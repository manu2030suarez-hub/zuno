-- ZUNO · Exponer referencias de mensajes denunciados al panel admin
create or replace function public.admin_list_report_message_links()
returns table (
  report_id uuid,
  message_id uuid,
  conversation_id uuid,
  reported_content_type text
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or not public.zuno_is_admin() then
    raise exception 'No autorizado.';
  end if;

  return query
  select r.id, r.message_id, r.conversation_id, r.reported_content_type
  from public.user_reports r
  where r.message_id is not null
  order by r.created_at desc
  limit 500;
end;
$function$;

revoke all on function public.admin_list_report_message_links() from public, anon;
grant execute on function public.admin_list_report_message_links() to authenticated;
