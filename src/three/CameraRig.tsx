import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '../lib/store'
import { useViewport } from '../lib/useViewport'

/**
 * Scroll-bound cinematic camera — v5 (face-zoom transitions).
 *
 * v4 kept keyframes separated into "anchors" and "transit waypoints"
 * with forced midpoint-scroll interleaving. That made it hard to tune
 * the critical moments — in particular the "element comes AT the camera
 * before the next act emerges" beat that sells the 3D.
 *
 * v5 flattens everything into a single ordered KEYFRAMES array with
 * explicit scrollPosition per frame. Each inter-act transit now includes
 * a FACE-ZOOM frame where z drops to ~2 and fov tightens — the previous
 * act's 3D element comes into the viewer's face, then the camera pulls
 * back to reveal the next act. Plus a HOLD frame right after each
 * settle so users have a beat to register the new scene before motion
 * resumes.
 */

interface Keyframe {
  scrollPosition: number
  position: [number, number, number]
  lookAt: [number, number, number]
  fov: number
}

// Single ordered list. Each ACT is a "fast-arrive, long-hold" shape:
//   PUSH peak → SETTLED (within ~0.04 scroll, so the camera arrives
//   quickly after the push) → HOLD (~0.12+ scroll, so the act has a
//   long static window to read) → next PUSH.
//
// v6 — widened held windows per user feedback "first frame after the
// transition is moving too fast." Previously the pullback from push to
// settled spanned 10% of scroll, so the camera was still decelerating
// well inside the first viewport of the new act. Now each settled frame
// is only 0.04 scroll away from its push, and the following hold is
// much longer. Net effect: once you pass a push, the scene locks in
// immediately and stays locked for a long read.
const KEYFRAMES: Keyframe[] = [
  // ─── ACT 1 hero — extended hold so the first paint has gravity ───
  { scrollPosition: 0.0, position: [0, 0.25, 7.5], lookAt: [0, 0.2, 0], fov: 32 },
  { scrollPosition: 0.045, position: [0, 0.255, 7.47], lookAt: [0, 0.2, 0], fov: 32 },
  { scrollPosition: 0.085, position: [0, 0.26, 7.4], lookAt: [0, 0.2, 0], fov: 31 },

  // ─── ACT 1 → ACT 2 PUSH — M comes INTO the face ──────────────────
  { scrollPosition: 0.12, position: [0, 0.22, 1.65], lookAt: [0, 0.15, 0], fov: 24 },

  // ─── ACT 2 settled — FAST arrival so user isn't still "in motion"
  //     when the outcomes come into view. 0.04 scroll after the push.
  { scrollPosition: 0.16, position: [0, 0.4, 9.8], lookAt: [0, 0.15, 0], fov: 38 },
  // ─── ACT 2 HOLD — long static window (0.16 → 0.29 = 13% of scroll)
  //     so user can actually read the outcomes.
  { scrollPosition: 0.22, position: [0.02, 0.4, 9.78], lookAt: [0, 0.15, 0], fov: 38 },
  { scrollPosition: 0.29, position: [0, 0.4, 9.76], lookAt: [0, 0.15, 0], fov: 38 },

  // ─── ACT 2 → ACT 3 PUSH ─────────────────────────────────────────
  { scrollPosition: 0.325, position: [0, 0.22, 2.3], lookAt: [0, 0.18, 0], fov: 28 },

  // ─── ACT 3 settled — FAST arrival (0.04 after push). ────────────
  { scrollPosition: 0.365, position: [0, 0.3, 7.8], lookAt: [0, 0.2, 0], fov: 36 },
  // ─── ACT 3 HOLD — long window 0.365 → 0.48 = 11.5% ──────────────
  { scrollPosition: 0.42, position: [0.02, 0.3, 7.78], lookAt: [0, 0.2, 0], fov: 36 },
  { scrollPosition: 0.48, position: [0, 0.3, 7.76], lookAt: [0, 0.2, 0], fov: 36 },

  // ─── ACT 3 → ACT 4 PUSH ─────────────────────────────────────────
  { scrollPosition: 0.515, position: [0, 0.25, 2.0], lookAt: [0, 0.2, 0], fov: 30 },

  // ─── ACT 4 settled — FAST arrival (0.04 after push). ────────────
  { scrollPosition: 0.555, position: [0, 0.15, 12.0], lookAt: [0, 0.1, 0], fov: 34 },
  // ─── ACT 4 HOLD — very long (0.555 → 0.82 = 26.5% of scroll) —
  //     this is the work carousel, the densest content section.
  { scrollPosition: 0.64, position: [0.02, 0.15, 11.96], lookAt: [0, 0.1, 0], fov: 34 },
  { scrollPosition: 0.75, position: [0, 0.15, 11.98], lookAt: [0, 0.1, 0], fov: 34 },
  { scrollPosition: 0.82, position: [0.01, 0.15, 12.0], lookAt: [0, 0.1, 0], fov: 34 },

  // ─── ACT 4 → ACT 5 transit — descent + arc left ─────────────────
  { scrollPosition: 0.87, position: [0, -0.25, 5.5], lookAt: [-1.2, 0.1, 0], fov: 33 },

  // ─── ACT 5 settled — monument / low reverent angle ──────────────
  { scrollPosition: 0.95, position: [0, -0.7, 7.0], lookAt: [-1.8, 0.1, 0], fov: 32 },
]

/**
 * cinematicSilk — cubic ease-in-out. Anticipate-and-settle shape that
 * reads like a hand-operated dolly.
 */
function cinematicSilk(t: number): number {
  const c = Math.max(0, Math.min(1, t))
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Build two Catmull curves (position + lookAt) once, reuse every frame.
 */
function buildCurves() {
  const positions = KEYFRAMES.map((k) => new THREE.Vector3(...k.position))
  const lookAts = KEYFRAMES.map((k) => new THREE.Vector3(...k.lookAt))
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
 * Scroll progress → curve-u. Local segment t is eased via cinematicSilk
 * so each keyframe anticipates + settles rather than gliding uniformly.
 */
function scrollToCurveU(progress: number): number {
  const n = KEYFRAMES.length
  if (progress <= KEYFRAMES[0].scrollPosition) return 0
  if (progress >= KEYFRAMES[n - 1].scrollPosition) return 1

  for (let i = 0; i < n - 1; i++) {
    const a = KEYFRAMES[i]
    const b = KEYFRAMES[i + 1]
    if (progress >= a.scrollPosition && progress <= b.scrollPosition) {
      const localT =
        (progress - a.scrollPosition) / (b.scrollPosition - a.scrollPosition)
      const eased = cinematicSilk(localT)
      return (i + eased) / (n - 1)
    }
  }
  return 0
}

function sampleFov(progress: number): number {
  const n = KEYFRAMES.length
  if (progress <= KEYFRAMES[0].scrollPosition) return KEYFRAMES[0].fov
  if (progress >= KEYFRAMES[n - 1].scrollPosition) return KEYFRAMES[n - 1].fov

  for (let i = 0; i < n - 1; i++) {
    const a = KEYFRAMES[i]
    const b = KEYFRAMES[i + 1]
    if (progress >= a.scrollPosition && progress <= b.scrollPosition) {
      const localT =
        (progress - a.scrollPosition) / (b.scrollPosition - a.scrollPosition)
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

    positionCurve.getPoint(u, sampleBuf.current)
    desiredPos.current.copy(sampleBuf.current)
    lookAtCurve.getPoint(u, lookAtTarget.current)

    const fov = sampleFov(scrollProgress)

    mouseSmoothed.current.x = lerp(
      mouseSmoothed.current.x,
      mouseTarget.current.x,
      0.045
    )
    mouseSmoothed.current.y = lerp(
      mouseSmoothed.current.y,
      mouseTarget.current.y,
      0.045
    )

    if (isMobile) {
      desiredPos.current.z *= 1.35
    }

    // Scroll velocity (absolute). Lenis exposes raw velocity in px/frame
    // equivalents (can be large). We normalise to roughly [0, 1].
    const lenis = (
      window as unknown as { __lenis?: { velocity?: number } }
    ).__lenis
    const rawVel = lenis?.velocity ?? 0
    const velT = Math.min(1, Math.abs(rawVel) / 20)

    // Autopilot drift — ONLY while user is actively scrolling. When
    // scroll velocity is near zero the camera is ROCK-STILL at its
    // scroll-driven target. User's complaint "first frame after
    // transition moves too fast" came from drift + lerp catch-up
    // continuing after the user had stopped, making settled frames feel
    // like they were still in motion. Now settled = truly settled.
    const nearPush = desiredPos.current.z < 3.5
    const baseDrift = nearPush ? 0.05 : 0.35
    const driftAmp = baseDrift * velT
    desiredPos.current.x += Math.sin(t * 0.13) * 0.08 * driftAmp
    desiredPos.current.y += Math.cos(t * 0.11) * 0.05 * driftAmp
    desiredPos.current.z += Math.sin(t * 0.08) * 0.05 * driftAmp

    // Cursor parallax — always on (feels like camera "breath" when idle)
    // but reduced near push frames.
    const parallaxAmp = nearPush ? 0.1 : 0.55
    desiredPos.current.x += mouseSmoothed.current.x * 0.35 * parallaxAmp
    desiredPos.current.y += mouseSmoothed.current.y * 0.2 * parallaxAmp

    // Velocity-coupled lerp: fast snap when user is scrolling, tight
    // settle when they stop. 0.35 active → 0.5 at rest (snap).
    const lerpFactor = 0.35 + (1 - velT) * 0.15
    camera.position.lerp(desiredPos.current, lerpFactor)

    lookAtTarget.current.x += mouseSmoothed.current.x * 0.12 * parallaxAmp
    lookAtTarget.current.y += mouseSmoothed.current.y * 0.08 * parallaxAmp
    camera.lookAt(lookAtTarget.current)

    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const cam = camera as THREE.PerspectiveCamera
      const targetFov = isMobile ? fov + 6 : fov
      // FOV lerp also tightened so the fov-tightening at push frames
      // tracks scroll more directly.
      cam.fov = lerp(cam.fov, targetFov, 0.18)
      cam.updateProjectionMatrix()
    }
  })

  return null
}
