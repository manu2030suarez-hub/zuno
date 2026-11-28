-- ZUNO: fix map meetup invitation RLS checks without exposing location rows.
-- Security-definer helper can verify both participants' map visibility while
-- keeping user_map_locations readable only by its owner.
create or replace function public.can_create_map_meetup_request(p_receiver_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and p_receiver_id is not null
    and p_receiver_id <> auth.uid()
    and exists (
      select 1
      from public.user_map_locations sender_location
      where sender_location.user_id = auth.uid()
        and sender_location.map_visible = true
        and sender_location.latitude is not null
        and sender_location.longitude is not null
        and sender_location.updated_at > now() - interval '24 hours'
    )
    and exists (
      select 1
      from public.user_map_locations receiver_location
      where receiver_location.user_id = p_receiver_id
        and receiver_location.map_visible = true
        and receiver_location.latitude is not null
        and receiver_location.longitude is not null
        and receiver_location.updated_at > now() - interval '24 hours'
    );
$$;

revoke all on function public.can_create_map_meetup_request(uuid) from public, anon;
grant execute on function public.can_create_map_meetup_request(uuid) to authenticated;

drop policy if exists "Users can invite visible map members"
  on public.map_meetup_requests;

create policy "Users can invite visible map members"
  on public.map_meetup_requests
  for insert to authenticated
  with check (
    auth.uid() = sender_id
    and public.can_create_map_meetup_request(receiver_id)
  );

-- Either participant can end an accepted meetup; only the receiver can accept/reject.
drop policy if exists "Participants can respond to map meetup requests"
  on public.map_meetup_requests;

create policy "Participants can respond to map meetup requests"
  on public.map_meetup_requests
  for update to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id)
  with check (
    (auth.uid() = receiver_id and status in ('accepted','rejected','cancelled'))
    or (auth.uid() = sender_id and status = 'cancelled')
  );
