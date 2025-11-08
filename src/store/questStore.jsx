import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { questDefinitions, evaluateQuestProgress, isQuestUnlocked, calculateLevelFromXp, xpForLevel, LEVEL_XP_STEP } from '../quests/questConfig'

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

          return {
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
        })
      },

      addVote: (dappId) => {
        set((state) => {
          if (!dappId) return {}
          if (state.legacyVotes.includes(dappId)) return {}
          const legacyVotes = [...state.legacyVotes, dappId]
          const voteCount = legacyVotes.length
          return {
            legacyVotes,
            questProgress: {
              ...state.questProgress,
              votes: voteCount,
              glitchUnlocked: voteCount >= 3,
            },
          }
        })
      },

      addCollection: (dappId) => {
        set((state) => {
          if (!dappId) return {}
          if (state.legacyCollections.includes(dappId)) return {}
          const legacyCollections = [...state.legacyCollections, dappId]
          const collectionCount = legacyCollections.length
          return {
            legacyCollections,
            questProgress: {
              ...state.questProgress,
              collections: collectionCount,
              recommendationsUnlocked: collectionCount >= 5,
            },
          }
        })
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

        const newXp = state.xp + (quest.xpReward || 0)
        const newLevel = calculateLevelFromXp(newXp)
        set({
          xp: newXp,
          level: newLevel,
          claimedRewards: {
            ...state.claimedRewards,
            [questId]: true,
          },
        })
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
      },
    }),
    {
      name: 'chog-quest-storage-v2',
    }
  )
)