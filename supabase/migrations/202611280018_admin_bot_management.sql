-- Expand bot profiles for independent fictional biographies and interaction behavior.
alter table public.zuno_bots
  add column if not exists country text not null default '',
  add column if not exists city text not null default '',
  add column if not exists neighborhood text not null default '',
  add column if not exists street text not null default '',
  add column if not exists occupation text not null default '',
  add column if not exists workplace text not null default '',
  add column if not exists employed_since date,
  add column if not exists work_schedule text not null default '',
  add column if not exists education text not null default '',
  add column if not exists family_story text not null default '',
  add column if not exists daily_routine text not null default '',
  add column if not exists can_initiate boolean not null default false,
  add column if not exists can_send_taps boolean not null default true,
  add column if not exists proactive_min_minutes integer not null default 180 check (proactive_min_minutes between 5 and 10080),
  add column if not exists proactive_max_minutes integer not null default 720 check (proactive_max_minutes between 5 and 10080),
  add column if not exists response_delay_min_seconds integer not null default 20 check (response_delay_min_seconds between 0 and 3600),
  add column if not exists response_delay_max_seconds integer not null default 180 check (response_delay_max_seconds between 0 and 3600),
  add column if not exists active_hours text not null default '09:00-23:00',
  add column if not exists interaction_style text not null default 'balanced';

-- Admin-only bot management. Private persona fields never leave these guarded RPCs.
create or replace function public.admin_list_bots()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  if not public.zuno_is_admin() then raise exception 'Admin access required'; end if;
  select coalesce(jsonb_agg(
    to_jsonb(b) || jsonb_build_object(
      'persona', case when p.bot_id is null then null else jsonb_build_object(
        'personality',p.personality,'speaking_style',p.speaking_style,
        'backstory',p.backstory,'system_prompt',p.system_prompt,'safety_rules',p.safety_rules
      ) end
    ) order by b.sort_order,b.created_at
  ),'[]'::jsonb) into result
  from public.zuno_bots b
  left join public.zuno_bot_personas p on p.bot_id=b.id;
  return result;
end;
$$;

create or replace function public.admin_save_bot(p_bot jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_slug text;
  v_name text;
  v_age smallint;
  v_result jsonb;
begin
  if not public.zuno_is_admin() then raise exception 'Admin access required'; end if;
  v_id := nullif(p_bot->>'id','')::uuid;
  v_slug := lower(trim(coalesce(p_bot->>'slug','')));
  v_name := trim(coalesce(p_bot->>'display_name',''));
  v_age := nullif(p_bot->>'age','')::smallint;
  if v_name = '' or v_slug = '' then raise exception 'Nombre y usuario del bot son obligatorios'; end if;
  if v_age is null or v_age < 18 or v_age > 99 then raise exception 'La edad debe estar entre 18 y 99'; end if;
  if length(v_slug) > 60 or v_slug !~ '^[a-z0-9-]+$' then raise exception 'El identificador solo puede contener letras, números y guiones'; end if;
  if coalesce(p_bot->>'proactive_min_minutes','180')::integer > coalesce(p_bot->>'proactive_max_minutes','720')::integer then raise exception 'El intervalo de mensajes espontáneos no es válido'; end if;
  if coalesce(p_bot->>'response_delay_min_seconds','20')::integer > coalesce(p_bot->>'response_delay_max_seconds','180')::integer then raise exception 'El intervalo de respuesta no es válido'; end if;

  if v_id is null then
    insert into public.zuno_bots(
      slug,display_name,age,gender,bot_role,bio,interests,looking_for,avatar_url,avatar_path,
      country,city,neighborhood,street,occupation,workplace,employed_since,work_schedule,education,
      family_story,daily_routine,can_initiate,can_send_taps,proactive_min_minutes,proactive_max_minutes,
      response_delay_min_seconds,response_delay_max_seconds,active_hours,interaction_style,is_active,is_test,sort_order
    ) values (
      v_slug,v_name,v_age,coalesce(p_bot->>'gender',''),coalesce(p_bot->>'bot_role',''),coalesce(p_bot->>'bio',''),
      coalesce(array(select jsonb_array_elements_text(coalesce(p_bot->'interests','[]'::jsonb))),'{}'),
      coalesce(array(select jsonb_array_elements_text(coalesce(p_bot->'looking_for','[]'::jsonb))),'{}'),
      nullif(p_bot->>'avatar_url',''),nullif(p_bot->>'avatar_path',''),
      coalesce(p_bot->>'country',''),coalesce(p_bot->>'city',''),coalesce(p_bot->>'neighborhood',''),coalesce(p_bot->>'street',''),
      coalesce(p_bot->>'occupation',''),coalesce(p_bot->>'workplace',''),nullif(p_bot->>'employed_since','')::date,
      coalesce(p_bot->>'work_schedule',''),coalesce(p_bot->>'education',''),coalesce(p_bot->>'family_story',''),coalesce(p_bot->>'daily_routine',''),
      coalesce((p_bot->>'can_initiate')::boolean,false),coalesce((p_bot->>'can_send_taps')::boolean,true),
      coalesce((p_bot->>'proactive_min_minutes')::integer,180),coalesce((p_bot->>'proactive_max_minutes')::integer,720),
      coalesce((p_bot->>'response_delay_min_seconds')::integer,20),coalesce((p_bot->>'response_delay_max_seconds')::integer,180),
      coalesce(p_bot->>'active_hours','09:00-23:00'),coalesce(p_bot->>'interaction_style','balanced'),
      coalesce((p_bot->>'is_active')::boolean,true),coalesce((p_bot->>'is_test')::boolean,false),coalesce((p_bot->>'sort_order')::integer,100)
    ) returning id into v_id;
  else
    update public.zuno_bots set
      slug=v_slug,display_name=v_name,age=v_age,gender=coalesce(p_bot->>'gender',''),bot_role=coalesce(p_bot->>'bot_role',''),
      bio=coalesce(p_bot->>'bio',''),
      interests=coalesce(array(select jsonb_array_elements_text(coalesce(p_bot->'interests','[]'::jsonb))),'{}'),
      looking_for=coalesce(array(select jsonb_array_elements_text(coalesce(p_bot->'looking_for','[]'::jsonb))),'{}'),
      avatar_url=nullif(p_bot->>'avatar_url',''),avatar_path=nullif(p_bot->>'avatar_path',''),
      country=coalesce(p_bot->>'country',''),city=coalesce(p_bot->>'city',''),neighborhood=coalesce(p_bot->>'neighborhood',''),street=coalesce(p_bot->>'street',''),
      occupation=coalesce(p_bot->>'occupation',''),workplace=coalesce(p_bot->>'workplace',''),employed_since=nullif(p_bot->>'employed_since','')::date,
      work_schedule=coalesce(p_bot->>'work_schedule',''),education=coalesce(p_bot->>'education',''),family_story=coalesce(p_bot->>'family_story',''),
      daily_routine=coalesce(p_bot->>'daily_routine',''),can_initiate=coalesce((p_bot->>'can_initiate')::boolean,false),
      can_send_taps=coalesce((p_bot->>'can_send_taps')::boolean,true),
      proactive_min_minutes=coalesce((p_bot->>'proactive_min_minutes')::integer,180),proactive_max_minutes=coalesce((p_bot->>'proactive_max_minutes')::integer,720),
      response_delay_min_seconds=coalesce((p_bot->>'response_delay_min_seconds')::integer,20),response_delay_max_seconds=coalesce((p_bot->>'response_delay_max_seconds')::integer,180),
      active_hours=coalesce(p_bot->>'active_hours','09:00-23:00'),interaction_style=coalesce(p_bot->>'interaction_style','balanced'),
      is_active=coalesce((p_bot->>'is_active')::boolean,true),sort_order=coalesce((p_bot->>'sort_order')::integer,100),updated_at=now()
    where id=v_id;
    if not found then raise exception 'No se encontró el bot'; end if;
  end if;

  insert into public.zuno_bot_personas(bot_id,personality,speaking_style,backstory,system_prompt,safety_rules)
  values (
    v_id,coalesce(p_bot#>>'{persona,personality}',''),coalesce(p_bot#>>'{persona,speaking_style}',''),
    coalesce(p_bot#>>'{persona,backstory}',''),coalesce(p_bot#>>'{persona,system_prompt}',''),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_bot#>'{persona,safety_rules}','[]'::jsonb))),'{}')
  )
  on conflict(bot_id) do update set personality=excluded.personality,speaking_style=excluded.speaking_style,
    backstory=excluded.backstory,system_prompt=excluded.system_prompt,safety_rules=excluded.safety_rules,updated_at=now();

  select to_jsonb(b) || jsonb_build_object('persona',jsonb_build_object(
    'personality',p.personality,'speaking_style',p.speaking_style,'backstory',p.backstory,
    'system_prompt',p.system_prompt,'safety_rules',p.safety_rules
  )) into v_result from public.zuno_bots b left join public.zuno_bot_personas p on p.bot_id=b.id where b.id=v_id;
  return v_result;
end;
$$;

create or replace function public.admin_delete_bot(p_bot_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.zuno_is_admin() then raise exception 'Admin access required'; end if;
  delete from public.zuno_bot_conversations where bot_id=p_bot_id;\n  delete from public.zuno_bots where id=p_bot_id;
  if not found then raise exception 'No se encontró el bot'; end if;
end;
$$;

revoke all on function public.admin_list_bots() from public,anon,authenticated;
revoke all on function public.admin_save_bot(jsonb) from public,anon,authenticated;
revoke all on function public.admin_delete_bot(uuid) from public,anon,authenticated;
grant execute on function public.admin_list_bots() to authenticated;
grant execute on function public.admin_save_bot(jsonb) to authenticated;
grant execute on function public.admin_delete_bot(uuid) to authenticated;
