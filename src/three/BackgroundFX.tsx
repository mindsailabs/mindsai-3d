import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Full-screen quad behind everything else that paints a subtle radial gradient
 * over pure black. Gives the "void" atmospheric depth — a soft breathing teal
 * glow near the centre/bottom that never reads as obvious lighting.
 */
const bgVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`

const bgFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uTint;
  varying vec2 vUv;

  void main() {
    // Centered UV
    vec2 p = vUv - vec2(0.5, 0.42);
    p.x *= 1.6; // widen horizontally
    float d = length(p);

    // Soft radial falloff — black at edges, tint near centre
    float glow = smoothstep(0.95, 0.0, d);
    glow = pow(glow, 2.4);

    // Subtle breathing so the atmosphere isn't static
    float breath = 0.85 + sin(uTime * 0.35) * 0.08;
    vec3 color = uTint * glow * 0.045 * breath;

    // Vertical gradient: a bit darker up top, a touch warmer at bottom
    color *= 0.6 + vUv.y * 0.5;

    gl_FragColor = vec4(color, 1.0);
  }
`

export function BackgroundFX() {
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
    <mesh frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={bgVertex}
        fragmentShader={bgFragment}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}
