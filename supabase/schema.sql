-- ============================================================
-- MIJN SYSTEEM — Supabase Schema (zonder taken)
-- Voer dit uit in de Supabase SQL Editor van je nieuwe project
-- ============================================================

-- ── SKILL TREE DOMAINS ────────────────────────────────────────
create table if not exists st_domains (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text default '#55a86e',
  sort_order int default 0
);
alter table st_domains enable row level security;
create policy "Users manage own st_domains" on st_domains
  for all using (auth.uid() = user_id);

-- ── SKILL TREE PROJECTS ───────────────────────────────────────
create table if not exists st_projects (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  domain_id text references st_domains(id) on delete cascade,
  name text not null,
  color text default '#6bcf85',
  description text default ''
);
alter table st_projects enable row level security;
create policy "Users manage own st_projects" on st_projects
  for all using (auth.uid() = user_id);

-- ── SKILL TREE NODES ──────────────────────────────────────────
create table if not exists st_nodes (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id text,
  title text not null default '',
  description text default '',
  achieve_desc text default '',
  status text default 'locked',
  parent_id text default null,
  x float default 0,
  y float default 0,
  is_root boolean default false,
  d_target text default null,
  d_hard text default null,
  refl jsonb default '{"wellDone":"","obstacles":""}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table st_nodes enable row level security;
create policy "Users manage own st_nodes" on st_nodes
  for all using (auth.uid() = user_id);

-- ── LABEL POSITIONS ───────────────────────────────────────────
create table if not exists st_label_positions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  positions jsonb default '{}'
);
alter table st_label_positions enable row level security;
create policy "Users manage own label positions" on st_label_positions
  for all using (auth.uid() = user_id);

-- ── HABIT TRACKER ─────────────────────────────────────────────
create table if not exists user_data (
  key text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  value jsonb default '{}',
  updated_at timestamptz default now(),
  primary key (user_id, key)
);
alter table user_data enable row level security;
create policy "Users manage own user_data" on user_data
  for all using (auth.uid() = user_id);

-- ── REALTIME ──────────────────────────────────────────────────
alter publication supabase_realtime add table st_nodes;
alter publication supabase_realtime add table st_domains;
alter publication supabase_realtime add table st_projects;
alter publication supabase_realtime add table user_data;
