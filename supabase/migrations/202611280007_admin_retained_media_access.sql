-- ZUNO · acceso administrativo a adjuntos retenidos
begin;

create policy "zuno_admin_read_retained_chat_media"
on storage.objects
for select
to authenticated
using (bucket_id = 'zuno-chat-media' and public.zuno_is_admin());

create or replace function public.admin_get_retained_chat_media_path(p_message_id uuid)
returns table(media_path text, message_type text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.zuno_is_admin() then
    raise exception 'No autorizado.';
  end if;

  return query
  select r.media_path, r.message_type
  from public.retained_chat_messages r
  where r.original_message_id = p_message_id
    and r.retention_until > now()
    and r.media_path is not null;

  if found then
    insert into public.retained_chat_access_audit(admin_user_id, retained_message_id, action)
    values (auth.uid(), p_message_id, 'media_path_view');
  end if;
end;
$$;
revoke all on function public.admin_get_retained_chat_media_path(uuid) from public, anon;
grant execute on function public.admin_get_retained_chat_media_path(uuid) to authenticated;

commit;
