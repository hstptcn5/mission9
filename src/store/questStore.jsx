import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useQuestStore = create(
  persist(
    (set, get) => ({
      votes: [],
      collections: [],
      questProgress: {
        votes: 0,
        collections: 0,
        glitchUnlocked: false,
        recommendationsUnlocked: false,
      },
      
      addVote: (dappId) => {
        const votes = get().votes
        if (!votes.includes(dappId)) {
          const newVotes = [...votes, dappId]
          const voteCount = newVotes.length
          set({
            votes: newVotes,
            questProgress: {
              ...get().questProgress,
              votes: voteCount,
              glitchUnlocked: voteCount >= 3,
            },
          })
        }
      },
      
      addCollection: (dappId) => {
        const collections = get().collections
        if (!collections.includes(dappId)) {
          const newCollections = [...collections, dappId]
          const collectionCount = newCollections.length
          set({
            collections: newCollections,
            questProgress: {
              ...get().questProgress,
              collections: collectionCount,
              recommendationsUnlocked: collectionCount >= 5,
            },
          })
        }
      },
      
      resetQuest: () => {
        set({
          votes: [],
          collections: [],
          questProgress: {
            votes: 0,
            collections: 0,
            glitchUnlocked: false,
            recommendationsUnlocked: false,
          },
        })
      },
    }),
    {
      name: 'chog-quest-storage',
    }
  )
)

