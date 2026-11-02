-- Run once in Supabase: SQL Editor -> New query -> Run.
-- Also: Authentication -> URL Configuration -> add your GitHub Pages URL.
create table if not exists user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  decks jsonb not null default '[]',
  progress jsonb not null default '{}',
  updated_at timestamptz default now()
);

alter table user_data enable row level security;

create policy "own data select" on user_data for select using (auth.uid() = user_id);
create policy "own data insert" on user_data for insert with check (auth.uid() = user_id);
create policy "own data update" on user_data for update using (auth.uid() = user_id);
