-- ZUNO: mutual consent for map meetup invitations.
create table if not exists public.map_meetup_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint map_meetup_requests_distinct_users check (sender_id <> receiver_id)
);

create index if not exists map_meetup_requests_sender_created_idx
  on public.map_meetup_requests(sender_id, created_at desc);
create index if not exists map_meetup_requests_receiver_created_idx
  on public.map_meetup_requests(receiver_id, created_at desc);

alter table public.map_meetup_requests enable row level security;

drop policy if exists "Participants can read map meetup requests" on public.map_meetup_requests;
create policy "Participants can read map meetup requests"
  on public.map_meetup_requests for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "Users can invite visible map members" on public.map_meetup_requests;
create policy "Users can invite visible map members"
  on public.map_meetup_requests for insert to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.user_map_locations sender_location
      where sender_location.user_id = auth.uid() and sender_location.map_visible = true
    )
    and exists (
      select 1 from public.user_map_locations receiver_location
      where receiver_location.user_id = receiver_id and receiver_location.map_visible = true
    )
  );

drop policy if exists "Participants can respond to map meetup requests" on public.map_meetup_requests;
create policy "Participants can respond to map meetup requests"
  on public.map_meetup_requests for update to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id)
  with check (
    (auth.uid() = receiver_id and status in ('accepted','rejected'))
    or (auth.uid() = sender_id and status = 'cancelled')
  );

grant select, insert, update on public.map_meetup_requests to authenticated;
