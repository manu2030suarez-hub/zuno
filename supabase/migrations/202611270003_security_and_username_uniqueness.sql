-- ZUNO security hardening: case-insensitive usernames and private profile data.
-- Run this migration in the Supabase SQL Editor while signed in as project owner.

-- Enforce uniqueness regardless of letter casing (e.g. Manu and manu are the same).
alter table public.profiles
  drop constraint if exists profiles_username_key;

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username))
  where username is not null;

-- Keep date of birth out of the publicly readable profiles table.
create table if not exists public.private_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  birth_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.private_profiles enable row level security;

drop policy if exists "Users can view their own private profile" on public.private_profiles;
create policy "Users can view their own private profile"
  on public.private_profiles for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own private profile" on public.private_profiles;
create policy "Users can insert their own private profile"
  on public.private_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own private profile" on public.private_profiles;
create policy "Users can update their own private profile"
  on public.private_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Preserve any existing birth dates before removing the column from public.profiles.
insert into public.private_profiles (user_id, birth_date)
select id, birth_date
from public.profiles
where birth_date is not null
on conflict (user_id) do update
set birth_date = excluded.birth_date;

alter table public.profiles drop column if exists birth_date;

-- Restrict API column access. RLS still controls which rows can be read/changed.
-- zuno_verified is readable but cannot be changed by normal signed-in clients.
revoke all on table public.profiles from anon, authenticated;
grant select (id, username, display_name, bio, avatar_url, zuno_verified, created_at, updated_at)
  on table public.profiles to authenticated;
grant insert (id, username, display_name, bio, avatar_url)
  on table public.profiles to authenticated;
grant update (username, display_name, bio, avatar_url)
  on table public.profiles to authenticated;

-- Private birth-date records are intentionally not exposed to the client yet.
revoke all on table public.private_profiles from anon, authenticated;
