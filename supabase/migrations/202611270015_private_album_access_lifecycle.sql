-- ZUNO: complete private album permission lifecycle.
-- Owners can revoke approved access. Requesters can resubmit after a rejection.
drop policy if exists "Album owners can revoke approved access" on public.private_album_access_requests;
create policy "Album owners can revoke approved access"
  on public.private_album_access_requests for delete to authenticated
  using (
    auth.uid() = owner_id
    and status = 'approved'
  );

drop policy if exists "Requesters can resubmit rejected album requests" on public.private_album_access_requests;
create policy "Requesters can resubmit rejected album requests"
  on public.private_album_access_requests for update to authenticated
  using (
    auth.uid() = requester_id
    and status = 'rejected'
    and not public.zuno_is_blocked_between(requester_id, owner_id)
  )
  with check (
    auth.uid() = requester_id
    and status = 'pending'
    and not public.zuno_is_blocked_between(requester_id, owner_id)
  );

-- Keep only the minimal permissions already defined by migration 014.
grant delete on public.private_album_access_requests to authenticated;
grant update (status, updated_at) on public.private_album_access_requests to authenticated;
