import { forwardRef, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  distortionFragmentShader,
  distortionVertexShader,
} from './distortionShaders'
import { useReducedMotion } from '../lib/useReducedMotion'

/**
 * DistortedMediaPlane — a Three.js plane that renders any sampler2D
 * source (VideoTexture, CanvasTexture, regular Texture) through the
 * scroll-velocity-driven distortion shader.
 *
 * Drop-in replacement for `<mesh><planeGeometry><meshBasicMaterial map={tex}/>`
 * with the addition of the distortion effects baked into the material.
 *
 * Usage:
 *   <DistortedMediaPlane
 *     texture={videoTexture}
 *     width={2.6}
 *     height={1.6}
 *     hovered={isFeatured}
 *     onPointerOver={...}
 *   />
 */

interface DistortedMediaPlaneProps {
  texture: THREE.Texture | null | undefined
  width: number
  height: number
  /** Drives uHover — a low-grade always-on ripple when true. Useful for
   *  the "featured" card in a carousel even when scroll is idle. */
  hovered?: boolean
  /** Plane base opacity. Combine with material.uniforms.uOpacity for
   *  fade-in/fade-out animations. Default 1. */
  opacity?: number
  /** Per-frame opacity override callback — receives the material so the
   *  caller can lerp uOpacity dynamically. Avoids React re-renders. */
  onFrame?: (material: THREE.ShaderMaterial) => void
  /** Pointer events forwarded to the underlying mesh. */
  onPointerOver?: (e: THREE.Event) => void
  onPointerOut?: (e: THREE.Event) => void
  onClick?: (e: THREE.Event) => void
  /** Geometry segment counts. Higher = smoother ripple at the cost of
   *  vertex count. 32×18 is plenty for 16:9 cards. */
  widthSegments?: number
  heightSegments?: number
}

export const DistortedMediaPlane = forwardRef<
  THREE.Mesh,
  DistortedMediaPlaneProps
>(function DistortedMediaPlane(
  {
    texture,
    width,
    height,
    hovered = false,
    opacity = 1,
    onFrame,
    onPointerOver,
    onPointerOut,
    onClick,
    widthSegments = 32,
    heightSegments = 18,
  },
  ref
) {
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const hoverSpike = useRef(0)
  const smoothedVelocity = useRef(0)
  const reducedMotion = useReducedMotion()

  // Fallback texture so the shader doesn't sample undefined when the
  // VideoTexture hasn't bound yet. A 1×1 black texture is harmless.
  const fallback = useMemo(() => {
    const data = new Uint8Array([0, 0, 0, 255])
    const t = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat)
    t.needsUpdate = true
    return t
  }, [])

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture || fallback },
      uVelocity: { value: 0 },
      uTime: { value: 0 },
      uHover: { value: 0 },
      uOpacity: { value: opacity },
      uReduceMotion: { value: reducedMotion ? 1 : 0 },
    }),
    // texture is intentionally NOT a dep here — we update via uniforms
    // assignment in useFrame so a swapped texture doesn't recreate the
    // material (which would break the shader compile cache).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // Push texture changes into the uniform without recreating the material.
  if (matRef.current && texture && matRef.current.uniforms.uTexture.value !== texture) {
    matRef.current.uniforms.uTexture.value = texture
  }
  if (matRef.current) {
    matRef.current.uniforms.uReduceMotion.value = reducedMotion ? 1 : 0
  }

  useFrame((state) => {
    if (!matRef.current) return

    // Read Lenis scroll velocity. Same approach as MindsMark:
    // raw velocity → normalised → exponentially smoothed.
    const lenis = (
      window as unknown as { __lenis?: { velocity?: number } }
    ).__lenis
    const rawVel = lenis?.velocity ?? 0
    // Normalise: Lenis velocity at fast wheel-flick is ~30+, settle 0.
    // Map to 0..1 with mild compression so the ripple isn't all-or-
    // nothing.
    const targetVel = Math.min(1, Math.abs(rawVel) / 25)
    smoothedVelocity.current +=
      (targetVel - smoothedVelocity.current) * 0.18

    // Hover spike — ease toward target with hysteresis (rise faster
    // than fall so hover-in feels responsive, hover-out feels lingering).
    const target = hovered ? 1 : 0
    const lerpRate = target > hoverSpike.current ? 0.1 : 0.05
    hoverSpike.current += (target - hoverSpike.current) * lerpRate

    matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    matRef.current.uniforms.uVelocity.value = smoothedVelocity.current
    matRef.current.uniforms.uHover.value = hoverSpike.current

    if (onFrame) onFrame(matRef.current)
  })

  return (
    <mesh
      ref={ref}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      <planeGeometry args={[width, height, widthSegments, heightSegments]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={distortionVertexShader}
        fragmentShader={distortionFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  )
})
