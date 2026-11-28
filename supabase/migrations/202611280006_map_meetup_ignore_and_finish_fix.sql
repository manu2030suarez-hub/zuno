-- Allow a recipient to ignore a pending invitation and either participant to finish an accepted meetup.
alter table public.map_meetup_requests
  drop constraint if exists map_meetup_requests_status_check;
alter table public.map_meetup_requests
  add constraint map_meetup_requests_status_check
  check (status in ('pending','accepted','rejected','ignored','cancelled'));

drop policy if exists "Participants can respond to map meetup requests" on public.map_meetup_requests;
create policy "Participants can respond to map meetup requests"
  on public.map_meetup_requests for update to authenticated
  using (
    (auth.uid() = receiver_id and status = 'pending')
    or (auth.uid() = sender_id and status = 'pending')
    or (auth.uid() in (sender_id, receiver_id) and status = 'accepted')
  )
  with check (
    (auth.uid() = receiver_id and status in ('accepted','rejected','ignored'))
    or (auth.uid() in (sender_id, receiver_id) and status = 'cancelled')
  );

create or replace function public.zuno_notify_map_meetup_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
  v_actor_name text;
  v_title text;
  v_body text;
begin
  if new.status is not distinct from old.status then return new; end if;
  if new.status not in ('accepted','rejected','ignored','cancelled') then return new; end if;

  v_recipient := case when auth.uid() = new.sender_id then new.receiver_id else new.sender_id end;
  if auth.uid() is null then v_recipient := new.sender_id; end if;

  select coalesce(display_name, username, 'Una persona de ZUNO')
    into v_actor_name from public.profiles where id = auth.uid();

  if new.status = 'accepted' then
    v_title := 'Solicitud aceptada';
    v_body := coalesce(v_actor_name, 'La otra persona') || ' aceptó encontrarse contigo.';
  elsif new.status = 'rejected' then
    v_title := 'Solicitud rechazada';
    v_body := coalesce(v_actor_name, 'La otra persona') || ' rechazó la invitación.';
  elsif new.status = 'ignored' then
    v_title := 'Solicitud ignorada';
    v_body := coalesce(v_actor_name, 'La otra persona') || ' decidió ignorar la invitación.';
  else
    v_title := 'Encuentro finalizado';
    v_body := 'El encuentro fue finalizado. La solicitud quedó guardada en el historial.';
  end if;

  insert into public.notifications
    (recipient_id, actor_id, notification_type, entity_id, title, body, metadata)
  values
    (v_recipient, auth.uid(), 'map_meetup_request', new.id, v_title, v_body,
     jsonb_build_object('request_id', new.id, 'status', new.status));
  return new;
end;
$$;

drop trigger if exists zuno_map_meetup_status_notification on public.map_meetup_requests;
create trigger zuno_map_meetup_status_notification
  after update of status on public.map_meetup_requests
  for each row when (old.status is distinct from new.status)
  execute function public.zuno_notify_map_meetup_status_change();
