-- ============================================================
-- Migration 001: Initial schema
-- ============================================================

-- Sessions must be created before hands (FK dependency)
create table sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  hands_played int not null,
  net_result_bb numeric not null,
  stakes text not null,
  vpip numeric,
  pfr numeric,
  aggression_factor numeric,
  created_at timestamptz default now()
);

-- Hand histories (parsed data)
create table hands (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  hand_id text not null,
  session_id uuid references sessions(id) on delete set null,
  game_type text not null,       -- 'HOLDEM', 'OMAHA'
  limit_type text not null,      -- 'NL', 'PL', 'FL'
  stakes text not null,          -- '$0.05/$0.10'
  table_size int not null,       -- 2, 6, 9
  position text not null,        -- 'BTN', 'SB', 'BB', 'UTG', etc.
  hole_cards text,               -- 'Ah Kd'
  board text,                    -- 'Js 7h 2c 8d Qh'
  actions jsonb not null,        -- [{street, action, amount}]
  result_bb numeric not null,    -- profit/loss in big blinds
  rake numeric default 0,
  is_all_in boolean default false,
  went_to_showdown boolean default false,
  won_at_showdown boolean default false,
  played_at timestamptz not null,
  created_at timestamptz default now(),
  unique(user_id, hand_id)
);

-- File uploads tracking
create table uploads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  filename text not null,
  file_size int not null,
  hands_parsed int default 0,
  status text default 'pending',   -- pending, processing, completed, failed
  error_message text,
  created_at timestamptz default now()
);

-- Cached aggregated stats per user
create table user_stats (
  user_id uuid references auth.users(id) on delete cascade primary key,
  total_hands int default 0,
  vpip numeric,
  pfr numeric,
  three_bet_pct numeric,
  aggression_factor numeric,
  cbet_pct numeric,
  fold_to_cbet_pct numeric,
  wtsd numeric,
  wsd numeric,
  bb_per_100 numeric,
  net_result_bb numeric,
  rake_paid_bb numeric,
  last_calculated_at timestamptz default now()
);

-- ============================================================
-- RLS
-- ============================================================

alter table hands enable row level security;
alter table sessions enable row level security;
alter table uploads enable row level security;
alter table user_stats enable row level security;

-- hands
create policy "Users can only see own hands"
  on hands for select using (auth.uid() = user_id);
create policy "Users can insert own hands"
  on hands for insert with check (auth.uid() = user_id);
create policy "Users can delete own hands"
  on hands for delete using (auth.uid() = user_id);

-- sessions
create policy "Users can only see own sessions"
  on sessions for select using (auth.uid() = user_id);
create policy "Users can insert own sessions"
  on sessions for insert with check (auth.uid() = user_id);
create policy "Users can delete own sessions"
  on sessions for delete using (auth.uid() = user_id);

-- uploads
create policy "Users can only see own uploads"
  on uploads for select using (auth.uid() = user_id);
create policy "Users can insert own uploads"
  on uploads for insert with check (auth.uid() = user_id);
create policy "Users can update own uploads"
  on uploads for update using (auth.uid() = user_id);

-- user_stats
create policy "Users can only see own stats"
  on user_stats for select using (auth.uid() = user_id);
create policy "Users can update own stats"
  on user_stats for update using (auth.uid() = user_id);
create policy "Users can insert own stats"
  on user_stats for insert with check (auth.uid() = user_id);
