import { create } from 'zustand'
import { getSupabaseClient, leaderboardTable } from '../utils/supabaseClient'

const normalizeEntry = (entry) => ({
  id: entry.wallet_address || entry.id,
  name: entry.display_name || entry.wallet_address || entry.id,
  xp: Number(entry.xp) || 0,
  badgeCount: Number(entry.badge_count) || 0,
  level: Number(entry.level) || 1,
  achievementCount: Number(entry.achievement_count) || 0,
  updatedAt: entry.updated_at ? new Date(entry.updated_at).getTime() : Date.now(),
})

const sortEntries = (entries) =>
  [...entries].sort((a, b) => {
    if (b.xp !== a.xp) return b.xp - a.xp
    if (b.badgeCount !== a.badgeCount) return b.badgeCount - a.badgeCount
    if (b.level !== a.level) return b.level - a.level
    return (a.updatedAt || 0) - (b.updatedAt || 0)
  })

const maxEntries = 100

export const useLeaderboardStore = create((set, get) => ({
  entries: [],
  loading: false,
  error: null,
  initialized: false,
  supabaseEnabled: !!getSupabaseClient(),
  realtimeAttached: false,

  fetchEntries: async () => {
    const client = getSupabaseClient()
    if (!client) {
      set({ supabaseEnabled: false, initialized: true })
      return
    }

    set({ loading: true, error: null })
    const { data, error } = await client
      .from(leaderboardTable)
      .select('wallet_address, display_name, xp, badge_count, level, achievement_count, updated_at')
      .order('xp', { ascending: false })
      .order('badge_count', { ascending: false })
      .order('level', { ascending: false })
      .order('updated_at', { ascending: true })
      .limit(maxEntries)

    if (error) {
      console.error('Failed to fetch leaderboard', error)
      set({ error: error.message, loading: false, initialized: true })
      return
    }

    const normalized = data.map(normalizeEntry)
    set({
      entries: normalized,
      loading: false,
      initialized: true,
      error: null,
      supabaseEnabled: true,
    })
  },

  upsertEntry: async (entry) => {
    if (!entry?.id) return

    const normalized = {
      id: entry.id,
      name: entry.name || entry.id,
      xp: Number(entry.xp) || 0,
      badgeCount: Number(entry.badgeCount) || 0,
      level: Number(entry.level) || 1,
      achievementCount: Number(entry.achievementCount) || 0,
      updatedAt: Date.now(),
    }

    const client = getSupabaseClient()
    if (client) {
      const payload = {
        wallet_address: normalized.id,
        display_name: normalized.name,
        xp: normalized.xp,
        badge_count: normalized.badgeCount,
        level: normalized.level,
        achievement_count: normalized.achievementCount,
        updated_at: new Date(normalized.updatedAt).toISOString(),
      }

      const { error } = await client.from(leaderboardTable).upsert(payload, {
        onConflict: 'wallet_address',
      })

      if (error) {
        console.error('Failed to upsert leaderboard entry', error)
        set({ error: error.message })
        return
      }
    }

    set((state) => {
      const normalizedEntry = client
        ? normalizeEntry({
            wallet_address: normalized.id,
            display_name: normalized.name,
            xp: normalized.xp,
            badge_count: normalized.badgeCount,
            level: normalized.level,
            achievement_count: normalized.achievementCount,
            updated_at: new Date(normalized.updatedAt).toISOString(),
          })
        : normalized
      const existingIndex = state.entries.findIndex((item) => item.id === normalized.id)
      const nextEntries =
        existingIndex >= 0
          ? state.entries.map((item, idx) => (idx === existingIndex ? normalizedEntry : item))
          : [...state.entries, normalizedEntry]
      return {
        entries: sortEntries(nextEntries).slice(0, maxEntries),
        error: null,
      }
    })
  },

  removeEntry: async (walletAddress) => {
    const client = getSupabaseClient()
    if (client && walletAddress) {
      const { error } = await client.from(leaderboardTable).delete().eq('wallet_address', walletAddress)
      if (error) {
        console.error('Failed to delete leaderboard entry', error)
        set({ error: error.message })
      }
    }

    set((state) => ({
      entries: state.entries.filter((entry) => entry.id !== walletAddress),
    }))
  },

  attachRealtime: () => {
    const client = getSupabaseClient()
    if (!client || get().realtimeAttached) return

    const channel = client
      .channel('leaderboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: leaderboardTable,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            set((state) => ({
              entries: state.entries.filter((entry) => entry.id !== payload.old.wallet_address),
            }))
            return
          }

          const record = payload.new || payload.old
          if (!record) return
          set((state) => {
            const normalized = normalizeEntry(record)
            const existingIndex = state.entries.findIndex((item) => item.id === normalized.id)
            const nextEntries =
              existingIndex >= 0
                ? state.entries.map((item, idx) => (idx === existingIndex ? normalized : item))
                : [...state.entries, normalized]
            return {
              entries: sortEntries(nextEntries).slice(0, maxEntries),
            }
          })
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Supabase realtime channel error')
        }
      })

    set({ realtimeAttached: true, supabaseEnabled: true })

    return () => {
      client.removeChannel(channel)
      set({ realtimeAttached: false })
    }
  },
}))

export const useLocalLeaderboardStore = useLeaderboardStore

