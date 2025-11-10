import quizzes from '../../data/dappQuizzes.json'

const quizIndex = new Map()
quizzes.forEach((entry) => {
  if (entry?.dappId) {
    quizIndex.set(entry.dappId, entry)
  }
})

export function getQuizForDapp(dappId) {
  return quizIndex.get(dappId) || null
}

export function hasQuiz(dappId) {
  return quizIndex.has(dappId)
}

