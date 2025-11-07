import { useState, useRef } from 'react'
import Sketch from 'react-p5'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuestStore } from '../store/questStore'

export default function ArtPortrait({ dapp, onVote, onCollect, walletConnected }) {
  const [isGlitching, setIsGlitching] = useState(false)
  const [showChogBubble, setShowChogBubble] = useState(false)
  const canvasRef = useRef(null)
  const { questProgress } = useQuestStore()

  const categories = Array.isArray(dapp.categories)
    ? dapp.categories
    : dapp.category
      ? [dapp.category]
      : []

  const socialLinks = Array.isArray(dapp.socials) ? dapp.socials : []

  const getSocialIcon = (link) => {
    const lower = link.toLowerCase()
    if (lower.includes('x.com') || lower.includes('twitter')) return '𝕏'
    if (lower.includes('warpcast') || lower.includes('farcaster')) return '🌀'
    if (lower.includes('discord')) return '💬'
    if (lower.includes('telegram') || lower.includes('t.me')) return '📣'
    if (lower.includes('linkedin')) return '🔗'
    if (lower.includes('medium') || lower.includes('mirror.xyz')) return '✍️'
    if (lower.includes('github') || lower.includes('gitbook')) return '🐙'
    return '🌐'
  }

  // p5.js sketch setup
  const setup = (p5, canvasParentRef) => {
    p5.createCanvas(400, 400).parent(canvasParentRef)
    p5.colorMode(p5.HSB, 360, 100, 100)
    p5.background(280, 50, 20) // Monad purple
    generateArt(p5, dapp)
  }

  const generateArt = (p5, dappData) => {
    const { tvl = 1500000, users = 5000 } = dappData
    
    // Map TVL to hue (0-360)
    const hue = p5.map(tvl, 0, 5000000, 200, 300) // Purple to blue range
    const saturation = p5.map(users, 0, 10000, 30, 100)
    const brightness = p5.map(tvl, 0, 5000000, 40, 90)
    
    p5.background(hue, saturation * 0.3, brightness * 0.3)
    
    // Generate strokes based on user count
    const strokeCount = Math.floor(users / 100)
    p5.stroke(hue, saturation, brightness)
    p5.strokeWeight(2)
    p5.noFill()
    
    // Create swirling patterns
    for (let i = 0; i < strokeCount; i++) {
      const angle = (i / strokeCount) * p5.TWO_PI * 5
      const radius = p5.map(i, 0, strokeCount, 50, 200)
      const x = p5.width / 2 + p5.cos(angle) * radius
      const y = p5.height / 2 + p5.sin(angle) * radius
      const nextX = p5.width / 2 + p5.cos(angle + 0.1) * (radius + 10)
      const nextY = p5.height / 2 + p5.sin(angle + 0.1) * (radius + 10)
      p5.line(x, y, nextX, nextY)
    }
    
    // Add TVL-based golden accents
    if (tvl > 1000000) {
      p5.fill(hue + 30, 80, 100, 0.3)
      p5.noStroke()
      for (let i = 0; i < 20; i++) {
        p5.ellipse(
          p5.random(p5.width),
          p5.random(p5.height),
          p5.random(10, 30)
        )
      }
    }
    
    // Chog silhouette overlay (simplified - would use actual Chog image)
    p5.fill(hue, 20, 100, 0.2)
    p5.noStroke()
    p5.ellipse(p5.width / 2, p5.height / 2, 150, 150)
  }

  const draw = (p5) => {
    // Static art, no animation needed
    if (!p5.isLooping()) {
      p5.noLoop()
    }
  }

  const handleMouseEnter = () => {
    if (questProgress.glitchUnlocked && dapp.hidden) {
      setIsGlitching(true)
      setTimeout(() => setIsGlitching(false), 500)
    }
    setShowChogBubble(true)
    setTimeout(() => setShowChogBubble(false), 3000)
  }

  const handleVote = async () => {
    if (!walletConnected) {
      alert('Please connect your wallet first!')
      return
    }
    await onVote(dapp.id)
  }

  const handleCollect = async () => {
    if (!walletConnected) {
      alert('Please connect your wallet first!')
      return
    }
    await onCollect(dapp.id)
  }

  const chogMessages = [
    `This dApp has high TVL, like my favorite paint color! 🎨`,
    `So many users! The art is getting complex! ✨`,
    `This one feels special... can you feel it? 🌟`,
    `I love painting DeFi protocols! They're so vibrant! 💜`,
  ]

  const randomMessage = chogMessages[Math.floor(Math.random() * chogMessages.length)]

  const headerStyle = dapp.bannerImage
    ? {
        backgroundImage: `linear-gradient(140deg, rgba(12,7,40,0.75), rgba(17,10,44,0.35)), url(${dapp.bannerImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        background: 'linear-gradient(140deg, rgba(46,20,82,0.7), rgba(19,32,85,0.6))',
      }

  return (
    <motion.div
      className="art-portrait relative flex flex-col bg-white/8 backdrop-blur-md border border-white/15 rounded-3xl overflow-hidden shadow-[0_25px_50px_rgba(15,10,45,0.45)]"
      onHoverStart={handleMouseEnter}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <div className="relative h-32" style={headerStyle}>
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-[#100a2b]/40 to-[#0b0420]" />
        {dapp.logoImage && (
          <div className="absolute left-6 bottom-0 translate-y-1/2">
            <img
              src={dapp.logoImage}
              alt={`${dapp.name} logo`}
              className="h-16 w-16 rounded-2xl border-4 border-[#0b0420] shadow-lg object-cover"
            />
          </div>
        )}
        {dapp.projectType && (
          <div className="absolute right-6 bottom-3 text-xs uppercase tracking-[0.2em] text-white/70">
            {dapp.projectType}
          </div>
        )}
      </div>

      <div className={`flex flex-col gap-5 px-6 pt-10 pb-6 ${isGlitching ? 'glitch-effect' : ''}`}>
        <div className="relative rounded-2xl border border-white/10 bg-[#0b0420]/70 p-3 shadow-inner overflow-hidden">
          <div ref={canvasRef} className="rounded-xl overflow-hidden border border-white/5 bg-black/30">
            <Sketch setup={setup} draw={draw} />
          </div>

          {dapp.hidden && questProgress.glitchUnlocked && (
            <motion.div
              className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: isGlitching ? 1 : 0 }}
            >
              <div className="text-white text-center p-4">
                <p className="text-2xl font-extrabold mb-2 tracking-tight">✨ Hidden Gem Revealed ✨</p>
                <p className="text-lg font-medium">{dapp.name}</p>
              </div>
            </motion.div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-2xl font-semibold text-white tracking-tight">{dapp.name}</h3>
            <p className="text-white/65 text-sm leading-relaxed min-h-[54px] mt-1">
              {dapp.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <span
                key={`${dapp.id}-${category}`}
                className="px-3 py-1 rounded-full border border-white/15 bg-white/12 text-[11px] uppercase tracking-wide text-white/80"
              >
                {category}
              </span>
            ))}
            {dapp.onlyOnMonad && (
              <span className="px-3 py-1 rounded-full border border-emerald-300/50 bg-emerald-400/20 text-[11px] uppercase tracking-wide text-emerald-100">
                Only on Monad
              </span>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showChogBubble && (
            <motion.div
              className="chog-bubble mb-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <p className="text-sm text-gray-800">🐕 Chog: {randomMessage}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-3">
          <button
            onClick={handleVote}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white text-sm font-semibold shadow-lg shadow-purple-900/30 hover:from-purple-500 hover:to-purple-400 transition"
          >
            👍 Vote
          </button>
          <button
            onClick={handleCollect}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-900/25 hover:from-blue-500 hover:to-blue-400 transition"
          >
            🎨 Collect
          </button>
        </div>

        {dapp.url && (
          <a
            href={dapp.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center text-sm text-white/70 hover:text-white underline underline-offset-4 transition"
          >
            Visit dApp →
          </a>
        )}

        {socialLinks.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
            {socialLinks.map((link) => (
              <a
                key={`${dapp.id}-${link}`}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 w-8 flex items-center justify-center rounded-full bg-white/12 border border-white/15 text-sm text-white hover:bg-white/25 transition"
                title={link}
              >
                {getSocialIcon(link)}
              </a>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

