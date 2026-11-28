-- ZUNO · Contexto de mensajes asociados a denuncias
begin;

alter table public.user_reports
  add column if not exists message_id uuid,
  add column if not exists conversation_id uuid,
  add column if not exists reported_content_type text;

create table if not exists public.admin_report_context_audit (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null,
  report_id uuid not null,
  message_id uuid,
  action text not null default 'report_context_view',
  accessed_at timestamptz not null default now()
);

alter table public.admin_report_context_audit enable row level security;
revoke all on public.admin_report_context_audit from public, anon, authenticated;
grant all on public.admin_report_context_audit to service_role;

create or replace function public.admin_get_report_context(p_report_id uuid)
returns table (
  report_id uuid,
  message_id uuid,
  conversation_id uuid,
  content_type text,
  message_body text,
  message_type text,
  has_media boolean,
  content_state text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_admin uuid := auth.uid();
  v_message_id uuid;
  v_conversation_id uuid;
  v_content_type text;
  v_body text;
  v_message_type text;
  v_has_media boolean := false;
  v_state text := 'not_linked';
begin
  if v_admin is null or not public.zuno_is_admin() then
    raise exception 'No autorizado.';
  end if;

  select r.message_id, r.conversation_id, r.reported_content_type
    into v_message_id, v_conversation_id, v_content_type
  from public.user_reports r
  where r.id = p_report_id;

  if not found then
    raise exception 'No se encontró la denuncia.';
  end if;

  insert into public.admin_report_context_audit
    (admin_user_id, report_id, message_id, action)
  values
    (v_admin, p_report_id, v_message_id, 'report_context_view');

  if v_message_id is not null then
    select m.body, m.message_type, (m.media_path is not null)
      into v_body, v_message_type, v_has_media
    from public.messages m
    where m.id = v_message_id;

    if found then
      v_state := 'active_message';
    else
      select r.body, r.message_type, (r.media_path is not null)
        into v_body, v_message_type, v_has_media
      from public.retained_chat_messages r
      where r.original_message_id = v_message_id
        and r.retention_until > now();

      if found then
        v_state := 'retained_message';
      else
        v_state := 'message_unavailable';
      end if;
    end if;
  end if;

  return query select p_report_id, v_message_id, v_conversation_id,
    v_content_type, v_body, v_message_type, v_has_media, v_state;
end;
$function$;

revoke all on function public.admin_get_report_context(uuid) from public, anon;
grant execute on function public.admin_get_report_context(uuid) to authenticated;

commit;
