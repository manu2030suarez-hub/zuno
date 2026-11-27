-- Chat privado de ZUNO: cualquier miembro puede iniciar una conversación.
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  member_one uuid not null references public.profiles(id) on delete cascade,
  member_two uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  constraint conversations_distinct_members check (member_one <> member_two),
  constraint conversations_ordered_members check (member_one < member_two),
  constraint conversations_unique_pair unique (member_one, member_two)
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_created_idx on public.messages (conversation_id, created_at);
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
drop policy if exists "Members can view their conversations" on public.conversations;
create policy "Members can view their conversations" on public.conversations for select to authenticated using (auth.uid() = member_one or auth.uid() = member_two);
drop policy if exists "Members can start conversations" on public.conversations;
create policy "Members can start conversations" on public.conversations for insert to authenticated with check ((auth.uid() = member_one or auth.uid() = member_two) and member_one < member_two);
drop policy if exists "Members can view messages in their conversations" on public.messages;
create policy "Members can view messages in their conversations" on public.messages for select to authenticated using (exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.member_one, c.member_two)));
drop policy if exists "Members can send messages in their conversations" on public.messages;
create policy "Members can send messages in their conversations" on public.messages for insert to authenticated with check (sender_id = auth.uid() and exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.member_one, c.member_two)));
drop policy if exists "Members can keep conversations current" on public.conversations;
create policy "Members can keep conversations current" on public.conversations for update to authenticated using (auth.uid() = member_one or auth.uid() = member_two) with check (auth.uid() = member_one or auth.uid() = member_two);
grant select, insert, update on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
drop policy if exists "Members can remove accepted connections" on public.connection_requests;
create policy "Members can remove accepted connections" on public.connection_requests for delete to authenticated using (status = 'accepted' and (auth.uid() = sender_id or auth.uid() = receiver_id));
grant delete on public.connection_requests to authenticated;
alter publication supabase_realtime add table public.messages;