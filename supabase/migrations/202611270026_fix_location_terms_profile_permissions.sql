-- ZUNO: restore the column-level privileges required by profile loading and saving.
-- Migration 003/005 intentionally revoked table-wide access. Migration 025 added
-- location_terms_accepted later but did not add it to the authenticated column grants.
-- RLS continues to restrict writes to the signed-in user's own row.

grant select (location_terms_accepted)
  on table public.profiles to authenticated;

grant insert (location_terms_accepted)
  on table public.profiles to authenticated;

grant update (location_terms_accepted)
  on table public.profiles to authenticated;
