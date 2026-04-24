import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useViewport } from '../lib/useViewport'
import { useAppStore } from '../lib/store'
import { useReducedMotion } from '../lib/useReducedMotion'

/**
 * Layered ambient starfield.
 *
 * Four parallax layers at different depths, each with per-particle size +
 * phase variation driven by a custom point shader. Particles twinkle at
 * their own rhythm (no synchronised pulse), which kills the "regular
 * motion" tell that ages a scene. Fog integration means far-layer points
 * fade to black naturally with scene depth.
 */

const particleVertex = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute float aSeed;

  uniform float uTime;
  uniform float uPixelDensity;
  uniform float uSizeScale;
  uniform float uAssembly;

  varying float vTwinkle;
  varying float vFogDepth;
  varying float vAssemblyAlpha;

  void main() {
    // uAssembly: 1 at page-open, eases to 0 over ~2s. While > 0, particles
    // are drawn toward their per-particle "origin pull" — a position that's
    // a blend between the global origin (0,0,0) and their natural spread.
    // At uAssembly=0, particles sit at their natural spread position. The
    // effect: field BURSTS outward from the M as the site opens.
    vec3 naturalPos = position;
    // Per-particle phase on the burst so particles don't all arrive
    // simultaneously — phase-weighted pullback makes some arrive first.
    float assemblyPhase = clamp(uAssembly - aPhase * 0.3, 0.0, 1.0);
    vec3 pos = naturalPos * (1.0 - assemblyPhase);

    // Gentle per-particle vertical drift so the layer feels alive, not
    // mechanical. Amplitude scales with aSeed so each particle drifts
    // at its own sine offset.
    pos.y += sin(uTime * 0.3 + aPhase * 6.28) * 0.08 * aSeed;
    pos.x += cos(uTime * 0.22 + aPhase * 6.28) * 0.06 * aSeed;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    // Twinkle: each particle fades in/out at a per-particle rate.
    float t = fract(uTime * 0.25 + aPhase);
    vTwinkle = smoothstep(0.0, 0.3, t) * smoothstep(1.0, 0.7, t);

    // During assembly, fade alpha from 0 → 1 as the particle travels
    // outward. Per-particle phase means some fade in earlier than others.
    vAssemblyAlpha = smoothstep(0.85, 0.0, assemblyPhase);

    // Size with distance attenuation so near points are bigger naturally.
    gl_PointSize = aSize * uPixelDensity * uSizeScale * (1.0 + vTwinkle * 0.5) *
                   (50.0 / -mvPos.z);

    // Expose camera-space depth for the fragment to apply fog.
    vFogDepth = -mvPos.z;
  }
`

const particleFragment = /* glsl */ `
  uniform vec3 uTint;
  uniform float uOpacity;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;

  varying float vTwinkle;
  varying float vFogDepth;
  varying float vAssemblyAlpha;

  void main() {
    // Round sprite with smooth falloff — no hard disc edges.
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float falloff = smoothstep(0.5, 0.0, d);
    falloff = pow(falloff, 1.4);

    vec3 color = uTint;
    float alpha = falloff * uOpacity * (0.45 + vTwinkle * 0.55);

    // During assembly this ramps alpha 0 → full as the particle arrives.
    alpha *= vAssemblyAlpha;

    // Manual fog — PointsMaterial's built-in fog can't be used because we're
    // a ShaderMaterial. Linear fog fades alpha to zero past uFogFar.
    float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);
    alpha *= (1.0 - fogFactor);

    gl_FragColor = vec4(color, alpha);
  }
`

interface ParticleLayerProps {
  count: number
  spread: [number, number, number]
  depth: number
  sizeBase: number
  sizeJitter: number
  opacity: number
  driftSpeed: number
  tintScale: number
  /** Viewport-aware multiplier for gl_PointSize. 1 on desktop, 0.45 on mobile. */
  sizeScale: number
  /** Shared ref holding the 1 → 0 assembly value animated by the parent. */
  assemblyRef: React.MutableRefObject<number>
}

function ParticleLayer({
  count,
  spread,
  depth,
  sizeBase,
  sizeJitter,
  opacity,
  driftSpeed,
  tintScale,
  sizeScale,
  assemblyRef,
}: ParticleLayerProps) {
  const pointsRef = useRef<THREE.Points>(null!)
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const reducedMotion = useReducedMotion()

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const phases = new Float32Array(count)
    const seeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread[0]
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread[1]
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread[2] + depth
      // Per-particle size = base + jitter * (0..1)^2 so smaller points are
      // more common than larger — natural size distribution.
      const r = Math.random()
      sizes[i] = sizeBase + sizeJitter * r * r
      phases[i] = Math.random()
      seeds[i] = 0.5 + Math.random() * 0.5
    }
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    g.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    return g
  }, [count, spread, depth, sizeBase, sizeJitter])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTint: { value: new THREE.Color('#73C5CC').multiplyScalar(tintScale) },
      uOpacity: { value: opacity },
      uPixelDensity: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uSizeScale: { value: sizeScale },
      uAssembly: { value: 1 },
      uFogColor: { value: new THREE.Color('#000000') },
      uFogNear: { value: 9 },
      uFogFar: { value: 26 },
    }),
    [tintScale, opacity, sizeScale]
  )

  useFrame((state) => {
    // Reduced motion: freeze particle time so the shader's sine-driven
    // drift is static, and don't rotate the layer. Particles still
    // SHOW (as specks of light in space) — they just don't move.
    const t = reducedMotion ? 0 : state.clock.elapsedTime
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = t
      matRef.current.uniforms.uSizeScale.value = sizeScale
      matRef.current.uniforms.uAssembly.value = assemblyRef.current
    }
    if (pointsRef.current) {
      pointsRef.current.rotation.y = t * driftSpeed
      pointsRef.current.rotation.x = Math.sin(t * driftSpeed * 0.4) * 0.04
    }
  })

  return (
    <points ref={pointsRef} geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        vertexShader={particleVertex}
        fragmentShader={particleFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

export function ParticleField() {
  const { isMobile } = useViewport()
  const appReady = useAppStore((s) => s.appReady)
  const sizeScale = isMobile ? 0.45 : 1

  // Assembly lifecycle: starts at 1, eases to 0 over ~2s once the opening
  // veil lifts (appReady flips true). All four layers read the SAME ref
  // so the burst is synchronised across depths.
  const assemblyRef = useRef(1)
  const assemblyStartedAt = useRef<number | null>(null)

  useFrame(() => {
    if (!appReady) {
      assemblyRef.current = 1
      assemblyStartedAt.current = null
      return
    }
    if (assemblyStartedAt.current === null) {
      assemblyStartedAt.current = performance.now()
    }
    const elapsed = (performance.now() - assemblyStartedAt.current) / 1000
    const ASSEMBLY_DURATION = 2.2 // seconds
    const raw = Math.max(0, 1 - elapsed / ASSEMBLY_DURATION)
    // Cubic ease-out: fast burst, slow settle.
    assemblyRef.current = raw * raw * raw
  })

  return (
    <group>
      {/* Deepest layer — dim backdrop dust, fogged by distance. */}
      <ParticleLayer
        count={isMobile ? 300 : 700}
        spread={[32, 20, 18]}
        depth={-8}
        sizeBase={0.8}
        sizeJitter={1.2}
        opacity={0.4}
        driftSpeed={0.006}
        tintScale={0.7}
        sizeScale={sizeScale}
        assemblyRef={assemblyRef}
      />
      {/* Mid-far — the visual bulk of the starfield. */}
      <ParticleLayer
        count={isMobile ? 220 : 500}
        spread={[22, 14, 12]}
        depth={-3}
        sizeBase={1.0}
        sizeJitter={1.8}
        opacity={0.55}
        driftSpeed={0.012}
        tintScale={1.3}
        sizeScale={sizeScale}
        assemblyRef={assemblyRef}
      />
      {/* Mid-near — brighter, more twinkle, contributes to the sparkle read. */}
      <ParticleLayer
        count={isMobile ? 120 : 260}
        spread={[16, 10, 8]}
        depth={-1}
        sizeBase={1.3}
        sizeJitter={2.4}
        opacity={0.75}
        driftSpeed={0.02}
        tintScale={1.9}
        sizeScale={sizeScale}
        assemblyRef={assemblyRef}
      />
      {/* Foreground — rare large sparks close to camera, high twinkle. */}
      <ParticleLayer
        count={isMobile ? 30 : 80}
        spread={[12, 8, 5]}
        depth={2}
        sizeBase={1.8}
        sizeJitter={3.2}
        opacity={0.85}
        driftSpeed={0.034}
        tintScale={2.5}
        sizeScale={sizeScale}
        assemblyRef={assemblyRef}
      />
    </group>
  )
}
