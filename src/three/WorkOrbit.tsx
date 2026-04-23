import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { caseStudies, smoothFade } from '../lib/copy'
import { useAppStore } from '../lib/store'

/**
 * Work carousel — 6 case-study cards orbit the M with SNAP scroll behavior.
 *
 * v3 — centralised video pool.
 *
 *   Prior version created/destroyed a <video> element per CardMesh useEffect
 *   each time `shouldMountVideos` flipped. Fast scroll → aborted range
 *   requests → partial-load failures on specific cards (Northwood, Kelvin
 *   were regular offenders because their requests got preempted by the
 *   Lenis-driven "flick through the section" behaviour).
 *
 *   New approach: the WorkOrbit parent owns all six <video> elements, mounts
 *   them hidden in the DOM once, and lets them preload autonomously. Cards
 *   just bind the matching VideoTexture and toggle play/pause via ref. No
 *   per-card re-creation, no aborted fetches.
 */

const ORBIT_RADIUS = 5.8
const CARD_ASPECT = 16 / 9
const CARD_HEIGHT_BASE = 1.8
const SLOT_COUNT = 6
const ACT4_START = 0.506
const ACT4_END = 0.861
const ACT4_SPAN = ACT4_END - ACT4_START

/** Smoothstep helper — t outside [edge0, edge1] clamps. */
function smoothstep(edge0: number, edge1: number, t: number): number {
  const c = Math.max(0, Math.min(1, (t - edge0) / (edge1 - edge0)))
  return c * c * (3 - 2 * c)
}

/** A video element + its VideoTexture, bundled. Owned by the parent orbit. */
interface VideoBinding {
  video: HTMLVideoElement
  texture: THREE.VideoTexture
}

/** Hook that creates & owns the six video elements for the carousel. Returns
 *  null while mounting has not yet triggered (so CardMesh renders a placeholder
 *  material for the empty period). */
function useVideoPool(shouldMount: boolean): VideoBinding[] | null {
  const [pool, setPool] = useState<VideoBinding[] | null>(null)
  const builtRef = useRef(false)

  useEffect(() => {
    if (!shouldMount || builtRef.current) return
    builtRef.current = true

    // Create a hidden container so videos are in-DOM (some browsers treat
    // detached <video> elements with reduced priority for buffering).
    const container = document.createElement('div')
    container.setAttribute('aria-hidden', 'true')
    container.style.cssText =
      'position:absolute;width:1px;height:1px;top:-9999px;left:-9999px;' +
      'pointer-events:none;opacity:0;overflow:hidden;'
    document.body.appendChild(container)

    const built: VideoBinding[] = caseStudies.map((study) => {
      const video = document.createElement('video')
      video.src = study.videoPath
      video.loop = true
      video.muted = true
      video.playsInline = true
      // preload="auto" tells the browser to buffer the full video as soon
      // as possible. Without this, Safari/Chrome often only fetch metadata
      // until play() is called, and the subsequent range request can race
      // the user's scroll and get aborted.
      video.preload = 'auto'
      // Kick the load explicitly so `loadedmetadata` fires early.
      video.load()
      container.appendChild(video)

      const texture = new THREE.VideoTexture(video)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter

      return { video, texture }
    })

    setPool(built)

    return () => {
      // On unmount: fully tear down.
      built.forEach(({ video, texture }) => {
        video.pause()
        video.removeAttribute('src')
        video.load()
        texture.dispose()
      })
      if (container.parentNode) container.parentNode.removeChild(container)
      builtRef.current = false
    }
  }, [shouldMount])

  return pool
}

interface CardMeshProps {
  binding: VideoBinding | null
  isFeatured: boolean
  frontness: number
}

function CardMesh({ binding, isFeatured, frontness }: CardMeshProps) {
  const groupRef = useRef<THREE.Group>(null!)

  // Settle-pulse — when this card becomes featured, trigger a bell-curve
  // spike in scale + border brightness over ~450ms. Reads as a "rack-focus"
  // / "focus-lock" beat the moment the carousel snaps to this card. Feels
  // like a camera focus-pull to the card, not a generic slide-in.
  const settlePulseStart = useRef<number | null>(null)
  const settlePulseVal = useRef(0)

  // Play/pause via ref — does NOT reset currentTime, so a partly-buffered
  // video isn't forced to re-seek every time it becomes featured. play()
  // on an already-playing video is a no-op; on a paused one it resumes.
  useEffect(() => {
    if (!binding) return
    const { video } = binding
    if (isFeatured) {
      // Rewind only if the video has reached the end (it loops, but just in
      // case). This avoids the "buffer stall from seeking to 0" trap that
      // was killing slots 0 and 3.
      if (video.ended) video.currentTime = 0
      const p = video.play()
      if (p && typeof p.catch === 'function') p.catch(() => {})
      // Trigger the settle-pulse when this card becomes featured.
      settlePulseStart.current = performance.now()
    } else {
      video.pause()
    }
  }, [binding, isFeatured])

  const fallbackMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({ color: new THREE.Color('#0a1115') })
  }, [])

  const borderMat = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#73C5CC'),
      transparent: true,
      opacity: 0.6,
    })
    ;(mat as unknown as { toneMapped: boolean }).toneMapped = false
    return mat
  }, [])

  const borderGeom = useMemo(() => {
    const w = (CARD_HEIGHT_BASE * CARD_ASPECT) / 2
    const h = CARD_HEIGHT_BASE / 2
    const g = new THREE.BufferGeometry()
    const pts = new Float32Array([
      -w, h, 0.01,
      w, h, 0.01,
      w, -h, 0.01,
      -w, -h, 0.01,
      -w, h, 0.01,
    ])
    g.setAttribute('position', new THREE.BufferAttribute(pts, 3))
    return g
  }, [])

  const cardScale = 0.32 + Math.pow(frontness, 1.5) * 1.45
  const cardOpacity = 0.15 + Math.pow(frontness, 2) * 0.85

  useFrame(() => {
    // Settle-pulse: bell curve peaked ~200ms after becoming featured,
    // decays to ~0 by 600ms. Shape: k * x * exp(-s * x^2).
    if (settlePulseStart.current !== null) {
      const dt = (performance.now() - settlePulseStart.current) / 1000
      if (dt > 0.6) {
        settlePulseVal.current = 0
        settlePulseStart.current = null
      } else {
        settlePulseVal.current = 5.2 * dt * Math.exp(-10 * dt * dt)
      }
    } else if (settlePulseVal.current > 0.01) {
      settlePulseVal.current *= 0.9
    }

    if (groupRef.current) {
      const pulseScale = 1 + settlePulseVal.current * 0.06
      groupRef.current.scale.setScalar(cardScale * pulseScale)
    }
    if (borderMat) {
      borderMat.opacity = Math.min(1, 0.6 + settlePulseVal.current * 0.4)
    }
  })

  return (
    <group ref={groupRef}>
      <mesh>
        <planeGeometry args={[CARD_HEIGHT_BASE * CARD_ASPECT, CARD_HEIGHT_BASE]} />
        {binding ? (
          <meshBasicMaterial
            map={binding.texture}
            toneMapped={false}
            transparent
            opacity={cardOpacity}
          />
        ) : (
          <primitive object={fallbackMat} attach="material" />
        )}
      </mesh>
      <lineSegments>
        <bufferGeometry attach="geometry" {...borderGeom} />
        <primitive object={borderMat} attach="material" />
      </lineSegments>
    </group>
  )
}

export function WorkOrbit() {
  const progress = useAppStore((s) => s.scrollProgress)
  const setFeaturedWorkIndex = useAppStore((s) => s.setFeaturedWorkIndex)
  const groupRef = useRef<THREE.Group>(null!)
  const currentRotationRef = useRef(0)
  const currentSlotRef = useRef(0)
  const lastFeaturedRef = useRef(-1)

  // Mount the video pool once as the user approaches Act 4. The 0.46 threshold
  // starts buffering ~40vh before the first card becomes visible so the
  // network fetch happens out-of-band of the scroll animation.
  const shouldMountVideos = progress > 0.46
  const videoPool = useVideoPool(shouldMountVideos)

  useFrame(() => {
    const sp = progress
    // v3 — aligned with new camera timing. Push at 0.515, settled at
    // 0.555. Carousel fades IN 0.49 → 0.555. Fade OUT 0.83 → 0.87 into
    // Act 4→5 descent.
    const act4Alpha = smoothFade(sp, 0.49, 0.555, 0.83, 0.87)

    if (groupRef.current) {
      const act4Linear = Math.max(0, Math.min(1, (sp - ACT4_START) / ACT4_SPAN))
      const BOUNDARY_PAD = 0.2
      const transZone = 1 - 2 * BOUNDARY_PAD

      let rawPos: number
      if (act4Linear <= BOUNDARY_PAD) {
        rawPos = 0
      } else if (act4Linear >= 1 - BOUNDARY_PAD) {
        rawPos = SLOT_COUNT - 1
      } else {
        const t = (act4Linear - BOUNDARY_PAD) / transZone
        rawPos = t * (SLOT_COUNT - 1)
      }

      const slotIdx = Math.min(SLOT_COUNT - 1, Math.floor(rawPos))
      const slotFrac = rawPos - slotIdx
      const snapT = smoothstep(0.82, 1.0, slotFrac)
      const displayIdx = slotIdx + snapT

      const snapRotation =
        displayIdx * ((Math.PI * 2) / SLOT_COUNT) - Math.PI / 2
      groupRef.current.rotation.y = snapRotation
      currentRotationRef.current = snapRotation
      currentSlotRef.current = slotIdx

      groupRef.current.scale.setScalar(act4Alpha)
      groupRef.current.visible = act4Alpha > 0.001

      if (slotIdx !== lastFeaturedRef.current) {
        lastFeaturedRef.current = slotIdx
        setFeaturedWorkIndex(slotIdx)
      }
    }
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {caseStudies.map((study, i) => {
        const baseAngle = (i / caseStudies.length) * Math.PI * 2
        const x = Math.cos(baseAngle) * ORBIT_RADIUS
        const z = Math.sin(baseAngle) * ORBIT_RADIUS
        const binding = videoPool ? videoPool[i] : null
        return (
          <AnglingCard
            key={study.id}
            index={i}
            binding={binding}
            baseAngle={baseAngle}
            x={x}
            z={z}
            currentRotationRef={currentRotationRef}
            currentSlotRef={currentSlotRef}
          />
        )
      })}
    </group>
  )
}

interface AnglingCardProps {
  index: number
  binding: VideoBinding | null
  baseAngle: number
  x: number
  z: number
  currentRotationRef: React.MutableRefObject<number>
  currentSlotRef: React.MutableRefObject<number>
}

function AnglingCard({
  index,
  binding,
  baseAngle,
  x,
  z,
  currentRotationRef,
  currentSlotRef,
}: AnglingCardProps) {
  const [frontness, setFrontness] = useState(0)
  const [isFeatured, setIsFeatured] = useState(false)
  const groupRef = useRef<THREE.Group>(null!)

  useFrame(() => {
    const worldAngle = baseAngle - currentRotationRef.current
    const f = (Math.sin(worldAngle) + 1) * 0.5
    setFrontness(f)
    setIsFeatured(currentSlotRef.current === index)

    if (groupRef.current) {
      groupRef.current.rotation.y = -currentRotationRef.current
    }
  })

  return (
    <group position={[x, 0, z]} ref={groupRef}>
      <CardMesh binding={binding} isFeatured={isFeatured} frontness={frontness} />
    </group>
  )
}
