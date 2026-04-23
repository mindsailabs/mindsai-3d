import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { capabilities, smoothFade } from '../lib/copy'
import { useAppStore } from '../lib/store'

/**
 * Seven capability nodes orbiting the M during Act 3.
 * Each node is a small emissive teal sphere with an HTML label attached
 * (via drei's <Html>) that rotates with the node in 3D space.
 *
 * When a node is CLOSER to camera (in front of the orbit), its label fades
 * brighter; when it's behind the M, the label dims.
 */

const NODE_COUNT = capabilities.length // 7
const ORBIT_RADIUS = 2.6
const ORBIT_TILT_X = 0.22

export function CapabilityNodes() {
  const progress = useAppStore((s) => s.scrollProgress)
  const hoveredCapability = useAppStore((s) => s.hoveredCapability)
  const setHoveredCapability = useAppStore((s) => s.setHoveredCapability)

  const groupRef = useRef<THREE.Group>(null!)
  const ringRef = useRef<THREE.Mesh>(null!)
  const nodeRefs = useRef<(THREE.Mesh | null)[]>([])
  const labelRefs = useRef<(HTMLDivElement | null)[]>([])

  const nodeMaterial = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#73C5CC').multiplyScalar(2.6),
    })
    mat.toneMapped = false
    return mat
  }, [])

  const hoveredNodeMaterial = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#73C5CC').multiplyScalar(6.0),
    })
    mat.toneMapped = false
    return mat
  }, [])

  const ringMaterial = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#73C5CC').multiplyScalar(0.55),
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    })
    mat.toneMapped = false
    return mat
  }, [])

  const baseAngles = useMemo(
    () => Array.from({ length: NODE_COUNT }, (_, i) => (i / NODE_COUNT) * Math.PI * 2),
    []
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const sp = progress

    const act3Alpha = smoothFade(sp, 0.30, 0.35, 0.47, 0.506)

    if (groupRef.current) {
      // Scroll-driven rotation: orbit rotates ~one full turn across Act 3.
      // Tiny time drift for life but slow enough that labels stay readable.
      // Act 3 span = 0.506 - 0.316 = 0.19; to make one full rotation, use 2π/0.19 ≈ 33.
      // Current value chosen empirically to feel like a gentle pan, not a spin.
      const scrollRotation = (sp - 0.316) * 5.5
      groupRef.current.rotation.y = scrollRotation + t * 0.05
      groupRef.current.rotation.x = ORBIT_TILT_X
      groupRef.current.scale.setScalar(act3Alpha)
      groupRef.current.visible = act3Alpha > 0.001
    }

    // Per-node animation + label visibility based on world Z of the node.
    // Nodes in front of origin (z > 0 in world) are closer to camera, nodes
    // behind (z < 0) are occluded by the M. Back labels must fade aggressively
    // because drei's <Html> renders HTML on top of the WebGL canvas — it has
    // no z-sort with 3D geometry, so without fading the back labels would
    // visually overlap the M bars.
    nodeRefs.current.forEach((mesh, i) => {
      if (!mesh) return
      const isHovered = hoveredCapability === i
      const basePulse = 1 + Math.sin(t * 1.5 + i * 0.6) * 0.15
      const hoverBoost = isHovered ? 1.9 : 1.0
      mesh.scale.setScalar(basePulse * hoverBoost)
      mesh.material = isHovered ? hoveredNodeMaterial : nodeMaterial

      const worldPos = new THREE.Vector3()
      mesh.getWorldPosition(worldPos)
      // Compute "front-ness": 1 = camera-facing (+Z side), 0 = behind origin.
      // ORBIT_RADIUS = 2.6, so worldPos.z ∈ [-2.6, +2.6].
      const frontBias = Math.max(0, Math.min(1, (worldPos.z + ORBIT_RADIUS) / (2 * ORBIT_RADIUS)))
      const label = labelRefs.current[i]
      if (label) {
        // Steep curve: only labels in the front half of the orbit are legible.
        // Back labels vanish so their text doesn't overlap the M (the <Html>
        // portal can't z-sort against the WebGL canvas).
        label.style.opacity = `${Math.pow(frontBias, 3.5) * 0.98}`
      }
    })
  })

  return (
    <group ref={groupRef} position={[0, 0.1, 0]}>
      {/* Orbit ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} material={ringMaterial}>
        <torusGeometry args={[ORBIT_RADIUS, 0.006, 8, 96]} />
      </mesh>

      {/* Nodes + labels */}
      {baseAngles.map((angle, i) => {
        const x = Math.cos(angle) * ORBIT_RADIUS
        const z = Math.sin(angle) * ORBIT_RADIUS
        const cap = capabilities[i]
        return (
          <group key={cap.id} position={[x, 0, z]}>
            <mesh
              ref={(m) => {
                nodeRefs.current[i] = m
              }}
              material={nodeMaterial}
              onPointerOver={() => setHoveredCapability(i)}
              onPointerOut={() => setHoveredCapability(null)}
            >
              <sphereGeometry args={[0.1, 32, 32]} />
            </mesh>
            {/* Labels only attach during Act 3 — prevents bleeding into other acts.
                This also avoids drei <Html> portal overhead when not needed. */}
            {progress > 0.3 && progress < 0.52 && (
              <Html
                center
                distanceFactor={6}
                position={[0, 0.38, 0]}
                zIndexRange={[10, 0]}
                style={{ pointerEvents: 'none' }}
              >
                <div
                  ref={(d) => {
                    labelRefs.current[i] = d
                  }}
                  className="whitespace-nowrap text-center transition-opacity duration-500"
                  style={{ opacity: 0.35 }}
                >
                  <div className="text-brand-teal text-[9px] uppercase tracking-[0.25em] font-medium">
                    {cap.code}
                  </div>
                  <div className="text-text-primary text-[13px] font-medium leading-tight mt-0.5">
                    {cap.title}
                  </div>
                </div>
              </Html>
            )}
          </group>
        )
      })}
    </group>
  )
}
