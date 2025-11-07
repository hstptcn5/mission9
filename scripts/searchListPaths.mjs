import { promises as fs } from 'fs'

const content = await fs.readFile('data/jetboost-main.js', 'utf8')

const listRegex = /\/list\/[A-Za-z0-9_-]+/g
const listResults = new Set()
let match

while ((match = listRegex.exec(content)) !== null) {
  listResults.add(match[0])
  if (listResults.size > 50) break
}

console.log('List paths', [...listResults])

const encodedRegex = /https:\\u002F\\u002Fapi\.jetboost\.io[^"']+/g
const encodedResults = new Set()

while ((match = encodedRegex.exec(content)) !== null) {
  encodedResults.add(match[0])
  if (encodedResults.size > 50) break
}

console.log('Encoded URLs', [...encodedResults])

