import * as THREE from 'three'
import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import {
  Environment,
  Html,
  KeyboardControls,
  PointerLockControls,
  Stars,
  Text,
  useKeyboardControls,
  useTexture,
} from '@react-three/drei'
import { dAppsData } from '../utils/dappsData'

const MAZE_SIZE = 39
const START_CELL = { row: Math.floor(MAZE_SIZE / 2), col: Math.floor(MAZE_SIZE / 2) }

const mashSeed = (seedString) => {
  let seed = 0
  for (let i = 0; i < seedString.length; i += 1) {
    seed = (seed * 1664525 + seedString.charCodeAt(i) + 1013904223) >>> 0
  }
  return seed
}

const createSeededRNG = (seedString) => {
  let state = mashSeed(seedString)
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

const seededRandom = (seedString) => createSeededRNG(seedString)()

const createMazeLayout = (size) => {
  const rng = createSeededRNG('chog-maze-layout')
  const innerSize = size - 4
  const innerGrid = Array.from({ length: innerSize }, () => Array(innerSize).fill('#'))

  const directions = [
    [0, 2],
    [0, -2],
    [2, 0],
    [-2, 0],
  ]

  const shuffleDirections = () => directions.slice().sort(() => rng() - 0.5)

  const carve = (row, col) => {
    innerGrid[row][col] = '.'
    const shuffled = shuffleDirections()
    for (const [dr, dc] of shuffled) {
      const nextRow = row + dr
      const nextCol = col + dc
      if (nextRow <= 0 || nextRow >= innerSize - 1 || nextCol <= 0 || nextCol >= innerSize - 1) continue
      if (innerGrid[nextRow][nextCol] === '#') {
        innerGrid[row + dr / 2][col + dc / 2] = '.'
        carve(nextRow, nextCol)
      }
    }
  }

  carve(1, 1)

  for (let row = 2; row < innerSize - 2; row += 1) {
    for (let col = 2; col < innerSize - 2; col += 1) {
      if (innerGrid[row][col] === '#' && rng() < 0.09) {
        innerGrid[row][col] = '.'
      }
    }
  }

  const grid = Array.from({ length: size }, () => Array(size).fill('#'))
  for (let row = 0; row < innerSize; row += 1) {
    for (let col = 0; col < innerSize; col += 1) {
      grid[row + 2][col + 2] = innerGrid[row][col]
    }
  }

  return grid.map((line) => line.join(''))
}

const GUARANTEED_OPEN_CELLS = [[START_CELL.row, START_CELL.col]]

const MAZE_LAYOUT = (() => {
  const rows = createMazeLayout(MAZE_SIZE).map((row) => row.split(''))
  GUARANTEED_OPEN_CELLS.forEach(([r, c]) => {
    if (rows[r] && rows[r][c] !== undefined) rows[r][c] = '.'
  })
  return rows.map((row) => row.join(''))
})()

const CELL_SIZE = 3.3
const GRID_ROWS = MAZE_LAYOUT.length
const GRID_COLS = MAZE_LAYOUT[0].length
const HALF_WIDTH = ((GRID_COLS - 1) * CELL_SIZE) / 2
const HALF_DEPTH = ((GRID_ROWS - 1) * CELL_SIZE) / 2

const CAMERA_HEIGHT = 1.7
const MOVE_SPEED = 4.4

const keyboardMap = [
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
  { name: 'backward', keys: ['KeyS', 'ArrowDown'] },
  { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
  { name: 'right', keys: ['KeyD', 'ArrowRight'] },
]

const frontVector = new THREE.Vector3()
const sideVector = new THREE.Vector3()
const direction = new THREE.Vector3()
const LIGHT_SAMPLE_STEP = 60
const tempObject = new THREE.Object3D()

const ART_IMAGE_URLS = Object.values(
  import.meta.glob('../../getchog/assets/*.jpg', { eager: true, query: '?url', import: 'default' })
)

const layoutData = (() => {
  const walkableCells = []
  const wallCells = []
  const walkableKeys = new Set()
  const cellMap = new Map()
  const exhibitSpots = []

  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const char = MAZE_LAYOUT[row][col]
      const key = `${row}:${col}`
      const x = col * CELL_SIZE - HALF_WIDTH
      const z = row * CELL_SIZE - HALF_DEPTH
      const position = [x, 0, z]
      cellMap.set(key, { row, col, position })

      if (char === '#') {
        wallCells.push({ key, row, col, position })
      } else {
        walkableCells.push({ key, row, col, position })
        walkableKeys.add(key)
      }
    }
  }

  const wallThickness = CELL_SIZE * 0.98
  const panelGap = 0.06
  const lateralSpread = 0.35
  const neighborDefs = [
    { name: 'north', dr: -1, dc: 0, forward: [0, 0, -1] },
    { name: 'south', dr: 1, dc: 0, forward: [0, 0, 1] },
    { name: 'east', dr: 0, dc: 1, forward: [1, 0, 0] },
    { name: 'west', dr: 0, dc: -1, forward: [-1, 0, 0] },
  ]

  walkableCells.forEach((cell) => {
    neighborDefs.forEach((def) => {
      const nr = cell.row + def.dr
      const nc = cell.col + def.dc
      if (nr < 0 || nr >= GRID_ROWS || nc < 0 || nc >= GRID_COLS) return
      if (MAZE_LAYOUT[nr][nc] !== '#') return

      const forward = new THREE.Vector3(...def.forward)
      const lateral = new THREE.Vector3(forward.z, 0, -forward.x).normalize()
      const wallCell = cellMap.get(`${nr}:${nc}`)
      if (!wallCell) return
      const wallCenter = new THREE.Vector3(...wallCell.position)
      const surfacePoint = wallCenter
        .clone()
        .add(forward.clone().multiplyScalar(-(wallThickness * 0.5 + panelGap)))
      const jitter = (seededRandom(`${cell.key}:${def.name}`) - 0.5) * lateralSpread
      surfacePoint.add(lateral.multiplyScalar(jitter))
      surfacePoint.y = 1.45

      exhibitSpots.push({
        key: `${cell.key}:${def.name}`,
        row: cell.row,
        col: cell.col,
        position: [surfacePoint.x, surfacePoint.y, surfacePoint.z],
        rotation: [0, Math.atan2(-forward.x, -forward.z), 0],
        mapPosition: [cell.position[0], cell.position[2]],
      })
    })
  })

  return { walkableCells, wallCells, walkableKeys, cellMap, exhibitSpots }
})()

function positionToCell(x, z) {
  const col = Math.round((x + HALF_WIDTH) / CELL_SIZE)
  const row = Math.round((z + HALF_DEPTH) / CELL_SIZE)
  return { row, col }
}

function isWalkable(row, col) {
  return layoutData.walkableKeys.has(`${row}:${col}`)
}

function VisitorRig() {
  const [, getKeys] = useKeyboardControls()
  const velocity = useRef(new THREE.Vector3())
  const prevPosition = useRef(new THREE.Vector3())

  useFrame((state, delta) => {
    const { forward, backward, left, right } = getKeys()

    prevPosition.current.copy(state.camera.position)
    frontVector.set(0, 0, Number(backward) - Number(forward))
    sideVector.set(Number(right) - Number(left), 0, 0)

    direction.subVectors(frontVector, sideVector)

    if (direction.lengthSq() > 0) {
      direction.normalize().applyQuaternion(state.camera.quaternion)
      velocity.current.addScaledVector(direction, MOVE_SPEED * delta)
    }

    state.camera.position.add(velocity.current)
    state.camera.position.y = CAMERA_HEIGHT

    const current = state.camera.position
    const { row, col } = positionToCell(current.x, current.z)
    if (!isWalkable(row, col)) {
      const cellSlideX = positionToCell(current.x, prevPosition.current.z)
      const cellSlideZ = positionToCell(prevPosition.current.x, current.z)
      const canSlideX = isWalkable(cellSlideX.row, cellSlideX.col)
      const canSlideZ = isWalkable(cellSlideZ.row, cellSlideZ.col)

      if (canSlideX && !canSlideZ) {
        state.camera.position.set(current.x, CAMERA_HEIGHT, prevPosition.current.z)
      } else if (!canSlideX && canSlideZ) {
        state.camera.position.set(prevPosition.current.x, CAMERA_HEIGHT, current.z)
      } else if (canSlideX && canSlideZ) {
        const distX = Math.abs(current.z - prevPosition.current.z)
        const distZ = Math.abs(current.x - prevPosition.current.x)
        if (distX < distZ) {
          state.camera.position.set(current.x, CAMERA_HEIGHT, prevPosition.current.z)
        } else {
          state.camera.position.set(prevPosition.current.x, CAMERA_HEIGHT, current.z)
        }
      } else {
        state.camera.position.copy(prevPosition.current)
      }
      velocity.current.set(0, 0, 0)
    } else {
      velocity.current.multiplyScalar(0.82)
    }
  })

  return null
}

function WallSegments({ cells }) {
  const instancedRef = useRef(null)
  const materialRef = useRef(null)

  useEffect(() => {
    if (!instancedRef.current) return
    cells.forEach((cell, idx) => {
      tempObject.position.set(cell.position[0], 1.9, cell.position[2])
      tempObject.rotation.set(0, 0, 0)
      tempObject.scale.set(1, 1, 1)
      tempObject.updateMatrix()
      instancedRef.current.setMatrixAt(idx, tempObject.matrix)
    })
    instancedRef.current.instanceMatrix.needsUpdate = true
  }, [cells])

  useFrame(({ clock }) => {
    if (!materialRef.current) return
    const pulse = 0.35 + Math.sin(clock.elapsedTime * 1.2) * 0.12
    materialRef.current.emissiveIntensity = pulse
  })

  return (
    <instancedMesh ref={instancedRef} args={[null, null, cells.length]} castShadow receiveShadow>
      <boxGeometry args={[CELL_SIZE * 0.98, 3.9, CELL_SIZE * 0.98]} />
      <meshStandardMaterial
        ref={materialRef}
        color="#4d60ff"
        roughness={0.35}
        metalness={0.3}
        emissive="#8ea5ff"
        emissiveIntensity={0.35}
      />
    </instancedMesh>
  )
}

function PlazaGround() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} receiveShadow>
        <planeGeometry args={[GRID_COLS * CELL_SIZE + 22, GRID_ROWS * CELL_SIZE + 22]} />
        <meshStandardMaterial color="#1c174d" roughness={0.75} metalness={0.12} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} receiveShadow>
        <planeGeometry args={[GRID_COLS * CELL_SIZE + 6, GRID_ROWS * CELL_SIZE + 6]} />
        <meshStandardMaterial
          color="#2e1d85"
          roughness={0.45}
          metalness={0.4}
          emissive="#6f5bff"
          emissiveIntensity={0.14}
        />
      </mesh>
    </group>
  )
}

function WalkableTiles({ cells }) {
  const instancedRef = useRef(null)

  useEffect(() => {
    if (!instancedRef.current) return
    cells.forEach((cell, idx) => {
      tempObject.position.set(cell.position[0], 0.001, cell.position[2])
      tempObject.rotation.set(-Math.PI / 2, 0, 0)
      tempObject.scale.set(1, 1, 1)
      tempObject.updateMatrix()
      instancedRef.current.setMatrixAt(idx, tempObject.matrix)
    })
    instancedRef.current.instanceMatrix.needsUpdate = true
  }, [cells])

  return (
    <instancedMesh ref={instancedRef} args={[null, null, cells.length]} receiveShadow>
      <planeGeometry args={[CELL_SIZE * 0.98, CELL_SIZE * 0.98]} />
      <meshStandardMaterial color="#1f1452" roughness={0.65} metalness={0.15} emissive="#331d7d" emissiveIntensity={0.18} />
    </instancedMesh>
  )
}

function MuseumShell({ width, depth }) {
  const shellWidth = width + 26
  const shellDepth = depth + 26
  const shellHeight = 14

  return (
    <group>
      <mesh scale={[shellWidth + 40, shellHeight + 20, shellDepth + 40]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          side={THREE.BackSide}
          color="#0b0b3a"
          emissive="#141461"
          emissiveIntensity={0.08}
        />
      </mesh>
      <mesh position={[0, shellHeight / 2 - 0.4, 0]} receiveShadow>
        <boxGeometry args={[shellWidth, shellHeight, shellDepth]} />
        <meshStandardMaterial
          side={THREE.BackSide}
          color="#0a0a28"
          roughness={0.85}
          metalness={0.05}
          emissive="#16145a"
          emissiveIntensity={0.18}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, shellHeight - 1.2, 0]} receiveShadow>
        <planeGeometry args={[shellWidth - 6, shellDepth - 6]} />
        <meshStandardMaterial color="#15123d" roughness={0.7} metalness={0.1} />
      </mesh>
    </group>
  )
}

function MazeLighting({ walkable }) {
  return (
    <group>
      {walkable
        .filter((_, idx) => idx % LIGHT_SAMPLE_STEP === 0)
        .map((cell) => (
          <group key={`light-${cell.key}`} position={[cell.position[0], 3.2, cell.position[2]]}>
            <pointLight color="#c7cffc" intensity={0.9} distance={6} decay={2.2} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]}>
              <circleGeometry args={[0.35, 16]} />
              <meshStandardMaterial
                color="#818cf8"
                emissive="#a5b4fc"
                emissiveIntensity={0.5}
                roughness={0.25}
                metalness={0.45}
              />
            </mesh>
          </group>
        ))}
    </group>
  )
}

function MinimapTracker({ onUpdate }) {
  const last = useRef(0)

  useFrame(({ camera, clock }) => {
    if (clock.elapsedTime - last.current > 0.05) {
      onUpdate({ x: camera.position.x, z: camera.position.z })
      last.current = clock.elapsedTime
    }
  })

  return null
}

function MinimapOverlay({ walkable, walls, exhibits, playerPos }) {
  const size = 260
  const margin = 18
  const cellW = (size - margin * 2) / GRID_COLS
  const cellH = (size - margin * 2) / GRID_ROWS

  const projectWorldToMinimap = (x, z) => {
    const col = (x + HALF_WIDTH) / CELL_SIZE
    const row = (z + HALF_DEPTH) / CELL_SIZE
    return {
      x: margin + col * cellW + cellW / 2,
      y: margin + row * cellH + cellH / 2,
    }
  }

  const player = projectWorldToMinimap(playerPos.x, playerPos.z)

  return (
    <div className="pointer-events-none absolute top-8 right-6">
      <div className="rounded-[28px] border border-white/24 bg-[#140d53]/92 p-4 shadow-[0_28px_60px_rgba(15,20,80,0.55)] backdrop-blur">
        <svg width={size} height={size}>
          <rect x={margin - 4} y={margin - 4} width={size - (margin - 4) * 2} height={size - (margin - 4) * 2} rx={18} fill="#1d228a" stroke="rgba(210,230,255,0.68)" strokeWidth={3.5} />

          {walkable.map((cell) => (
            <rect
              key={`walk-${cell.key}`}
              x={margin + cell.col * cellW + 0.5}
              y={margin + cell.row * cellH + 0.5}
              width={cellW - 1}
              height={cellH - 1}
              fill="rgba(106,136,255,0.72)"
              rx={Math.min(cellW, cellH) * 0.18}
            />
          ))}

          {walls.map((cell) => (
            <rect
              key={`wall-${cell.key}`}
              x={margin + cell.col * cellW}
              y={margin + cell.row * cellH}
              width={cellW}
              height={cellH}
              fill="rgba(25,16,60,0.94)"
            />
          ))}

          {exhibits.map((item) => {
            const pos = projectWorldToMinimap(item.minimap[0], item.minimap[1])
            return (
              <g key={`marker-${item.dapp.id}`}>
                <circle cx={pos.x} cy={pos.y} r={3.5} fill={item.color} stroke="white" strokeWidth={1} />
              </g>
            )
          })}

          <g>
            <circle cx={player.x} cy={player.y} r={7} fill="#fb923c" stroke="white" strokeWidth={2.4} />
            <path d={`M${player.x} ${player.y - 13} L${player.x - 6} ${player.y - 3} L${player.x + 6} ${player.y - 3} Z`} fill="#fb923c" stroke="white" strokeWidth={1} />
            <circle cx={player.x} cy={player.y} r={2.2} fill="#fff7ed" />
          </g>
        </svg>
      </div>
    </div>
  )
}

function DappExhibit({ dapp, position, rotation }) {
  const groupRef = useRef(null)
  const [active, setActive] = useState(false)
  const prevActive = useRef(false)
  const audioCtxRef = useRef(null)

  const playEnterTone = useCallback(async () => {
    if (typeof window === 'undefined') return
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return

    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioCtx()
    }

    const ctx = audioCtxRef.current
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch (error) {
        return
      }
    }

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.45)
    osc.onended = () => {
      gain.disconnect()
    }
  }, [])

  useEffect(() => () => {
    if (audioCtxRef.current && typeof audioCtxRef.current.close === 'function') {
      audioCtxRef.current.close()
    }
  }, [])

  useFrame(({ camera }) => {
    if (!groupRef.current) return
    const dist = groupRef.current.position.distanceTo(camera.position)
    if (dist < 3.8 && !active) setActive(true)
    if (dist >= 4.2 && active) setActive(false)
  })

  useEffect(() => {
    if (active && !prevActive.current) {
      playEnterTone()
    }
    prevActive.current = active
  }, [active, playEnterTone])

  const categories = Array.isArray(dapp.categories) ? dapp.categories : []

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <mesh position={[0, 0, 0]} rotation={[0, Math.PI, 0]} castShadow>
        <planeGeometry args={[1.75, 1.15]} />
        <meshStandardMaterial color="#eef2ff" roughness={0.8} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0, -0.035]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.9, 1.3]} />
        <meshStandardMaterial color="#4338ca" roughness={0.45} metalness={0.4} emissive="#6366f1" emissiveIntensity={0.25} />
      </mesh>
      <Text position={[0, 0.44, -0.04]} fontSize={0.18} color="#f8fafc" anchorX="center" anchorY="bottom">
        {dapp.name}
      </Text>
      <Text position={[0, 0.2, -0.04]} fontSize={0.11} color="#cbd5f5" anchorX="center" anchorY="middle">
        {dapp.projectType || (categories[0] ?? 'Project')}
      </Text>
      <Text position={[0, -0.16, -0.04]} fontSize={0.09} color="#e2e8f0" anchorX="center" anchorY="middle" maxWidth={1.4} lineHeight={1.3}>
        {(dapp.description || '').slice(0, 120)}
      </Text>
      {active && (
        <Html
          transform
          occlude
          zIndexRange={[1, 0]}
          wrapperClass="pointer-events-auto"
          position={[0, -0.85, -0.05]}
          className="[&>*]:rounded-2xl"
        >
          <div className="w-52 rounded-2xl border border-indigo-200 bg-white/95 p-3 shadow-xl text-gray-900">
            <h4 className="text-sm font-semibold mb-2">Interact with {dapp.name}</h4>
            <div className="flex flex-wrap gap-1 mb-2">
              {categories.slice(0, 3).map((cat) => (
                <span key={`${dapp.id}-tag-${cat}`} className="px-2 py-1 text-[10px] uppercase tracking-wide rounded-full bg-indigo-100 text-indigo-600">
                  {cat}
                </span>
              ))}
              {dapp.onlyOnMonad && (
                <span className="px-2 py-1 text-[10px] uppercase tracking-wide rounded-full bg-amber-100 text-amber-600">
                  Only on Monad
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {dapp.url && (
                <a
                  href={dapp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-xl bg-indigo-500 text-white text-xs font-semibold px-3 py-2 text-center hover:bg-indigo-400"
                >
                  Visit
                </a>
              )}
              <button className="flex-1 rounded-xl border border-indigo-400 text-indigo-500 text-xs font-semibold px-3 py-2">
                Quest +1
              </button>
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

function WallArtPanel({ position, rotation, textureUrl, frameColor }) {
  const texture = useTexture(textureUrl)

  useEffect(() => {
    if (!texture) return
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.anisotropy = 8
  }, [texture])

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.04]} castShadow>
        <planeGeometry args={[1.7, 1.2]} />
        <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.35} emissive={new THREE.Color(frameColor).multiplyScalar(0.4)} emissiveIntensity={0.45} />
      </mesh>
      <mesh castShadow>
        <planeGeometry args={[1.55, 1.05]} />
        <meshStandardMaterial map={texture} roughness={0.55} metalness={0.15} />
      </mesh>
    </group>
  )
}

const POPULAR_LIMIT = 30

export default function MuseumScene() {
  const popularDapps = useMemo(() => {
    return dAppsData
      .filter((dapp) => !dapp.hidden)
      .slice()
      .sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0))
      .slice(0, POPULAR_LIMIT)
  }, [])

  const popularPlacementResult = useMemo(() => {
    const availableSpots = layoutData.exhibitSpots.slice()
    if (!availableSpots.length) return { placements: [], remainingSpots: [] }
    const palette = ['#f97316', '#38bdf8', '#a855f7', '#22c55e', '#facc15', '#fb7185']
    const placements = []

    popularDapps.forEach((dapp, index) => {
      if (!availableSpots.length) return
      const randomValue = seededRandom(`placement:${dapp.id}`)
      const chosenIndex = Math.floor(randomValue * availableSpots.length) % availableSpots.length
      const spot = availableSpots.splice(chosenIndex, 1)[0]
      placements.push({
        dapp,
        position: spot.position,
        rotation: spot.rotation,
        minimap: spot.mapPosition,
        color: palette[index % palette.length],
      })
    })

    return { placements, remainingSpots: availableSpots }
  }, [popularDapps])

  const popularPlacements = popularPlacementResult.placements
  const remainingSpots = popularPlacementResult.remainingSpots

  const decorativePanels = useMemo(() => {
    if (!remainingSpots.length || !ART_IMAGE_URLS.length) return []
    const maxPanels = 48
    const palette = ['#0ea5e9', '#6366f1', '#f97316', '#14b8a6', '#facc15', '#ec4899']
    const selected = []

    for (let i = 0; i < remainingSpots.length && selected.length < maxPanels; i += 1) {
      const spot = remainingSpots[i]
      const randomness = seededRandom(`art-select:${spot.key}`)
      if (randomness < 0.65) {
        const imageIndex = Math.floor(seededRandom(`art-image:${spot.key}`) * ART_IMAGE_URLS.length) % ART_IMAGE_URLS.length
        selected.push({
          textureUrl: ART_IMAGE_URLS[imageIndex],
          position: spot.position,
          rotation: spot.rotation,
          frameColor: palette[selected.length % palette.length],
        })
      }
    }

    return selected
  }, [remainingSpots])

  const [playerPos, setPlayerPos] = useState({ x: 0, z: 0 })

  const startCell = layoutData.cellMap.get(`${START_CELL.row}:${START_CELL.col}`) || layoutData.walkableCells[0]
  const initialPosition = startCell?.position || [0, 0, 0]

  return (
    <div className="relative min-h-[calc(100vh-120px)] mt-6">
      <div className="absolute inset-0 rounded-[40px] border border-white/8 bg-gradient-to-br from-[#2f1da9] via-[#21116e] to-[#100542] shadow-[0_45px_120px_rgba(32,26,120,0.6)] overflow-hidden">
        <KeyboardControls map={keyboardMap}>
          <Canvas
            shadows
            camera={{ position: [initialPosition[0], CAMERA_HEIGHT, initialPosition[2]], fov: 58 }}
            onCreated={({ camera }) => {
              camera.position.set(initialPosition[0], CAMERA_HEIGHT, initialPosition[2])
              setPlayerPos({ x: initialPosition[0], z: initialPosition[2] })
            }}
          >
            <color attach="background" args={[0x050220]} />
            <fog attach="fog" args={[0x050220, 20, 50]} />
            <ambientLight intensity={0.7} />
            <directionalLight castShadow position={[16, 22, 14]} intensity={1.95} shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
            <Environment preset="sunset" background={false} />
            <Stars radius={180} depth={90} count={900} factor={3} fade speed={1.1} />

            <PointerLockControls selector="#museum-lock" />
            <VisitorRig />
            <MinimapTracker onUpdate={setPlayerPos} />

            <group>
              <MuseumShell width={GRID_COLS * CELL_SIZE} depth={GRID_ROWS * CELL_SIZE} />
              <PlazaGround />
              <MazeLighting walkable={layoutData.walkableCells} />

              <WalkableTiles cells={layoutData.walkableCells} />

              <WallSegments cells={layoutData.wallCells} />

              <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[GRID_COLS * CELL_SIZE + 8, GRID_ROWS * CELL_SIZE + 8]} />
                <meshStandardMaterial color="#0a0527" roughness={0.85} metalness={0.08} />
              </mesh>

              {popularPlacements.map((item) => (
                <DappExhibit key={item.dapp.id} dapp={item.dapp} position={item.position} rotation={item.rotation} />
              ))}

              {decorativePanels.map((panel, index) => (
                <WallArtPanel
                  key={`decor-${index}`}
                  position={panel.position}
                  rotation={panel.rotation}
                  textureUrl={panel.textureUrl}
                  frameColor={panel.frameColor}
                />
              ))}

              <Html position={[0, 2.5, 0]} center>
                <div className="px-6 py-3 rounded-full bg-white/15 border border-white/25 text-white text-sm backdrop-blur">
                  <strong>Welcome to Chog's Museum</strong> — click to lock pointer, use WASD to walk
                </div>
              </Html>
            </group>
          </Canvas>
        </KeyboardControls>
      </div>

      <div className="pointer-events-none absolute top-8 left-1/2 -translate-x-1/2 text-center space-y-2 text-white/80">
        <h2 className="text-2xl font-semibold tracking-wide">Chog's Museum Maze (Prototype)</h2>
        <p className="text-sm text-white/60">Click inside the scene • WASD to move corridors • Mouse to look around</p>
      </div>

      <MinimapOverlay walkable={layoutData.walkableCells} walls={layoutData.wallCells} exhibits={popularPlacements} playerPos={playerPos} />

      <button
        id="museum-lock"
        className="pointer-events-auto absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-white/15 border border-white/25 text-white text-sm hover:bg-white/25 transition"
      >
        Click to (re)enter explore mode
      </button>
    </div>
  )
}

