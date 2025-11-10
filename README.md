# Chog's Gallery Maze

Chog's Gallery Maze is an interactive 3D experience built with React Three Fiber where players explore a procedurally generated maze to discover Monad ecosystem dApps. While navigating, players earn XP, complete quests, answer quizzes to claim badges, draw graffiti, and review their progress via an integrated HUD.

## Key Features

- **First-person maze exploration** with minimap, wall art panels, and avatar follower.
- **Quest and XP system** that tracks unique visits, categories, and Monad exclusives.
- **Quiz-locked badges** for each dApp plus a badge inventory and achievement titles.
- **Graffiti wall interaction** with brush tools, color palette, and session persistence.
- **Selfie capture mode** including live preview, hotkeys, and overlay metadata.
- **Local leaderboard prototype** stored in `localStorage` ready to swap for Supabase/on-chain.
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
- Leaderboard prototype stores entries under `chog-local-leaderboard`.
- DApp metadata merged from `data/monad-ecosystem.enriched.json` and CSV.

## Development Notes

- The graffiti canvas uses `CanvasTexture`; changes persist for the current session only.
- Selfie capture duplicates the WebGL canvas onto a 2D canvas, overlays level/achievement text, and exposes download/share options.
- Local leaderboard is ready to be replaced by Supabase or smart contract updates. Swap the `updateEntry` calls with API requests when backend is available.

## Deployment Tips

- Ensure static assets (e.g., `public/getchog/tittle.png`) are bundled in the public directory.
- For hosting on static platforms (Vercel/Netlify), deploy the `dist/` build output.
- When adding wallet/contract integrations, inject RPC URLs and contract addresses via environment variables (`.env` with `VITE_` prefix).

## Roadmap Ideas

- Supabase or on-chain leaderboard synchronization
- Persistent graffiti storage (IPFS or backend)
- Dynamic quest creation and admin tools
- Accessibility and device performance tuning

## License

MIT License. Contributions and forks are welcome.

