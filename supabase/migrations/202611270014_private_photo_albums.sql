-- ZUNO: private photo albums with owner-approved access requests.
-- Existing public profile photos are unchanged. Private album files use a separate bucket.

create table if not exists public.private_album_access_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint private_album_request_not_self check (requester_id <> owner_id),
  constraint private_album_request_unique_pair unique (requester_id, owner_id)
);

create index if not exists private_album_requests_owner_status_idx
  on public.private_album_access_requests (owner_id, status, created_at desc);
create index if not exists private_album_requests_requester_idx
  on public.private_album_access_requests (requester_id, created_at desc);

alter table public.private_album_access_requests enable row level security;

drop policy if exists "Members can view their private album requests" on public.private_album_access_requests;
create policy "Members can view their private album requests"
  on public.private_album_access_requests for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = owner_id);

drop policy if exists "Members can request private album access" on public.private_album_access_requests;
create policy "Members can request private album access"
  on public.private_album_access_requests for insert to authenticated
  with check (
    auth.uid() = requester_id
    and status = 'pending'
    and not public.zuno_is_blocked_between(requester_id, owner_id)
  );

drop policy if exists "Album owners can decide access requests" on public.private_album_access_requests;
create policy "Album owners can decide access requests"
  on public.private_album_access_requests for update to authenticated
  using (
    auth.uid() = owner_id
    and status = 'pending'
    and not public.zuno_is_blocked_between(requester_id, owner_id)
  )
  with check (
    auth.uid() = owner_id
    and status in ('approved', 'rejected')
    and not public.zuno_is_blocked_between(requester_id, owner_id)
  );

drop policy if exists "Requesters can cancel pending album requests" on public.private_album_access_requests;
create policy "Requesters can cancel pending album requests"
  on public.private_album_access_requests for delete to authenticated
  using (auth.uid() = requester_id and status = 'pending');

revoke all on public.private_album_access_requests from anon, authenticated;
grant select, insert, delete on public.private_album_access_requests to authenticated;
grant update (status, updated_at) on public.private_album_access_requests to authenticated;

create table if not exists public.private_album_photos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists private_album_photos_owner_order_idx
  on public.private_album_photos (owner_id, sort_order, created_at);

alter table public.private_album_photos enable row level security;

create or replace function public.zuno_can_view_private_album(p_owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and (
      auth.uid() = p_owner_id
      or (
        not public.zuno_is_blocked_between(auth.uid(), p_owner_id)
        and exists (
          select 1
          from public.private_album_access_requests r
          where r.requester_id = auth.uid()
            and r.owner_id = p_owner_id
            and r.status = 'approved'
        )
      )
    );
$$;

revoke all on function public.zuno_can_view_private_album(uuid) from public, anon;
grant execute on function public.zuno_can_view_private_album(uuid) to authenticated;

drop policy if exists "Owners and approved viewers can see private album photos" on public.private_album_photos;
create policy "Owners and approved viewers can see private album photos"
  on public.private_album_photos for select to authenticated
  using (public.zuno_can_view_private_album(owner_id));

drop policy if exists "Owners can add private album photos" on public.private_album_photos;
create policy "Owners can add private album photos"
  on public.private_album_photos for insert to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "Owners can update private album photos" on public.private_album_photos;
create policy "Owners can update private album photos"
  on public.private_album_photos for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Owners can delete private album photos" on public.private_album_photos;
create policy "Owners can delete private album photos"
  on public.private_album_photos for delete to authenticated
  using (auth.uid() = owner_id);

revoke all on public.private_album_photos from anon, authenticated;
grant select, insert, update, delete on public.private_album_photos to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'zuno-private-albums',
  'zuno-private-albums',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Owners can upload private album photos" on storage.objects;
create policy "Owners can upload private album photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'zuno-private-albums'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Owners and approved viewers can read private album photos" on storage.objects;
create policy "Owners and approved viewers can read private album photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'zuno-private-albums'
    and public.zuno_can_view_private_album(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Owners can update private album photos in storage" on storage.objects;
create policy "Owners can update private album photos in storage"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'zuno-private-albums'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'zuno-private-albums'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Owners can delete private album photos in storage" on storage.objects;
create policy "Owners can delete private album photos in storage"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'zuno-private-albums'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
