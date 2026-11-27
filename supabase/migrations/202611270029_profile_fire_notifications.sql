-- ZUNO: profile fire reactions notify the profile owner.
create or replace function public.zuno_notify_favorite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.zuno_create_activity_notification(
    new.favorite_user_id, new.user_id, 'favorite', null,
    'Te dio fuego 🔥', 'Alguien reaccionó a tu perfil con fuego'
  );
  return new;
end;
$$;

revoke all on function public.zuno_notify_favorite() from public, anon, authenticated;
