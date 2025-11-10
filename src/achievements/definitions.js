import { getDappById } from '../utils/dappsData'

export const achievementDefinitions = [
  {
    id: 'novice-curator',
    title: 'Novice Curator',
    description: 'Claim your first badge.',
    check: (state) => state.badges.length >= 1,
    icon: '🌱',
    theme: 'from-emerald-100 to-emerald-200 text-emerald-700',
  },
  {
    id: 'gallery-scout',
    title: 'Gallery Scout',
    description: 'Collect 5 badges across the museum.',
    check: (state) => state.badges.length >= 5,
    icon: '🧭',
    theme: 'from-sky-100 to-sky-200 text-sky-700',
  },
  {
    id: 'archival-seeker',
    title: 'Archival Seeker',
    description: 'Collect 10 badges.',
    check: (state) => state.badges.length >= 10,
    icon: '🗂️',
    theme: 'from-purple-100 to-purple-200 text-purple-700',
  },
  {
    id: 'maze-virtuoso',
    title: 'Maze Virtuoso',
    description: 'Collect 20 badges.',
    check: (state) => state.badges.length >= 20,
    icon: '🎻',
    theme: 'from-pink-100 to-pink-200 text-pink-700',
  },
  {
    id: 'monad-muse-keeper',
    title: 'Monad Muse Keeper',
    description: 'Collect 40 badges.',
    check: (state) => state.badges.length >= 40,
    icon: '🏛️',
    theme: 'from-amber-100 to-amber-200 text-amber-700',
  },
  {
    id: 'skylight-walker',
    title: 'Skylight Walker',
    description: 'Reach level 5.',
    check: (state) => state.level >= 5,
    icon: '☀️',
    theme: 'from-cyan-100 to-cyan-200 text-cyan-700',
  },
  {
    id: 'hallway-harmonist',
    title: 'Hallway Harmonist',
    description: 'Reach level 10.',
    check: (state) => state.level >= 10,
    icon: '🎶',
    theme: 'from-slate-100 to-slate-200 text-slate-700',
  },
  {
    id: 'badge-whisperer',
    title: 'Badge Whisperer',
    description: 'Reach level 20.',
    check: (state) => state.level >= 20,
    icon: '🌀',
    theme: 'from-indigo-100 to-indigo-200 text-indigo-700',
  },
  {
    id: 'defi-specialist',
    title: 'DeFi Specialist',
    description: 'Collect 4 DeFi badges.',
    check: (state) => countBadgesByCategory(state, 'defi') >= 4,
    icon: '💸',
    theme: 'from-lime-100 to-lime-200 text-lime-700',
  },
  {
    id: 'infra-specialist',
    title: 'Infrastructure Cartographer',
    description: 'Collect 4 Infra badges.',
    check: (state) => countBadgesByCategory(state, 'infra') >= 4,
    icon: '🛰️',
    theme: 'from-orange-100 to-orange-200 text-orange-700',
  },
  {
    id: 'ai-specialist',
    title: 'Agent Architect',
    description: 'Collect 4 AI badges.',
    check: (state) => countBadgesByCategory(state, 'ai') >= 4,
    icon: '🤖',
    theme: 'from-rose-100 to-rose-200 text-rose-700',
  },
]

export function countBadgesByCategory(state, category) {
  if (!category) return 0
  return state.badges.reduce((count, badgeId) => {
    const dapp = getDappById(badgeId)
    if (!dapp) return count
    const categories = (dapp.categories || []).map((value) => String(value || '').toLowerCase())
    return categories.includes(category.toLowerCase()) ? count + 1 : count
  }, 0)
}

export function getAchievementDefinition(id) {
  return achievementDefinitions.find((item) => item.id === id) || null
}

