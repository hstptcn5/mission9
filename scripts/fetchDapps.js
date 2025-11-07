import axios from 'axios'
import * as cheerio from 'cheerio'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const SOURCE_URL = 'https://www.monad.xyz/ecosystem'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'monad-ecosystem.json')

const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim()

const mergeEntry = (store, entry) => {
  if (!entry.name) return
  const key = entry.name.toLowerCase()
  const existing = store.get(key)

  const unique = (arr = []) => [...new Set(arr.filter(Boolean))]

  if (!existing) {
    store.set(key, {
      ...entry,
      categories: unique(entry.categories),
      tags: unique(entry.tags),
    })
    return
  }

  store.set(key, {
    ...existing,
    ...entry,
    description:
      (entry.description || '').length > (existing.description || '').length
        ? entry.description
        : existing.description,
    type: entry.type || existing.type,
    status: entry.status || existing.status,
    categories: unique([...(existing.categories || []), ...(entry.categories || [])]),
    tags: unique([...(existing.tags || []), ...(entry.tags || [])]),
  })
}

async function fetchHtml() {
  const response = await axios.get(SOURCE_URL, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    },
  })
  return response.data
}

function parseFromDom(html) {
  const $ = cheerio.load(html)
  const store = new Map()

  const selectors = [
    '[data-ecosystem-card]',
    '.ecosystem-card',
    '.ecosystem_card',
    '.ecosystem-item',
    '.w-dyn-item',
  ]

  selectors.forEach((selector) => {
    $(selector).each((_, element) => {
      const el = $(element)
      const name = normalize(
        el
          .find(
            'h2, h3, h4, .heading, .title, .ecosystem-card_name, .ecosystem_card-title, .ecosystem_card-name',
          )
          .first()
          .text(),
      )

      if (!name) return

      const description = normalize(
        el
          .find('p, .paragraph, .ecosystem-card_description, .ecosystem_card-description')
          .first()
          .text(),
      )

      const type = normalize(
        el
          .find('.type, .ecosystem-card_type, .ecosystem_card-type')
          .first()
          .text(),
      )

      const status = normalize(
        el
          .find('.status, .ecosystem-card_status, .ecosystem_card-status')
          .first()
          .text(),
      )

      const categories = new Set()
      el.find('[data-category], .ecosystem-card_category, .ecosystem_card-category, .category, .chip').each(
        (_, catEl) => {
          const category = normalize($(catEl).text())
          if (category) categories.add(category)
        },
      )

      const tags = new Set()
      el.find('.tag, .badge, .ecosystem-card_tag, .ecosystem_card-tag').each((_, tagEl) => {
        const tag = normalize($(tagEl).text())
        if (tag) tags.add(tag)
      })

      mergeEntry(store, {
        name,
        description,
        type,
        status,
        categories: [...categories],
        tags: [...tags],
        source: 'dom',
      })
    })
  })

  return store
}

function parseFallback(html, existingStore) {
  const $ = cheerio.load(html)
  const text = $('body').text().replace(/\r/g, '')
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)

  const typeCandidates = new Set(['App', 'Infra', 'App/Infra'])
  const statusMatcher = /(Coming Soon|Live on Testnet|Live on Mainnet|Live|Launch|Available)/i

  for (let i = 0; i < lines.length - 6; i++) {
    const name = lines[i]
    const typeLine = lines[i + 1]
    if (!typeCandidates.has(typeLine)) continue

    let cursor = i + 2
    const tags = []

    while (lines[cursor] && lines[cursor] !== name && !typeCandidates.has(lines[cursor])) {
      if (lines[cursor].includes('Only on Monad') || lines[cursor].includes('Coming Soon')) {
        tags.push(lines[cursor])
        cursor++
        continue
      }
      break
    }

    if (lines[cursor] !== name) continue

    const description = lines[cursor + 1] || ''

    let pointer = cursor + 2
    const categories = new Set()
    let status = ''

    while (pointer < lines.length) {
      const value = lines[pointer]
      if (statusMatcher.test(value)) {
        status = value
        pointer++
        break
      }
      if (typeCandidates.has(value) || value === name) break
      if (value.includes('Only on Monad')) {
        tags.push(value)
      } else {
        categories.add(value)
      }
      pointer++
    }

    mergeEntry(existingStore, {
      name,
      type: typeLine,
      description,
      status,
      categories: [...categories],
      tags,
      source: 'fallback',
    })
  }
}

async function main() {
  try {
    console.log(`Fetching ecosystem data from ${SOURCE_URL}`)
    const html = await fetchHtml()

    const store = parseFromDom(html)

    if (store.size < 5) {
      console.warn(
        `DOM-based parsing only found ${store.size} items. Falling back to text parsing (structure may have changed).`,
      )
      parseFallback(html, store)
    }

    const items = [...store.values()].sort((a, b) => a.name.localeCompare(b.name))

    await fs.mkdir(path.join(__dirname, '..', 'data'), { recursive: true })
    await fs.writeFile(
      OUTPUT_PATH,
      JSON.stringify(
        {
          source: SOURCE_URL,
          updatedAt: new Date().toISOString(),
          total: items.length,
          items,
        },
        null,
        2,
      ),
    )

    console.log(`Saved ${items.length} dApps to ${path.relative(process.cwd(), OUTPUT_PATH)}`)
    console.log('Inspect the JSON file for accuracy. If fields are empty, the site structure may have changed.')
  } catch (error) {
    console.error('Failed to fetch Monad ecosystem data:', error.message)
    process.exitCode = 1
  }
}

main()



