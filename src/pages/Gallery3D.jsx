import { Canvas } from '@react-three/fiber'
import { OrbitControls, Float, Html, Stars, Environment } from '@react-three/drei'
import { useMemo } from 'react'
import { dAppsData } from '../utils/dappsData'

const MAX_FEATURED = 24
const RADIUS = 8

const isSocialLink = (link = '') =>
  /(x\.com|twitter\.com|warpcast|farcaster|discord\.com|t\.me|telegram|linkedin\.com|medium\.com|mirror\.xyz|github\.com)/i.test(
    link
  )

function PanelHtml({ dapp }) {
  const categories = Array.isArray(dapp.categories) ? dapp.categories : []
  const socials = Array.isArray(dapp.socials)
    ? dapp.socials.filter((link) => isSocialLink(link))
    : []

  return (
    <div className="pointer-events-auto w-56 rounded-3xl border border-white/15 bg-[#0b0420dd] p-4 text-white shadow-[0_15px_35px_rgba(10,8,40,0.35)] backdrop-blur">
      <div className="flex items-center gap-3 mb-3">
        {dapp.logoImage && (
          <img
            src={dapp.logoImage}
            alt={`${dapp.name} logo`}
            className="h-9 w-9 rounded-xl border border-white/20 object-cover"
          />
        )}
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">
            {dapp.projectType || 'Project'}
          </p>
          <h3 className="text-lg font-semibold leading-tight">{dapp.name}</h3>
        </div>
      </div>
      <p className="text-xs text-white/70 leading-relaxed mb-3 min-h-[48px]">
        {dapp.description}
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {categories.slice(0, 3).map((category) => (
          <span
            key={`${dapp.id}-tag-${category}`}
            className="px-2 py-1 text-[11px] uppercase tracking-wide rounded-full bg-white/10 border border-white/15"
          >
            {category}
          </span>
        ))}
        {dapp.onlyOnMonad && (
          <span className="px-2 py-1 text-[11px] uppercase tracking-wide rounded-full bg-emerald-400/20 border border-emerald-300/40 text-emerald-100">
            Only on Monad
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {dapp.url && (
          <a
            href={dapp.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex justify-center px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-xs font-semibold hover:from-purple-500 hover:to-purple-400"
          >
            Visit
          </a>
        )}
        {socials.length > 0 && (
          <div className="flex gap-1">
            {socials.slice(0, 2).map((link) => (
              <a
                key={`${dapp.id}-${link}`}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10 border border-white/15 text-sm"
                title={link}
              >
                🌐
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DappPanel({ dapp, index, total }) {
  const angle = (index / total) * Math.PI * 2
  const x = Math.cos(angle) * RADIUS
  const z = Math.sin(angle) * RADIUS
  const rotation = [0, -angle + Math.PI / 2, 0]
  const hue = Math.floor((index / total) * 360)

  return (
    <Float speed={1.2} rotationIntensity={0.25} floatIntensity={0.6} swayIntensity={0.3}>
      <group position={[x, 0, z]} rotation={rotation}>
        <mesh castShadow receiveShadow position={[0, 1.1, 0]}>
          <planeGeometry args={[2.6, 1.7]} />
          <meshStandardMaterial
            color={`hsl(${hue}, 55%, 45%)`}
            metalness={0.35}
            roughness={0.35}
            emissive={`hsl(${hue}, 45%, 25%)`}
            emissiveIntensity={0.2}
          />
        </mesh>
        <Html
          center
          distanceFactor={8}
          wrapperClass="pointer-events-none"
          position={[0, 1.1, 0.06]}
          transform
          occlude
        >
          <PanelHtml dapp={dapp} />
        </Html>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
          <circleGeometry args={[1.6, 48]} />
          <meshStandardMaterial
            color={`hsl(${hue}, 60%, 18%)`}
            emissive={`hsl(${hue}, 50%, 12%)`}
            emissiveIntensity={0.25}
          />
        </mesh>
      </group>
    </Float>
  )
}

export default function Gallery3D({ walletConnected, walletAddress }) {
  const featured = useMemo(
    () => dAppsData.filter((dapp) => !dapp.hidden).slice(0, MAX_FEATURED),
    []
  )

  return (
    <div className="relative min-h-[calc(100vh-120px)] mt-8">
      <div className="absolute inset-0 rounded-[40px] border border-white/10 bg-gradient-to-br from-[#05021a] via-[#070322] to-[#05021a] shadow-[0_30px_80px_rgba(6,2,28,0.65)] overflow-hidden">
        <Canvas shadows camera={{ position: [0, 4, 12], fov: 45 }}>
          <color attach="background" args={[0x040016]} />
          <ambientLight intensity={0.4} />
          <directionalLight
            castShadow
            position={[8, 12, 6]}
            intensity={1}
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <Environment preset="night" />
          <Stars radius={80} depth={40} count={700} factor={4} fade speed={1.5} />

          <group position={[0, -0.6, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <circleGeometry args={[RADIUS + 3, 64]} />
              <meshStandardMaterial color="#0b0522" roughness={0.8} metalness={0.1} />
            </mesh>
          </group>

          {featured.map((dapp, index) => (
            <DappPanel key={dapp.id} dapp={dapp} index={index} total={featured.length} />
          ))}

          <OrbitControls
            enablePan={false}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={(3 * Math.PI) / 5}
            maxDistance={16}
            minDistance={6}
          />
        </Canvas>
      </div>

      <div className="pointer-events-none absolute top-10 left-1/2 -translate-x-1/2 text-center text-white/80 space-y-2">
        <h2 className="text-2xl font-semibold tracking-wide">Chog's 3D Gallery</h2>
        <p className="text-sm text-white/60">
          Drag to orbit • Scroll to zoom • Hover a panel to see more • Click buttons/links to open new tab
        </p>
      </div>
    </div>
  )
}

