import { memo, useMemo } from 'react'
import { getDappById } from '../utils/dappsData'

function BadgeInventory({ open, onClose, badgeIds = [] }) {
  const badgeDetails = useMemo(() => {
    return badgeIds
      .map((id) => getDappById(id))
      .filter(Boolean)
      .map((dapp) => ({
        id: dapp.id,
        name: dapp.name,
        logoImage: dapp.logoImage,
        projectType: dapp.projectType,
        categories: dapp.categories,
      }))
  }, [badgeIds])

  if (!open) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex justify-end">
      <div className="pointer-events-auto relative top-24 right-6 w-72 rounded-3xl border border-white/20 bg-white/90 shadow-[0_30px_80px_rgba(17,12,79,0.45)] backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/30">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-indigo-500">Badge Kit</p>
            <p className="text-lg font-semibold text-slate-900">{badgeDetails.length} collected</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-indigo-200 bg-indigo-100/60 px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-100"
          >
            Close
          </button>
        </div>
        <div className="max-h-[420px] overflow-y-auto px-4 py-3 space-y-3">
          {badgeDetails.length === 0 && (
            <p className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/70 px-3 py-3 text-xs text-indigo-600">
              You haven&apos;t claimed any badges yet. Complete quizzes to fill your kit.
            </p>
          )}
          {badgeDetails.map((badge) => (
            <div key={badge.id} className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-white px-3 py-2 shadow-sm">
              {badge.logoImage ? (
                <img src={badge.logoImage} alt={`${badge.name} logo`} className="h-9 w-9 rounded-xl border border-indigo-200 bg-white object-cover" />
              ) : (
                <div className="h-9 w-9 rounded-xl border border-indigo-200 bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-semibold">
                  {badge.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{badge.name}</p>
                <p className="text-[10px] uppercase tracking-wide text-indigo-500">{badge.projectType}</p>
                {badge.categories?.length ? (
                  <p className="text-[10px] text-indigo-400">#{badge.categories.slice(0, 2).join(' #')}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default memo(BadgeInventory)

