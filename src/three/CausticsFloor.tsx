import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Invisible floor rendering subtle teal caustic light patterns — the kind of
 * shimmering light you see under a crystal lamp. Adds "groundedness" without
 * a visible surface; reads as refracted light on an implicit floor.
 */

const causticsVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const causticsFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uTint;
  varying vec2 vUv;

  // Simple looping caustic pattern using three phase-shifted sin waves.
  float caustic(vec2 uv, float t) {
    vec2 p = (uv - 0.5) * 8.0;
    float c = 0.0;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      vec2 offset = vec2(sin(t * 0.3 + fi * 2.1), cos(t * 0.23 + fi * 1.7)) * 1.5;
      float d = length(p - offset);
      c += 0.4 / (1.0 + d * d);
    }
    return c;
  }

  void main() {
    // Radial falloff from centre — floor glow strongest directly under the mark
    vec2 c = vUv - vec2(0.5, 0.5);
    float radial = smoothstep(0.6, 0.0, length(c));

    // Animated caustic pattern
    float pattern = caustic(vUv, uTime);

    // Breathing intensity
    float breath = 0.8 + sin(uTime * 0.4) * 0.2;

    vec3 color = uTint * pattern * radial * 0.18 * breath;

    gl_FragColor = vec4(color, radial * 0.7);
  }
`

export function CausticsFloor() {
  const materialRef = useRef<THREE.ShaderMaterial>(null!)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTint: { value: new THREE.Color('#73C5CC') },
    }),
    []
  )

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  return (
    <mesh position={[0, -2.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[10, 10]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={causticsVertex}
        fragmentShader={causticsFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}
