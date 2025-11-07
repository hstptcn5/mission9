import { promises as fs } from 'fs'
import { load } from 'cheerio'

const html = await fs.readFile('data/monad-ecosystem-raw.html', 'utf8')

const $ = load(html)

console.log('descriptions:', $('.ecosystem_item-description').length)
console.log('First description element:\n', $('.ecosystem_item-description').first().html()?.slice(0, 500))

const cards = []

$('.ecosystem_item-description').each((_, element) => {
  const $description = $(element)
  const name = $description.find('.u-text-medium').first().text().trim()
  const description = $description.find('.u-text-small').first().text().trim()
  const categories = $description.find('.ecosystem_item-tag .u-text-xsmall')
    .map((__, tag) => $(tag).text().trim())
    .get()

  const root = $description.closest('[class*="ecosystem_directory-item"]')
  const projectType = root.find('.ecosystem_item-project-type').first().text().trim()
  const status = root.find('.coming-soon').text().includes('Coming Soon') ? 'Coming Soon' : 'Live'

  const links = root
    .find('.ecosystem_item-link')
    .map((__, link) => $(link).attr('href'))
    .get()
    .filter(Boolean)

  cards.push({ name, description, categories, projectType, status, links })
})

console.log('Cards parsed:', cards.length)
console.log(cards.slice(0, 3))

