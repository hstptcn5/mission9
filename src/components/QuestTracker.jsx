import { useMemo } from 'react'
import { useQuestStore } from '../store/questStore'
import { questDefinitions, LEVEL_XP_STEP } from '../quests/questConfig'

const getProgressPercentage = (progress, target) => Math.min(100, Math.round((progress / target) * 100))
const cx = (...args) => args.filter(Boolean).join(' ')

export default function QuestTracker({ variant = 'default', maxItems = 3, className = '' }) {
  const levelInfo = useQuestStore((state) => state.getLevelInfo())
  const questList = useQuestStore((state) => state.getQuestList())
  const claimQuestReward = useQuestStore((state) => state.claimQuestReward)

  const { level, xp, currentLevelXp, nextLevelXp, progress } = levelInfo

  const displayedQuests = useMemo(() => {
    const claimable = questList.filter((quest) => quest.unlocked && quest.completed && !quest.claimed)
    const active = questList.filter((quest) => quest.unlocked && !quest.completed)
    const upcoming = questList.filter((quest) => !quest.unlocked)

    const ordered = [...claimable, ...active, ...upcoming]
    if (!ordered.length)
      return questDefinitions.slice(0, maxItems).map((quest) => ({
        ...quest,
        unlocked: false,
        progress: 0,
        completed: false,
        claimed: false,
      }))
    return ordered.slice(0, maxItems)
  }, [questList, maxItems])

  const xpIntoLevel = xp - currentLevelXp
  const xpRequired = Math.max(nextLevelXp - currentLevelXp, LEVEL_XP_STEP)
  const compact = variant === 'compact'

  return (
    <div
      className={cx(
        'rounded-3xl border border-white/20 bg-white/10 text-white shadow-[0_20px_45px_rgba(9,6,40,0.2)] backdrop-blur-lg',
        compact ? 'w-64 px-4 py-3 space-y-3' : 'w-80 px-5 py-4 space-y-4',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={cx('uppercase text-white/50', compact ? 'text-[10px] tracking-[0.35em]' : 'text-xs tracking-[0.25em]')}>
            Explorer Level
          </p>
          <p className={cx('font-semibold text-white', compact ? 'text-lg' : 'text-xl')}>Level {level}</p>
        </div>
        <div className={cx('text-right text-white/60', compact ? 'text-[11px]' : 'text-xs')}>
          <p>{xp} XP</p>
          <p>
            Next: {xpIntoLevel}/{xpRequired} XP
          </p>
        </div>
      </div>
      <div className={cx(compact ? 'mt-1.5 h-1.5' : 'mt-2 h-2', 'w-full rounded-full bg-white/10 overflow-hidden')}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 transition-all duration-500"
          style={{ width: `${Math.min(100, progress * 100)}%` }}
        />
      </div>

      <div className={cx(compact ? 'space-y-2.5' : 'mt-4 space-y-3')}>
        {displayedQuests.map((quest) => {
          const percent = getProgressPercentage(quest.progress || 0, quest.target)
          const isLocked = !quest.unlocked
          const isComplete = quest.completed
          const canClaim = quest.completed && !quest.claimed

          return (
            <div key={quest.id} className={cx('rounded-2xl border border-white/10 bg-white/5', compact ? 'px-3 py-2.5' : 'px-4 py-3')}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className={cx('font-semibold text-white', compact ? 'text-[13px]' : 'text-sm')}>{quest.title}</p>
                  <p className={cx('text-white/60', compact ? 'text-[11px]' : 'text-xs')}>{quest.description}</p>
                </div>
                <span className={cx('font-semibold text-white/70', compact ? 'text-[11px]' : 'text-xs')}>
                  {quest.progress ?? 0}/{quest.target}
                </span>
              </div>
              <div className={cx(compact ? 'mt-2 h-1' : 'mt-2 h-1.5', 'rounded-full bg-white/10 overflow-hidden')}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-emerald-400' : 'bg-indigo-400/90'}`}
                  style={{ width: `${isLocked ? 0 : percent}%` }}
                />
              </div>
              <div className={cx('mt-2 flex items-center justify-between text-white/70', compact ? 'text-[11px]' : 'text-xs')}>
                <span className="truncate">
                  {isLocked && 'Locked'}
                  {isComplete && quest.claimed && 'Reward claimed'}
                  {canClaim && 'Completed! Claim reward'}
                  {!isLocked && !isComplete && `${percent}%`}
                </span>
                <span className="font-semibold text-amber-300">+{quest.xpReward} XP</span>
              </div>
              {canClaim && (
                <button
                  type="button"
                  onClick={() => claimQuestReward(quest.id)}
                  className={cx(
                    'mt-2 w-full rounded-xl bg-emerald-500/90 text-white font-semibold hover:bg-emerald-400/90 transition',
                    compact ? 'px-3 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
                  )}
                >
                  Claim Reward
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
