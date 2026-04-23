import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ParticleLayerProps {
  count: number
  spread: [number, number, number]
  depth: number
  size: number
  opacity: number
  driftSpeed: number
  tintScale: number
}

function ParticleLayer({
  count,
  spread,
  depth,
  size,
  opacity,
  driftSpeed,
  tintScale,
}: ParticleLayerProps) {
  const pointsRef = useRef<THREE.Points>(null!)

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread[0]
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread[1]
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread[2] + depth
    }
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [count, spread, depth])

  const material = useMemo(() => {
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color('#73C5CC').multiplyScalar(tintScale),
      size,
      sizeAttenuation: true,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    mat.toneMapped = false
    return mat
  }, [size, opacity, tintScale])

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * driftSpeed
      pointsRef.current.rotation.x =
        Math.sin(state.clock.elapsedTime * driftSpeed * 0.4) * 0.04
    }
  })

  return <points ref={pointsRef} geometry={geometry} material={material} />
}

export function ParticleField() {
  return (
    <group>
      {/* Far layer — big slow drift, tiny dim points */}
      <ParticleLayer
        count={600}
        spread={[28, 18, 16]}
        depth={-6}
        size={0.02}
        opacity={0.35}
        driftSpeed={0.008}
        tintScale={1.0}
      />
      {/* Mid layer — medium size + brighter */}
      <ParticleLayer
        count={300}
        spread={[18, 12, 10]}
        depth={-2}
        size={0.032}
        opacity={0.55}
        driftSpeed={0.016}
        tintScale={1.6}
      />
      {/* Near layer — larger, brightest, fastest (closest to camera) */}
      <ParticleLayer
        count={120}
        spread={[12, 8, 6]}
        depth={1.5}
        size={0.045}
        opacity={0.75}
        driftSpeed={0.028}
        tintScale={2.2}
      />
    </group>
  )
}
