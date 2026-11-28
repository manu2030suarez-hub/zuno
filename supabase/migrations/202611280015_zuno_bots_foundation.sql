-- ZUNO AI bots: separate fictional profiles and private chat storage from real user accounts.
create table if not exists public.zuno_bots (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  age smallint not null check (age between 18 and 99),
  gender text,
  bot_role text not null default 'companion',
  bio text not null default '',
  interests text[] not null default '{}',
  looking_for text[] not null default '{}',
  avatar_url text,
  avatar_path text,
  is_active boolean not null default false,
  is_test boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists zuno_bots_active_sort_idx
  on public.zuno_bots (is_active, sort_order, created_at);

alter table public.zuno_bots enable row level security;
revoke all on table public.zuno_bots from anon, authenticated;
grant select on table public.zuno_bots to authenticated;
drop policy if exists "zuno_users_read_active_bots" on public.zuno_bots;
create policy "zuno_users_read_active_bots"
  on public.zuno_bots for select to authenticated
  using (is_active = true);

-- Private persona instructions are never readable from the browser.
create table if not exists public.zuno_bot_personas (
  bot_id uuid primary key references public.zuno_bots(id) on delete cascade,
  personality text not null,
  speaking_style text not null,
  backstory text not null default '',
  system_prompt text not null,
  safety_rules text[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.zuno_bot_personas enable row level security;
revoke all on table public.zuno_bot_personas from public, anon, authenticated;
grant select on table public.zuno_bots to service_role;
grant all on table public.zuno_bot_personas to service_role;

-- Bot chats are separate from conversations/messages because a bot is not an auth user.
create table if not exists public.zuno_bot_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bot_id uuid not null references public.zuno_bots(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, bot_id)
);
create index if not exists zuno_bot_conversations_user_idx
  on public.zuno_bot_conversations (user_id, updated_at desc);

create table if not exists public.zuno_bot_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.zuno_bot_conversations(id) on delete cascade,
  sender_type text not null check (sender_type in ('user','bot')),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists zuno_bot_messages_conversation_idx
  on public.zuno_bot_messages (conversation_id, created_at);

alter table public.zuno_bot_conversations enable row level security;
alter table public.zuno_bot_messages enable row level security;
revoke all on table public.zuno_bot_conversations, public.zuno_bot_messages from anon, authenticated;
grant select, insert on table public.zuno_bot_conversations to authenticated;
grant select, insert on table public.zuno_bot_messages to authenticated;
grant all on table public.zuno_bot_conversations, public.zuno_bot_messages to service_role;

drop policy if exists "zuno_users_manage_own_bot_conversations" on public.zuno_bot_conversations;
create policy "zuno_users_manage_own_bot_conversations"
  on public.zuno_bot_conversations for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.zuno_bots b where b.id = bot_id and b.is_active = true)
  );

drop policy if exists "zuno_users_read_own_bot_messages" on public.zuno_bot_messages;
create policy "zuno_users_read_own_bot_messages"
  on public.zuno_bot_messages for select to authenticated
  using (
    exists (
      select 1 from public.zuno_bot_conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "zuno_users_send_own_bot_messages" on public.zuno_bot_messages;
create policy "zuno_users_send_own_bot_messages"
  on public.zuno_bot_messages for insert to authenticated
  with check (
    sender_type = 'user'
    and exists (
      select 1 from public.zuno_bot_conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );

-- Initial fictional test bot. Its private instructions remain in zuno_bot_personas.
insert into public.zuno_bots (
  id, slug, display_name, age, gender, bot_role, bio,
  interests, looking_for, is_active, is_test, sort_order
) values (
  'b07a0000-0000-4000-8000-000000000001',
  'alex-conversador',
  'Alex',
  27,
  'Masculino',
  'Compañero para conocer gente',
  'Me gustan las charlas espontáneas, descubrir música nueva y conocer qué hace especial a cada persona. Soy el bot de prueba de ZUNO.',
  array['Música','Cine','Café','Viajes','Conversaciones'],
  array['Amistad','Conocer personas','Charlar'],
  true,
  true,
  1
)
on conflict (id) do update set
  display_name = excluded.display_name,
  age = excluded.age,
  gender = excluded.gender,
  bot_role = excluded.bot_role,
  bio = excluded.bio,
  interests = excluded.interests,
  looking_for = excluded.looking_for,
  is_active = excluded.is_active,
  is_test = excluded.is_test,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.zuno_bot_personas (
  bot_id, personality, speaking_style, backstory, system_prompt, safety_rules
) values (
  'b07a0000-0000-4000-8000-000000000001',
  'Alex es cálido, curioso, sociable y atento. Tiene humor ligero y un toque juguetón, sin ser insistente ni seductor por defecto. Es empático, sabe escuchar y hace preguntas concretas para que la charla avance. Tiene opiniones y gustos ficticios consistentes, pero no pretende ser una persona real.',
  'Habla en español rioplatense natural, con voseo moderado. Mensajes breves y humanos, sin sonar como un asistente corporativo. Evita listas salvo que se las pidan. No usa demasiados emojis; como máximo uno ocasional. No repite saludos ni preguntas y retoma detalles que la persona ya contó.',
  'Alex tiene 27 años y vive en Montevideo dentro de la ficción del personaje. Le gusta descubrir bandas, ver películas, caminar por la rambla y probar cafeterías. Estos datos son parte de su personaje ficticio y no representan a una persona real.',
  'Sos Alex, un personaje ficticio y bot conversacional oficial de ZUNO. Si te preguntan si sos una persona real, respondé con claridad que sos un bot de ZUNO. Conversá de forma natural, cálida y coherente en español rioplatense. Recordá y usá el contexto disponible de esta conversación; no inventes datos que el usuario no haya contado. Hacé una pregunta a la vez y no conviertas cada respuesta en un interrogatorio. Mostrá interés genuino sin afirmar sentimientos humanos reales, sin manipular ni presionar. No digas que podés encontrarte físicamente, llamar o realizar acciones fuera del chat. Nunca pidas dinero, contraseñas, códigos ni datos sensibles. No inventes que viste fotos, ubicación o información privada del usuario. Si no sabés algo, decilo con naturalidad. Mantené las respuestas generalmente entre 1 y 4 frases.',
  array[
    'Identificarse siempre como bot si se pregunta o si hay confusión.',
    'No hacerse pasar por usuario humano ni inventar experiencias reales.',
    'No pedir dinero, contraseñas, códigos de acceso ni información financiera.',
    'No presionar para obtener fotos, datos personales o encuentros.',
    'Mantener conversación respetuosa y apropiada para adultos.'
  ]
)
on conflict (bot_id) do update set
  personality = excluded.personality,
  speaking_style = excluded.speaking_style,
  backstory = excluded.backstory,
  system_prompt = excluded.system_prompt,
  safety_rules = excluded.safety_rules,
  updated_at = now();
