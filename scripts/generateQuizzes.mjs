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

const typePrompts = [
  'Which project type best fits __NAME__?',
  'How would you classify __NAME__ within the Monad ecosystem?',
  'Choose the most accurate project type for __NAME__.',
  '__NAME__ is primarily which kind of project?',
]

const tagPrompts = [
  'Which focus area is most associated with __NAME__?',
  'Select the key category that __NAME__ highlights.',
  '__NAME__ is closely linked to which focus tag?',
  'Pick the tag that best represents __NAME__.',
]

const buildTypeQuestion = (name, type, allTypes) => {
  const incorrectPool = allTypes.filter((item) => item && item.toLowerCase() !== type.toLowerCase())
  const shuffled = incorrectPool.sort(() => Math.random() - 0.5)
  const distractors = shuffled.slice(0, 3)
  const options = [...distractors, type].sort(() => Math.random() - 0.5)
  const answerIndex = options.findIndex((option) => option === type)
  return {
    question: typePrompts[Math.floor(Math.random() * typePrompts.length)].replace('__NAME__', name),
    options,
    answerIndex,
    explanation: `${name} is categorized as ${type || 'a Monad project'}.`,
  }
}

const buildTagQuestion = (name, tag, allTags) => {
  const incorrectPool = allTags.filter((item) => item && item.toLowerCase() !== tag.toLowerCase())
  const distractors = incorrectPool.sort(() => Math.random() - 0.5).slice(0, 3)
  const options = [...distractors, tag].sort(() => Math.random() - 0.5)
  const answerIndex = options.findIndex((option) => option === tag)
  return {
    question: tagPrompts[Math.floor(Math.random() * tagPrompts.length)].replace('__NAME__', name),
    options,
    answerIndex,
    explanation: `${name} is commonly associated with ${tag}.`,
  }
}

const buildQuiz = (entry, allTypes, allTags, usedIds) => {
  const name = normalizeValue(entry.NAME)
  const type = normalizeValue(entry['PJ TYPE'] || entry['PJ TYPE '])
  if (!name) return null

  const tags = normalizeValue(entry.TAGS)
    .split(/[,|]/)
    .map((tag) => tag.trim())
    .filter(Boolean)

  const baseSlug = slugify(name) || slugify(entry.WEB || entry.NAME)
  const slug = baseSlug || `dapp-${usedIds.size}`
  const dappId = usedIds.has(slug) ? `${slug}-${usedIds.get(slug)}` : slug
  usedIds.set(slug, (usedIds.get(slug) || 0) + 1)

  let quizBody = null
  if (!quizBody && tags.length) {
    quizBody = buildTagQuestion(name, tags[0], allTags)
  }
  if (!quizBody && type) {
    quizBody = buildTypeQuestion(name, type, allTypes)
  }
  if (!quizBody) return null

  return {
    dappId,
    ...quizBody,
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

  const allTags = new Set()

  entries.forEach((entry) => {
    const type = normalizeValue(entry['PJ TYPE'] || entry['PJ TYPE '])
    if (type) allTypes.add(type)
    const tags = normalizeValue(entry.TAGS)
      .split(/[,|]/)
      .map((tag) => tag.trim())
      .filter(Boolean)
    tags.forEach((tag) => {
      if (tag) allTags.add(tag)
    })
  })

  const quizzes = []
  const usedIds = new Map()

  entries.forEach((entry) => {
    const quiz = buildQuiz(entry, Array.from(allTypes), Array.from(allTags), usedIds)
    if (quiz) quizzes.push(quiz)
  })

  await writeFile(OUTPUT_PATH, JSON.stringify(quizzes, null, 2), 'utf8')
  console.log(`Generated ${quizzes.length} quizzes -> ${path.relative(projectRoot, OUTPUT_PATH)}`)
}

main().catch((error) => {
  console.error('Failed to generate quizzes:', error)
  process.exitCode = 1
})

