-- Allow admins to set a fictional map point for each active ZUNO bot.
alter table public.zuno_bots
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.zuno_bots
  drop constraint if exists zuno_bots_location_coordinates_check;
alter table public.zuno_bots
  add constraint zuno_bots_location_coordinates_check
  check (
    (latitude is null and longitude is null)
    or
    (latitude is not null and longitude is not null and latitude between -90 and 90 and longitude between -180 and 180)
  );

create or replace function public.admin_set_bot_location(
  p_bot_id uuid,
  p_latitude double precision,
  p_longitude double precision
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.zuno_is_admin() then
    raise exception 'Admin access required';
  end if;

  if (p_latitude is null) <> (p_longitude is null) then
    raise exception 'Latitude and longitude must both be supplied or both be null';
  end if;

  if p_latitude is not null and (
    p_latitude < -90 or p_latitude > 90
    or p_longitude < -180 or p_longitude > 180
  ) then
    raise exception 'Invalid map coordinates';
  end if;

  update public.zuno_bots
  set latitude = p_latitude,
      longitude = p_longitude,
      updated_at = now()
  where id = p_bot_id;

  if not found then
    raise exception 'Bot not found';
  end if;
end;
$$;

revoke all on function public.admin_set_bot_location(uuid,double precision,double precision) from public, anon, authenticated;
grant execute on function public.admin_set_bot_location(uuid,double precision,double precision) to authenticated;
