import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const CSV_PATH = path.join(projectRoot, 'MonEco - Sheet1.csv')
const OUTPUT_PATH = path.join(projectRoot, 'data/dappQuizzes.json')

const normalizeValue = (value) => (value || '').trim()

const slugify = (value) =>
  normalizeValue(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const parseCSV = (text) => {
  const rows = []
  let current = ''
  let column = []
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
      column.push(current.trim())
      current = ''
      if (char === '\n') {
        rows.push(column)
        column = []
      } else if (char === '\r' && next === '\n') {
        rows.push(column)
        column = []
        i += 1
      }
    } else {
      current += char
    }
  }
  if (current.length || column.length) {
    column.push(current.trim())
  }
  if (column.length) rows.push(column)
  return rows
}

const buildQuiz = (entry, allTypes, usedIds) => {
  const name = normalizeValue(entry.NAME)
  const type = normalizeValue(entry['PJ TYPE'] || entry['PJ TYPE '])
  if (!name) return null

  const slug = slugify(name)
  const dappId = usedIds.has(slug) ? `${slug}-${usedIds.get(slug)}` : slug
  usedIds.set(slug, (usedIds.get(slug) || 0) + 1)

  const question = `Which project type best describes ${name}?`

  const incorrectPool = allTypes.filter((item) => item && item.toLowerCase() !== type.toLowerCase())
  const shuffled = incorrectPool.sort(() => Math.random() - 0.5)
  const distractors = shuffled.slice(0, 3)
  const options = [...distractors, type].sort(() => Math.random() - 0.5)
  const answerIndex = options.findIndex((option) => option === type)

  return {
    dappId,
    question,
    options,
    answerIndex,
    explanation: `${name} is categorized as ${type || 'a Monad project'}.`,
  }
}

async function main() {
  const csvRaw = await readFile(CSV_PATH, 'utf8')
  const rows = parseCSV(csvRaw)
  const headers = rows.shift()
  const headerIndex = Object.fromEntries(headers.map((header, index) => [header.trim(), index]))

  const allTypes = new Set()
  const entries = rows
    .map((row) =>
      Object.fromEntries(
        Object.entries(headerIndex).map(([key, idx]) => [key, row[idx] ?? ''])
      )
    )
    .filter((entry) => normalizeValue(entry.NAME))

  entries.forEach((entry) => {
    const type = normalizeValue(entry['PJ TYPE'] || entry['PJ TYPE '])
    if (type) allTypes.add(type)
  })

  const quizzes = []
  const usedIds = new Map()

  entries.forEach((entry) => {
    const quiz = buildQuiz(entry, Array.from(allTypes), usedIds)
    if (quiz) quizzes.push(quiz)
  })

  await writeFile(OUTPUT_PATH, JSON.stringify(quizzes, null, 2), 'utf8')
  console.log(`Generated ${quizzes.length} quizzes -> ${path.relative(projectRoot, OUTPUT_PATH)}`)
}

main().catch((error) => {
  console.error('Failed to generate quizzes:', error)
  process.exitCode = 1
})

