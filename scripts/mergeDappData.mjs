import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const CSV_PATH = path.join(projectRoot, 'MonEco - Sheet1.csv')
const SOURCE_JSON_PATH = path.join(projectRoot, 'data/monad-ecosystem.json')
const OUTPUT_JSON_PATH = path.join(projectRoot, 'data/monad-ecosystem.enriched.json')

function parseCSV(text) {
  const rows = []
  let current = ''
  let row = []
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (!inQuotes && (char === ',' || char === '\n' || char === '\r')) {
      row.push(current.trim())
      current = ''
      if (char === '\n') {
        rows.push(row)
        row = []
      } else if (char === '\r' && next === '\n') {
        i += 1
        rows.push(row)
        row = []
      }
    } else {
      current += char
    }
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current.trim())
  }
  if (row.length > 0) {
    rows.push(row)
  }
  return rows
}

const normalizeName = (value = '') =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim()

const cleanValue = (value) => {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed || trimmed.toUpperCase() === 'NONE' || trimmed === '-') return ''
  return trimmed
}

const toBoolean = (value) => {
  const normalized = value?.trim().toLowerCase()
  return normalized === 'yes' || normalized === 'true'
}

async function loadCsvMap() {
  const raw = await readFile(CSV_PATH, 'utf8')
  const rows = parseCSV(raw)
  if (!rows.length) throw new Error('CSV file has no content')
  const headers = rows[0]
  const map = new Map()

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i]
    if (!row.length || row.every((cell) => cell === '')) continue
    const entry = {}
    headers.forEach((header, index) => {
      entry[header] = row[index] ?? ''
    })
    const name = entry.NAME?.trim()
    if (!name) continue
    const key = normalizeName(name)
    map.set(key, {
      name,
      logo: cleanValue(entry.LOGO),
      banner: cleanValue(entry.BANNER),
      projectType: cleanValue(entry['PJ TYPE']),
      tags: cleanValue(entry.TAGS)
        .split(/[,|]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
      x: cleanValue(entry.X),
      web: cleanValue(entry.WEB),
      info: cleanValue(entry.INFO),
      onlyOnMonad: toBoolean(entry['ONLY on Monad']),
      warning: cleanValue(entry['🟥 = sus / website link broken / dead pjs']),
    })
  }

  return map
}

async function mergeData() {
  const [csvMap, sourceJson] = await Promise.all([loadCsvMap(), readFile(SOURCE_JSON_PATH, 'utf8')])
  const ecosystem = JSON.parse(sourceJson)

  let matched = 0
  let logoUpdates = 0
  let bannerUpdates = 0
  let statusUpdates = 0

  const enrichedData = ecosystem.data.map((entry) => {
    const key = normalizeName(entry.name)
    const csvEntry = csvMap.get(key)
    if (!csvEntry) {
      return entry
    }
    matched += 1
    const updated = { ...entry }
    updated.image = { ...(entry.image || {}) }

    if (csvEntry.logo && updated.image.logo !== csvEntry.logo) {
      updated.image.logo = csvEntry.logo
      logoUpdates += 1
    }

    if (csvEntry.banner && (!updated.image.banner || updated.image.banner !== csvEntry.banner)) {
      updated.image.banner = csvEntry.banner
      bannerUpdates += 1
    }

    if (csvEntry.onlyOnMonad !== undefined) {
      updated.onlyOnMonad = csvEntry.onlyOnMonad
      statusUpdates += 1
    }

    if (!updated.projectType && csvEntry.projectType) {
      updated.projectType = csvEntry.projectType
    }

    updated.csvMeta = {
      ...(updated.csvMeta || {}),
      tags: csvEntry.tags,
      web: csvEntry.web,
      x: csvEntry.x,
      info: csvEntry.info,
      warning: csvEntry.warning,
    }

    return updated
  })

  const enriched = {
    ...ecosystem,
    data: enrichedData,
    mergedAt: new Date().toISOString(),
    mergeStats: {
      matched,
      logoUpdates,
      bannerUpdates,
      statusUpdates,
      totalCsvEntries: csvMap.size,
      totalJsonEntries: ecosystem.data.length,
    },
  }

  await writeFile(OUTPUT_JSON_PATH, JSON.stringify(enriched, null, 2), 'utf8')
  console.log(`Enriched data written to ${path.relative(projectRoot, OUTPUT_JSON_PATH)}`)
  console.log(enriched.mergeStats)
}

mergeData().catch((error) => {
  console.error('Failed to merge ecosystem data:', error)
  process.exitCode = 1
})

