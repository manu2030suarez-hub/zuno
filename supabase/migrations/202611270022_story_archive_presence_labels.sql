-- ZUNO: private story archive and privacy-safe discovery presence labels.
alter table public.stories
  add column if not exists archived_at timestamptz;

grant update (archived_at) on public.stories to authenticated;

drop policy if exists "Authenticated users can view active unblocked stories" on public.stories;
create policy "Authenticated users can view active unblocked stories"
  on public.stories for select to authenticated
  using (
    (
      archived_at is null
      and expires_at > now()
      and not public.zuno_is_blocked_between(auth.uid(), user_id)
    )
    or (user_id = auth.uid() and archived_at is not null)
  );

drop policy if exists "Story owners can archive their own stories" on public.stories;
create policy "Story owners can archive their own stories"
  on public.stories for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can view active story media" on storage.objects;
create policy "Users can view active story media"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'zuno-stories'
    and exists (
      select 1 from public.stories s
      where s.media_path = name
        and (
          (s.archived_at is null and s.expires_at > now()
            and not public.zuno_is_blocked_between(auth.uid(), s.user_id))
          or (s.user_id = auth.uid() and s.archived_at is not null)
        )
    )
  );

drop function if exists public.get_discovery_profile_ids(integer, integer, integer, boolean);
create function public.get_discovery_profile_ids(
  p_age_min integer default null,
  p_age_max integer default null,
  p_distance_km integer default null,
  p_online_recently boolean default false
)
returns table (
  user_id uuid,
  approximate_distance_km integer,
  online_recently boolean,
  activity_status text
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
    select l.user_id,
      6371.0 * 2.0 * asin(sqrt(least(1.0,greatest(0.0,
        power(sin(radians(l.latitude - m.latitude) / 2.0), 2)
        + cos(radians(m.latitude)) * cos(radians(l.latitude))
        * power(sin(radians(l.longitude - m.longitude) / 2.0), 2)
      )))) as distance_km
    from public.user_map_locations l
    cross join my_location m
    where l.user_id <> auth.uid()
      and l.map_visible = true
      and l.latitude is not null
      and l.longitude is not null
      and l.updated_at > now() - interval '24 hours'
  ),
  candidate_locations as (
    select user_id, (round(distance_km / 5.0) * 5)::integer as distance_bucket
    from candidate_distance
  )
  select
    p.id,
    cl.distance_bucket,
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
    and (p_distance_km is null or (cl.distance_bucket is not null and cl.distance_bucket <= greatest(1,least(500,p_distance_km))))
    and (coalesce(p_online_recently,false) = false or (p.show_online = true and p.last_seen_at >= now() - interval '15 minutes'))
  order by p.created_at desc;
$function$;

revoke all on function public.get_discovery_profile_ids(integer, integer, integer, boolean) from public, anon;
grant execute on function public.get_discovery_profile_ids(integer, integer, integer, boolean) to authenticated;
