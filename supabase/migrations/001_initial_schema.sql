-- ============================================================
-- Georgian Domino — Supabase Schema
-- Migration: 001_initial_schema.sql
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- ROOMS
-- ============================================================
create table public.rooms (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,           -- 6-char join code e.g. "კარი42"
  host_id     uuid not null,                  -- references auth.users
  status      text not null default 'waiting' -- waiting | playing | finished
                check (status in ('waiting','playing','finished')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- PLAYERS IN ROOM
-- ============================================================
create table public.room_players (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms(id) on delete cascade,
  user_id     uuid not null,
  nickname    text not null,
  seat        int not null check (seat between 0 and 3),  -- 0,1,2,3 clockwise
  team        int not null check (team in (0, 1)),         -- 0 = team A, 1 = team B
  is_online   boolean not null default true,
  joined_at   timestamptz not null default now(),
  unique(room_id, user_id),
  unique(room_id, seat)
);

-- Seats 0,2 = Team 0 (facing each other); Seats 1,3 = Team 1

-- ============================================================
-- GAME STATE  (one row per round)
-- ============================================================
create table public.game_states (
  id              uuid primary key default gen_random_uuid(),
  room_id         uuid not null references public.rooms(id) on delete cascade,
  round_number    int not null default 1,
  status          text not null default 'active'
                    check (status in ('active','blocked','finished')),
  -- Tile assignments (JSON arrays per seat)
  hands           jsonb not null,   -- { "0": [[6,6],[5,3],...], "1": [...], ... }
  boneyard        jsonb not null,   -- remaining tiles not dealt (empty in 4-player)
  -- Board state
  chain           jsonb not null default '[]', -- ordered array of placed tiles
  left_end        int,              -- current left pip value
  right_end       int,              -- current right pip value
  -- Turn management
  current_seat    int not null,     -- whose turn (0-3)
  pass_count      int not null default 0, -- consecutive passes = blocked
  -- Scores this round
  round_scores    jsonb not null default '{"0":0,"1":0}',
  -- Who goes first
  first_seat      int not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- MOVES  (append-only game log)
-- ============================================================
create table public.moves (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms(id) on delete cascade,
  round_id    uuid not null references public.game_states(id) on delete cascade,
  seat        int not null,
  move_type   text not null check (move_type in ('place','pass')),
  tile        int[2],               -- [high, low] e.g. [6,3]
  side        text check (side in ('left','right','first')),
  created_at  timestamptz not null default now()
);

-- ============================================================
-- SCORE HISTORY  (one row per completed round)
-- ============================================================
create table public.score_history (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid not null references public.rooms(id) on delete cascade,
  round_number  int not null,
  team0_delta   int not null,
  team1_delta   int not null,
  team0_total   int not null,
  team1_total   int not null,
  finish_reason text not null check (finish_reason in ('domino','blocked','mshrali')),
  winner_team   int check (winner_team in (0,1)),
  created_at    timestamptz not null default now()
);

-- ============================================================
-- CHAT / REACTIONS
-- ============================================================
create table public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms(id) on delete cascade,
  user_id     uuid not null,
  nickname    text not null,
  message     text,
  reaction    text,               -- emoji shortcode or null
  created_at  timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index on public.rooms(code);
create index on public.room_players(room_id);
create index on public.game_states(room_id, round_number desc);
create index on public.moves(round_id, created_at);
create index on public.score_history(room_id, round_number);
create index on public.chat_messages(room_id, created_at desc);

-- ============================================================
-- REALTIME  — enable for these tables
-- ============================================================
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;
alter publication supabase_realtime add table public.game_states;
alter publication supabase_realtime add table public.moves;
alter publication supabase_realtime add table public.chat_messages;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.rooms           enable row level security;
alter table public.room_players    enable row level security;
alter table public.game_states     enable row level security;
alter table public.moves           enable row level security;
alter table public.score_history   enable row level security;
alter table public.chat_messages   enable row level security;

-- Everyone can read rooms (to join by code)
create policy "read rooms" on public.rooms for select using (true);
create policy "create rooms" on public.rooms for insert with check (true);
create policy "update own room" on public.rooms for update using (true);

-- Everyone can read/write room players
create policy "read players" on public.room_players for select using (true);
create policy "join room" on public.room_players for insert with check (true);
create policy "update player" on public.room_players for update using (true);

-- Game state readable by all in room
create policy "read game" on public.game_states for select using (true);
create policy "write game" on public.game_states for all using (true);

-- Moves readable by all
create policy "read moves" on public.moves for select using (true);
create policy "write moves" on public.moves for insert with check (true);

-- Scores readable by all
create policy "read scores" on public.score_history for select using (true);
create policy "write scores" on public.score_history for all using (true);

-- Chat
create policy "read chat" on public.chat_messages for select using (true);
create policy "write chat" on public.chat_messages for insert with check (true);
