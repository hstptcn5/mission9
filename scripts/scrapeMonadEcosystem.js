import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import puppeteer from 'puppeteer'

const ECOSYSTEM_URL = 'https://www.monad.xyz/ecosystem'
const EXPECTED_COUNT = 303
const SCROLL_RETRIES = 12

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'monad-ecosystem.json')

async function ensureDataDir() {
  const dataDir = path.dirname(OUTPUT_PATH)
  await fs.mkdir(dataDir, { recursive: true })
}

async function collectEcosystemData(page) {
  return page.$$eval('.ecosystem_directory-item', (items) => {
    return items.map((item) => {
      const selectText = (selector) => {
        const el = item.querySelector(selector)
        return el ? el.textContent.trim() : ''
      }

      const collectTexts = (selector) =>
        Array.from(item.querySelectorAll(selector))
          .map((el) => el.textContent.trim())
          .filter(Boolean)

      const collectLinks = (selector) =>
        Array.from(item.querySelectorAll(selector))
          .map((el) => el.getAttribute('href'))
          .filter(Boolean)

      const collectLogos = () => {
        const img = item.querySelector('.ecosystem_item-logo img')
        const banner = item.querySelector('.ecosystem_item-banner')
        return {
          logo: img ? img.getAttribute('src') : '',
          banner: banner ? banner.getAttribute('src') : '',
        }
      }

      const tags = collectTexts('.ecosystem_item-tag .u-text-xsmall')
      const metadataChips = collectTexts('.ecosystem_item-meta .u-text-xsmall')
      const statusEl = item.querySelector('.coming-soon')
      const exclusiveTooltip = item.querySelector('.exclusive-tooltip_text')
      const descriptions = collectTexts('.u-text-small')
      const description =
        descriptions.find((text) => text && text !== 'Only on Monad') || ''

      return {
        name: selectText('.u-text-medium'),
        description,
        projectType: selectText('.ecosystem_item-project-type'),
        categories: tags,
        metadata: metadataChips,
        status:
          statusEl && statusEl.textContent && statusEl.textContent.includes('Coming Soon')
            ? 'Coming Soon'
            : 'Live',
        onlyOnMonad: Boolean(
          exclusiveTooltip && exclusiveTooltip.textContent.includes('Only on Monad')
        ),
        links: collectLinks('.ecosystem_item-link'),
        image: collectLogos(),
      }
    }).filter((entry) => entry.name)
  })
}

async function scrollUntilLoaded(page) {
  let retries = 0
  let previousCount = 0

  while (retries < SCROLL_RETRIES) {
    const currentCount = await page.$$eval('.ecosystem_directory-item', (els) => els.length)
    if (currentCount >= EXPECTED_COUNT) {
      console.log(`Loaded expected count: ${currentCount}`)
      return currentCount
    }

    if (currentCount === previousCount) {
      retries += 1
    } else {
      retries = 0
      previousCount = currentCount
    }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }

  const finalCount = await page.$$eval('.ecosystem_directory-item', (els) => els.length)
  console.warn(`Reached retries limit. Final count: ${finalCount}`)
  return finalCount
}

async function scrape() {
  await ensureDataDir()

  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  console.log(`Navigating to ${ECOSYSTEM_URL}`)
  await page.goto(ECOSYSTEM_URL, { waitUntil: 'networkidle2', timeout: 60_000 })

  await page.waitForSelector('.ecosystem_item-description', { timeout: 30_000 })

  const totalItems = await scrollUntilLoaded(page)
  console.log(`Collected ${totalItems} cards from DOM`)

  const entries = await collectEcosystemData(page)

  await browser.close()

  const payload = {
    source: ECOSYSTEM_URL,
    collectedAt: new Date().toISOString(),
    itemCount: entries.length,
    expectedCount: EXPECTED_COUNT,
    data: entries,
  }

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2), 'utf8')
  console.log(`Saved data to ${path.relative(process.cwd(), OUTPUT_PATH)} (${entries.length} entries)`) 
}

scrape().catch((error) => {
  console.error('Failed to scrape Monad ecosystem:', error)
  process.exitCode = 1
})

