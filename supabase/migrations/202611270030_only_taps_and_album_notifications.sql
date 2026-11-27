-- ZUNO: only profile taps and private-album requests are activity notifications.
drop trigger if exists zuno_notify_message_insert on public.messages;
drop trigger if exists zuno_notify_connection_insert on public.connection_requests;
drop trigger if exists zuno_notify_private_album_decision_update on public.private_album_access_requests;

alter table public.notifications
  drop constraint if exists notifications_notification_type_check;

delete from public.notifications
where notification_type not in ('favorite','album_access_request');

alter table public.notifications
  add constraint notifications_notification_type_check
  check (notification_type in ('favorite','album_access_request'));

create or replace function public.zuno_notify_favorite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.zuno_create_activity_notification(
    new.favorite_user_id, new.user_id, 'favorite', null,
    'Nuevo tap 🔥', 'Alguien tocó tu perfil'
  );
  return new;
end;
$$;

revoke all on function public.zuno_notify_favorite() from public, anon, authenticated;

drop trigger if exists zuno_notify_favorite_insert on public.profile_favorites;
create trigger zuno_notify_favorite_insert
  after insert on public.profile_favorites
  for each row execute function public.zuno_notify_favorite();
