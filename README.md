# Chog's Gallery Maze

Chog's Gallery Maze is an interactive 3D experience built with React Three Fiber where players explore a procedurally generated maze to discover Monad ecosystem dApps. While navigating, players earn XP, complete quests, answer quizzes to claim badges, draw graffiti, and review their progress via an integrated HUD.

## Key Features

- **First-person maze exploration** with minimap, wall art panels, and avatar follower.
- **Quest and XP system** that tracks unique visits, categories, and Monad exclusives.
- **Quiz-locked badges** for each dApp plus a badge inventory and achievement titles.
- **Graffiti wall interaction** with brush tools, color palette, and session persistence.
- **Selfie capture mode** including live preview, hotkeys, and overlay metadata.
- **Global leaderboard** backed by Supabase with realtime updates and graceful local fallback.
- **Optimised UI**: compact quest HUD, inline badge kit, hotkeys for interactions.

## Quick Start

### Prerequisites

- Node.js 18 or newer
- npm or yarn

### Installation

```bash
npm install
npm run dev
```

Development server runs at `http://localhost:5173` by default (Vite).
If you plan to enable Supabase, create a `.env.local` file with the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` values before starting the dev server.

### Production Build

```bash
npm run build
npm run preview
```

## Tech Stack

- **Rendering**: React Three Fiber, Three.js, @react-three/drei
- **State**: Zustand (persisted)
- **UI**: Tailwind CSS, Headless custom components
- **Audio/Media**: use-sound, custom CanvasTexture drawing
- **Tooling**: Vite, ESLint

## Project Structure (selected)

```
src/
  components/
    BadgeInventory.jsx      // Compact badge kit & titles UI
    LocalLeaderboard.jsx    // Prototype leaderboard overlay
    QuestTracker.jsx        // HUD for XP and quests
  pages/
    MuseumScene.jsx         // Main 3D scene and interactions
  store/
    questStore.jsx          // Quest, XP, badge, achievements
    localLeaderboardStore.jsx
  quests/
    questConfig.js          // Quest definitions and helpers
  utils/
    dappsData.js            // DApp data enrichment
```

## Controls & Hotkeys

- `W A S D` / arrow keys: move
- `Mouse` look (pointer lock)
- `Space`: interact/visit dApp
- `F`: toggle dApp info
- `Q`: open/answer dApp quiz
- `B`: toggle badge kit overlay
- `P`: capture selfie
- `O`: toggle selfie preview
- `L`: toggle local leaderboard

## Data & Persistence

- Player progression is stored using Zustand with `localStorage` (`chog-quest-storage-v2`).
- Leaderboard entries are synced to Supabase table `leaderboard_entries` when environment variables are configured. If Supabase is unavailable, entries fall back to the in-memory store.
- DApp metadata merged from `data/monad-ecosystem.enriched.json` and CSV.

## Development Notes

- The graffiti canvas uses `CanvasTexture`; changes persist for the current session only.
- Selfie capture duplicates the WebGL canvas onto a 2D canvas, overlays level/achievement text, and exposes download/share options.
- Supabase client is configured in `src/utils/supabaseClient.js`. Provide `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to enable global leaderboard sync.

## Supabase Leaderboard Setup

1. Create a Supabase project and enable the SQL editor.
2. Run:
   ```sql
   create table if not exists public.leaderboard_entries (
     wallet_address text primary key,
     display_name text,
     xp integer default 0,
     badge_count integer default 0,
     level integer default 1,
     achievement_count integer default 0,
     updated_at timestamptz default now()
   );
   ```
3. Optional: enable Row Level Security and add a policy that allows `anon` inserts/updates on the table.
4. Add the following to `.env.local`:
   ```bash
   VITE_SUPABASE_URL=<your-supabase-url>
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   ```
5. Redeploy so `process.env` picks up the new values. Without the env vars the app keeps using the local fallback store.

## Using the Supabase Leaderboard

1. Start the app with `npm run dev` (ensure the env vars are loaded).
2. Connect your wallet in the UI; the quest store will register the wallet address as the leaderboard ID.
3. Explore the maze and earn XP/badges. Every XP or badge update triggers an `upsert` into `leaderboard_entries`.
4. Open Supabase → Table Editor → `leaderboard_entries` to verify rows are created/updated.
5. Multiple users will appear on the leaderboard in realtime thanks to Supabase realtime subscriptions.
6. If env vars are missing or Supabase is unreachable, the leaderboard automatically falls back to a local in-memory list.

## Deployment Tips

- Ensure static assets (e.g., `public/tittle.png`) are bundled in the public directory.
- For hosting on static platforms (Vercel/Netlify), deploy the `dist/` build output.
- When adding wallet/contract integrations, inject RPC URLs and contract addresses via environment variables (`.env` with `VITE_` prefix).

## Roadmap Ideas

- Supabase or on-chain leaderboard synchronization
- Persistent graffiti storage (IPFS or backend)
- Dynamic quest creation and admin tools
- Accessibility and device performance tuning

## License

MIT License. Contributions and forks are welcome.

