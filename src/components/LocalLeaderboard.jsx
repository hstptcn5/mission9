import { useEffect, useMemo } from 'react'
import { useLeaderboardStore } from '../store/localLeaderboardStore'

const formatRank = (index) => `#${index + 1}`
const formatXp = (xp) => xp.toLocaleString()

export default function LocalLeaderboard() {
  const entries = useLeaderboardStore((state) => state.entries)
  const loading = useLeaderboardStore((state) => state.loading)
  const error = useLeaderboardStore((state) => state.error)
  const initialized = useLeaderboardStore((state) => state.initialized)
  const supabaseEnabled = useLeaderboardStore((state) => state.supabaseEnabled)

  useEffect(() => {
    const { fetchEntries, attachRealtime } = useLeaderboardStore.getState()
    fetchEntries()
    const cleanup = attachRealtime?.()
    return () => {
      cleanup?.()
    }
  }, [])

  const displayEntries = useMemo(
    () =>
      entries.map((entry, idx) => ({
        rank: formatRank(idx),
        name: entry.name || entry.id,
        xp: formatXp(entry.xp || 0),
        badgeCount: entry.badgeCount || 0,
        level: entry.level || 1,
        achievementCount: entry.achievementCount || 0,
        id: entry.id,
      })),
    [entries]
  )

  return (
    <div className="pointer-events-auto w-80 rounded-3xl border border-white/12 bg-gradient-to-br from-indigo-950/95 via-blue-950/90 to-slate-950/92 text-white shadow-[0_30px_70px_rgba(8,4,40,0.55)] backdrop-blur-xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-indigo-200/80">
            {supabaseEnabled ? 'Global Leaderboard' : 'Local Leaderboard'}
          </p>
          <p className="text-lg font-semibold text-white">Top Explorers</p>
        </div>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-indigo-100/80">{displayEntries.length}</span>
      </div>
      <div className="max-h-80 overflow-y-auto px-4 py-3 space-y-2">
        {!initialized || loading ? (
          <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-5 text-center text-indigo-100/70">
            Loading leaderboard...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-dashed border-rose-400/30 bg-rose-950/30 px-4 py-5 text-center text-rose-100/80">
            Failed to load leaderboard: {error}
          </div>
        ) : displayEntries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-5 text-center text-indigo-100/70">
            No scores stored yet. Explore the maze to generate XP and badges.
          </div>
        ) : (
          displayEntries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-2xl border border-white/12 bg-white/6 px-4 py-3 shadow-[0_12px_25px_rgba(10,5,35,0.45)]"
            >
              <div className="flex items-center justify-between text-sm font-semibold text-indigo-100">
                <span className="text-white/90">{entry.rank}</span>
                <span className="truncate text-white">{entry.name}</span>
                <span className="text-indigo-200">{entry.xp} XP</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-indigo-200/80 uppercase tracking-[0.2em]">
                <span>Level {entry.level}</span>
                <span>{entry.badgeCount} badges</span>
                <span>{entry.achievementCount} titles</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

