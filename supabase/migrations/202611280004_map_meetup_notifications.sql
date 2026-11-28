-- ZUNO: reliable meetup invites, RLS-safe validation, and activity notifications.
alter table public.notifications
  drop constraint if exists notifications_notification_type_check;

alter table public.notifications
  add constraint notifications_notification_type_check
  check (notification_type in ('favorite','album_access_request','map_meetup_request'));

drop policy if exists "Users can invite visible map members"
  on public.map_meetup_requests;

-- The trigger below performs the visibility validation as SECURITY DEFINER.
-- This policy only verifies the authenticated sender, avoiding cross-user
-- location reads under RLS.
create policy "Users can invite visible map members"
  on public.map_meetup_requests
  for insert to authenticated
  with check (
    auth.uid() = sender_id
    and sender_id <> receiver_id
  );

create or replace function public.zuno_validate_and_notify_map_meetup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_visible boolean;
  v_receiver_visible boolean;
  v_actor_name text;
begin
  select exists (
    select 1 from public.user_map_locations
    where user_id = new.sender_id
      and map_visible = true
      and latitude is not null
      and longitude is not null
      and updated_at > now() - interval '24 hours'
  ) into v_sender_visible;

  select exists (
    select 1 from public.user_map_locations
    where user_id = new.receiver_id
      and map_visible = true
      and latitude is not null
      and longitude is not null
      and updated_at > now() - interval '24 hours'
  ) into v_receiver_visible;

  if not v_sender_visible or not v_receiver_visible then
    raise exception 'Ambas personas deben tener la visibilidad del mapa activa y una ubicación reciente.';
  end if;

  select coalesce(display_name, username, 'Una persona de ZUNO')
    into v_actor_name
    from public.profiles
   where id = new.sender_id;

  insert into public.notifications
    (recipient_id, actor_id, notification_type, entity_id, title, body, metadata)
  values
    (new.receiver_id, new.sender_id, 'map_meetup_request', new.id,
     'Solicitud para encontrarse',
     coalesce(v_actor_name, 'Una persona de ZUNO') || ' quiere encontrarse contigo.',
     jsonb_build_object('request_id', new.id));

  return new;
end;
$$;

revoke all on function public.zuno_validate_and_notify_map_meetup() from public, anon, authenticated;

drop trigger if exists zuno_map_meetup_validate_notify on public.map_meetup_requests;
create trigger zuno_map_meetup_validate_notify
  before insert on public.map_meetup_requests
  for each row execute function public.zuno_validate_and_notify_map_meetup();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'map_meetup_requests'
     ) then
    alter publication supabase_realtime add table public.map_meetup_requests;
  end if;
end;
$$;
