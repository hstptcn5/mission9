import * as THREE from 'three'
import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  Environment,
  Html,
  KeyboardControls,
  PointerLockControls,
  Stars,
  Text,
  useKeyboardControls,
  useTexture,
  useGLTF,
  useAnimations,
} from '@react-three/drei'
import { dAppsData } from '../utils/dappsData'
import QuestTracker from '../components/QuestTracker'
import BadgeInventory from '../components/BadgeInventory'
import LocalLeaderboard from '../components/LocalLeaderboard'
import { useQuestStore } from '../store/questStore'
import { achievementDefinitions } from '../achievements/definitions'
import { getQuizForDapp } from '../utils/dappQuizzes'

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

const CAMERA_HEIGHT = 1.5
const CAMERA_COLLISION_RADIUS = 0.5
const CAMERA_SLIDE_EPSILON = 0.005
const MOVE_SPEED = 1.4
const AVATAR_FOLLOW_DISTANCE = 0.7
const AVATAR_HEIGHT = 0.8
const DEFAULT_AVATAR_MODEL_PATH = '/models/chog.glb'
const AVATAR_MODEL_SCALE = 0.6
const AVATAR_MODEL_ROTATION = [0, 110, 0]
const AVATAR_YAW_OFFSET = Math.PI

const keyboardMap = [
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
  { name: 'backward', keys: ['KeyS', 'ArrowDown'] },
  { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
  { name: 'right', keys: ['KeyD', 'ArrowRight'] },
]

const frontVector = new THREE.Vector3()
const sideVector = new THREE.Vector3()
const direction = new THREE.Vector3()
const forwardHelper = new THREE.Vector3()
const avatarTarget = new THREE.Vector3()
const LIGHT_SAMPLE_STEP = 60
const tempObject = new THREE.Object3D()

// Preload all avatar models
useGLTF.preload('/models/chog.glb')
useGLTF.preload('/models/chog2.glb')
useGLTF.preload('/models/chog3.glb')

const ART_IMAGE_URLS = Object.values(
  import.meta.glob('../../getchog/assets/*.jpg', { eager: true, query: '?url', import: 'default' })
)
const SPRAY_COLOR_OPTIONS = ['#f97316', '#38bdf8', '#a855f7', '#22c55e', '#facc15', '#fb7185']

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

function getCollisionNormal(position) {
  const { x, z } = position
  const radius = CAMERA_COLLISION_RADIUS
  let closestDistance = Infinity
  const normal = new THREE.Vector3(0, 0, 0)
  const samples = 12

  for (let i = 0; i < samples; i += 1) {
    const angle = (Math.PI * 2 * i) / samples
    const offsetX = Math.cos(angle) * radius
    const offsetZ = Math.sin(angle) * radius
    const sampleX = x + offsetX
    const sampleZ = z + offsetZ
    const cell = positionToCell(sampleX, sampleZ)
    if (!isWalkable(cell.row, cell.col)) {
      const distance = Math.sqrt(offsetX * offsetX + offsetZ * offsetZ)
      if (distance < closestDistance) {
        closestDistance = distance
        normal.set(offsetX, 0, offsetZ).normalize()
      }
    }
  }

  if (closestDistance === Infinity) return null
  return normal
}

function VisitorRig() {
  const [, getKeys] = useKeyboardControls()
  const velocity = useRef(new THREE.Vector3())
  const prevPosition = useRef(new THREE.Vector3())

  useFrame((state, delta) => {
    const { forward, backward, left, right } = getKeys()

    const currentPosition = state.camera.position.clone()
    const proposedPosition = currentPosition.clone()
    prevPosition.current.copy(currentPosition)
    frontVector.set(0, 0, Number(backward) - Number(forward))
    sideVector.set(Number(right) - Number(left), 0, 0)

    direction.subVectors(frontVector, sideVector)

    if (direction.lengthSq() > 0) {
      direction.normalize().applyQuaternion(state.camera.quaternion)
      velocity.current.addScaledVector(direction, MOVE_SPEED * delta)
    }

    velocity.current.y = 0
    velocity.current.clamp(
      new THREE.Vector3(-MOVE_SPEED, -MOVE_SPEED, -MOVE_SPEED),
      new THREE.Vector3(MOVE_SPEED, MOVE_SPEED, MOVE_SPEED)
    )

    proposedPosition.add(velocity.current)
    proposedPosition.y = CAMERA_HEIGHT

    let moved = false
    if (!getCollisionNormal(proposedPosition)) {
      state.camera.position.copy(proposedPosition)
      prevPosition.current.copy(proposedPosition)
      moved = true
    } else {
      const slideX = new THREE.Vector3(velocity.current.x, 0, 0)
      const candidateX = currentPosition.clone().add(slideX)
      candidateX.y = CAMERA_HEIGHT

      const slideZ = new THREE.Vector3(0, 0, velocity.current.z)
      const candidateZ = currentPosition.clone().add(slideZ)
      candidateZ.y = CAMERA_HEIGHT

      if (!getCollisionNormal(candidateX) && slideX.lengthSq() > CAMERA_SLIDE_EPSILON) {
        state.camera.position.copy(candidateX)
        prevPosition.current.copy(candidateX)
        velocity.current.z *= 0.4
        moved = true
      } else if (!getCollisionNormal(candidateZ) && slideZ.lengthSq() > CAMERA_SLIDE_EPSILON) {
        state.camera.position.copy(candidateZ)
        prevPosition.current.copy(candidateZ)
        velocity.current.x *= 0.4
        moved = true
      }
    }

    if (!moved) {
      state.camera.position.copy(currentPosition)
      prevPosition.current.copy(currentPosition)
      velocity.current.multiplyScalar(0.2)
    }

    velocity.current.multiplyScalar(0.8)
  })

  return null
}

function WallSegments({ cells }) {
  const instancedRef = useRef(null)
  const materialRef = useRef(null)

  useEffect(() => {
    if (!instancedRef.current) return
    instancedRef.current.frustumCulled = false
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
    instancedRef.current.frustumCulled = false
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

function EnvironmentMap() {
  const { scene } = useThree()
  const envMap = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    // Tạo gradient sáng hơn với màu tím/xanh sáng hơn
    const gradient = ctx.createLinearGradient(0, 0, 0, 256)
    gradient.addColorStop(0, '#3d2a8f') // Sáng hơn
    gradient.addColorStop(0.3, '#4a3ba5') // Sáng hơn
    gradient.addColorStop(0.6, '#2d1a6b')
    gradient.addColorStop(1, '#1a0f4a')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 256)
    const texture = new THREE.CanvasTexture(canvas)
    texture.mapping = THREE.EquirectangularReflectionMapping
    return texture
  }, [])

  useEffect(() => {
    scene.environment = envMap
    scene.environmentIntensity = 1.2 // Tăng intensity để sáng hơn
    return () => {
      scene.environment = null
    }
  }, [scene, envMap])

  return null
}

function MinimapTracker({ onUpdate }) {
  const last = useRef(0)
  const eulerRef = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const prevPosition = useRef(new THREE.Vector3())

  useFrame(({ camera, clock }) => {
    if (clock.elapsedTime - last.current > 0.05) {
      eulerRef.current.setFromQuaternion(camera.quaternion, 'YXZ')
      const elapsed = Math.max(clock.elapsedTime - last.current, 0.0001)
      const currentPos = camera.position
      const distance = currentPos.distanceTo(prevPosition.current)
      const speed = distance / elapsed
      onUpdate({ x: currentPos.x, z: currentPos.z, heading: eulerRef.current.y, speed })
      prevPosition.current.copy(currentPos)
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
  const headingDeg = ((playerPos.heading ?? 0) * 180) / Math.PI * -1

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

          <g transform={`translate(${player.x} ${player.y})`}>
            <circle cx={0} cy={0} r={7} fill="#fb923c" stroke="white" strokeWidth={2.4} />
            <g transform={`rotate(${headingDeg})`}>
              <path d="M0 -12 L-6 -3 L6 -3 Z" fill="#fb923c" stroke="white" strokeWidth={1} />
            </g>
            <circle cx={0} cy={0} r={2.2} fill="#fff7ed" />
          </g>
        </svg>
      </div>
    </div>
  )
}

function DappExhibit({ dapp, position, rotation }) {
  const groupRef = useRef(null)
  const [active, setActive] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showQuiz, setShowQuiz] = useState(false)
  const [selectedOption, setSelectedOption] = useState(null)
  const [quizFeedback, setQuizFeedback] = useState(null)
  const prevActive = useRef(false)
  const audioCtxRef = useRef(null)
  const registerVisit = useQuestStore((state) => state.registerVisit)
  const hasBadgeForDapp = useQuestStore((state) => state.badges.includes(dapp.id))
  const claimBadge = useQuestStore((state) => state.claimBadge)
  const visitLinkRef = useRef(null)
  const visitPayload = useMemo(
    () => ({
      id: dapp.id,
      name: dapp.name,
      categories: Array.isArray(dapp.categories) ? dapp.categories : [],
      onlyOnMonad: Boolean(dapp.onlyOnMonad),
    }),
    [dapp]
  )
  const quiz = useMemo(() => getQuizForDapp(dapp.id), [dapp.id])

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

  const distanceRef = useRef(0)
  const glowIntensityRef = useRef(0.25)
  const glowMaterialRef = useRef(null)
  const emissiveMaterialRef = useRef(null)
  const pointLightRef = useRef(null)

  useFrame(({ camera, clock }) => {
    if (!groupRef.current) return
    const dist = groupRef.current.position.distanceTo(camera.position)
    distanceRef.current = dist
    
    if (dist < 3.8 && !active) setActive(true)
    if (dist >= 4.2 && active) setActive(false)
    
    // Calculate glow intensity based on distance - brighter when far away
    const farDistance = 15
    const nearDistance = 3
    const normalizedDist = Math.min(Math.max((dist - nearDistance) / (farDistance - nearDistance), 0), 1)
    // Pulse effect for visibility at distance
    const pulse = Math.sin(clock.elapsedTime * 2) * 0.15 + 0.85
    const newIntensity = 0.25 + (normalizedDist * 0.6) * pulse
    glowIntensityRef.current = newIntensity
    
    // Update materials and light
    if (emissiveMaterialRef.current) {
      emissiveMaterialRef.current.emissiveIntensity = newIntensity
    }
    if (glowMaterialRef.current) {
      // Glow opacity increases with distance
      glowMaterialRef.current.opacity = 0.2 + (normalizedDist * 0.4) * pulse
    }
    if (pointLightRef.current) {
      pointLightRef.current.intensity = 0.5 + (normalizedDist * 0.5) * pulse
    }
  })

  useEffect(() => {
    if (active && !prevActive.current) {
      registerVisit(visitPayload)
    }
  }, [active, registerVisit, visitPayload])

  useEffect(() => {
    if (active && !prevActive.current) {
      playEnterTone()
    }
    prevActive.current = active
  }, [active, playEnterTone])

  useEffect(() => {
    if (!active) {
      setShowDetails(false)
      setShowQuiz(false)
      setSelectedOption(null)
      setQuizFeedback(null)
      return undefined
    }
    const handleKeyDown = (event) => {
      if (event.repeat) return
      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault()
        if (visitLinkRef.current) {
          visitLinkRef.current.click()
        }
      }
      if (event.code === 'KeyF' || event.key === 'f' || event.key === 'F') {
        event.preventDefault()
        setShowDetails((prev) => !prev)
      }
      if (quiz && (event.code === 'KeyQ' || event.key === 'q' || event.key === 'Q')) {
        event.preventDefault()
        if (!hasBadgeForDapp) {
          setShowQuiz((prev) => !prev)
          setSelectedOption(null)
          setQuizFeedback(null)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [active, quiz, hasBadgeForDapp])

  const categories = Array.isArray(dapp.categories) ? dapp.categories : []

  const handleQuizAnswer = useCallback(
    (optionIndex, submit = true) => {
      if (!quiz || hasBadgeForDapp) return
      setSelectedOption(optionIndex)
      if (!submit) return
      if (optionIndex === quiz.answerIndex) {
        claimBadge(dapp.id)
        setQuizFeedback('correct')
        setTimeout(() => {
          setShowQuiz(false)
          setSelectedOption(null)
          setQuizFeedback(null)
        }, 1200)
      } else {
        setQuizFeedback('incorrect')
      }
    },
    [quiz, hasBadgeForDapp, claimBadge, dapp.id]
  )

  useEffect(() => {
    if (!showQuiz || hasBadgeForDapp || !quiz) return undefined
    const handleKeys = (event) => {
      if (event.repeat) return
      const key = event.key
      if (key >= '1' && key <= '9') {
        const idx = Number(key) - 1
        if (idx < quiz.options.length) {
          event.preventDefault()
          handleQuizAnswer(idx, false)
        }
      }
      if (key === 'Enter') {
        event.preventDefault()
        if (selectedOption !== null) {
          handleQuizAnswer(selectedOption, true)
        }
      }
    }
    window.addEventListener('keydown', handleKeys)
    return () => window.removeEventListener('keydown', handleKeys)
  }, [showQuiz, quiz, hasBadgeForDapp, selectedOption, handleQuizAnswer])

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={0.56}>
      {/* Glow effect behind panel - more visible at distance */}
      <mesh position={[0, 0, -0.06]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.85, 1.3]} />
        <meshBasicMaterial 
          ref={glowMaterialRef}
          color="#6366f1" 
          transparent 
          opacity={0.2}
        />
      </mesh>
      
      {/* Point light for glow effect */}
      <pointLight 
        ref={pointLightRef}
        position={[0, 0, -0.05]} 
        color="#6366f1" 
        intensity={0.5} 
        distance={8}
        decay={2}
      />
      
      <mesh position={[0, 0, 0]} rotation={[0, Math.PI, 0]} castShadow>
        <planeGeometry args={[1.5, 1.02]} />
        <meshStandardMaterial color="#eef2ff" roughness={0.8} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0, -0.035]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.72, 1.18]} />
        <meshStandardMaterial 
          ref={emissiveMaterialRef}
          color="#4338ca" 
          roughness={0.45} 
          metalness={0.4} 
          emissive="#6366f1" 
          emissiveIntensity={0.25}
        />
      </mesh>
      <Text position={[0, 0.4, -0.04]} fontSize={0.16} color="#f8fafc" anchorX="center" anchorY="bottom">
        {dapp.name}
      </Text>
      <Text position={[0, 0.18, -0.04]} fontSize={0.1} color="#cbd5f5" anchorX="center" anchorY="middle">
        {dapp.projectType || (categories[0] ?? 'Project')}
      </Text>
      <Text position={[0, -0.15, -0.04]} fontSize={0.08} color="#e2e8f0" anchorX="center" anchorY="middle" maxWidth={1.2} lineHeight={1.25}>
        {(dapp.description || '').slice(0, 120)}
      </Text>
      {active && (
        <Html
          transform
          occlude
          zIndexRange={[1, 0]}
          wrapperClass="pointer-events-auto"
          position={[0, -0.78, -0.05]}
          className="[&>*]:rounded-2xl"
        >
          <div className="w-44 rounded-2xl border border-indigo-200 bg-white/95 p-3 shadow-xl text-gray-900">
            <div className="flex items-center gap-2 mb-2">
              {dapp.logoImage ? (
                <img
                  src={dapp.logoImage}
                  alt={`${dapp.name} logo`}
                  className="h-9 w-9 rounded-xl border border-indigo-200/80 object-cover shadow-sm bg-white"
                />
              ) : (
                <div className="h-9 w-9 rounded-xl border border-indigo-200/80 bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-semibold">
                  {dapp.name?.slice(0, 2)?.toUpperCase() || 'DP'}
                </div>
              )}
              <div className="min-w-0">
                <h4 className="text-xs font-semibold truncate">{dapp.name}</h4>
                <p className="text-[10px] text-indigo-500/90 uppercase tracking-wide">
                  {dapp.projectType || (categories[0] ?? 'Project')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-2 text-[10px]">
              {categories.slice(0, 3).map((cat) => (
                <span key={`${dapp.id}-tag-${cat}`} className="px-2 py-0.5 uppercase tracking-wide rounded-full bg-indigo-100 text-indigo-600">
                  {cat}
                </span>
              ))}
              {dapp.onlyOnMonad && (
                <span className="px-2 py-0.5 uppercase tracking-wide rounded-full bg-amber-100 text-amber-600">
                  Only on Monad
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {dapp.url && (
                <a
                  ref={visitLinkRef}
                  href={dapp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-xl bg-indigo-500 text-white text-[11px] font-semibold px-3 py-1.5 text-center hover:bg-indigo-400"
                >
                  Visit
                </a>
              )}
              <button className="flex-1 rounded-xl border border-indigo-400 text-indigo-500 text-[11px] font-semibold px-3 py-1.5">
                Quest +1
              </button>
            </div>
            {dapp.url && (
              <p className="mt-2 text-[10px] text-indigo-500/90 font-semibold text-center uppercase tracking-wide">
                Press Space to Visit • Press F for Info
              </p>
            )}
            {quiz && !hasBadgeForDapp && (
              <div className="mt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuiz((prev) => !prev)
                    setSelectedOption(null)
                    setQuizFeedback(null)
                  }}
                  className="rounded-xl bg-purple-500 text-white text-[11px] font-semibold px-3 py-1.5 hover:bg-purple-400 transition"
                >
                  {showQuiz ? 'Hide Quiz (Q)' : 'Take Quiz (Press Q)'}
                </button>
              </div>
            )}
            {quiz && hasBadgeForDapp && (
              <p className="mt-2 text-[10px] font-semibold text-emerald-600 text-center uppercase tracking-wide">Badge claimed ✅</p>
            )}
            {quiz && showQuiz && !hasBadgeForDapp && (
              <div className="mt-3 space-y-2 rounded-xl border border-purple-200 bg-purple-50/80 p-3 text-[11px] text-slate-900 shadow-inner">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-purple-500">Knowledge Check</p>
                  <p className="font-semibold leading-snug">{quiz.question}</p>
                </div>
                <div className="space-y-1.5">
                  {quiz.options.map((option, index) => {
                    const isSelected = selectedOption === index
                    const isCorrect = quizFeedback === 'correct' && index === quiz.answerIndex
                    const showIncorrect = quizFeedback === 'incorrect' && isSelected && index !== quiz.answerIndex
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleQuizAnswer(index, true)}
                        className={`w-full rounded-lg border px-2.5 py-1.5 text-left transition ${
                          isCorrect
                            ? 'border-emerald-400 bg-emerald-100 text-emerald-700'
                            : showIncorrect
                            ? 'border-rose-300 bg-rose-50 text-rose-600'
                            : isSelected
                            ? 'border-purple-400 bg-purple-100 text-purple-600'
                            : 'border-slate-200 bg-white/90 hover:border-purple-300'
                        }`}
                      >
                        <span className="mr-2 text-[10px] font-semibold text-purple-500">{index + 1}</span>
                        {option}
                      </button>
                    )
                  })}
                </div>
                {quizFeedback && (
                  <div
                    className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold ${
                      quizFeedback === 'correct' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                    }`}
                  >
                    {quizFeedback === 'correct' ? 'Correct! Badge added to your kit.' : 'Not quite. Try again!'}
                    {quiz.explanation && quizFeedback === 'correct' && <p className="mt-1 font-normal text-slate-600">{quiz.explanation}</p>}
                  </div>
                )}
                <div className="flex justify-between text-[10px] text-purple-600/80">
                  <span>Press Q to close</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuiz(false)
                      setSelectedOption(null)
                      setQuizFeedback(null)
                    }}
                    className="rounded-lg border border-purple-300 px-2 py-1 text-purple-600 hover:bg-purple-100/60"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
            {showDetails && (
              <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/80 p-3 text-slate-800 text-[11px] leading-relaxed shadow-inner">
                <p className="font-semibold uppercase tracking-wide text-indigo-500 mb-1 text-[10px]">Overview</p>
                <p>{dapp.description || 'No additional description provided yet.'}</p>
                {(dapp.metadata?.length || dapp.tags?.length) && (
                  <div className="mt-2 space-y-1">
                    {dapp.metadata?.length ? (
                      <p className="text-[10px] text-indigo-600">
                        {dapp.metadata.join(' • ')}
                      </p>
                    ) : null}
                    {dapp.tags?.length ? (
                      <p className="text-[10px] text-indigo-600">
                        Tags: {dapp.tags.join(', ')}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  )
}

function WallArtPanel({ position, rotation, textureUrl, frameColor }) {
  const texture = useTexture(textureUrl)
  const groupRef = useRef(null)
  const [active, setActive] = useState(false)
  const [paintingEnabled, setPaintingEnabled] = useState(false)
  const [colorIndex, setColorIndex] = useState(0)
  const drawingRef = useRef(false)
  const lastPointRef = useRef(null)
  const brushColor = SPRAY_COLOR_OPTIONS[colorIndex]

  const graffitiLayer = useMemo(() => {
    if (typeof window === 'undefined') return null
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 640
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const layerTexture = new THREE.CanvasTexture(canvas)
    layerTexture.needsUpdate = true
    layerTexture.transparent = true
    return { canvas, ctx, texture: layerTexture }
  }, [])

  useEffect(() => {
    if (!texture) return
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.anisotropy = 8
  }, [texture])

  useFrame(({ camera }) => {
    if (!groupRef.current) return
    const dist = groupRef.current.position.distanceTo(camera.position)
    if (dist < 2.6 && !active) setActive(true)
    if (dist >= 3 && active) setActive(false)
  })

  useEffect(() => {
    if (!active) {
      setPaintingEnabled(false)
      drawingRef.current = false
      return undefined
    }
    const handleKey = (event) => {
      if (event.repeat) return
      if (event.code === 'KeyG' || event.key === 'g' || event.key === 'G') {
        event.preventDefault()
        setPaintingEnabled((prev) => !prev)
      }
      if (event.code === 'KeyN' || event.key === 'n' || event.key === 'N') {
        event.preventDefault()
        setColorIndex((index) => (index + 1) % SPRAY_COLOR_OPTIONS.length)
      }
      if ((event.code === 'KeyC' || event.key === 'c' || event.key === 'C') && graffitiLayer?.ctx) {
        graffitiLayer.ctx.clearRect(0, 0, graffitiLayer.canvas.width, graffitiLayer.canvas.height)
        graffitiLayer.texture.needsUpdate = true
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [active, graffitiLayer])

  const paintAt = useCallback(
    (uv, force = false) => {
      if (!graffitiLayer?.ctx) return
      const ctx = graffitiLayer.ctx
      const { canvas } = graffitiLayer
      const x = uv.x * canvas.width
      const y = (1 - uv.y) * canvas.height

      ctx.save()
      ctx.strokeStyle = brushColor
      ctx.lineWidth = 18
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.shadowColor = brushColor
      ctx.shadowBlur = 12
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      if (!lastPointRef.current || force) {
        ctx.moveTo(x, y)
      } else {
        ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
      }
      ctx.lineTo(x, y)
      ctx.stroke()
      ctx.restore()

      lastPointRef.current = { x, y }
      graffitiLayer.texture.needsUpdate = true
    },
    [graffitiLayer, brushColor]
  )

  const handlePointerDown = useCallback(
    (event) => {
      if (!paintingEnabled || !event.uv) return
      event.stopPropagation()
      drawingRef.current = true
      paintAt(event.uv, true)
    },
    [paintingEnabled, paintAt]
  )

  const handlePointerMove = useCallback(
    (event) => {
      if (!paintingEnabled || !drawingRef.current || !event.uv) return
      event.stopPropagation()
      paintAt(event.uv)
    },
    [paintingEnabled, paintAt]
  )

  const handlePointerUp = useCallback(() => {
    drawingRef.current = false
    lastPointRef.current = null
  }, [])

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.04]} castShadow>
        <planeGeometry args={[1.7, 1.2]} />
        <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.35} emissive={new THREE.Color(frameColor).multiplyScalar(0.4)} emissiveIntensity={0.45} />
      </mesh>
      <mesh castShadow>
        <planeGeometry args={[1.55, 1.05]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.55}
          metalness={0.15}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </mesh>
      {graffitiLayer?.texture && (
        <mesh position={[0, 0, 0.004]} renderOrder={10} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
          <planeGeometry args={[1.55, 1.05]} />
          <meshBasicMaterial map={graffitiLayer.texture} transparent opacity={0.94} toneMapped={false} depthTest={false} depthWrite={false} />
        </mesh>
      )}

      {active && (
        <Html position={[0.78, 0.85, 0]} transform occlude wrapperClass="pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-white/35 bg-white/75 px-1.5 py-0.5 text-[8px] text-indigo-700 shadow-sm">
            <button
              type="button"
              onClick={() => setColorIndex((index) => (index - 1 + SPRAY_COLOR_OPTIONS.length) % SPRAY_COLOR_OPTIONS.length)}
              className="h-3.5 w-3.5 rounded border border-indigo-300 bg-indigo-100/60 text-[9px] leading-3.5 text-indigo-600 hover:bg-indigo-100"
              aria-label="Previous color"
            >
              ‹
            </button>
            <span className="h-3 w-3 rounded-full border border-indigo-500 shadow-sm" style={{ backgroundColor: brushColor }} aria-label="Current color" />
            <button
              type="button"
              onClick={() => setColorIndex((index) => (index + 1) % SPRAY_COLOR_OPTIONS.length)}
              className="h-3.5 w-3.5 rounded border border-indigo-300 bg-indigo-100/60 text-[9px] leading-3.5 text-indigo-600 hover:bg-indigo-100"
              aria-label="Next color"
            >
              ›
            </button>
            <span className="font-semibold">{paintingEnabled ? 'Spray' : 'Press G'}</span>
            <span className="text-indigo-500">N color · C clear</span>
          </div>
        </Html>
      )}
    </group>
  )
}

function PlayerAvatar({ player, avatarModelPath = DEFAULT_AVATAR_MODEL_PATH }) {
  const groupRef = useRef(null)
  const avatarGroupRef = useRef(null)
  const bobRef = useRef(0)
  const { scene, animations } = useGLTF(avatarModelPath)
  const avatarScene = useMemo(() => scene.clone(true), [scene])
  
  // Load animations if available - use scene as ref for animations
  const { actions, mixer } = useAnimations(animations, avatarScene)

  useEffect(() => {
    avatarScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        child.frustumCulled = false // Disable frustum culling so model is always visible
        child.visible = true // Ensure mesh is always visible
        // Ensure model renders at any distance
        child.matrixAutoUpdate = true
        if (child.material) {
          // Make material more visible at distance
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => {
              if (mat) mat.needsUpdate = true
            })
          } else {
            child.material.needsUpdate = true
          }
        }
      }
    })
    // Also disable frustum culling on the scene itself
    avatarScene.frustumCulled = false
    avatarScene.matrixAutoUpdate = true
  }, [avatarScene])


  useFrame(({ camera }, delta) => {
    if (!groupRef.current || !avatarGroupRef.current) return
    
    // Calculate avatar position FIRST - this should ALWAYS run regardless of animation state
    forwardHelper.set(0, 0, -1).applyQuaternion(camera.quaternion)
    forwardHelper.y = 0
    if (forwardHelper.lengthSq() === 0) forwardHelper.set(0, 0, -1)
    forwardHelper.normalize()

    avatarTarget.copy(camera.position).addScaledVector(forwardHelper, AVATAR_FOLLOW_DISTANCE)
    groupRef.current.position.set(avatarTarget.x, 0, avatarTarget.z)
    groupRef.current.rotation.y = Math.atan2(forwardHelper.x, forwardHelper.z) + AVATAR_YAW_OFFSET

    const speed = player?.speed ?? 0
    
    if (speed > 0.2) {
      bobRef.current += delta * Math.min(speed * 4, 8)
    } else {
      bobRef.current = Math.max(bobRef.current - delta * 4, 0)
    }
    const bobOffset = Math.sin(bobRef.current) * 0.08
    if (avatarGroupRef.current) avatarGroupRef.current.position.y = AVATAR_HEIGHT + bobOffset
  })

  return (
    <group ref={groupRef}>
      <group ref={avatarGroupRef} scale={AVATAR_MODEL_SCALE}>
        <primitive object={avatarScene} rotation={AVATAR_MODEL_ROTATION} />
      </group>
    </group>
  )
}

const POPULAR_LIMIT = 30

export default function MuseumScene({ avatarModelPath = DEFAULT_AVATAR_MODEL_PATH }) {
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
    const maxPanels = 96
    const palette = ['#0ea5e9', '#6366f1', '#f97316', '#14b8a6', '#facc15', '#ec4899']
    const selected = []
    const shuffledSpots = remainingSpots.slice()

    for (let i = shuffledSpots.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffledSpots[i], shuffledSpots[j]] = [shuffledSpots[j], shuffledSpots[i]]
    }

    for (let i = 0; i < shuffledSpots.length && selected.length < maxPanels; i += 1) {
      const spot = shuffledSpots[i]
      const randomness = Math.random()
      if (randomness < 0.85) {
        const imageIndex = Math.floor(Math.random() * ART_IMAGE_URLS.length)
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

  const [playerPos, setPlayerPos] = useState({ x: 0, z: 0, heading: 0, speed: 0 })
  const [inlineBadgeOpen, setInlineBadgeOpen] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [previewActive, setPreviewActive] = useState(false)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [pointerLocked, setPointerLocked] = useState(false)
  const badges = useQuestStore((state) => state.badges)
  const achievements = useQuestStore((state) => state.achievements)
  const level = useQuestStore((state) => state.level)
  const rendererRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const previewCanvasRef = useRef(null)
  const previewCameraRef = useRef(new THREE.PerspectiveCamera(58, 1, 0.1, 100))

  // Track pointer lock state
  useEffect(() => {
    const handlePointerLockChange = () => {
      setPointerLocked(document.pointerLockElement !== null)
    }

    const handlePointerLockError = () => {
      setPointerLocked(false)
    }

    document.addEventListener('pointerlockchange', handlePointerLockChange)
    document.addEventListener('pointerlockerror', handlePointerLockError)

    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
      document.removeEventListener('pointerlockerror', handlePointerLockError)
    }
  }, [])

const startCell = layoutData.cellMap.get(`${START_CELL.row}:${START_CELL.col}`) || layoutData.walkableCells[0]
const initialPosition = startCell?.position || [0, 0, 0]

const axisOffsets = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
]

  useEffect(() => {
    const toggleInventory = (event) => {
      if (event.repeat) return
      if (event.code === 'KeyB' || event.key === 'b' || event.key === 'B') {
        event.preventDefault()
        setInlineBadgeOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', toggleInventory)
    return () => window.removeEventListener('keydown', toggleInventory)
  }, [])

  const computeSelfiePlacement = useCallback(() => {
    if (!cameraRef.current) return null
    const mainCamera = cameraRef.current
    const forward = new THREE.Vector3()
    mainCamera.getWorldDirection(forward)
    if (forward.lengthSq() === 0) forward.set(0, 0, -1)
    forward.normalize()

    const originalPosition = mainCamera.position.clone()
    const avatarPos = originalPosition.clone().add(forward.clone().multiplyScalar(AVATAR_FOLLOW_DISTANCE))
    const selfiePos = avatarPos.clone().add(forward.clone().multiplyScalar(1.4))
    selfiePos.y = originalPosition.y + 0.15

    return { originalPosition, avatarPos, selfiePos }
  }, [])

  const captureSelfie = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current) return
    const placement = computeSelfiePlacement()
    if (!placement) return
    const { originalPosition, avatarPos, selfiePos } = placement
    const camera = cameraRef.current
    const renderer = rendererRef.current
    const scene = sceneRef.current

    const overlayCanvas = document.createElement('canvas')
    overlayCanvas.width = renderer.domElement.width
    overlayCanvas.height = renderer.domElement.height
    const ctx = overlayCanvas.getContext('2d')

    camera.position.copy(selfiePos)
    camera.lookAt(avatarPos)
    renderer.render(scene, camera)

    ctx.drawImage(renderer.domElement, 0, 0, overlayCanvas.width, overlayCanvas.height)
    ctx.fillStyle = 'rgba(8, 4, 32, 0.4)'
    ctx.fillRect(0, overlayCanvas.height - 120, overlayCanvas.width, 120)
    ctx.fillStyle = '#f7f7ff'
    ctx.font = 'bold 48px "Segoe UI", sans-serif'
    ctx.fillText(`Level ${level}`, 40, overlayCanvas.height - 65)
    ctx.font = '24px "Segoe UI", sans-serif'
    const latestAchievementId = achievements[achievements.length - 1]
    const latestAchievement =
      latestAchievementId && achievementDefinitions.find((item) => item.id === latestAchievementId)
    const achievementText = latestAchievement ? `${latestAchievement.icon} ${latestAchievement.title}` : 'Explorer'
    ctx.fillText(achievementText, 40, overlayCanvas.height - 28)

    ctx.fillStyle = '#cbd5ff'
    ctx.font = '20px "Segoe UI", sans-serif'
    ctx.fillText(new Date().toLocaleString(), overlayCanvas.width - 320, overlayCanvas.height - 28)

    const finalImage = overlayCanvas.toDataURL('image/png')

    camera.position.copy(originalPosition)
    camera.lookAt(avatarPos)
    renderer.render(scene, camera)
    setCapturedImage(finalImage)
  }, [computeSelfiePlacement, level, achievements])

  const handleSelfieClick = useCallback(() => {
    if (isCapturing) return
    setIsCapturing(true)
    requestAnimationFrame(() => {
      captureSelfie()
      setIsCapturing(false)
    })
  }, [captureSelfie, isCapturing])

  const handleShareX = useCallback(() => {
    const text = encodeURIComponent("Captured a snapshot inside Chog's Immersive Gallery! #Monad #Web3")
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'noopener')
  }, [])

  useEffect(() => {
    const handleSelfieHotkey = (event) => {
      if (event.repeat) return
      if (event.code === 'KeyP' || event.key === 'p' || event.key === 'P') {
        event.preventDefault()
        handleSelfieClick()
      }
    }
    window.addEventListener('keydown', handleSelfieHotkey)
    return () => window.removeEventListener('keydown', handleSelfieHotkey)
  }, [handleSelfieClick])

  useEffect(() => {
    const handleLeaderboardHotkey = (event) => {
      if (event.repeat) return
      if (event.code === 'KeyL' || event.key === 'l' || event.key === 'L') {
        event.preventDefault()
        setLeaderboardOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleLeaderboardHotkey)
    return () => window.removeEventListener('keydown', handleLeaderboardHotkey)
  }, [])

  useEffect(() => {
    const handlePreviewHotkey = (event) => {
      if (event.repeat) return
      if (event.code === 'KeyO' || event.key === 'o' || event.key === 'O') {
        event.preventDefault()
        setPreviewActive((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handlePreviewHotkey)
    return () => window.removeEventListener('keydown', handlePreviewHotkey)
  }, [])

  useEffect(() => {
    if (!previewActive) return undefined
    const renderer = rendererRef.current
    const scene = sceneRef.current
    const mainCamera = cameraRef.current
    const canvas = previewCanvasRef.current
    const previewCameraRefObj = previewCameraRef.current

    if (!renderer || !scene || !mainCamera || !canvas || !previewCameraRefObj) return undefined

    const ctx = canvas.getContext('2d')
    let frameId

    const renderPreview = () => {
      const placement = computeSelfiePlacement()
      if (placement) {
        const { avatarPos, selfiePos } = placement
        const width = canvas.width
        const height = canvas.height
        const aspect = width / height
        if (previewCameraRefObj.aspect !== aspect) {
          previewCameraRefObj.aspect = aspect
          previewCameraRefObj.updateProjectionMatrix()
        }

        previewCameraRefObj.position.copy(selfiePos)
        previewCameraRefObj.lookAt(avatarPos)
        renderer.render(scene, previewCameraRefObj)
        ctx.clearRect(0, 0, width, height)
        ctx.drawImage(renderer.domElement, 0, 0, width, height)
        renderer.render(scene, mainCamera)
      }
      frameId = requestAnimationFrame(renderPreview)
    }

    frameId = requestAnimationFrame(renderPreview)

    return () => cancelAnimationFrame(frameId)
  }, [previewActive, computeSelfiePlacement])

  return (
    <div className="relative mt-0 min-h-[calc(100vh-124px)] w-full px-4">
      <div className="pointer-events-auto absolute top-6 left-8 z-30 space-y-2">
        <QuestTracker variant="compact" maxItems={2} />
        <div className="rounded-xl border border-white/20 bg-white/15 px-3 py-1.5 text-[11px] text-white/80 backdrop-blur">
          Press <span className="font-semibold text-white">B</span> to toggle badge kit
        </div>
        <button
          type="button"
          onClick={handleSelfieClick}
          disabled={isCapturing}
          className="rounded-xl border border-white/25 bg-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/30 transition disabled:opacity-60"
        >
          {isCapturing ? 'Capturing...' : 'Take Selfie (P)'}
        </button>
        <button
          type="button"
          onClick={() => setPreviewActive((prev) => !prev)}
          className="rounded-xl border border-white/25 bg-white/12 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25 transition"
        >
          {previewActive ? 'Hide Selfie Preview (O)' : 'Show Selfie Preview (O)'}
        </button>
        <button
          type="button"
          onClick={() => setLeaderboardOpen((prev) => !prev)}
          className="rounded-xl border border-white/25 bg-white/12 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25 transition"
        >
          {leaderboardOpen ? 'Hide Leaderboard (L)' : 'Show Leaderboard (L)'}
        </button>
      </div>
      {inlineBadgeOpen && (
        <BadgeInventory inline open badgeIds={badges} achievements={achievements} onClose={() => setInlineBadgeOpen(false)} />
      )}
      {previewActive && (
        <div className="pointer-events-none absolute bottom-32 right-10 z-30 flex flex-col items-end gap-2">
          <canvas
            ref={previewCanvasRef}
            width={240}
            height={240}
            className="pointer-events-auto rounded-3xl border border-white/25 bg-black/40 shadow-[0_25px_65px_rgba(10,0,60,0.45)]"
          />
          <span className="rounded-lg border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] text-white/80 backdrop-blur">
            Live selfie preview
          </span>
        </div>
      )}
      {leaderboardOpen && (
        <div className="pointer-events-none absolute top-6 right-10 z-30">
          <LocalLeaderboard />
        </div>
      )}
      <div className="absolute inset-0 rounded-[32px] border border-white/6 bg-gradient-to-br from-[#2f1da9] via-[#21116e] to-[#100542] shadow-[0_45px_120px_rgba(32,26,120,0.5)] overflow-hidden">
        <KeyboardControls map={keyboardMap}>
          <Canvas
            shadows
            camera={{ position: [initialPosition[0], CAMERA_HEIGHT, initialPosition[2]], fov: 58, near: 0.1, far: 200 }}
            gl={{
              antialias: false,
              powerPreference: 'high-performance',
              toneMapping: THREE.ACESFilmicToneMapping,
              shadowMap: {
                enabled: true,
                type: THREE.BasicShadowMap,
              },
            }}
            dpr={[0.55, 0.9]}
            onCreated={({ camera, gl, scene }) => {
              cameraRef.current = camera
              rendererRef.current = gl
              sceneRef.current = scene
              camera.position.set(initialPosition[0], CAMERA_HEIGHT, initialPosition[2])
              setPlayerPos({ x: initialPosition[0], z: initialPosition[2], heading: 0, speed: 0 })
            }}
          >
            <color attach="background" args={[0x050220]} />
            <fog attach="fog" args={[0x050220, 20, 50]} />
            <ambientLight intensity={1.0} />
            <directionalLight castShadow position={[16, 22, 14]} intensity={2.0} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
            <EnvironmentMap />
            <Stars radius={160} depth={65} count={450} factor={2.2} fade speed={1} />

            <PointerLockControls selector="#museum-lock" />
            <PlayerAvatar player={playerPos} avatarModelPath={avatarModelPath} />
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
            </group>
          </Canvas>
        </KeyboardControls>
      </div>

      <MinimapOverlay walkable={layoutData.walkableCells} walls={layoutData.wallCells} exhibits={popularPlacements} playerPos={playerPos} />

      {!pointerLocked && (
        <button 
          id="museum-lock" 
          className="pointer-events-auto absolute bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-full bg-gradient-to-r from-indigo-500/90 to-purple-500/90 border-2 border-white/40 text-white text-lg font-bold shadow-[0_8px_32px_rgba(99,102,241,0.4)] hover:from-indigo-600 hover:to-purple-600 hover:shadow-[0_12px_40px_rgba(99,102,241,0.6)] transition-all duration-200 hover:scale-105 z-50"
        >
          <div className="flex flex-col items-center gap-1">
            <span>Click để bắt đầu khám phá</span>
            <span className="text-sm font-normal opacity-90">(Sử dụng WASD hoặc mũi tên để di chuyển)</span>
          </div>
        </button>
      )}

      {capturedImage && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
          <div className="pointer-events-auto w-[min(520px,90vw)] rounded-3xl border border-white/25 bg-white/95 p-5 shadow-[0_40px_120px_rgba(17,12,79,0.45)] space-y-4">
            <img src={capturedImage} alt="Selfie" className="w-full rounded-2xl border border-slate-200 object-cover" />
            <div className="flex items-center justify-between text-sm text-slate-600">
              <a
                href={capturedImage}
                download="chog-selfie.png"
                className="rounded-xl border border-indigo-200 bg-indigo-500 px-3 py-1.5 text-white font-semibold hover:bg-indigo-400 transition"
              >
                Save Image
              </a>
              <button
                type="button"
                onClick={handleShareX}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-slate-700 font-semibold hover:bg-slate-100 transition"
              >
                Share to X
              </button>
              <button
                type="button"
                onClick={() => setCapturedImage(null)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-slate-600 font-semibold hover:bg-slate-100 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}