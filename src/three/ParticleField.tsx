import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

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

  varying float vTwinkle;
  varying float vFogDepth;

  void main() {
    vec3 pos = position;
    // Gentle per-particle vertical drift so the layer feels alive, not
    // mechanical. Amplitude scales with aSeed so each particle drifts
    // at its own sine offset.
    pos.y += sin(uTime * 0.3 + aPhase * 6.28) * 0.08 * aSeed;
    pos.x += cos(uTime * 0.22 + aPhase * 6.28) * 0.06 * aSeed;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    // Twinkle: each particle fades in/out at a per-particle rate.
    // The fract() + smoothstep combo gives a soft "breathe" instead of
    // a hard blink.
    float t = fract(uTime * 0.25 + aPhase);
    vTwinkle = smoothstep(0.0, 0.3, t) * smoothstep(1.0, 0.7, t);

    // Size with distance attenuation so near points are bigger naturally.
    gl_PointSize = aSize * uPixelDensity * (1.0 + vTwinkle * 0.5) *
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

  void main() {
    // Round sprite with smooth falloff — no hard disc edges.
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float falloff = smoothstep(0.5, 0.0, d);
    // Core is brighter than edge — gives a "bokeh bokeh" feel.
    falloff = pow(falloff, 1.4);

    vec3 color = uTint;
    float alpha = falloff * uOpacity * (0.45 + vTwinkle * 0.55);

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
}: ParticleLayerProps) {
  const pointsRef = useRef<THREE.Points>(null!)
  const matRef = useRef<THREE.ShaderMaterial>(null!)

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
      uFogColor: { value: new THREE.Color('#000000') },
      uFogNear: { value: 9 },
      uFogFar: { value: 26 },
    }),
    [tintScale, opacity]
  )

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * driftSpeed
      pointsRef.current.rotation.x =
        Math.sin(state.clock.elapsedTime * driftSpeed * 0.4) * 0.04
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
  return (
    <group>
      {/* Deepest layer — dim backdrop dust, fogged by distance. */}
      <ParticleLayer
        count={700}
        spread={[32, 20, 18]}
        depth={-8}
        sizeBase={0.8}
        sizeJitter={1.2}
        opacity={0.4}
        driftSpeed={0.006}
        tintScale={0.7}
      />
      {/* Mid-far — the visual bulk of the starfield. */}
      <ParticleLayer
        count={500}
        spread={[22, 14, 12]}
        depth={-3}
        sizeBase={1.0}
        sizeJitter={1.8}
        opacity={0.55}
        driftSpeed={0.012}
        tintScale={1.3}
      />
      {/* Mid-near — brighter, more twinkle, contributes to the sparkle read. */}
      <ParticleLayer
        count={260}
        spread={[16, 10, 8]}
        depth={-1}
        sizeBase={1.3}
        sizeJitter={2.4}
        opacity={0.75}
        driftSpeed={0.02}
        tintScale={1.9}
      />
      {/* Foreground — rare large sparks close to camera, high twinkle. */}
      <ParticleLayer
        count={80}
        spread={[12, 8, 5]}
        depth={2}
        sizeBase={1.8}
        sizeJitter={3.2}
        opacity={0.85}
        driftSpeed={0.034}
        tintScale={2.5}
      />
    </group>
  )
}
