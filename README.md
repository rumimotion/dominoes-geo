# დომინო — Georgian Multiplayer Domino

Soviet-Georgian neighborhood domino, online. 4 players, 2v2, ჩოთქი scoring, real-time via Supabase.

## Stack
- **Next.js 14** (App Router)
- **Supabase** (Postgres + Realtime + Auth)
- **Vercel** (deployment)
- **TypeScript**

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/dominoes-geo
cd dominoes-geo
npm install
cp .env.local.example .env.local
# Fill in Supabase keys
npm run dev
```

## Project Structure

```
src/
  app/                    # Next.js App Router pages
    page.tsx              # Home / lobby
    room/[code]/page.tsx  # Game room
    api/                  # API routes
  components/
    game/                 # DominoTile, GameBoard, PlayerHand, ScoreBoard
    ui/                   # Button, Modal, Input (Georgian-styled)
    layout/               # Header, RoomLayout
  lib/
    game/                 # Pure game logic (no React)
      engine.ts           # Core rules, move validation, scoring
      tiles.ts            # Tile generation, shuffle
      scoring.ts          # ჩოთქი score system
    supabase/
      client.ts           # Browser client
      server.ts           # Server client
      realtime.ts         # Room subscription helpers
  hooks/
    useRoom.ts            # Room state + realtime sync
    useGame.ts            # Game state machine
    useHand.ts            # Local hand management
  types/
    game.ts               # All TypeScript types
supabase/
  migrations/             # SQL migrations
```

## Supabase Setup

1. Create project at supabase.com
2. Run migrations in `supabase/migrations/` in order
3. Enable Realtime on `rooms`, `game_states`, `moves` tables
4. Copy `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `.env.local`

## Georgian Domino Rules

- 28 tiles, 4 players, 2v2
- Each player gets 7 tiles
- Highest double leads first round; winner leads subsequent rounds
- Play extends the line (left or right end)
- If **blocked (თევზი)**: all players count their pip total; lowest team scores the difference
- **მშრალი წაგება**: if losing team never reached 200 points
- First team to **355 points** wins

## Deployment

```bash
vercel --prod
```
Set env vars in Vercel dashboard.
