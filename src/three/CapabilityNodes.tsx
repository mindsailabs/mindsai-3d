import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { capabilities, smoothFade } from '../lib/copy'
import { useAppStore } from '../lib/store'
import { useViewport } from '../lib/useViewport'
import { useReducedMotion } from '../lib/useReducedMotion'

/**
 * Seven capability planets — scroll-driven planet tour (v4).
 *
 * Earlier versions ran each planet on its OWN orbital clock (per-planet
 * angular velocity + delta * speed) WHILE the group also rotated with
 * scroll. Net result: two clocks, no coherent flow. Some planets sped
 * past while others crawled, depending on which way their orbit was
 * pointing relative to scroll-driven group rotation. Users couldn't
 * register what they were looking at.
 *
 * v4 model:
 * - Planets are STATIC at fixed positions around the M (no per-planet
 *   motion). Each planet has a unique angle, radius, and Y-offset.
 * - Y-offsets vary planet-to-planet so labels never share screen rows
 *   (prevents the "all titles stacked on the left" clutter).
 * - Scroll position within Act 3 (0.355 → 0.48) drives a continuous
 *   "featured index" 0..7 that smoothly cycles through planets.
 * - Group rotation lerps so the featured planet always lands closest to
 *   the camera (+Z foreground). Result: scroll = direct manipulation
 *   of which planet is being read.
 * - Featured planet scales 1.8×, glows 5.5× brightness, full title
 *   visible. Adjacent planets get partial credit via a Gaussian falloff
 *   (peak 1.0 at featured, ~0.37 at next-door, ~0.02 at opposite side).
 *   Far-from-featured planets shrink to 0.65× and dim — the visual DoF.
 * - Hover overrides scroll: rotation lerps to bring the hovered planet
 *   to foreground, hovered planet expands its full description card.
 *
 * Each planet now gets ~1.8% of total scroll (12.5% of Act 3 / 7) — a
 * full viewport's worth. Stop scrolling = scene parks at that planet.
 * Scroll fast = camera tour scrolls through planets fast but never
 * skips a featured-state — the eased rotation guarantees each planet
 * holds the foreground for ~one viewport.
 */

// Scroll window for Act 3 (must match the camera + alpha fade timings
// in CameraRig.tsx and CapabilityNodes' act3Alpha smoothFade).
const ACT3_TOUR_START = 0.365
const ACT3_TOUR_END = 0.48
const ACT3_TOUR_SPAN = ACT3_TOUR_END - ACT3_TOUR_START
const PLANET_COUNT = capabilities.length // 7

interface PlanetPos {
  angle: number // radians around Y axis
  yOffset: number // vertical offset from M's centre — varies so labels stagger
  radius: number // distance from M centre
}

// Spherical-ish distribution. Even angles around the equator, but Y
// varies in a non-monotonic pattern so planets at NEAR-adjacent angles
// have DIFFERENT heights. Net: when two planets transit a similar
// horizontal screen position, their labels stack vertically without
// overlapping.
const PLANET_POSITIONS: PlanetPos[] = capabilities.map((_, i) => {
  // Y pattern designed by hand so no three consecutive planets share a Y band:
  // [+0.45, -0.55, +0.65, -0.20, +0.55, -0.50, +0.20] — alternating high/low
  // with subtle variance.
  const yPattern = [0.45, -0.55, 0.65, -0.2, 0.55, -0.5, 0.2]
  // Slight radius variance so depth reads even when angles are close.
  const rPattern = [2.6, 2.45, 2.7, 2.55, 2.65, 2.5, 2.6]
  return {
    angle: (i / PLANET_COUNT) * Math.PI * 2,
    yOffset: yPattern[i] ?? 0,
    radius: rPattern[i] ?? 2.6,
  }
})

const PLANET_POSITIONS_MOBILE: PlanetPos[] = PLANET_POSITIONS.map((p) => ({
  ...p,
  radius: p.radius * 0.62,
  yOffset: p.yOffset * 0.7,
}))

export function CapabilityNodes() {
  const progress = useAppStore((s) => s.scrollProgress)
  const hoveredCapability = useAppStore((s) => s.hoveredCapability)
  const setHoveredCapability = useAppStore((s) => s.setHoveredCapability)
  const { isMobile } = useViewport()
  const reducedMotion = useReducedMotion()

  const groupRef = useRef<THREE.Group>(null!)
  const positions = isMobile ? PLANET_POSITIONS_MOBILE : PLANET_POSITIONS

  useFrame(() => {
    if (!groupRef.current) return

    const sp = progress
    const act3Alpha = smoothFade(sp, 0.30, 0.365, 0.49, 0.515)

    // Continuous featured index, 0..7 across Act 3 scroll window.
    // We multiply by PLANET_COUNT (not PLANET_COUNT - 1) so a full
    // scroll-through cycles through all planets including a brief
    // pass through the "between planet 6 and planet 0" wrap zone at
    // the very end of Act 3, easing into the Act 3→4 push frame.
    const tourT = Math.max(0, Math.min(1, (sp - ACT3_TOUR_START) / ACT3_TOUR_SPAN))
    let featured = tourT * PLANET_COUNT // 0..7

    // Hover override: bring the hovered planet to foreground regardless
    // of scroll position. featured snaps to hoveredIndex.
    if (hoveredCapability !== null) {
      featured = hoveredCapability
    }

    // Group rotation: position featured planet at world angle π/2
    // (= positive Z, closest to camera at z=7.8).
    const angleStep = (Math.PI * 2) / PLANET_COUNT
    const targetRotY = Math.PI / 2 - featured * angleStep

    // Ease toward target rotation. 0.16 lerp gives ~10 frames to settle —
    // tight enough that scrolling responds, smooth enough that the
    // motion reads as cinematic.
    const cur = groupRef.current.rotation.y
    // Wrap-aware lerp: pick the shorter of CW vs CCW path so we don't
    // unwind through 360° when crossing the index 0 boundary.
    let delta = targetRotY - cur
    while (delta > Math.PI) delta -= Math.PI * 2
    while (delta < -Math.PI) delta += Math.PI * 2
    const lerpAmount = reducedMotion ? 1 : 0.16
    groupRef.current.rotation.y = cur + delta * lerpAmount

    groupRef.current.scale.setScalar(act3Alpha)
    groupRef.current.visible = act3Alpha > 0.001
  })

  return (
    <group ref={groupRef} position={[0, 0.1, 0]}>
      {capabilities.map((cap, i) => (
        <CapabilityPlanet
          key={cap.id}
          capability={cap}
          index={i}
          pos={positions[i]}
          hoveredIndex={hoveredCapability}
          onHover={setHoveredCapability}
          isMobile={isMobile}
        />
      ))}
    </group>
  )
}

/**
 * CapabilityPlanet — one planet, one fixed position. Its appearance
 * (scale, brightness, label visibility) is driven entirely by the
 * "featured index" computed from scroll.
 */
function CapabilityPlanet({
  capability,
  index,
  pos,
  hoveredIndex,
  onHover,
  isMobile,
}: {
  capability: (typeof capabilities)[number]
  index: number
  pos: PlanetPos
  hoveredIndex: number | null
  onHover: (i: number | null) => void
  isMobile: boolean
}) {
  const progress = useAppStore((s) => s.scrollProgress)
  const nodeRef = useRef<THREE.Mesh>(null!)
  const glowRef = useRef<THREE.Mesh>(null!)
  const cardRef = useRef<THREE.Group>(null!)
  const labelRef = useRef<THREE.Group>(null!)

  const isHovered = hoveredIndex === index
  const anyHovered = hoveredIndex !== null

  // STATIC local position from the planet's pos descriptor — no per-frame
  // angular advance. The group around us rotates with scroll; we just
  // sit at a fixed offset.
  const px = Math.cos(pos.angle) * pos.radius
  const py = pos.yOffset
  const pz = Math.sin(pos.angle) * pos.radius

  const baseColor = useMemo(() => new THREE.Color('#73C5CC'), [])

  const nodeMaterial = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      color: baseColor.clone().multiplyScalar(2.0),
      transparent: true,
    })
    m.toneMapped = false
    return m
  }, [baseColor])

  const glowMaterial = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      color: baseColor.clone().multiplyScalar(1.2),
      transparent: true,
      opacity: 0.3,
    })
    m.toneMapped = false
    return m
  }, [baseColor])

  useFrame(() => {
    const sp = progress

    // Recompute the featured index for THIS frame so each planet's
    // featureT lookup is in sync with the group rotation logic.
    const tourT = Math.max(
      0,
      Math.min(1, (sp - ACT3_TOUR_START) / ACT3_TOUR_SPAN)
    )
    let featured = tourT * PLANET_COUNT
    if (hoveredIndex !== null) featured = hoveredIndex

    // Cyclic distance from this planet's index to the featured float.
    let d = Math.abs(index - featured)
    d = Math.min(d, PLANET_COUNT - d) // wrap-aware

    // Gaussian falloff. v2 — TIGHTER width (0.28 instead of 0.65) so
    // only the featured planet + very-near-transition neighbour read
    // as "active." User feedback: "items revolving are not visible"
    // = previous width gave ALL planets partial credit and the scene
    // looked like a static cloud of equally-bright orbs. Now:
    //   d=0 (featured): 1.00
    //   d=0.5 (mid)   : 0.41
    //   d=1 (next)    : 0.03 (essentially off)
    const featureT = Math.exp(-(d * d) / 0.28)

    // Scale + brightness lerp. v2 — much sharper contrast between
    // featured and not, so each planet "expands" dramatically as it
    // becomes the active one.
    if (nodeRef.current) {
      const effectiveT = isHovered ? 1.4 : featureT
      const targetScale = anyHovered && !isHovered
        ? 0.4
        : 0.55 + effectiveT * 1.95 // featured 2.5×, far 0.55×
      const cur = nodeRef.current.scale.x
      nodeRef.current.scale.setScalar(cur + (targetScale - cur) * 0.14)

      const mat = nodeRef.current.material as THREE.MeshBasicMaterial
      // Featured 6.5× brightness, far 0.7× — clear hierarchy.
      const boost = isHovered ? 6.5 : 0.7 + effectiveT * 5.8
      mat.color = baseColor.clone().multiplyScalar(boost)
      const targetOpacity = anyHovered && !isHovered
        ? 0.2
        : 0.3 + effectiveT * 0.7
      mat.opacity = mat.opacity + (targetOpacity - mat.opacity) * 0.14
    }

    // Glow halo — wider + brighter for featured.
    if (glowRef.current) {
      const gTarget = isHovered ? 4.0 : 0.5 + featureT * 3.5
      const c = glowRef.current.scale.x
      glowRef.current.scale.setScalar(c + (gTarget - c) * 0.12)
      const gm = glowRef.current.material as THREE.MeshBasicMaterial
      const gOp = isHovered ? 0.6 : 0.04 + featureT * 0.5
      gm.opacity = gm.opacity + (gOp - gm.opacity) * 0.14
    }

    // Label visibility — v2 strictly featureT-driven, NO floor. Far-
    // from-featured planets show no label at all → only the active
    // planet's title is visible at any moment, eliminating the "all
    // 7 labels stacked" clutter. The label group's opacity lerps
    // toward featureT^1.4 (sharper than linear so non-featured
    // planets fade fast).
    if (labelRef.current) {
      const target = isHovered ? 0 : Math.pow(featureT, 1.4)
      labelRef.current.traverse((obj) => {
        const mat = (obj as unknown as { material?: THREE.Material }).material
        if (mat && 'opacity' in mat) {
          const m = mat as THREE.Material & { opacity: number }
          m.opacity = m.opacity + (target - m.opacity) * 0.15
        }
      })
    }

    // Expanded card opacity — only this planet's hover triggers it.
    if (cardRef.current) {
      const target = isHovered ? 1 : 0
      cardRef.current.traverse((obj) => {
        const mat = (obj as unknown as { material?: THREE.Material }).material
        if (mat && 'opacity' in mat) {
          const m = mat as THREE.Material & { opacity: number }
          m.opacity = m.opacity + (target - m.opacity) * 0.16
        }
      })
    }
  })

  // Card position — bias outward from M (radially) so it doesn't overlap
  // the planet from the camera's perspective.
  const cardOffsetSign = pos.angle > Math.PI ? -1 : 1
  const cardOffsetX = cardOffsetSign * 0.55

  return (
    <group position={[px, py, pz]}>
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

      {/* Always-visible label — fades with featureT so back-of-tour
          planets don't compete with the featured one. drei <Billboard>
          handles lookAt-camera automatically. */}
      <Billboard follow position={[0, isMobile ? 0.22 : 0.3, 0]}>
        <group ref={labelRef}>
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
            material-opacity={1.0}
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
              material-opacity={1.0}
            >
              {capability.title}
            </Text>
          )}
        </group>
      </Billboard>

      {/* Expanded hover card — full description in white */}
      <Billboard follow position={[cardOffsetX, 0, 0]}>
        <group ref={cardRef}>
          <Text
            fontSize={0.08}
            color="#73C5CC"
            anchorX={cardOffsetSign > 0 ? 'left' : 'right'}
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
            anchorX={cardOffsetSign > 0 ? 'left' : 'right'}
            anchorY="top"
            position={[0, 0.16, 0]}
            fontWeight={700}
            maxWidth={isMobile ? 1.6 : 2.6}
            textAlign={cardOffsetSign > 0 ? 'left' : 'right'}
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
            anchorX={cardOffsetSign > 0 ? 'left' : 'right'}
            anchorY="top"
            position={[0, -0.35, 0]}
            maxWidth={isMobile ? 1.6 : 2.6}
            textAlign={cardOffsetSign > 0 ? 'left' : 'right'}
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
