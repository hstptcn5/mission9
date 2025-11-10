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
        'rounded-3xl border border-white/25 bg-gradient-to-br from-indigo-900/95 via-purple-900/92 to-blue-900/90 text-white shadow-[0_24px_55px_rgba(16,9,60,0.4)] backdrop-blur-2xl',
        'ring-1 ring-white/10',
        compact ? 'w-64 px-4 py-3 space-y-3' : 'w-80 px-5 py-4 space-y-4',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p
            className={cx(
              'uppercase tracking-[0.35em] text-[11px] font-semibold',
              compact ? 'text-indigo-200/90' : 'text-indigo-100/90'
            )}
          >
            Explorer Level
          </p>
          <p className={cx('font-bold', compact ? 'text-2xl text-white' : 'text-[26px] text-white')}>
            <span className="text-indigo-200/90 font-light mr-1">Level</span>
            {level}
          </p>
        </div>
        <div className={cx('text-right text-indigo-100/80 font-medium', compact ? 'text-[11px]' : 'text-sm')}>
          <p className="uppercase tracking-[0.25em] text-[10px] text-indigo-200/80">Total XP</p>
          <p className="text-white">{xp.toLocaleString()} XP</p>
          <p className="text-indigo-100/70">
            Next: {xpIntoLevel}/{xpRequired} XP
          </p>
        </div>
      </div>
      <div
        className={cx(
          compact ? 'mt-2 h-2' : 'mt-3 h-3',
          'w-full rounded-full bg-gradient-to-r from-indigo-950/60 to-purple-950/60 overflow-hidden ring-1 ring-white/5'
        )}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-indigo-400 to-fuchsia-400 transition-[width] duration-500 shadow-[0_0_10px_rgba(129,140,248,0.6)]"
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
            <div
              key={quest.id}
              className={cx(
                'rounded-2xl border border-white/12 bg-white/[0.07] backdrop-blur-xl shadow-[0_12px_30px_rgba(10,5,40,0.35)]',
                compact ? 'px-3.5 py-3 space-y-2' : 'px-4.5 py-3.5 space-y-2.5'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className={cx('font-semibold text-white drop-shadow', compact ? 'text-[14px]' : 'text-base')}>
                    {quest.title}
                  </p>
                  <p className={cx('text-indigo-100/80', compact ? 'text-[11px] leading-tight' : 'text-sm leading-snug')}>
                    {quest.description}
                  </p>
                </div>
                <span className={cx('font-semibold text-indigo-100', compact ? 'text-[12px]' : 'text-sm')}>
                  {quest.progress ?? 0}/{quest.target}
                </span>
              </div>
              <div className={cx(compact ? 'mt-2 h-1' : 'mt-2 h-1.5', 'rounded-full bg-white/10 overflow-hidden')}>
                <div
                  className={cx(
                    'h-full rounded-full shadow-[0_0_12px_rgba(59,130,246,0.55)] transition-[width] duration-500',
                    isComplete ? 'bg-emerald-400' : 'bg-sky-400/90'
                  )}
                  style={{ width: `${isLocked ? 0 : percent}%` }}
                />
              </div>
              <div
                className={cx(
                  'mt-1.5 flex items-center justify-between text-indigo-100/80 font-medium',
                  compact ? 'text-[11px]' : 'text-sm'
                )}
              >
                <span className="truncate uppercase tracking-[0.22em] text-[10px] text-indigo-200/80">
                  {isLocked && 'Locked'}
                  {isComplete && quest.claimed && 'Reward claimed'}
                  {canClaim && 'Completed – Claim reward'}
                  {!isLocked && !isComplete && `${percent}% Complete`}
                </span>
                <span className="rounded-full bg-amber-400/20 px-2 py-[2px] text-amber-200/90 shadow-[0_0_8px_rgba(251,191,36,0.45)]">
                  +{quest.xpReward} XP
                </span>
              </div>
              {canClaim && (
                <button
                  type="button"
                  onClick={() => claimQuestReward(quest.id)}
                  className={cx(
                    'mt-2 w-full rounded-xl bg-emerald-500/90 text-white font-semibold hover:bg-emerald-400/90 transition shadow-[0_12px_20px_rgba(16,185,129,0.35)]',
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
