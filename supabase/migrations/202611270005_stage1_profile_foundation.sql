-- ZUNO Stage 1: richer profiles, private birth dates, photo gallery and privacy controls.
-- Safe to run in Supabase SQL Editor. Does not delete existing profile data.

alter table public.profiles
  add column if not exists city text,
  add column if not exists region text,
  add column if not exists interests text[] not null default '{}',
  add column if not exists looking_for text[] not null default '{}',
  add column if not exists preferred_age_min integer,
  add column if not exists preferred_age_max integer,
  add column if not exists preferred_distance_km integer,
  add column if not exists show_online boolean not null default true,
  add column if not exists show_distance boolean not null default false,
  add column if not exists show_age boolean not null default true,
  add column if not exists show_location boolean not null default true;

-- Birth date is private and must never be queried from the public profile list.
create table if not exists public.private_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  birth_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.private_profiles enable row level security;
drop policy if exists "Users can view their own private profile" on public.private_profiles;
create policy "Users can view their own private profile"
  on public.private_profiles for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can insert their own private profile" on public.private_profiles;
create policy "Users can insert their own private profile"
  on public.private_profiles for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update their own private profile" on public.private_profiles;
create policy "Users can update their own private profile"
  on public.private_profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update on public.private_profiles to authenticated;

-- Photo metadata. Image objects live in a private Storage bucket.
create table if not exists public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.profile_photos enable row level security;
drop policy if exists "Users can view profile photo metadata" on public.profile_photos;
create policy "Users can view profile photo metadata"
  on public.profile_photos for select to authenticated using (true);
drop policy if exists "Users can add their own profile photos" on public.profile_photos;
create policy "Users can add their own profile photos"
  on public.profile_photos for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update their own profile photos" on public.profile_photos;
create policy "Users can update their own profile photos"
  on public.profile_photos for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their own profile photos" on public.profile_photos;
create policy "Users can delete their own profile photos"
  on public.profile_photos for delete to authenticated using (auth.uid() = user_id);
grant select, insert, update, delete on public.profile_photos to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('zuno-profile-photos', 'zuno-profile-photos', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Users can upload their own ZUNO photos" on storage.objects;
create policy "Users can upload their own ZUNO photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'zuno-profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users can view ZUNO profile photos" on storage.objects;
create policy "Users can view ZUNO profile photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'zuno-profile-photos');
drop policy if exists "Users can update their own ZUNO photos" on storage.objects;
create policy "Users can update their own ZUNO photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'zuno-profile-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'zuno-profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users can delete their own ZUNO photos" on storage.objects;
create policy "Users can delete their own ZUNO photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'zuno-profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Column-level access: only the owner can update profile settings; public profile fields
-- remain readable by signed-in users. Keep privileged verification fields protected.
revoke all on table public.profiles from anon, authenticated;
grant select (id, username, display_name, bio, avatar_url, zuno_verified, created_at, updated_at,
  city, region, interests, looking_for, preferred_age_min, preferred_age_max,
  preferred_distance_km, show_online, show_distance, show_age, show_location)
  on table public.profiles to authenticated;
grant insert (id, username, display_name, bio, avatar_url, city, region, interests, looking_for,
  preferred_age_min, preferred_age_max, preferred_distance_km, show_online, show_distance,
  show_age, show_location)
  on table public.profiles to authenticated;
grant update (id, username, display_name, bio, avatar_url, city, region, interests, looking_for,
  preferred_age_min, preferred_age_max, preferred_distance_km, show_online, show_distance,
  show_age, show_location)
  on table public.profiles to authenticated;
