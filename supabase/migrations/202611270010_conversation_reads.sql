-- ZUNO: seguimiento de mensajes leídos por usuario
create table if not exists public.conversation_reads (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_reads enable row level security;

drop policy if exists "Users can view their own conversation reads" on public.conversation_reads;
create policy "Users can view their own conversation reads"
on public.conversation_reads for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can create their own conversation reads" on public.conversation_reads;
create policy "Users can create their own conversation reads"
on public.conversation_reads for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and auth.uid() in (c.member_one, c.member_two)
  )
);

drop policy if exists "Users can update their own conversation reads" on public.conversation_reads;
create policy "Users can update their own conversation reads"
on public.conversation_reads for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and auth.uid() in (c.member_one, c.member_two)
  )
);

grant select, insert, update on public.conversation_reads to authenticated;
