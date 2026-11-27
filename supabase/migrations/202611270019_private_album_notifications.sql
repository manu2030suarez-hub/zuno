-- ZUNO: private album access request and decision notifications.
alter table public.notifications
  drop constraint if exists notifications_notification_type_check;

alter table public.notifications
  add constraint notifications_notification_type_check
  check (notification_type in (
    'message',
    'connection_request',
    'favorite',
    'album_access_request',
    'album_access_decision'
  ));

create or replace function public.zuno_notify_private_album_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending' then
    perform public.zuno_create_activity_notification(
      new.owner_id,
      new.requester_id,
      'album_access_request',
      new.id,
      'Solicitud para ver tu álbum privado',
      'Quiere acceder a tus fotos privadas'
    );
  end if;
  return new;
end;
$$;

revoke all on function public.zuno_notify_private_album_request() from public, anon, authenticated;

drop trigger if exists zuno_notify_private_album_request_insert on public.private_album_access_requests;
create trigger zuno_notify_private_album_request_insert
  after insert on public.private_album_access_requests
  for each row execute function public.zuno_notify_private_album_request();

create or replace function public.zuno_notify_private_album_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_body text;
begin
  if old.status = 'pending' and new.status in ('approved', 'rejected') then
    if new.status = 'approved' then
      v_title := 'Acceso aprobado';
      v_body := 'Te dieron acceso al álbum privado';
    else
      v_title := 'Solicitud rechazada';
      v_body := 'Por ahora no aprobaron tu solicitud de acceso';
    end if;

    perform public.zuno_create_activity_notification(
      new.requester_id,
      new.owner_id,
      'album_access_decision',
      new.id,
      v_title,
      v_body
    );
  end if;
  return new;
end;
$$;

revoke all on function public.zuno_notify_private_album_decision() from public, anon, authenticated;

drop trigger if exists zuno_notify_private_album_decision_update on public.private_album_access_requests;
create trigger zuno_notify_private_album_decision_update
  after update of status on public.private_album_access_requests
  for each row execute function public.zuno_notify_private_album_decision();
