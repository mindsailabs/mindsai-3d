import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '../lib/store'

/**
 * Radial particle burst emanating from the M centre during Act 2.
 * Metaphor: as the bars separate, the M "dissolves" and releases light
 * streams that fly outward in all directions (on the 2×2 grid bias — more
 * particles going to the 4 outcome quadrants).
 *
 * Each particle has a random direction + phase. Shader animates them along
 * that direction with a wrap-around lifetime. Only visible during Act 2.
 */

const PARTICLE_COUNT = 140

const vertexShader = /* glsl */ `
  attribute vec3 aDir;
  attribute float aPhase;
  attribute float aSize;

  uniform float uTime;
  uniform float uAlpha;
  uniform float uMaxDist;

  varying float vAlpha;

  void main() {
    // Particle travels from origin along aDir, looping with phase offset.
    float t = fract(uTime * 0.25 + aPhase);
    vec3 pos = aDir * t * uMaxDist;

    // Lifetime alpha: fade in first third, full middle, fade out last third.
    float life = smoothstep(0.0, 0.15, t) * smoothstep(1.0, 0.7, t);
    vAlpha = life * uAlpha;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * (160.0 / -mvPosition.z);
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uTint;
  varying float vAlpha;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float falloff = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uTint, vAlpha * falloff);
  }
`

function smoothstepJS(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export function DissolveBurst() {
  const progress = useAppStore((s) => s.scrollProgress)
  const pointsRef = useRef<THREE.Points>(null!)
  const materialRef = useRef<THREE.ShaderMaterial>(null!)

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const dirs = new Float32Array(PARTICLE_COUNT * 3)
    const phases = new Float32Array(PARTICLE_COUNT)
    const sizes = new Float32Array(PARTICLE_COUNT)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = 0
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = 0

      // Random direction biased toward the 4 outcome quadrants (x±, y±)
      const quadrant = i % 4
      const qx = quadrant === 0 || quadrant === 2 ? -1 : 1
      const qy = quadrant === 0 || quadrant === 1 ? 1 : -1
      const jitter = 0.6
      const x = qx * (0.4 + Math.random() * 0.6) + (Math.random() - 0.5) * jitter
      const y = qy * (0.3 + Math.random() * 0.5) + (Math.random() - 0.5) * jitter
      const z = (Math.random() - 0.5) * 0.8
      const len = Math.sqrt(x * x + y * y + z * z) || 1
      dirs[i * 3] = x / len
      dirs[i * 3 + 1] = y / len
      dirs[i * 3 + 2] = z / len

      phases[i] = Math.random()
      sizes[i] = 0.4 + Math.random() * 0.8
    }

    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('aDir', new THREE.BufferAttribute(dirs, 3))
    g.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    return g
  }, [])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAlpha: { value: 0 },
      uMaxDist: { value: 3.5 },
      uTint: { value: new THREE.Color('#73C5CC').multiplyScalar(1.6) },
    }),
    []
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    // Act 2 (0.127-0.316): burst is a TRANSITION moment, not a constant overlay.
    // Peaks briefly at the act1→act2 boundary and disappears before users reach
    // the first outcome panel so it doesn't compete with panel content.
    const act2Alpha =
      smoothstepJS(0.11, 0.135, progress) *
      (1 - smoothstepJS(0.145, 0.17, progress)) *
      0.55

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = t
      materialRef.current.uniforms.uAlpha.value = act2Alpha
    }
    if (pointsRef.current) {
      pointsRef.current.visible = act2Alpha > 0.001
    }
  })

  return (
    <points ref={pointsRef} geometry={geometry} position={[0.1, 0.25, 0]}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
