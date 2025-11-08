import ecosystem from '../../data/monad-ecosystem.enriched.json'

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const slugCounts = new Map()
const uniqueSlug = (slug) => {
  const count = slugCounts.get(slug) || 0
  slugCounts.set(slug, count + 1)
  return count ? `${slug}-${count}` : slug
}

const isSocialLink = (link = '') =>
  /(x\.com|twitter\.com|warpcast\.com|farcaster|discord\.com|t\.me|telegram\.me|linkedin\.com|medium\.com)/i.test(
    link
  )

const seededRandom = (seedString) => {
  let seed = 0
  for (let i = 0; i < seedString.length; i += 1) {
    seed = (seed * 1664525 + seedString.charCodeAt(i) + 1013904223) >>> 0
  }
  return seed / 4294967296
}

const derivePopularityScore = (entry) => {
  const numericHints = (entry.metadata || [])
    .map((value) => parseInt(String(value).replace(/[^0-9]/g, ''), 10))
    .filter((num) => Number.isFinite(num) && num > 0)

  const inferred = numericHints.length ? Math.max(...numericHints) : 0
  const linkBoost = (entry.links?.length || 0) * 18
  const exclusivityBoost = entry.onlyOnMonad ? 60 : 0
  const base = Math.round(seededRandom(entry.name || entry.description || 'monad') * 700)

  return inferred + base + linkBoost + exclusivityBoost
}

const mapEcosystemEntry = (entry) => {
  const baseSlug = slugify(entry.name)
  const randomId =
    globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)
  const id = uniqueSlug(baseSlug || randomId)

  const csvMeta = entry.csvMeta || {}
  const website =
    csvMeta.web ||
    entry.links.find((link) => !isSocialLink(link)) ||
    entry.links[0] ||
    ''
  const socials = [
    ...entry.links.filter((link) => isSocialLink(link)),
    ...(csvMeta.x && !isSocialLink(csvMeta.x) ? [csvMeta.x] : []),
  ].filter(Boolean)
  const popularityScore = derivePopularityScore(entry)
  const tags = Array.isArray(csvMeta.tags)
    ? csvMeta.tags.filter(Boolean)
    : []

  return {
    id,
    name: entry.name,
    description: entry.description,
    projectType: entry.projectType,
    categories: entry.categories || [],
    metadata: entry.metadata || [],
    status: entry.status,
    onlyOnMonad: entry.onlyOnMonad,
    url: website,
    links: entry.links,
    socials,
    bannerImage: entry.image?.banner || '',
    logoImage: entry.image?.logo || '',
    contractAddress: null,
    votes: popularityScore,
    popularityScore,
    hidden: false,
    warning: csvMeta.warning || '',
    tags,
  }
}

export const dAppsData = (ecosystem?.data || []).map(mapEcosystemEntry)

const HIDDEN_SAMPLE_SIZE = 12
dAppsData.slice(0, HIDDEN_SAMPLE_SIZE).forEach((item) => {
  item.hidden = true
})

const categorySet = new Set()
dAppsData.forEach((item) => {
  item.categories.forEach((category) => {
    if (category) categorySet.add(category)
  })
})

export const categories = ['All', ...Array.from(categorySet).sort((a, b) => a.localeCompare(b))]

export function getDappsByCategory(category) {
  if (category === 'All') return dAppsData.filter((dapp) => !dapp.hidden)
  return dAppsData.filter(
    (dapp) => !dapp.hidden && dapp.categories.includes(category)
  )
}

export function getHiddenDapps() {
  return dAppsData.filter((dapp) => dapp.hidden)
}
