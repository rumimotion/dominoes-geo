# 🚀 Deployment Guide — Georgian Domino

## Step 1: GitHub

```bash
# In the project directory
git init
git add .
git commit -m "feat: Georgian domino — initial commit"

# Create repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/dominoes-geo.git
git branch -M main
git push -u origin main
```

## Step 2: Supabase Setup

1. Go to **supabase.com** → New Project
2. Name: `dominoes-geo`, choose a region close to Georgia (e.g. EU West)
3. Wait for provisioning (~2 min)

### Run the migration

In the Supabase dashboard → **SQL Editor** → New query:
- Paste the contents of `supabase/migrations/001_initial_schema.sql`
- Click **Run**

### Enable Realtime

Go to **Database → Replication**:
- Toggle ON: `rooms`, `room_players`, `game_states`, `moves`, `chat_messages`

### Get your keys

Go to **Settings → API**:
- Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Step 3: Vercel Deployment

1. Go to **vercel.com** → New Project
2. Import your GitHub repo `dominoes-geo`
3. Framework: **Next.js** (auto-detected)
4. Add Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL    = https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
   ```
5. Click **Deploy** → Done! 🎉

Your app will be live at `https://dominoes-geo.vercel.app`

## Step 4: Custom Domain (Optional)

In Vercel → Settings → Domains → Add `domino.yourdomain.ge`

---

## Local Development

```bash
cp .env.local.example .env.local
# Fill in your Supabase keys
npm install
npm run dev
# Open http://localhost:3000
```

## Testing Multiplayer Locally

Open 4 different browser tabs (or use incognito):
1. Tab 1: Create room → copy the code
2. Tabs 2-4: Join room with the code
3. Tab 1 host: Click "თამაშის დაწყება"

## Architecture Notes

### Why no auth?
Anonymous user IDs stored in localStorage. Simple, no sign-up friction.
For production you'd want Supabase Auth (anonymous sessions).

### Realtime strategy
Supabase Postgres Changes subscription — all clients subscribe to their room's
tables. When the current player makes a move, the game state row is updated,
and all subscribers (other players) receive the update instantly.

### Security
All game logic runs client-side (fast, no round-trip latency).
RLS policies are permissive for now — tighten for production by
requiring user_id match on writes.

### Scaling
Each room is isolated. Supabase free tier supports ~500 concurrent connections.
For serious scale, add a Redis layer or use Supabase Edge Functions for game logic.

## Known Limitations & Next Steps

- [ ] Swap Georgia-language-first to i18n support (RU/EN)
- [ ] Add Supabase anonymous auth for better user identity
- [ ] Add spectator mode
- [ ] Add rematch button
- [ ] Add AI opponent for practice
- [ ] Progressive Web App (PWA) for home screen install
- [ ] Add sound effects (tile click, place, domino call)
- [ ] Animate tile placement on board
