-- ZUNO: separate platform verification from Supabase sign-in confirmation.
alter table public.profiles
add column if not exists zuno_verified boolean not null default false;

-- Existing accounts remain unverified in ZUNO until the platform adds
-- a real verification flow and explicitly changes this value.
update public.profiles
set zuno_verified = false
where zuno_verified is null;
