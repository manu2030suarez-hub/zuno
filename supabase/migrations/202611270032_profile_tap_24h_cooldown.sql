-- Allow one tap per sender/recipient every 24 hours (not once forever).
alter table public.profile_taps
  drop constraint if exists profile_taps_once_per_pair;

create index if not exists profile_taps_sender_recipient_created_idx
  on public.profile_taps (user_id, tapped_user_id, created_at desc);

create or replace function public.zuno_enforce_profile_tap_cooldown()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || ':' || new.tapped_user_id::text, 0));

  if exists (
    select 1
    from public.profile_taps t
    where t.user_id = new.user_id
      and t.tapped_user_id = new.tapped_user_id
      and t.created_at > now() - interval '24 hours'
  ) then
    raise exception 'You can send another tap to this person after 24 hours.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.zuno_enforce_profile_tap_cooldown() from public, anon, authenticated;

drop trigger if exists zuno_profile_tap_cooldown on public.profile_taps;
create trigger zuno_profile_tap_cooldown
  before insert on public.profile_taps
  for each row execute function public.zuno_enforce_profile_tap_cooldown();
