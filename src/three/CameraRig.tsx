import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '../lib/store'
import { useViewport } from '../lib/useViewport'

/**
 * Scroll-bound cinematic camera — v4 (Catmull-Rom spline + secondary
 * waypoints + cinematicSilk easing).
 *
 * Previous versions lerped between 5 act keyframes segment-by-segment,
 * which read as "mechanical slide" rather than "authored camera move."
 * This version:
 *
 *   – Builds a CatmullRomCurve3 through the 5 act keyframes PLUS two
 *     secondary waypoints between each pair, so the camera genuinely
 *     TRAVELS through 3D space (dips IN before pulling back for Act 2,
 *     ARCS up before descending for Act 4, etc.) rather than taking a
 *     straight line.
 *   – Uses centripetal parameterisation to prevent loops or cusps on
 *     the curve from the uneven keyframe spacing.
 *   – Maps scroll progress to curve-u through a piecewise function that
 *     respects each keyframe's scrollPosition, then applies
 *     cinematicSilk easing (cubic-bezier approximation) within each
 *     segment so the camera anticipates and settles at each act rather
 *     than gliding uniformly.
 *   – Keeps lookAt on a separate Catmull curve so the focus point
 *     evolves smoothly even while the camera takes a more dramatic path.
 *
 * Cursor parallax, mobile camera adjustments, and autopilot drift all
 * carry forward unchanged.
 */

interface Keyframe {
  scrollPosition: number
  position: [number, number, number]
  lookAt: [number, number, number]
  fov: number
}

// Primary anchor keyframes — where the camera "settles" at each act.
const ANCHORS: Keyframe[] = [
  // Act 1 hero — framing M at y=0.25, slightly elevated so typography has air
  { scrollPosition: 0.0, position: [0, 0.25, 7.5], lookAt: [0, 0.2, 0], fov: 32 },

  // Act 2 (0.127-0.316) — pull BACK to see outcome panels orbiting the M.
  { scrollPosition: 0.22, position: [0, 0.4, 9.8], lookAt: [0, 0.15, 0], fov: 38 },

  // Act 3 (0.316-0.506) — push IN to the capability ring.
  { scrollPosition: 0.41, position: [0, 0.3, 7.8], lookAt: [0, 0.2, 0], fov: 36 },

  // Act 4 (0.506-0.861) — carousel orbit at radius 5.8, camera at z=12.
  { scrollPosition: 0.68, position: [0, 0.15, 12.0], lookAt: [0, 0.1, 0], fov: 34 },

  // Act 5 (0.861-1.0) — low reverent monument angle, looking slightly LEFT
  // where the M translates to sit on its pedestal.
  { scrollPosition: 0.95, position: [0, -0.7, 7.0], lookAt: [-1.8, 0.1, 0], fov: 32 },
]

/**
 * Secondary waypoints between each pair of anchors — these make the
 * transition feel like a journey through 3D space, not a slide.
 *
 * Each entry is [(anchor_index), (waypoint_position), (waypoint_lookAt), fov].
 * waypoint_position is computed as "mid-anchor + offset" where offset
 * gives the camera an interesting arc / dip / rise between the anchors.
 */
const TRANSIT_WAYPOINTS: {
  betweenAnchors: [number, number]
  position: [number, number, number]
  lookAt: [number, number, number]
  fov: number
}[] = [
  // Act 1 → Act 2: dip CLOSE-IN to the M (push-focus tension) before
  // pulling back to reveal the outcome panels.
  {
    betweenAnchors: [0, 1],
    position: [0, 0.32, 5.8],
    lookAt: [0, 0.18, 0],
    fov: 30,
  },

  // Act 2 → Act 3: arc UP and over before descending to the orbital ring.
  {
    betweenAnchors: [1, 2],
    position: [0, 0.9, 8.5],
    lookAt: [0, 0.3, 0],
    fov: 37,
  },

  // Act 3 → Act 4: pull back AND rise so the carousel emerges from below,
  // then settle at the high-framing z=12 shot.
  {
    betweenAnchors: [2, 3],
    position: [0, 0.7, 10.5],
    lookAt: [0, 0.2, 0],
    fov: 35,
  },

  // Act 4 → Act 5: descend + arc LEFT so the camera "lands" at the
  // monument angle rather than cutting.
  {
    betweenAnchors: [3, 4],
    position: [0, -0.3, 9.5],
    lookAt: [-0.9, 0.15, 0],
    fov: 33,
  },
]

/**
 * Build an interleaved keyframe list by inserting each transit waypoint
 * at its own midpoint scrollPosition, so the spline has [anchor, wp,
 * anchor, wp, anchor, …] ordered by scroll.
 */
function buildInterleavedKeyframes(): Keyframe[] {
  const all: Keyframe[] = [ANCHORS[0]]
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const a = ANCHORS[i]
    const b = ANCHORS[i + 1]
    const wp = TRANSIT_WAYPOINTS.find(
      (w) => w.betweenAnchors[0] === i && w.betweenAnchors[1] === i + 1
    )
    if (wp) {
      all.push({
        scrollPosition: a.scrollPosition + (b.scrollPosition - a.scrollPosition) * 0.5,
        position: wp.position,
        lookAt: wp.lookAt,
        fov: wp.fov,
      })
    }
    all.push(b)
  }
  return all
}

const KEYFRAMES = buildInterleavedKeyframes()

/**
 * cinematicSilk — approximates cubic-bezier(0.45, 0.05, 0.55, 0.95).
 * More pronounced anticipate-and-settle than smoothstep; less
 * aggressive than ease-in-out-quart. Chosen for scroll camera because
 * it feels like a hand-operated dolly: slow start, quick mid, slow
 * settle at the destination anchor.
 */
function cinematicSilk(t: number): number {
  const c = Math.max(0, Math.min(1, t))
  // Cubic ease-in-out — close enough match for the target bezier and
  // cheaper than iterating a real bezier solver every frame.
  return c < 0.5
    ? 4 * c * c * c
    : 1 - Math.pow(-2 * c + 2, 3) / 2
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Build two Catmull curves (position + lookAt) once, reuse every frame.
 */
function buildCurves() {
  const positions = KEYFRAMES.map(
    (k) => new THREE.Vector3(...k.position)
  )
  const lookAts = KEYFRAMES.map(
    (k) => new THREE.Vector3(...k.lookAt)
  )
  const positionCurve = new THREE.CatmullRomCurve3(
    positions,
    false,
    'centripetal',
    0.5
  )
  const lookAtCurve = new THREE.CatmullRomCurve3(
    lookAts,
    false,
    'centripetal',
    0.5
  )
  return { positionCurve, lookAtCurve }
}

/**
 * Scroll progress → curve-u with segment-aware easing. Within each
 * (KEYFRAMES[i] → KEYFRAMES[i+1]) segment, local t is eased via
 * cinematicSilk before being mapped to the global curve-u.
 */
function scrollToCurveU(progress: number): number {
  const n = KEYFRAMES.length
  if (progress <= KEYFRAMES[0].scrollPosition) return 0
  if (progress >= KEYFRAMES[n - 1].scrollPosition) return 1

  for (let i = 0; i < n - 1; i++) {
    const a = KEYFRAMES[i]
    const b = KEYFRAMES[i + 1]
    if (progress >= a.scrollPosition && progress <= b.scrollPosition) {
      const localT = (progress - a.scrollPosition) / (b.scrollPosition - a.scrollPosition)
      const eased = cinematicSilk(localT)
      return (i + eased) / (n - 1)
    }
  }
  return 0
}

/**
 * FOV is NOT interpolated on the curve (Catmull over scalars is
 * overkill) — we sample it from the two bracketing keyframes with the
 * same eased localT used for curve-u. Result: FOV eases in sync with
 * the camera's physical position.
 */
function sampleFov(progress: number): number {
  const n = KEYFRAMES.length
  if (progress <= KEYFRAMES[0].scrollPosition) return KEYFRAMES[0].fov
  if (progress >= KEYFRAMES[n - 1].scrollPosition) return KEYFRAMES[n - 1].fov

  for (let i = 0; i < n - 1; i++) {
    const a = KEYFRAMES[i]
    const b = KEYFRAMES[i + 1]
    if (progress >= a.scrollPosition && progress <= b.scrollPosition) {
      const localT = (progress - a.scrollPosition) / (b.scrollPosition - a.scrollPosition)
      const eased = cinematicSilk(localT)
      return lerp(a.fov, b.fov, eased)
    }
  }
  return KEYFRAMES[0].fov
}

export function CameraRig() {
  const { camera } = useThree()
  const scrollProgress = useAppStore((s) => s.scrollProgress)
  const { isMobile } = useViewport()

  const lookAtTarget = useRef(new THREE.Vector3())
  const desiredPos = useRef(new THREE.Vector3())
  const sampleBuf = useRef(new THREE.Vector3())

  // Cursor-driven parallax: subtle scene-follows-gaze.
  const mouseTarget = useRef({ x: 0, y: 0 })
  const mouseSmoothed = useRef({ x: 0, y: 0 })

  const { positionCurve, lookAtCurve } = useMemo(buildCurves, [])

  useEffect(() => {
    function onMove(e: MouseEvent) {
      mouseTarget.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouseTarget.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const u = scrollToCurveU(scrollProgress)

    // Sample the two Catmull curves at the same u — position + focus
    // evolve together through 3D space.
    positionCurve.getPoint(u, sampleBuf.current)
    desiredPos.current.copy(sampleBuf.current)
    lookAtCurve.getPoint(u, lookAtTarget.current)

    const fov = sampleFov(scrollProgress)

    // Ease mouse toward target — low factor so it feels like cinematic
    // tracking, not a cursor leash.
    mouseSmoothed.current.x = lerp(mouseSmoothed.current.x, mouseTarget.current.x, 0.045)
    mouseSmoothed.current.y = lerp(mouseSmoothed.current.y, mouseTarget.current.y, 0.045)

    // Mobile: pull the camera back 35% so orbital content fits the
    // portrait frustum.
    if (isMobile) {
      desiredPos.current.z *= 1.35
    }

    // Autopilot drift so the camera breathes even when idle.
    desiredPos.current.x += Math.sin(t * 0.13) * 0.08
    desiredPos.current.y += Math.cos(t * 0.11) * 0.05
    desiredPos.current.z += Math.sin(t * 0.08) * 0.05

    // Cursor parallax offset.
    desiredPos.current.x += mouseSmoothed.current.x * 0.35
    desiredPos.current.y += mouseSmoothed.current.y * 0.2

    // Per-frame lerp — still smoothed so scroll snaps don't jar the
    // camera, but now the TARGET itself is already curve-sampled and
    // eased. 0.14 is a hair tighter than v3 (0.12) because the target
    // evolves more smoothly now; we can afford to follow more faithfully.
    camera.position.lerp(desiredPos.current, 0.14)

    // Look-at nudge by cursor.
    lookAtTarget.current.x += mouseSmoothed.current.x * 0.12
    lookAtTarget.current.y += mouseSmoothed.current.y * 0.08
    camera.lookAt(lookAtTarget.current)

    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const cam = camera as THREE.PerspectiveCamera
      const targetFov = isMobile ? fov + 6 : fov
      cam.fov = lerp(cam.fov, targetFov, 0.1)
      cam.updateProjectionMatrix()
    }
  })

  return null
}
