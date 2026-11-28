-- ZUNO · Retención controlada de mensajes de chat
-- Política: 90 días desde el vencimiento/eliminación. Los archivos no se exponen en el panel.
begin;

create table if not exists public.retained_chat_messages (
  original_message_id uuid primary key,
  conversation_id uuid not null,
  sender_id uuid not null,
  body text,
  message_type text not null,
  media_path text,
  original_created_at timestamptz not null,
  expired_at timestamptz,
  deletion_reason text not null check (deletion_reason in ('expired','deleted_for_everyone')),
  preserved_at timestamptz not null default now(),
  retention_until timestamptz not null default (now() + interval '90 days')
);

create index if not exists retained_chat_messages_retention_idx
  on public.retained_chat_messages (retention_until);
create index if not exists retained_chat_messages_conversation_idx
  on public.retained_chat_messages (conversation_id, preserved_at desc);

alter table public.retained_chat_messages enable row level security;
revoke all on public.retained_chat_messages from public, anon, authenticated;
grant all on public.retained_chat_messages to service_role;

create table if not exists public.retained_chat_access_audit (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null,
  retained_message_id uuid,
  action text not null,
  accessed_at timestamptz not null default now()
);
alter table public.retained_chat_access_audit enable row level security;
revoke all on public.retained_chat_access_audit from public, anon, authenticated;
grant all on public.retained_chat_access_audit to service_role;

-- Impide que un cliente borre desde Storage un archivo mientras siga retenido.
drop policy if exists "zuno_prevent_delete_retained_chat_media" on storage.objects;
create policy "zuno_prevent_delete_retained_chat_media"
on storage.objects as restrictive
for delete to authenticated
using (
  bucket_id <> 'zuno-chat-media'
  or not exists (
    select 1 from public.retained_chat_messages r
    where r.media_path = storage.objects.name
      and r.retention_until > now()
  )
);

create or replace function public.purge_expired_chat_messages(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or not exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and auth.uid() in (c.member_one, c.member_two)
  ) then
    raise exception 'No tenés acceso a esta conversación.';
  end if;

  insert into public.retained_chat_messages (
    original_message_id, conversation_id, sender_id, body, message_type,
    media_path, original_created_at, expired_at, deletion_reason
  )
  select m.id, m.conversation_id, m.sender_id, m.body, m.message_type,
         m.media_path, m.created_at, m.expires_at, 'expired'
  from public.messages m
  where m.conversation_id = p_conversation_id
    and m.expires_at is not null
    and m.expires_at <= now()
  on conflict (original_message_id) do nothing;

  delete from public.messages
  where conversation_id = p_conversation_id
    and expires_at is not null
    and expires_at <= now();
end;
$function$;

create or replace function public.archive_chat_message_for_all(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_message public.messages%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Debés iniciar sesión.';
  end if;

  select * into v_message
  from public.messages
  where id = p_message_id
  for update;

  if not found or v_message.sender_id <> auth.uid() then
    raise exception 'No podés eliminar este mensaje.';
  end if;

  insert into public.retained_chat_messages (
    original_message_id, conversation_id, sender_id, body, message_type,
    media_path, original_created_at, expired_at, deletion_reason
  ) values (
    v_message.id, v_message.conversation_id, v_message.sender_id, v_message.body,
    v_message.message_type, v_message.media_path, v_message.created_at,
    v_message.expires_at, 'deleted_for_everyone'
  )
  on conflict (original_message_id) do nothing;

  delete from public.messages where id = p_message_id and sender_id = auth.uid();
end;
$function$;

-- Las eliminaciones pasan exclusivamente por las funciones que archivan primero.
revoke delete on public.messages from authenticated, anon;
revoke all on function public.purge_expired_chat_messages(uuid) from public, anon;
revoke all on function public.archive_chat_message_for_all(uuid) from public, anon;
grant execute on function public.purge_expired_chat_messages(uuid) to authenticated;
grant execute on function public.archive_chat_message_for_all(uuid) to authenticated;

create or replace function public.admin_list_retained_chat_messages(
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  original_message_id uuid,
  conversation_id uuid,
  sender_id uuid,
  body text,
  message_type text,
  has_media boolean,
  original_created_at timestamptz,
  preserved_at timestamptz,
  retention_until timestamptz,
  deletion_reason text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_admin uuid := auth.uid();
  v_row record;
begin
  if v_admin is null or not public.zuno_is_admin() then
    raise exception 'No autorizado.';
  end if;

  for v_row in
    select r.original_message_id
    from public.retained_chat_messages r
    where r.retention_until > now()
    order by r.preserved_at desc
    limit greatest(1, least(coalesce(p_limit, 50), 100))
    offset greatest(coalesce(p_offset, 0), 0)
  loop
    insert into public.retained_chat_access_audit(admin_user_id, retained_message_id, action)
    values (v_admin, v_row.original_message_id, 'metadata_view');
  end loop;

  return query
  select r.original_message_id, r.conversation_id, r.sender_id, r.body,
         r.message_type, (r.media_path is not null), r.original_created_at,
         r.preserved_at, r.retention_until, r.deletion_reason
  from public.retained_chat_messages r
  where r.retention_until > now()
  order by r.preserved_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$function$;
revoke all on function public.admin_list_retained_chat_messages(integer, integer) from public, anon;
grant execute on function public.admin_list_retained_chat_messages(integer, integer) to authenticated;

commit;
