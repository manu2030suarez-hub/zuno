-- ZUNO discovery privacy fix: return a boolean activity flag, not raw last_seen_at.
drop function if exists public.get_discovery_profile_ids(integer, integer, integer, boolean);

-- ZUNO discovery filters: private age matching, opt-in approximate distance, recent activity.
alter table public.profiles
  add column if not exists last_seen_at timestamptz;

grant update (last_seen_at) on public.profiles to authenticated;

create or replace function public.get_discovery_profile_ids(
  p_age_min integer default null,
  p_age_max integer default null,
  p_distance_km integer default null,
  p_online_recently boolean default false
)
returns table (
  user_id uuid,
  approximate_distance_km integer,
  online_recently boolean
)
language sql
stable
security definer
set search_path = ''
as $function$
  with my_location as (
    select latitude, longitude
    from public.user_map_locations
    where user_id = auth.uid()
      and map_visible = true
      and latitude is not null
      and longitude is not null
      and updated_at > now() - interval '24 hours'
  ),
  candidate_distance as (
    select
      l.user_id,
      6371.0 * 2.0 * asin(
        sqrt(
          least(
            1.0,
            greatest(
              0.0,
              power(sin(radians(l.latitude - m.latitude) / 2.0), 2)
              + cos(radians(m.latitude)) * cos(radians(l.latitude))
              * power(sin(radians(l.longitude - m.longitude) / 2.0), 2)
            )
          )
        )
      ) as distance_km
    from public.user_map_locations as l
    cross join my_location as m
    where l.user_id <> auth.uid()
      and l.map_visible = true
      and l.latitude is not null
      and l.longitude is not null
      and l.updated_at > now() - interval '24 hours'
  ),
  candidate_locations as (
    select
      user_id,
      (round(distance_km / 5.0) * 5)::integer as distance_bucket
    from candidate_distance
  )
  select
    p.id,
    cl.distance_bucket,
    (p.show_online = true and p.last_seen_at >= now() - interval '15 minutes') as online_recently
  from public.profiles as p
  left join public.private_profiles as pp on pp.user_id = p.id
  left join candidate_locations as cl on cl.user_id = p.id
  where p.id <> auth.uid()
    and not public.zuno_is_blocked_between(auth.uid(), p.id)
    and (
      p_age_min is null
      or extract(year from age(current_date, pp.birth_date))::integer >= greatest(18, p_age_min)
    )
    and (
      p_age_max is null
      or extract(year from age(current_date, pp.birth_date))::integer <= least(99, p_age_max)
    )
    and (
      p_distance_km is null
      or (
        cl.distance_bucket is not null
        and cl.distance_bucket <= greatest(1, least(500, p_distance_km))
      )
    )
    and (
      coalesce(p_online_recently, false) = false
      or (
        p.show_online = true
        and p.last_seen_at >= now() - interval '15 minutes'
      )
    )
  order by p.created_at desc;
$function$;

revoke all on function public.get_discovery_profile_ids(integer, integer, integer, boolean) from public, anon;
grant execute on function public.get_discovery_profile_ids(integer, integer, integer, boolean) to authenticated;
