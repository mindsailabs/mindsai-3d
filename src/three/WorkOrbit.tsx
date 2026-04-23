import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { caseStudies, smoothFade } from '../lib/copy'
import { useAppStore } from '../lib/store'

/**
 * Work carousel — 6 case-study cards orbit the M with SNAP scroll behavior.
 *
 * Scroll divides Act 4 into 6 slots (one per case study). Within each slot
 * the rotation HOLDS so the featured video plays undisturbed. Scroll advances
 * past the slot boundary and the carousel snaps to the next card. Videos
 * PAUSE when not featured, PLAY when featured. Like a curtain stack with a
 * pause between each reveal.
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

interface CardMeshProps {
  study: (typeof caseStudies)[number]
  shouldPlay: boolean
  isFeatured: boolean
  frontness: number
}

function CardMesh({ study, shouldPlay, isFeatured, frontness }: CardMeshProps) {
  const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null)
  const videoElRef = useRef<HTMLVideoElement | null>(null)
  const groupRef = useRef<THREE.Group>(null!)

  useEffect(() => {
    if (!shouldPlay) return
    const video = document.createElement('video')
    video.src = study.videoPath
    video.loop = true
    video.muted = true
    video.playsInline = true
    video.crossOrigin = 'anonymous'
    videoElRef.current = video
    const tex = new THREE.VideoTexture(video)
    tex.colorSpace = THREE.SRGBColorSpace
    setVideoTexture(tex)
    return () => {
      video.pause()
      video.src = ''
      tex.dispose()
    }
  }, [shouldPlay, study.videoPath])

  // Play when featured, pause otherwise. Featured card resets to start so
  // each "arrival" feels like a fresh beginning — curtain-stack feel.
  useEffect(() => {
    const v = videoElRef.current
    if (!v) return
    if (isFeatured) {
      v.currentTime = 0
      v.play().catch(() => {})
    } else {
      v.pause()
    }
  }, [isFeatured])

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
    if (groupRef.current) {
      groupRef.current.scale.setScalar(cardScale)
    }
  })

  return (
    <group ref={groupRef}>
      <mesh>
        <planeGeometry args={[CARD_HEIGHT_BASE * CARD_ASPECT, CARD_HEIGHT_BASE]} />
        {videoTexture ? (
          <meshBasicMaterial
            map={videoTexture}
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

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const sp = progress
    const act4Alpha = smoothFade(sp, 0.49, 0.55, 0.83, 0.861)

    if (groupRef.current) {
      // SNAP-SCROLL with padded boundaries.
      //
      // Users complained the first/last videos never got a "beat" to play —
      // scroll dropped them straight into a transition at the Act-4 boundary.
      // Fix: reserve the first BOUNDARY_PAD and last BOUNDARY_PAD of Act 4 as
      // pure HOLD on card 0 / card 5, and map the remaining span across the
      // (SLOT_COUNT-1) transitions between videos. Per-slot HOLD also bumped
      // to 82% (was 70%) so each card plays undisturbed longer.
      const act4Linear = Math.max(0, Math.min(1, (sp - ACT4_START) / ACT4_SPAN))
      const BOUNDARY_PAD = 0.2
      const transZone = 1 - 2 * BOUNDARY_PAD

      let rawPos: number
      if (act4Linear <= BOUNDARY_PAD) {
        rawPos = 0 // HOLD on card 0
      } else if (act4Linear >= 1 - BOUNDARY_PAD) {
        rawPos = SLOT_COUNT - 1 // HOLD on last card
      } else {
        const t = (act4Linear - BOUNDARY_PAD) / transZone // 0..1
        rawPos = t * (SLOT_COUNT - 1) // 0..5 across the 5 transitions
      }

      const slotIdx = Math.min(SLOT_COUNT - 1, Math.floor(rawPos))
      const slotFrac = rawPos - slotIdx
      const snapT = smoothstep(0.82, 1.0, slotFrac) // hold 82%, transition 18%
      const displayIdx = slotIdx + snapT

      // Offset by -π/2 so slot 0 places Card 0 at world z=+r (camera-facing).
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

  const shouldMountVideos = progress > 0.46

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {caseStudies.map((study, i) => {
        const baseAngle = (i / caseStudies.length) * Math.PI * 2
        const x = Math.cos(baseAngle) * ORBIT_RADIUS
        const z = Math.sin(baseAngle) * ORBIT_RADIUS
        return (
          <AnglingCard
            key={study.id}
            study={study}
            index={i}
            shouldPlay={shouldMountVideos}
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
  study: (typeof caseStudies)[number]
  index: number
  shouldPlay: boolean
  baseAngle: number
  x: number
  z: number
  currentRotationRef: React.MutableRefObject<number>
  currentSlotRef: React.MutableRefObject<number>
}

function AnglingCard({
  study,
  index,
  shouldPlay,
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
    // Frontness uses (baseAngle - rot) to match actual world z after Y-rotation
    // (positive rot takes +X toward -Z in Three.js).
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
      <CardMesh
        study={study}
        shouldPlay={shouldPlay}
        isFeatured={isFeatured}
        frontness={frontness}
      />
    </group>
  )
}
