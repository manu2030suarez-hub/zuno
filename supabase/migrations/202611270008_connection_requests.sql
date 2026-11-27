-- ZUNO: connection requests between members.
create table if not exists public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint connection_requests_not_self check (sender_id <> receiver_id),
  constraint connection_requests_unique_pair unique (sender_id, receiver_id)
);

create index if not exists connection_requests_receiver_status_idx
  on public.connection_requests (receiver_id, status, created_at desc);
create index if not exists connection_requests_sender_status_idx
  on public.connection_requests (sender_id, status, created_at desc);

alter table public.connection_requests enable row level security;

drop policy if exists "Members can view their connection requests" on public.connection_requests;
create policy "Members can view their connection requests"
  on public.connection_requests for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

drop policy if exists "Members can send connection requests" on public.connection_requests;
create policy "Members can send connection requests"
  on public.connection_requests for insert to authenticated
  with check (auth.uid() = sender_id and status = 'pending');

drop policy if exists "Recipients can respond to connection requests" on public.connection_requests;
create policy "Recipients can respond to connection requests"
  on public.connection_requests for update to authenticated
  using (auth.uid() = receiver_id and status = 'pending')
  with check (auth.uid() = receiver_id and status in ('accepted', 'rejected'));

grant select, insert, update on public.connection_requests to authenticated;
