-- Allow dots in ZUNO usernames while keeping the existing length and character limits.
alter table public.profiles
  drop constraint if exists username_length;

alter table public.profiles
  add constraint username_format
  check (
    username is null
    or (
      char_length(username) between 3 and 24
      and username ~ '^[A-Za-z0-9_.]+$'
    )
  );
