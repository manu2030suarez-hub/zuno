-- ZUNO · Comunicaciones administrativas
begin;

create table if not exists public.admin_communications (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id),
  target_user_id uuid references auth.users(id),
  target_type text not null check (target_type in ('all','individual')),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  recipient_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists admin_communications_created_idx
  on public.admin_communications(created_at desc);
alter table public.admin_communications enable row level security;
revoke all on public.admin_communications from public, anon, authenticated;

create or replace function public.admin_send_communication(
  p_title text,
  p_message text,
  p_target_user_id uuid default null
)
returns table(communication_id uuid, recipients integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := auth.uid();
  v_title text := btrim(coalesce(p_title,''));
  v_message text := btrim(coalesce(p_message,''));
  v_id uuid;
  v_count integer := 0;
begin
  if v_admin is null or not public.zuno_is_admin() then
    raise exception 'No autorizado.';
  end if;
  if char_length(v_title) < 1 or char_length(v_title) > 120 then
    raise exception 'El título debe tener entre 1 y 120 caracteres.';
  end if;
  if char_length(v_message) < 1 or char_length(v_message) > 2000 then
    raise exception 'El mensaje debe tener entre 1 y 2000 caracteres.';
  end if;
  if p_target_user_id is not null and not exists (
    select 1 from public.profiles p where p.id = p_target_user_id
  ) then
    raise exception 'No se encontró el usuario destinatario.';
  end if;

  insert into public.admin_communications(
    admin_user_id, target_user_id, target_type, title, body, recipient_count
  ) values (
    v_admin, p_target_user_id,
    case when p_target_user_id is null then 'all' else 'individual' end,
    v_title, v_message, 0
  ) returning id into v_id;

  if p_target_user_id is null then
    insert into public.notifications(
      recipient_id, actor_id, notification_type, entity_id, title, body, metadata
    )
    select p.id, v_admin, 'admin_announcement', v_id, v_title, v_message,
      jsonb_build_object('communication_id',v_id,'target_type','all')
    from public.profiles p;
    get diagnostics v_count = row_count;
  else
    insert into public.notifications(
      recipient_id, actor_id, notification_type, entity_id, title, body, metadata
    ) values (
      p_target_user_id, v_admin, 'admin_announcement', v_id, v_title, v_message,
      jsonb_build_object('communication_id',v_id,'target_type','individual')
    );
    v_count := 1;
  end if;

  update public.admin_communications
  set recipient_count = v_count
  where id = v_id;

  insert into public.admin_moderation_audit(admin_user_id, action, details)
  values (v_admin, 'communication_sent',
    jsonb_build_object('communication_id',v_id,'target_type',case when p_target_user_id is null then 'all' else 'individual' end,'target_user_id',p_target_user_id,'recipients',v_count));

  return query select v_id, v_count;
end;
$$;
revoke all on function public.admin_send_communication(text,text,uuid) from public, anon;
grant execute on function public.admin_send_communication(text,text,uuid) to authenticated;

create or replace function public.admin_list_communications(
  p_limit integer default 30,
  p_offset integer default 0
)
returns table(
  id uuid, target_type text, target_user_id uuid, title text, body text,
  recipient_count integer, created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.zuno_is_admin() then
    raise exception 'No autorizado.';
  end if;
  insert into public.admin_moderation_audit(admin_user_id, action, details)
  values (auth.uid(), 'communications_history_view', '{}'::jsonb);
  return query
  select c.id,c.target_type,c.target_user_id,c.title,c.body,c.recipient_count,c.created_at
  from public.admin_communications c
  order by c.created_at desc
  limit greatest(1,least(coalesce(p_limit,30),100))
  offset greatest(coalesce(p_offset,0),0);
end;
$$;
revoke all on function public.admin_list_communications(integer,integer) from public, anon;
grant execute on function public.admin_list_communications(integer,integer) to authenticated;

commit;
