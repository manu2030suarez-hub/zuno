-- Per-member chat archive and delete state; one user's action never deletes the other user's chat.
alter table public.conversations
  add column if not exists archived_by_one boolean not null default false,
  add column if not exists archived_by_two boolean not null default false,
  add column if not exists deleted_by_one boolean not null default false,
  add column if not exists deleted_by_two boolean not null default false;
