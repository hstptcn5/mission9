import { useEffect, useState } from 'react'

export default function LoadingScreen({ onComplete }) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading time - adjust duration as needed
    const timer = setTimeout(() => {
      setLoading(false)
      if (onComplete) {
        setTimeout(onComplete, 300) // Small delay for fade out
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [onComplete])

  if (!loading && onComplete) {
    return null
  }

  return (
    <div
      className={`fixed inset-0 z-50 w-screen h-screen transition-opacity duration-500 ${
        loading ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Full Screen Background Image */}
      <div className="absolute inset-0 w-full h-full">
        <img
          src="/loading.png"
          alt="Loading"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Overlay with Controls Guide */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div className="w-full max-w-4xl mx-auto px-6 py-8">
          {/* Controls Guide */}
          <div className="w-full rounded-2xl border border-white/20 bg-gradient-to-br from-black/80 via-purple-900/80 to-blue-900/80 text-white shadow-[0_30px_70px_rgba(8,4,40,0.75)] backdrop-blur-xl p-6 md:p-8">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 text-indigo-100 drop-shadow-lg">
              Controls & Hotkeys
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm md:text-base">
              {/* Movement */}
              <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <h3 className="font-semibold text-indigo-200 mb-2 uppercase tracking-wide text-sm md:text-base">
                  Movement
                </h3>
                <ul className="space-y-1.5 text-indigo-100/90">
                  <li>
                    <kbd className="px-2 py-1 bg-white/20 rounded text-xs font-mono border border-white/30">W A S D</kbd> or{' '}
                    <kbd className="px-2 py-1 bg-white/20 rounded text-xs font-mono border border-white/30">Arrow Keys</kbd>{' '}
                    - Move
                  </li>
                  <li>
                    <kbd className="px-2 py-1 bg-white/20 rounded text-xs font-mono border border-white/30">Mouse</kbd> - Look
                    around
                  </li>
                </ul>
              </div>

              {/* Interaction */}
              <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <h3 className="font-semibold text-indigo-200 mb-2 uppercase tracking-wide text-sm md:text-base">
                  Interaction
                </h3>
                <ul className="space-y-1.5 text-indigo-100/90">
                  <li>
                    <kbd className="px-2 py-1 bg-white/20 rounded text-xs font-mono border border-white/30">Space</kbd> -
                    Visit dApp
                  </li>
                  <li>
                    <kbd className="px-2 py-1 bg-white/20 rounded text-xs font-mono border border-white/30">F</kbd> - Toggle
                    dApp info
                  </li>
                  <li>
                    <kbd className="px-2 py-1 bg-white/20 rounded text-xs font-mono border border-white/30">Q</kbd> - Open
                    quiz
                  </li>
                </ul>
              </div>

              {/* Overlays */}
              <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <h3 className="font-semibold text-indigo-200 mb-2 uppercase tracking-wide text-sm md:text-base">
                  Overlays
                </h3>
                <ul className="space-y-1.5 text-indigo-100/90">
                  <li>
                    <kbd className="px-2 py-1 bg-white/20 rounded text-xs font-mono border border-white/30">B</kbd> - Toggle
                    badge kit
                  </li>
                  <li>
                    <kbd className="px-2 py-1 bg-white/20 rounded text-xs font-mono border border-white/30">L</kbd> - Toggle
                    leaderboard
                  </li>
                </ul>
              </div>

              {/* Selfie */}
              <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <h3 className="font-semibold text-indigo-200 mb-2 uppercase tracking-wide text-sm md:text-base">
                  Selfie Mode
                </h3>
                <ul className="space-y-1.5 text-indigo-100/90">
                  <li>
                    <kbd className="px-2 py-1 bg-white/20 rounded text-xs font-mono border border-white/30">P</kbd> - Capture
                    selfie
                  </li>
                  <li>
                    <kbd className="px-2 py-1 bg-white/20 rounded text-xs font-mono border border-white/30">O</kbd> - Preview
                    selfie
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/20 text-center">
              <p className="text-sm md:text-base text-indigo-100/90 animate-pulse drop-shadow-lg">
                Loading your gallery experience...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

