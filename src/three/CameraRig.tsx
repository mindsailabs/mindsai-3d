import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '../lib/store'

/**
 * Scroll-bound cinematic camera — v3.
 *
 * Keyframes are now continuous (no plateaus). Every scroll movement produces
 * visible camera motion, so the first scroll tick is responsive. Between acts
 * the camera physically *travels* through 3D space — diving low/close for Act 2,
 * rising + arcing for Act 3, pulling far back for Act 4, descending to reverent
 * low angle for Act 5.
 */

interface Keyframe {
  scrollPosition: number
  position: [number, number, number]
  lookAt: [number, number, number]
  fov: number
}

const KEYFRAMES: Keyframe[] = [
  // Keyframes align with new Act boundaries (scroll re-balanced so Work has
  // extra runway). Each scrollPosition is the midpoint where the act should
  // "settle" before transitioning to the next.

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

function smoothstepNum(t: number): number {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function getCameraAtProgress(progress: number): {
  position: THREE.Vector3
  lookAt: THREE.Vector3
  fov: number
} {
  let before = KEYFRAMES[0]
  let after = KEYFRAMES[KEYFRAMES.length - 1]

  if (progress <= KEYFRAMES[0].scrollPosition) {
    before = KEYFRAMES[0]
    after = KEYFRAMES[0]
  } else if (progress >= KEYFRAMES[KEYFRAMES.length - 1].scrollPosition) {
    before = KEYFRAMES[KEYFRAMES.length - 1]
    after = KEYFRAMES[KEYFRAMES.length - 1]
  } else {
    for (let i = 0; i < KEYFRAMES.length - 1; i++) {
      if (
        progress >= KEYFRAMES[i].scrollPosition &&
        progress <= KEYFRAMES[i + 1].scrollPosition
      ) {
        before = KEYFRAMES[i]
        after = KEYFRAMES[i + 1]
        break
      }
    }
  }

  const span = after.scrollPosition - before.scrollPosition
  const localT = span > 0 ? (progress - before.scrollPosition) / span : 0
  const t = smoothstepNum(localT)

  return {
    position: new THREE.Vector3(
      lerp(before.position[0], after.position[0], t),
      lerp(before.position[1], after.position[1], t),
      lerp(before.position[2], after.position[2], t)
    ),
    lookAt: new THREE.Vector3(
      lerp(before.lookAt[0], after.lookAt[0], t),
      lerp(before.lookAt[1], after.lookAt[1], t),
      lerp(before.lookAt[2], after.lookAt[2], t)
    ),
    fov: lerp(before.fov, after.fov, t),
  }
}

export function CameraRig() {
  const { camera } = useThree()
  const scrollProgress = useAppStore((s) => s.scrollProgress)

  const lookAtTarget = useRef(new THREE.Vector3())
  const desiredPos = useRef(new THREE.Vector3())

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const { position, lookAt, fov } = getCameraAtProgress(scrollProgress)

    desiredPos.current.copy(position)
    desiredPos.current.x += Math.sin(t * 0.13) * 0.08
    desiredPos.current.y += Math.cos(t * 0.11) * 0.05
    desiredPos.current.z += Math.sin(t * 0.08) * 0.05

    // Slow lerp = cinematic camera. Each frame the camera moves only ~8%
    // toward its target, so scroll-triggered moves feel like a dolly track,
    // not a snap. FOV eases similarly so zooms breathe into place.
    camera.position.lerp(desiredPos.current, 0.08)

    lookAtTarget.current.copy(lookAt)
    camera.lookAt(lookAtTarget.current)

    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const cam = camera as THREE.PerspectiveCamera
      cam.fov = lerp(cam.fov, fov, 0.07)
      cam.updateProjectionMatrix()
    }
  })

  return null
}
