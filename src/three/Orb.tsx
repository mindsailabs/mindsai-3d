import { useLoader, useFrame } from '@react-three/fiber'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { vertexShader, fragmentShader } from './orbShaders'

interface OrbProps {
  position?: [number, number, number]
  scale?: number
}

export function Orb({ position = [0, 0, 0], scale = 1 }: OrbProps) {
  const hdr = useLoader(RGBELoader, '/assets/hdri/moonless_golf_1k.hdr')
  hdr.mapping = THREE.EquirectangularReflectionMapping

  const materialRef = useRef<THREE.ShaderMaterial>(null!)
  const groupRef = useRef<THREE.Group>(null!)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uEnvMap: { value: hdr },
      uIOR: { value: 1.42 },
      uDispersion: { value: 0.045 },
      uTint: { value: new THREE.Color('#73C5CC') },
      uTintStrength: { value: 0.0 },
      uFresnelPower: { value: 2.4 },
      uFresnelBoost: { value: 1.4 },
      uReflectionMix: { value: 0.55 },
      uDisplacementStrength: { value: 0.012 },
      uNoiseScale: { value: 1.8 },
    }),
    [hdr]
  )

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }
    if (groupRef.current) {
      const t = state.clock.elapsedTime
      groupRef.current.rotation.y = t * 0.08
      groupRef.current.rotation.x = Math.sin(t * 0.2) * 0.08
      const breathe = 1 + Math.sin(t * 0.6) * 0.015
      groupRef.current.scale.setScalar(scale * breathe)
    }
  })

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <icosahedronGeometry args={[1, 64]} />
        <shaderMaterial
          key={`${vertexShader.length}-${fragmentShader.length}`}
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent={false}
        />
      </mesh>
    </group>
  )
}
