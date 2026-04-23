import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { smoothFade } from '../lib/copy'
import { useAppStore } from '../lib/store'

/**
 * Reflective pedestal floor that fades in during Act 5.
 * Nod to reel frame 10 — the "monument" shot — where the logo mark sits on a
 * subtle wet floor with soft teal reflections.
 *
 * Implementation: a dark plane with a teal radial gradient painted on it,
 * blending additively so it reads as light pooling under the M.
 */

const vertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPosition = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const fragment = /* glsl */ `
  uniform float uTime;
  uniform float uAlpha;
  uniform vec3 uTint;
  varying vec2 vUv;

  void main() {
    // Centred radial with elliptical stretch (wider than tall, like reflection pool)
    vec2 p = (vUv - 0.5) * vec2(1.2, 1.8);
    float d = length(p);
    float pool = smoothstep(0.55, 0.0, d);
    pool = pow(pool, 2.2);

    // Subtle animated shimmer — very slow
    float shimmer = 1.0 + sin(uTime * 0.4 + d * 12.0) * 0.08;

    // Radial bands (caustic-like)
    float bands = sin(d * 26.0 - uTime * 1.1) * 0.5 + 0.5;
    bands = pow(bands, 5.0);

    vec3 col = uTint * pool * shimmer * 0.9 + uTint * bands * pool * 0.25;

    gl_FragColor = vec4(col, pool * uAlpha);
  }
`

export function MonumentFloor() {
  const progress = useAppStore((s) => s.scrollProgress)
  const materialRef = useRef<THREE.ShaderMaterial>(null!)
  const meshRef = useRef<THREE.Mesh>(null!)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAlpha: { value: 0 },
      uTint: { value: new THREE.Color('#73C5CC') },
    }),
    []
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const sp = progress
    const act5Alpha = smoothFade(sp, 0.82, 0.87, 1.0, 1.05)

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = t
      materialRef.current.uniforms.uAlpha.value = act5Alpha
    }
    if (meshRef.current) {
      meshRef.current.visible = act5Alpha > 0.001
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={[0, -1.6, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={-1}
    >
      <planeGeometry args={[14, 14]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}
