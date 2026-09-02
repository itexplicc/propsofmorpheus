create table public.explic_radio_chat_messages (
  id uuid primary key default gen_random_uuid(),
  listener_key text not null
    check (listener_key ~ '^[a-zA-Z0-9_-]{16,80}$'),
  nickname text not null
    check (char_length(nickname) between 1 and 24),
  message text not null
    check (char_length(message) between 1 and 200),
  created_at timestamptz not null default now()
);

create index explic_radio_chat_created_at_idx
  on public.explic_radio_chat_messages (created_at desc);

create index explic_radio_chat_listener_created_at_idx
  on public.explic_radio_chat_messages (listener_key, created_at desc);

alter table public.explic_radio_chat_messages enable row level security;

revoke all on public.explic_radio_chat_messages from anon, authenticated;
grant select on public.explic_radio_chat_messages to anon, authenticated;
grant select, insert, delete on public.explic_radio_chat_messages to service_role;

create policy "radio chat is publicly readable"
  on public.explic_radio_chat_messages
  for select
  to anon, authenticated
  using (true);

alter publication supabase_realtime
  add table public.explic_radio_chat_messages;

comment on table public.explic_radio_chat_messages is
  'Short anonymous listener messages for the XPLC Radio room. Inserts and cleanup are server-controlled.';
