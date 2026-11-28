-- ZUNO privacy hardening: voluntary map visibility, adult-only discovery, and block privacy.
-- Run in Supabase SQL Editor after deploying the matching frontend commit.

-- A user can only ask whether they are blocked with another account.
-- This prevents authenticated users from probing arbitrary pairs of users.
create or replace function public.zuno_is_blocked_between(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when auth.uid() is null or auth.uid() not in (p_user_a, p_user_b) then false
    else exists (
      select 1
      from public.user_blocks b
      where (b.blocker_id = p_user_a and b.blocked_id = p_user_b)
         or (b.blocker_id = p_user_b and b.blocked_id = p_user_a)
    )
  end;
$$;

revoke all on function public.zuno_is_blocked_between(uuid, uuid) from public, anon;
grant execute on function public.zuno_is_blocked_between(uuid, uuid) to authenticated;

-- Enforce the 18+ rule in the database, not only in the browser.
create or replace function public.zuno_validate_private_birth_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.birth_date is null
     or new.birth_date > (current_date - interval '18 years')::date then
    raise exception 'ZUNO is exclusively for people aged 18 or older';
  end if;
  return new;
end;
$$;

drop trigger if exists zuno_validate_private_birth_date on public.private_profiles;
create trigger zuno_validate_private_birth_date
before insert or update of birth_date on public.private_profiles
for each row execute function public.zuno_validate_private_birth_date();

-- A user may opt into map visibility only after accepting the location terms.
create or replace function public.set_my_map_visibility(p_visible boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_terms_accepted boolean := false;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select coalesce(location_terms_accepted, false)
    into v_terms_accepted
    from public.profiles
   where id = v_user_id;

  if p_visible and not coalesce(v_terms_accepted, false) then
    raise exception 'Location terms must be accepted before enabling map visibility';
  end if;

  if p_visible then
    insert into public.user_map_locations(user_id, map_visible)
    values (v_user_id, true)
    on conflict (user_id) do update set map_visible = true;
  else
    update public.user_map_locations
       set map_visible = false,
           latitude = case
             when exists (
               select 1 from public.profiles p
               where p.id = v_user_id and p.show_distance = true
             ) then latitude else null end,
           longitude = case
             when exists (
               select 1 from public.profiles p
               where p.id = v_user_id and p.show_distance = true
             ) then longitude else null end,
           updated_at = case
             when exists (
               select 1 from public.profiles p
               where p.id = v_user_id and p.show_distance = true
             ) then updated_at else null end
     where user_id = v_user_id;
  end if;
end;
$$;

-- Discovery only returns profiles with a valid adult birth date.
-- Exact birth dates remain private; the RPC returns only IDs, coarse distance,
-- and activity state needed by the discovery interface.
create or replace function public.get_discovery_profile_ids(
  p_age_min integer default null,
  p_age_max integer default null,
  p_distance_km integer default null,
  p_online_recently boolean default false
)
returns table (
  user_id uuid,
  approximate_distance_km numeric,
  online_recently boolean,
  activity_status text
)
language sql
stable
security definer
set search_path = ''
as $function$
  with my_location as (
    select l.latitude, l.longitude
    from public.user_map_locations l
    join public.profiles mine on mine.id = l.user_id
    where l.user_id = auth.uid()
      and mine.location_terms_accepted = true
      and mine.show_distance = true
      and l.latitude is not null
      and l.longitude is not null
      and l.updated_at > now() - interval '24 hours'
  ),
  candidate_distance as (
    select l.user_id,
      6371.0 * 2.0 * asin(sqrt(least(1.0,greatest(0.0,
        power(sin(radians(l.latitude - m.latitude) / 2.0), 2)
        + cos(radians(m.latitude)) * cos(radians(l.latitude))
        * power(sin(radians(l.longitude - m.longitude) / 2.0), 2)
      )))) as distance_km
    from public.user_map_locations l
    join public.profiles candidate on candidate.id = l.user_id
    cross join my_location m
    where l.user_id <> auth.uid()
      and candidate.location_terms_accepted = true
      and candidate.show_distance = true
      and l.latitude is not null
      and l.longitude is not null
      and l.updated_at > now() - interval '24 hours'
  ),
  candidate_locations as (
    select user_id, round(distance_km::numeric, 3) as distance_value
    from candidate_distance
  )
  select
    p.id,
    cl.distance_value,
    (p.show_online = true and p.last_seen_at >= now() - interval '15 minutes') as online_recently,
    case
      when p.show_online is not true then null
      when p.last_seen_at is null then 'offline'
      when p.last_seen_at >= now() - interval '2 minutes' then 'active'
      when p.last_seen_at >= now() - interval '15 minutes' then 'recent'
      else 'offline'
    end as activity_status
  from public.profiles p
  join public.private_profiles pp on pp.user_id = p.id
  left join candidate_locations cl on cl.user_id = p.id
  where p.id <> auth.uid()
    and pp.birth_date is not null
    and pp.birth_date <= (current_date - interval '18 years')::date
    and not public.zuno_is_blocked_between(auth.uid(), p.id)
    and (p_age_min is null or extract(year from age(current_date, pp.birth_date))::integer >= greatest(18,p_age_min))
    and (p_age_max is null or extract(year from age(current_date, pp.birth_date))::integer <= least(99,p_age_max))
    and (p_distance_km is null or (cl.distance_value is not null and cl.distance_value <= greatest(1,least(500,p_distance_km))))
    and (coalesce(p_online_recently,false) = false or (p.show_online = true and p.last_seen_at >= now() - interval '15 minutes'))
  order by p.created_at desc;
$function$;

-- Only users who explicitly enabled map visibility are returned.
-- Coordinates are rounded before they leave the database.
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
    select l.latitude, l.longitude
    from public.user_map_locations l
    join public.profiles mine on mine.id = l.user_id
    join public.private_profiles mine_private on mine_private.user_id = mine.id
    where l.user_id = auth.uid()
      and mine.location_terms_accepted = true
      and mine_private.birth_date <= (current_date - interval '18 years')::date
      and l.latitude is not null
      and l.longitude is not null
      and l.updated_at > now() - interval '24 hours'
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
      and p.location_terms_accepted = true
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

revoke all on function public.set_my_map_visibility(boolean) from public, anon;
revoke all on function public.get_discovery_profile_ids(integer, integer, integer, boolean) from public, anon;
revoke all on function public.get_nearby_map_users(integer) from public, anon;
grant execute on function public.set_my_map_visibility(boolean) to authenticated;
grant execute on function public.get_discovery_profile_ids(integer, integer, integer, boolean) to authenticated;
grant execute on function public.get_nearby_map_users(integer) to authenticated;
