-- Permite que el administrador responda una denuncia mediante una notificación privada.
create or replace function public.admin_reply_to_user_report(
  p_report_id uuid,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_admin_id uuid := auth.uid();
  v_reporter_id uuid;
  v_message text := btrim(coalesce(p_message, ''));
begin
  if v_admin_id is null or not public.zuno_is_admin() then
    raise exception 'No autorizado.';
  end if;

  if char_length(v_message) < 1 or char_length(v_message) > 1000 then
    raise exception 'La respuesta debe tener entre 1 y 1000 caracteres.';
  end if;

  select r.reporter_id
    into v_reporter_id
  from public.user_reports r
  where r.id = p_report_id;

  if v_reporter_id is null then
    raise exception 'No se encontró la denuncia.';
  end if;

  insert into public.notifications (
    recipient_id,
    actor_id,
    notification_type,
    entity_id,
    title,
    body,
    metadata
  ) values (
    v_reporter_id,
    v_admin_id,
    'report_response',
    p_report_id,
    'Respuesta a tu denuncia',
    v_message,
    jsonb_build_object('report_id', p_report_id)
  );
end;
$function$;

revoke all on function public.admin_reply_to_user_report(uuid, text) from public;
revoke all on function public.admin_reply_to_user_report(uuid, text) from anon;
grant execute on function public.admin_reply_to_user_report(uuid, text) to authenticated;
