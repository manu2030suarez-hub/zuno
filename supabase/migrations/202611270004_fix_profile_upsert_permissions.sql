-- Fix the profile upsert used when a user completes or edits their profile.
-- The app sends the user's own id in the upsert payload. PostgreSQL therefore
-- also requires UPDATE privilege on id for the ON CONFLICT update path.
-- The existing RLS UPDATE policy still enforces auth.uid() = id, so a user
-- cannot move or take ownership of another user's profile.

grant update (id, username, display_name, bio, avatar_url)
  on table public.profiles to authenticated;
