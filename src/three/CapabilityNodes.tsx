import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { capabilities, smoothFade } from '../lib/copy'
import { useAppStore } from '../lib/store'
import { useViewport } from '../lib/useViewport'

/**
 * Seven capability planets orbiting the M (the "sun") during Act 3.
 *
 * v3 — planets, not a constellation.
 *
 * Earlier versions had all seven nodes on a SINGLE shared ring with
 * glowing tubes connecting adjacent nodes. That read as a wired network,
 * not an orbital system. Planets are not linked to each other — they
 * share a star.
 *
 * v3 gives each capability its OWN orbit: independent radius, tilt,
 * speed, and phase. No beams. The M is the gravitational centre, the
 * seven planets move independently around it.
 *
 * Hover behaviour:
 *   – When you hover a planet, ALL orbital motion pauses.
 *   – The hovered planet scales up 2.2× and reveals a full card
 *     (code · title · description · index) beside it.
 *   – Other planets dim.
 *   – Release hover, motion resumes from the same angles (no snap back).
 */

interface PlanetOrbit {
  radius: number
  speed: number // rad/sec
  phase: number // initial angle, rad
  tiltX: number
  tiltZ: number
  yBob: number // amplitude of vertical bob along orbit
  bobFreqMul: number // how many times per full orbit it bobs
}

// Each capability gets its own orbit. Radii staggered from 1.95 to 3.6
// (staggered NOT linear — gives an asteroid-belt feel rather than
// concentric rings). Speeds and tilts picked to feel "natural" — no
// resonances so planets never align for long.
const PLANET_ORBITS_DESKTOP: PlanetOrbit[] = [
  { radius: 2.0, speed: 0.14, phase: 0.0, tiltX: 0.18, tiltZ: 0.05, yBob: 0.12, bobFreqMul: 1 },
  { radius: 2.4, speed: -0.11, phase: 1.1, tiltX: 0.32, tiltZ: -0.08, yBob: 0.18, bobFreqMul: 1 },
  { radius: 2.75, speed: 0.095, phase: 2.3, tiltX: -0.12, tiltZ: 0.16, yBob: 0.1, bobFreqMul: 2 },
  { radius: 3.1, speed: -0.08, phase: 3.6, tiltX: 0.24, tiltZ: -0.12, yBob: 0.14, bobFreqMul: 1 },
  { radius: 3.35, speed: 0.075, phase: 4.8, tiltX: -0.28, tiltZ: 0.08, yBob: 0.16, bobFreqMul: 2 },
  { radius: 3.6, speed: -0.065, phase: 5.6, tiltX: 0.38, tiltZ: -0.04, yBob: 0.09, bobFreqMul: 1 },
  { radius: 3.85, speed: 0.055, phase: 6.5, tiltX: -0.2, tiltZ: 0.14, yBob: 0.12, bobFreqMul: 3 },
]

// Mobile: tighter radii so the whole system fits in portrait.
const PLANET_ORBITS_MOBILE: PlanetOrbit[] = PLANET_ORBITS_DESKTOP.map(
  (o) => ({ ...o, radius: o.radius * 0.62 })
)

export function CapabilityNodes() {
  const progress = useAppStore((s) => s.scrollProgress)
  const hoveredCapability = useAppStore((s) => s.hoveredCapability)
  const setHoveredCapability = useAppStore((s) => s.setHoveredCapability)
  const { isMobile } = useViewport()

  const groupRef = useRef<THREE.Group>(null!)
  const PLANET_ORBITS = isMobile ? PLANET_ORBITS_MOBILE : PLANET_ORBITS_DESKTOP

  useFrame((state) => {
    const sp = progress
    // v5 — aligned with new camera timing. Push at 0.325, settled at
    // 0.365, hold ends 0.48, push to Act 4 at 0.515. Planets fade
    // IN 0.30 → 0.365 (during and through the flare, fully visible at
    // camera settled). Fade OUT 0.49 → 0.515 into Act 3→4 push.
    const act3Alpha = smoothFade(sp, 0.30, 0.365, 0.49, 0.515)

    if (groupRef.current) {
      // Scroll rotates the whole system slowly. Starts at the settled
      // frame (0.365), so the system arrives at a stable orientation.
      // Time drift paused on hover.
      const scrollRotation = Math.max(0, sp - 0.365) * 2.0
      const anyHovered = hoveredCapability !== null
      const idleDrift = anyHovered ? 0 : state.clock.elapsedTime * 0.02
      groupRef.current.rotation.y = scrollRotation + idleDrift
      groupRef.current.scale.setScalar(act3Alpha)
      groupRef.current.visible = act3Alpha > 0.001
    }
  })

  return (
    <group ref={groupRef} position={[0, 0.1, 0]}>
      {capabilities.map((cap, i) => (
        <CapabilityPlanet
          key={cap.id}
          capability={cap}
          index={i}
          orbit={PLANET_ORBITS[i]}
          hoveredIndex={hoveredCapability}
          onHover={setHoveredCapability}
          isMobile={isMobile}
        />
      ))}
    </group>
  )
}

/**
 * CapabilityPlanet — one capability, one orbit. Advances its orbital
 * angle every frame unless any planet is hovered (then it freezes in
 * place so users can read the expanded card).
 */
function CapabilityPlanet({
  capability,
  index,
  orbit,
  hoveredIndex,
  onHover,
  isMobile,
}: {
  capability: (typeof capabilities)[number]
  index: number
  orbit: PlanetOrbit
  hoveredIndex: number | null
  onHover: (i: number | null) => void
  isMobile: boolean
}) {
  const planetRef = useRef<THREE.Group>(null!)
  const nodeRef = useRef<THREE.Mesh>(null!)
  const glowRef = useRef<THREE.Mesh>(null!)
  const cardRef = useRef<THREE.Group>(null!)
  const angleRef = useRef(orbit.phase)

  const isHovered = hoveredIndex === index
  const anyHovered = hoveredIndex !== null
  const isDimmed = anyHovered && !isHovered

  const nodeMaterial = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#73C5CC').multiplyScalar(2.6),
    })
    m.toneMapped = false
    return m
  }, [])

  const glowMaterial = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#73C5CC').multiplyScalar(1.2),
      transparent: true,
      opacity: 0.35,
    })
    m.toneMapped = false
    return m
  }, [])

  useFrame((state, delta) => {
    // Advance orbit unless something is hovered.
    if (!anyHovered) {
      angleRef.current += delta * orbit.speed
    }

    // Compute planet position from current angle, then apply tilt.
    const a = angleRef.current
    let px = Math.cos(a) * orbit.radius
    let py =
      Math.sin(a * orbit.bobFreqMul + orbit.phase * 0.7) * orbit.yBob
    let pz = Math.sin(a) * orbit.radius

    // Apply orbit-plane tilt (rotate around X then Z).
    const cosX = Math.cos(orbit.tiltX)
    const sinX = Math.sin(orbit.tiltX)
    const ty = py * cosX - pz * sinX
    const tz = py * sinX + pz * cosX
    py = ty
    pz = tz
    const cosZ = Math.cos(orbit.tiltZ)
    const sinZ = Math.sin(orbit.tiltZ)
    const tx = px * cosZ - py * sinZ
    const ty2 = px * sinZ + py * cosZ
    px = tx
    py = ty2

    if (planetRef.current) {
      planetRef.current.position.set(px, py, pz)
    }

    // Scale / dim lerp.
    const targetScale = isHovered ? 2.2 : isDimmed ? 0.7 : 1.0
    const current = nodeRef.current
    if (current) {
      const pulse =
        1 + Math.sin(state.clock.elapsedTime * 1.4 + index * 0.7) * 0.12
      const s = current.scale.x
      const newS = s + (targetScale * pulse - s) * 0.12
      current.scale.setScalar(newS)

      // Brightness ramp on hover (colour via material uniforms).
      const mat = current.material as THREE.MeshBasicMaterial
      const boost = isHovered ? 5.5 : isDimmed ? 1.2 : 2.6
      mat.color = new THREE.Color('#73C5CC').multiplyScalar(boost)
    }

    // Glow halo (wider sphere behind the node).
    if (glowRef.current) {
      const gTarget = isHovered ? 3.4 : isDimmed ? 0.5 : 1.4
      const cur = glowRef.current.scale.x
      const next = cur + (gTarget - cur) * 0.1
      glowRef.current.scale.setScalar(next)
      ;(glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        isHovered ? 0.55 : isDimmed ? 0.08 : 0.28
    }

    // Card fade-in on hover.
    if (cardRef.current) {
      const target = isHovered ? 1 : 0
      cardRef.current.traverse((obj) => {
        const mat = (obj as unknown as { material?: THREE.Material })
          .material
        if (mat && 'opacity' in mat) {
          const m = mat as THREE.Material & { opacity: number }
          m.opacity = m.opacity + (target - m.opacity) * 0.16
        }
      })
    }
  })

  // Card positions to the RIGHT of the planet on even indices, LEFT on
  // odd — so cards don't all collide in the same region of the scene.
  const cardOnRight = index % 2 === 0
  const cardOffsetX = cardOnRight ? 0.55 : -0.55

  return (
    <group ref={planetRef}>
      {/* Glow halo */}
      <mesh ref={glowRef} material={glowMaterial}>
        <sphereGeometry args={[0.14, 20, 20]} />
      </mesh>
      {/* Core planet */}
      <mesh
        ref={nodeRef}
        material={nodeMaterial}
        onPointerOver={(e) => {
          e.stopPropagation()
          onHover(index)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          onHover(null)
          document.body.style.cursor = 'default'
        }}
      >
        <sphereGeometry args={[0.09, 24, 24]} />
      </mesh>

      {/* Always-visible planet label — code + short title stacked so
          users can read WHICH capability this planet is without having
          to hover. Upsized 0.085 → 0.14 and opacity raised to 1.0 so
          the label reads clearly through the fog / bloom / particles. */}
      <Billboard follow position={[0, isMobile ? 0.22 : 0.3, 0]}>
        <group>
          <Text
            fontSize={isMobile ? 0.065 : 0.12}
            color="#73C5CC"
            anchorX="center"
            anchorY="bottom"
            position={[0, 0.03, 0]}
            letterSpacing={0.3}
            outlineWidth={0.004}
            outlineColor="#000000"
            outlineOpacity={0.55}
            material-toneMapped={false}
            material-transparent={true}
            material-opacity={isDimmed ? 0.35 : isHovered ? 0 : 1.0}
          >
            {capability.code}
          </Text>
          {!isMobile && (
            <Text
              fontSize={0.075}
              color="#FFFFFF"
              anchorX="center"
              anchorY="top"
              position={[0, -0.03, 0]}
              letterSpacing={0.02}
              maxWidth={2.2}
              textAlign="center"
              outlineWidth={0.003}
              outlineColor="#000000"
              outlineOpacity={0.6}
              material-toneMapped={false}
              material-transparent={true}
              material-opacity={isDimmed ? 0.3 : isHovered ? 0 : 0.92}
            >
              {capability.title}
            </Text>
          )}
        </group>
      </Billboard>

      {/* Expanded card — only animates in on hover */}
      <Billboard follow position={[cardOffsetX, 0, 0]}>
        <group ref={cardRef}>
          <Text
            fontSize={0.08}
            color="#73C5CC"
            anchorX={cardOnRight ? 'left' : 'right'}
            anchorY="bottom"
            position={[0, 0.24, 0]}
            letterSpacing={0.3}
            outlineWidth={0}
            material-toneMapped={false}
            material-transparent={true}
            material-opacity={0}
          >
            {capability.code} · {String(index + 1).padStart(2, '0')}/07
          </Text>
          <Text
            fontSize={isMobile ? 0.16 : 0.22}
            color="#FFFFFF"
            anchorX={cardOnRight ? 'left' : 'right'}
            anchorY="top"
            position={[0, 0.16, 0]}
            fontWeight={700}
            maxWidth={isMobile ? 1.6 : 2.6}
            textAlign={cardOnRight ? 'left' : 'right'}
            outlineWidth={0}
            material-toneMapped={false}
            material-transparent={true}
            material-opacity={0}
          >
            {capability.title}
          </Text>
          <Text
            fontSize={0.075}
            color="#B8C0C0"
            anchorX={cardOnRight ? 'left' : 'right'}
            anchorY="top"
            position={[0, -0.35, 0]}
            maxWidth={isMobile ? 1.6 : 2.6}
            textAlign={cardOnRight ? 'left' : 'right'}
            outlineWidth={0}
            material-toneMapped={false}
            material-transparent={true}
            material-opacity={0}
          >
            {capability.description}
          </Text>
        </group>
      </Billboard>
    </group>
  )
}
