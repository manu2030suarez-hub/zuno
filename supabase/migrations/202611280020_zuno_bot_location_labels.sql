-- Persist the approximate street/address selected for a ZUNO bot.
alter table public.zuno_bots
  add column if not exists location_label text;

drop function if exists public.admin_set_bot_location(uuid,double precision,double precision);

create function public.admin_set_bot_location(
  p_bot_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_location_label text default null
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
      location_label = case when p_latitude is null then null else nullif(left(trim(coalesce(p_location_label, '')), 240), '') end,
      updated_at = now()
  where id = p_bot_id;

  if not found then
    raise exception 'Bot not found';
  end if;
end;
$$;

revoke all on function public.admin_set_bot_location(uuid,double precision,double precision,text) from public, anon, authenticated;
grant execute on function public.admin_set_bot_location(uuid,double precision,double precision,text) to authenticated;
