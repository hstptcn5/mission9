import { useQuestStore } from '../store/questStore'

export default function QuestTracker() {
  const { questProgress } = useQuestStore()

  return (
    <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/20">
      <div className="text-white text-sm">
        <span className="font-semibold">Votes:</span> {questProgress.votes}/3
        {questProgress.votes >= 3 && ' ✅'}
      </div>
      <div className="text-white text-sm">
        <span className="font-semibold">Collections:</span> {questProgress.collections}/5
        {questProgress.collections >= 5 && ' ✅'}
      </div>
    </div>
  )
}

