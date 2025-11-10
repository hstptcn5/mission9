import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const normalizeEntry = (entry) => ({
  id: entry.id,
  name: entry.name || entry.id,
  xp: Number(entry.xp) || 0,
  badgeCount: Number(entry.badgeCount) || 0,
  level: Number(entry.level) || 1,
  achievementCount: Number(entry.achievementCount) || 0,
  updatedAt: entry.updatedAt || Date.now(),
})

const sortEntries = (entries) =>
  [...entries].sort((a, b) => {
    if (b.xp !== a.xp) return b.xp - a.xp
    if (b.badgeCount !== a.badgeCount) return b.badgeCount - a.badgeCount
    if (b.level !== a.level) return b.level - a.level
    return (a.updatedAt || 0) - (b.updatedAt || 0)
  })

export const useLocalLeaderboardStore = create(
  persist(
    (set, get) => ({
      entries: [],
      updateEntry: (entry) => {
        if (!entry?.id) return
        const normalized = normalizeEntry(entry)
        set((state) => {
          const existingIndex = state.entries.findIndex((item) => item.id === normalized.id)
          const nextEntries =
            existingIndex >= 0
              ? state.entries.map((item, idx) => (idx === existingIndex ? normalized : item))
              : [...state.entries, normalized]

          return {
            entries: sortEntries(nextEntries).slice(0, 25),
          }
        })
      },
      removeEntry: (id) => {
        if (!id) return
        set((state) => ({
          entries: state.entries.filter((entry) => entry.id !== id),
        }))
      },
      clear: () => set({ entries: [] }),
    }),
    {
      name: 'chog-local-leaderboard',
    }
  )
)

