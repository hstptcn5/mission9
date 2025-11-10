import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { questDefinitions, evaluateQuestProgress, isQuestUnlocked, calculateLevelFromXp, xpForLevel, LEVEL_XP_STEP } from '../quests/questConfig'
import { achievementDefinitions } from '../achievements/definitions'
import { useLocalLeaderboardStore } from './localLeaderboardStore'

const XP_GAIN = {
  unique: 25,
  onlyOnMonadBonus: 15,
  newCategoryBonus: 5,
}

const createInitialQuestState = () => {
  const baseState = {
    xp: 0,
    level: 1,
    visitedDapps: [],
    visitLog: [],
    categoryVisits: {},
    onlyOnMonadVisited: [],
    questProgressMap: questDefinitions.reduce((acc, quest) => {
      acc[quest.id] = 0
      return acc
    }, {}),
    completedQuests: questDefinitions.reduce((acc, quest) => {
      acc[quest.id] = false
      return acc
    }, {}),
    claimedRewards: {},
    lastVisitAt: null,
    legacyVotes: [],
    legacyCollections: [],
    questProgress: {
      votes: 0,
      collections: 0,
      glitchUnlocked: false,
      recommendationsUnlocked: false,
    },
    badges: [],
    achievements: [],
    achievementFeed: [],
    leaderboardId: 'guest',
    leaderboardName: 'Guest Explorer',
  }

  applyQuestProgress(baseState, baseState.questProgressMap, baseState.completedQuests)
  return baseState
}

const applyQuestProgress = (snapshot, questProgressMap, completedQuests) => {
  questDefinitions.forEach((quest) => {
    if (!isQuestUnlocked(quest, snapshot)) return
    const progress = evaluateQuestProgress(quest, snapshot)
    questProgressMap[quest.id] = progress
    if (progress >= quest.target) {
      completedQuests[quest.id] = true
    }
  })
}

const computeAchievementUpdates = (prevState, partialUpdate) => {
  const nextState = {
    ...prevState,
    ...partialUpdate,
    badges: partialUpdate.badges ?? prevState.badges,
    level: partialUpdate.level ?? prevState.level,
    xp: partialUpdate.xp ?? prevState.xp,
  }

  const unlockedSet = new Set(prevState.achievements || [])
  const newAchievements = []

  achievementDefinitions.forEach((def) => {
    if (unlockedSet.has(def.id)) return
    if (def.check(nextState)) {
      unlockedSet.add(def.id)
      newAchievements.push({ id: def.id, unlockedAt: Date.now() })
    }
  })

  if (!newAchievements.length) {
    return partialUpdate
  }

  const feed = [...(prevState.achievementFeed || []), ...newAchievements]

  return {
    ...partialUpdate,
    achievements: Array.from(unlockedSet),
    achievementFeed: feed.slice(-20),
  }
}

const syncLocalLeaderboardState = (state) => {
  try {
    const leaderboardId = state.leaderboardId || 'guest'
    if (!leaderboardId) return
    useLocalLeaderboardStore
      .getState()
      .updateEntry({
        id: leaderboardId,
        name: state.leaderboardName || leaderboardId,
        xp: state.xp || 0,
        badgeCount: state.badges?.length || 0,
        level: state.level || 1,
        achievementCount: state.achievements?.length || 0,
        updatedAt: Date.now(),
      })
  } catch (error) {
    console.warn('Failed syncing local leaderboard', error)
  }
}

export const useQuestStore = create(
  persist(
    (set, get) => ({
      ...createInitialQuestState(),

      registerVisit: (dapp) => {
        if (!dapp?.id) return

        set((state) => {
          const isNewVisit = !state.visitedDapps.includes(dapp.id)

          const visitedDapps = isNewVisit ? [...state.visitedDapps, dapp.id] : state.visitedDapps
          const visitLog = [...state.visitLog, { id: dapp.id, at: Date.now() }]

          const categoryVisits = { ...state.categoryVisits }
          if (isNewVisit) {
            ;(dapp.categories || []).forEach((category) => {
              if (!category) return
              const key = category.trim()
              const existing = categoryVisits[key] || []
              if (!existing.includes(dapp.id)) {
                categoryVisits[key] = [...existing, dapp.id]
              }
            })
          }

          let onlyOnMonadVisited = state.onlyOnMonadVisited
          if (isNewVisit && dapp.onlyOnMonad && !onlyOnMonadVisited.includes(dapp.id)) {
            onlyOnMonadVisited = [...onlyOnMonadVisited, dapp.id]
          }

          let xpGain = 0
          if (isNewVisit) {
            xpGain = XP_GAIN.unique + (dapp.onlyOnMonad ? XP_GAIN.onlyOnMonadBonus : 0)
            const newCategoryCount = (dapp.categories || []).reduce((acc, category) => {
              if (!category) return acc
              const key = category.trim()
              const existing = categoryVisits[key] || []
              return existing.length === 1 && existing[0] === dapp.id ? acc + 1 : acc
            }, 0)
            xpGain += newCategoryCount * XP_GAIN.newCategoryBonus
          }

          const xp = state.xp + xpGain
          const level = calculateLevelFromXp(xp)

          const questProgressMap = { ...state.questProgressMap }
          const completedQuests = { ...state.completedQuests }
          const snapshot = {
            ...state,
            xp,
            level,
            visitedDapps,
            categoryVisits,
            onlyOnMonadVisited,
            completedQuests,
          }
          applyQuestProgress(snapshot, questProgressMap, completedQuests)

          const partial = {
            xp,
            level,
            visitedDapps,
            visitLog,
            categoryVisits,
            onlyOnMonadVisited,
            questProgressMap,
            completedQuests,
            lastVisitAt: Date.now(),
          }
          return computeAchievementUpdates(state, partial)
        })
        syncLocalLeaderboardState(get())
      },

      addVote: (dappId) => {
        set((state) => {
          if (!dappId) return {}
          if (state.legacyVotes.includes(dappId)) return {}
          const legacyVotes = [...state.legacyVotes, dappId]
          const voteCount = legacyVotes.length
          const partial = {
            legacyVotes,
            questProgress: {
              ...state.questProgress,
              votes: voteCount,
              glitchUnlocked: voteCount >= 3,
            },
          }
          return computeAchievementUpdates(state, partial)
        })
      },

      addCollection: (dappId) => {
        set((state) => {
          if (!dappId) return {}
          if (state.legacyCollections.includes(dappId)) return {}
          const legacyCollections = [...state.legacyCollections, dappId]
          const collectionCount = legacyCollections.length
          const partial = {
            legacyCollections,
            questProgress: {
              ...state.questProgress,
              collections: collectionCount,
              recommendationsUnlocked: collectionCount >= 5,
            },
          }
          return computeAchievementUpdates(state, partial)
        })
      },
      hasBadge: (dappId) => {
        const state = get()
        return state.badges.includes(dappId)
      },
      claimBadge: (dappId) => {
        set((state) => {
          if (!dappId) return {}
          if (state.badges.includes(dappId)) return {}
          const badges = [...state.badges, dappId]
          return computeAchievementUpdates(state, { badges })
        })
        syncLocalLeaderboardState(get())
      },

      getQuestList: () => {
        const state = get()
        return questDefinitions.map((quest) => {
          const unlocked = isQuestUnlocked(quest, state)
          const progress = state.questProgressMap[quest.id] || 0
          return {
            ...quest,
            unlocked,
            progress,
            completed: !!state.completedQuests[quest.id],
            claimed: !!state.claimedRewards[quest.id],
          }
        })
      },

      claimQuestReward: (questId) => {
        const quest = questDefinitions.find((q) => q.id === questId)
        if (!quest) return false
        const state = get()
        if (!state.completedQuests[questId] || state.claimedRewards[questId]) return false

        set((current) => {
          const updatedXp = current.xp + (quest.xpReward || 0)
          const updatedLevel = calculateLevelFromXp(updatedXp)
          const partial = {
            xp: updatedXp,
            level: updatedLevel,
            claimedRewards: {
              ...current.claimedRewards,
              [questId]: true,
            },
          }
          return computeAchievementUpdates(current, partial)
        })
        syncLocalLeaderboardState(get())
        return true
      },

      getLevelInfo: () => {
        const state = get()
        const currentLevelXp = xpForLevel(state.level)
        const nextLevelXp = xpForLevel(state.level + 1)
        const divisor = Math.max(nextLevelXp - currentLevelXp, LEVEL_XP_STEP)
        return {
          level: state.level,
          xp: state.xp,
          currentLevelXp,
          nextLevelXp,
          progress: Math.min(1, (state.xp - currentLevelXp) / divisor),
        }
      },

      resetQuestData: () => {
        set(createInitialQuestState())
        syncLocalLeaderboardState(get())
      },
      setLeaderboardIdentity: (id, name) => {
        const safeId = typeof id === 'string' && id.length ? id : null
        const fallbackName =
          typeof name === 'string' && name.length
            ? name
            : safeId
            ? `${safeId.slice(0, 6)}...${safeId.slice(-4)}`
            : 'Guest Explorer'
        set(() => ({
          leaderboardId: safeId || 'guest',
          leaderboardName: fallbackName,
        }))
        syncLocalLeaderboardState(get())
      },
    }),
    {
      name: 'chog-quest-storage-v2',
    }
  )
)