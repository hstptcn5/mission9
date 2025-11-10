import { memo, useMemo } from 'react'
import { getDappById } from '../utils/dappsData'
import { achievementDefinitions } from '../achievements/definitions'

function BadgeInventory({ open, onClose, badgeIds = [], achievements = [], inline = false }) {
  const badgeDetails = useMemo(() => {
    return badgeIds
      .map((id) => getDappById(id))
      .filter(Boolean)
      .map((dapp) => ({
        id: dapp.id,
        name: dapp.name,
        logoImage: dapp.logoImage,
      }))
  }, [badgeIds])

  const unlockedSet = useMemo(() => new Set(achievements), [achievements])
  const unlockedAchievements = useMemo(() => achievementDefinitions.filter((item) => unlockedSet.has(item.id)), [unlockedSet])
  const nextAchievement = useMemo(
    () => achievementDefinitions.find((item) => !unlockedSet.has(item.id)),
    [unlockedSet]
  )

  const totalAchievements = achievementDefinitions.length

  if (!open) return null

  const containerClasses = inline
    ? 'pointer-events-auto relative top-4 left-4 w-[1560px] rounded-3xl border border-white/20 bg-white/92 shadow-[0_30px_80px_rgba(17,12,79,0.35)] backdrop-blur space-y-4'
    : 'pointer-events-auto relative top-12 right-10 w-[min(900px,94vw)] rounded-3xl border border-white/25 bg-white/97 shadow-[0_45px_120px_rgba(15,13,70,0.45)] backdrop-blur space-y-5'
  const wrapperClasses = inline
    ? 'pointer-events-none absolute inset-0 z-30 flex items-start'
    : 'pointer-events-none fixed inset-0 z-40 flex justify-end items-start'

  return (
    <div className={wrapperClasses}>
      <div className={containerClasses}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/30">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-indigo-500">Badge Kit</p>
            <p className="text-lg font-semibold text-slate-900">{badgeDetails.length} collected</p>
          </div>
          {!inline && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-indigo-200 bg-indigo-100/60 px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-100"
            >
              Close
            </button>
          )}
        </div>
        <div className="px-4">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-3 py-3 text-xs text-indigo-600 space-y-1">
            {unlockedAchievements.length ? (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-500">Signature Title</p>
                <p className="text-[13px] font-semibold text-slate-900">
                  {unlockedAchievements[unlockedAchievements.length - 1].icon}{' '}
                  {unlockedAchievements[unlockedAchievements.length - 1].title}
                </p>
                <p>{unlockedAchievements[unlockedAchievements.length - 1].description}</p>
              </>
            ) : (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-500">No titles yet</p>
                <p>Complete quizzes and collect badges to unlock unique titles.</p>
              </>
            )}
            {nextAchievement && (
              <p className="text-[10px] text-indigo-400">
                Next: {nextAchievement.icon} {nextAchievement.title} — {nextAchievement.description}
              </p>
            )}
          </div>
        </div>
        <div className="px-5 pb-5 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-indigo-500 mb-2">Badge Collection</p>
            {badgeDetails.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/70 px-3 py-3 text-xs text-indigo-600">
                You haven&apos;t claimed any badges yet. Complete quizzes to fill your kit.
              </p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-3">
                {badgeDetails.map((badge) => (
                  <div
                    key={badge.id}
                    className="group flex h-20 w-20 items-center justify-center rounded-3xl border border-indigo-100 bg-white shadow-sm transition hover:shadow-md"
                    title={badge.name}
                  >
                    {badge.logoImage ? (
                      <img src={badge.logoImage} alt={`${badge.name} logo`} className="h-14 w-14 rounded-2xl border border-indigo-200 object-cover" />
                    ) : (
                      <span className="text-base font-semibold text-indigo-500">{badge.name.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.25em] text-indigo-500">Titles Earned</p>
              <span className="text-[10px] text-indigo-400">
                {unlockedAchievements.length}/{totalAchievements}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 max-h-[220px] overflow-y-auto pr-1">
              {unlockedAchievements.length === 0 && (
                <p className="rounded-xl border border-indigo-100 bg-white px-3 py-2 text-xs text-indigo-500">
                  Unlock titles by gathering badges and XP.
                </p>
              )}
              {unlockedAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`flex items-start gap-3 rounded-xl border border-white bg-gradient-to-r ${achievement.theme || 'from-purple-100 to-purple-200 text-purple-700'} px-3 py-2 shadow-sm`}
                >
                  <span className="text-lg leading-none">{achievement.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{achievement.title}</p>
                    <p className="text-[11px] text-slate-700/80">{achievement.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {!inline && (
            <div className="flex justify-end text-[10px] text-indigo-400">
              Tip: Press <span className="px-1 font-semibold text-indigo-600">B</span> in the maze to toggle this kit without leaving explore mode.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(BadgeInventory)

