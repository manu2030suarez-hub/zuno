-- ZUNO: persistent, private activity notifications for messages, connection requests and favorites.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  notification_type text not null check (notification_type in ('message', 'connection_request', 'favorite')),
  entity_id uuid,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_id, created_at desc)
  where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "Users can read their own notifications" on public.notifications;
create policy "Users can read their own notifications"
  on public.notifications for select to authenticated
  using (auth.uid() = recipient_id);

drop policy if exists "Users can update their own notification read state" on public.notifications;
create policy "Users can update their own notification read state"
  on public.notifications for update to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

drop policy if exists "Users can delete their own notifications" on public.notifications;
create policy "Users can delete their own notifications"
  on public.notifications for delete to authenticated
  using (auth.uid() = recipient_id);

revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create or replace function public.zuno_create_activity_notification(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_type text,
  p_entity_id uuid,
  p_title text,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_recipient_id is null or p_actor_id is null or p_recipient_id = p_actor_id then
    return;
  end if;

  if to_regprocedure('public.zuno_is_blocked_between(uuid,uuid)') is not null
     and public.zuno_is_blocked_between(p_recipient_id, p_actor_id) then
    return;
  end if;

  insert into public.notifications
    (recipient_id, actor_id, notification_type, entity_id, title, body)
  values
    (p_recipient_id, p_actor_id, p_type, p_entity_id, p_title, p_body);
end;
$$;

revoke all on function public.zuno_create_activity_notification(uuid, uuid, text, uuid, text, text) from public, anon, authenticated;

create or replace function public.zuno_notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
begin
  select case
    when c.member_one = new.sender_id then c.member_two
    else c.member_one
  end
  into v_recipient
  from public.conversations c
  where c.id = new.conversation_id
    and new.sender_id in (c.member_one, c.member_two);

  if v_recipient is not null then
    perform public.zuno_create_activity_notification(
      v_recipient, new.sender_id, 'message', new.id,
      'Nuevo mensaje', 'Te envió un mensaje'
    );
  end if;
  return new;
end;
$$;

revoke all on function public.zuno_notify_new_message() from public, anon, authenticated;

drop trigger if exists zuno_notify_message_insert on public.messages;
create trigger zuno_notify_message_insert
  after insert on public.messages
  for each row execute function public.zuno_notify_new_message();

create or replace function public.zuno_notify_connection_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending' then
    perform public.zuno_create_activity_notification(
      new.receiver_id, new.sender_id, 'connection_request', new.id,
      'Solicitud de conexión', 'Quiere conectar con vos'
    );
  end if;
  return new;
end;
$$;

revoke all on function public.zuno_notify_connection_request() from public, anon, authenticated;

drop trigger if exists zuno_notify_connection_insert on public.connection_requests;
create trigger zuno_notify_connection_insert
  after insert on public.connection_requests
  for each row execute function public.zuno_notify_connection_request();

create or replace function public.zuno_notify_favorite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.zuno_create_activity_notification(
    new.favorite_user_id, new.user_id, 'favorite', null,
    'Te agregó a favoritos', 'Alguien te agregó a sus favoritos'
  );
  return new;
end;
$$;

revoke all on function public.zuno_notify_favorite() from public, anon, authenticated;

drop trigger if exists zuno_notify_favorite_insert on public.profile_favorites;
create trigger zuno_notify_favorite_insert
  after insert on public.profile_favorites
  for each row execute function public.zuno_notify_favorite();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
