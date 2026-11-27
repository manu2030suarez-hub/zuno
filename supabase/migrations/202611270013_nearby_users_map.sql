-- ZUNO nearby map: exact coordinates stay private; only coarse markers leave the database.
create table if not exists public.user_map_locations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  latitude double precision,
  longitude double precision,
  map_visible boolean not null default false,
  updated_at timestamptz,
  created_at timestamptz not null default now(),
  constraint user_map_latitude_range check (latitude is null or latitude between -90 and 90),
  constraint user_map_longitude_range check (longitude is null or longitude between -180 and 180),
  constraint user_map_coordinates_pair check ((latitude is null) = (longitude is null))
);

alter table public.user_map_locations enable row level security;
drop policy if exists "Users can view their own map location" on public.user_map_locations;
create policy "Users can view their own map location"
  on public.user_map_locations for select to authenticated
  using (auth.uid() = user_id);

revoke all on public.user_map_locations from anon, authenticated;
grant select on public.user_map_locations to authenticated;

-- This RPC is called only after the user explicitly grants browser geolocation.
-- It opts the account into the map and stores the exact coordinates privately.
create or replace function public.update_my_map_location(p_latitude double precision, p_longitude double precision)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_latitude is null or p_longitude is null
     or p_latitude < -90 or p_latitude > 90
     or p_longitude < -180 or p_longitude > 180 then
    raise exception 'Invalid coordinates';
  end if;

  insert into public.user_map_locations(user_id, latitude, longitude, map_visible, updated_at)
  values (v_user_id, p_latitude, p_longitude, true, now())
  on conflict (user_id) do update
    set latitude = excluded.latitude,
        longitude = excluded.longitude,
        map_visible = true,
        updated_at = now();
end;
$$;

-- Hiding immediately removes the stored coordinates. Re-enabling requires a fresh,
-- explicit location update from the browser.
create or replace function public.set_my_map_visibility(p_visible boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_visible then
    insert into public.user_map_locations(user_id, map_visible)
    values (v_user_id, true)
    on conflict (user_id) do update set map_visible = true;
  else
    update public.user_map_locations
       set map_visible = false, latitude = null, longitude = null, updated_at = null
     where user_id = v_user_id;
  end if;
end;
$$;

-- Only coarse coordinates (rounded to 2 decimals) and distance buckets (5 km)
-- are returned. The exact coordinates are never sent to the browser.
create or replace function public.get_nearby_map_users(p_radius_km integer default 50)
returns table (
  user_id uuid,
  display_name text,
  username text,
  avatar_url text,
  approximate_latitude numeric,
  approximate_longitude numeric,
  approximate_distance_km integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select latitude, longitude
      from public.user_map_locations
     where user_id = auth.uid()
       and latitude is not null
       and longitude is not null
       and updated_at > now() - interval '24 hours'
  ),
  candidates as (
    select
      p.id as user_id,
      p.display_name,
      p.username,
      p.avatar_url,
      l.latitude,
      l.longitude,
      6371 * 2 * asin(sqrt(
        power(sin(radians(l.latitude - me.latitude) / 2), 2) +
        cos(radians(me.latitude)) * cos(radians(l.latitude)) *
        power(sin(radians(l.longitude - me.longitude) / 2), 2)
      )) as exact_distance
    from me
    join public.user_map_locations l
      on l.map_visible = true
     and l.latitude is not null
     and l.longitude is not null
     and l.updated_at > now() - interval '24 hours'
    join public.profiles p on p.id = l.user_id
    join public.private_profiles pp on pp.user_id = p.id
    where p.id <> auth.uid()
      and pp.birth_date <= (current_date - interval '18 years')::date
      and not public.zuno_is_blocked_between(auth.uid(), p.id)
  )
  select
    user_id,
    display_name,
    username,
    avatar_url,
    round(latitude::numeric, 2) as approximate_latitude,
    round(longitude::numeric, 2) as approximate_longitude,
    (round(exact_distance / 5.0) * 5)::integer as approximate_distance_km
  from candidates
  where exact_distance <= greatest(1, least(coalesce(p_radius_km, 50), 200))
  order by exact_distance asc;
$$;

revoke all on function public.update_my_map_location(double precision, double precision) from public, anon;
revoke all on function public.set_my_map_visibility(boolean) from public, anon;
revoke all on function public.get_nearby_map_users(integer) from public, anon;
grant execute on function public.update_my_map_location(double precision, double precision) to authenticated;
grant execute on function public.set_my_map_visibility(boolean) to authenticated;
grant execute on function public.get_nearby_map_users(integer) to authenticated;
