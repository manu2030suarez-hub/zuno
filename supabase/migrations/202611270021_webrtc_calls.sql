-- ZUNO: signaling seguro para llamadas de voz y videollamadas WebRTC.
create table if not exists public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  caller_id uuid not null references public.profiles(id) on delete cascade,
  callee_id uuid not null references public.profiles(id) on delete cascade,
  call_type text not null check (call_type in ('audio','video')),
  status text not null default 'ringing' check (status in ('ringing','accepted','rejected','ended','missed')),
  offer jsonb not null,
  answer jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz,
  constraint call_sessions_distinct_members check (caller_id <> callee_id)
);

create index if not exists call_sessions_callee_status_idx
  on public.call_sessions (callee_id, status, created_at desc);
create index if not exists call_sessions_conversation_created_idx
  on public.call_sessions (conversation_id, created_at desc);
create unique index if not exists call_sessions_one_active_per_conversation
  on public.call_sessions (conversation_id)
  where status in ('ringing','accepted');

create table if not exists public.call_signals (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.call_sessions(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  signal_type text not null check (signal_type in ('ice')),
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists call_signals_call_created_idx
  on public.call_signals (call_id, created_at);

alter table public.call_sessions enable row level security;
alter table public.call_signals enable row level security;

drop policy if exists "Call participants can view sessions" on public.call_sessions;
create policy "Call participants can view sessions"
  on public.call_sessions for select to authenticated
  using (auth.uid() = caller_id or auth.uid() = callee_id);

drop policy if exists "Conversation members can start calls" on public.call_sessions;
create policy "Conversation members can start calls"
  on public.call_sessions for insert to authenticated
  with check (
    auth.uid() = caller_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.member_one, c.member_two)
        and callee_id in (c.member_one, c.member_two)
        and callee_id <> auth.uid()
    )
  );

drop policy if exists "Call participants can update sessions" on public.call_sessions;
create policy "Call participants can update sessions"
  on public.call_sessions for update to authenticated
  using (auth.uid() = caller_id or auth.uid() = callee_id)
  with check (auth.uid() = caller_id or auth.uid() = callee_id);

drop policy if exists "Call participants can view ICE signals" on public.call_signals;
create policy "Call participants can view ICE signals"
  on public.call_signals for select to authenticated
  using (exists (
    select 1 from public.call_sessions s
    where s.id = call_id and auth.uid() in (s.caller_id, s.callee_id)
  ));

drop policy if exists "Call participants can send ICE signals" on public.call_signals;
create policy "Call participants can send ICE signals"
  on public.call_signals for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.call_sessions s
      where s.id = call_id and auth.uid() in (s.caller_id, s.callee_id)
    )
  );

grant select, insert on public.call_sessions to authenticated;
grant update (status, answer, updated_at, answered_at, ended_at) on public.call_sessions to authenticated;
grant select, insert on public.call_signals to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'call_sessions'
  ) then
    alter publication supabase_realtime add table public.call_sessions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'call_signals'
  ) then
    alter publication supabase_realtime add table public.call_signals;
  end if;
end $$;
