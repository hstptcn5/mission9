import { promises as fs } from 'fs'

const content = await fs.readFile('data/jetboost-main.js', 'utf8')

const urlRegex = /https?:\/\/[^\s"'`<>\\]+/g
const urls = new Set()
let match
while ((match = urlRegex.exec(content)) !== null) {
  urls.add(match[0])
  if (urls.size > 100) break
}

console.log('URLs:', [...urls])

const listRegex = /\/list\/[A-Za-z0-9_-]+/g
const listPaths = new Set()
while ((match = listRegex.exec(content)) !== null) {
  listPaths.add(match[0])
  if (listPaths.size > 50) break
}

console.log('List paths:', [...listPaths])

