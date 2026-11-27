-- ZUNO: separate profile taps (🔥) from saved favorites (❤️).
create table if not exists public.profile_taps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tapped_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint profile_taps_not_self check (user_id <> tapped_user_id),
  constraint profile_taps_once_per_pair unique (user_id, tapped_user_id)
);

alter table public.profile_taps enable row level security;
drop policy if exists "Users can view taps they sent" on public.profile_taps;
create policy "Users can view taps they sent"
  on public.profile_taps for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Users can send their own taps" on public.profile_taps;
create policy "Users can send their own taps"
  on public.profile_taps for insert to authenticated
  with check (auth.uid() = user_id and auth.uid() <> tapped_user_id);
grant select, insert on public.profile_taps to authenticated;

alter table public.notifications
  drop constraint if exists notifications_notification_type_check;
alter table public.notifications
  add constraint notifications_notification_type_check
  check (notification_type in ('favorite','tap','album_access_request'));

create or replace function public.zuno_notify_profile_tap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.zuno_create_activity_notification(
    new.tapped_user_id, new.user_id, 'tap', new.id,
    'Nuevo tap 🔥', 'Alguien tocó tu perfil con fuego'
  );
  return new;
end;
$$;

revoke all on function public.zuno_notify_profile_tap() from public, anon, authenticated;
drop trigger if exists zuno_notify_profile_tap_insert on public.profile_taps;
create trigger zuno_notify_profile_tap_insert
  after insert on public.profile_taps
  for each row execute function public.zuno_notify_profile_tap();
