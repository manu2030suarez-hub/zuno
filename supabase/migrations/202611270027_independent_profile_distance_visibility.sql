-- ZUNO: profile distance visibility is independent from appearing on the map.
-- Exact coordinates remain private in user_map_locations and are only used inside SECURITY DEFINER RPCs.

create or replace function public.update_my_map_location(p_latitude double precision, p_longitude double precision)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_terms_accepted boolean;
  v_show_distance boolean;
  v_map_visible boolean := false;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_latitude is null or p_longitude is null
     or p_latitude < -90 or p_latitude > 90
     or p_longitude < -180 or p_longitude > 180 then
    raise exception 'Invalid coordinates';
  end if;

  select coalesce(location_terms_accepted, false), coalesce(show_distance, false)
    into v_terms_accepted, v_show_distance
    from public.profiles where id = v_user_id;

  if not coalesce(v_terms_accepted, false) then
    raise exception 'Location terms must be accepted';
  end if;

  select coalesce(map_visible, false) into v_map_visible
    from public.user_map_locations where user_id = v_user_id;

  if not coalesce(v_show_distance, false) and not coalesce(v_map_visible, false) then
    raise exception 'Enable profile distance or map visibility before sharing location';
  end if;

  insert into public.user_map_locations(user_id, latitude, longitude, map_visible, updated_at)
  values (v_user_id, p_latitude, p_longitude, false, now())
  on conflict (user_id) do update
    set latitude = excluded.latitude,
        longitude = excluded.longitude,
        updated_at = now();
end;
$$;

create or replace function public.set_my_map_visibility(p_visible boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_show_distance boolean := false;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select coalesce(show_distance, false) into v_show_distance
    from public.profiles where id = v_user_id;

  if p_visible then
    insert into public.user_map_locations(user_id, map_visible)
    values (v_user_id, true)
    on conflict (user_id) do update set map_visible = true;
  else
    update public.user_map_locations
       set map_visible = false,
           latitude = case when v_show_distance then latitude else null end,
           longitude = case when v_show_distance then longitude else null end,
           updated_at = case when v_show_distance then updated_at else null end
     where user_id = v_user_id;
  end if;
end;
$$;

drop function if exists public.get_discovery_profile_ids(integer, integer, integer, boolean);

create function public.get_discovery_profile_ids(
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
  left join public.private_profiles pp on pp.user_id = p.id
  left join candidate_locations cl on cl.user_id = p.id
  where p.id <> auth.uid()
    and not public.zuno_is_blocked_between(auth.uid(), p.id)
    and (p_age_min is null or extract(year from age(current_date, pp.birth_date))::integer >= greatest(18,p_age_min))
    and (p_age_max is null or extract(year from age(current_date, pp.birth_date))::integer <= least(99,p_age_max))
    and (p_distance_km is null or (cl.distance_value is not null and cl.distance_value <= greatest(1,least(500,p_distance_km))))
    and (coalesce(p_online_recently,false) = false or (p.show_online = true and p.last_seen_at >= now() - interval '15 minutes'))
  order by p.created_at desc;
$function$;

revoke all on function public.update_my_map_location(double precision, double precision) from public, anon;
revoke all on function public.set_my_map_visibility(boolean) from public, anon;
revoke all on function public.get_discovery_profile_ids(integer, integer, integer, boolean) from public, anon;
grant execute on function public.update_my_map_location(double precision, double precision) to authenticated;
grant execute on function public.set_my_map_visibility(boolean) to authenticated;
grant execute on function public.get_discovery_profile_ids(integer, integer, integer, boolean) to authenticated;
