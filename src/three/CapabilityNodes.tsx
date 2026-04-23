import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { capabilities, smoothFade } from '../lib/copy'
import { useAppStore } from '../lib/store'
import { useViewport } from '../lib/useViewport'

/**
 * Seven capability nodes orbiting the M during Act 3.
 *
 * v2 — SDF text labels (drei `<Text>`, backed by troika-three-text) replace
 * the prior `<Html>` overlays. Benefits:
 *   – Labels are rendered IN the WebGL scene so they z-sort naturally with
 *     the M and the orbit ring. No more HTML-over-canvas overlap.
 *   – No CSS transform subpixel blur at intermediate distances — SDF stays
 *     crisp at any scale.
 *   – Labels follow the orbit rotation automatically; no per-frame opacity
 *     math to hide back-side labels (occlusion is handled by the depth
 *     buffer against the M).
 */

const NODE_COUNT = capabilities.length // 7
const ORBIT_RADIUS = 2.6
const ORBIT_TILT_X = 0.22

export function CapabilityNodes() {
  const progress = useAppStore((s) => s.scrollProgress)
  const hoveredCapability = useAppStore((s) => s.hoveredCapability)
  const setHoveredCapability = useAppStore((s) => s.setHoveredCapability)
  const { isMobile } = useViewport()

  // SDF text size in world units scales down on mobile — the camera is
  // closer in relative terms and the aspect is narrower, so the same
  // fontSize reads as giant clipping text.
  const labelCodeSize = isMobile ? 0.055 : 0.09
  const labelTitleSize = isMobile ? 0.09 : 0.15
  // Also tighten label position to node so labels don't drift into M area.
  const labelYOffset = isMobile ? 0.24 : 0.36

  const groupRef = useRef<THREE.Group>(null!)
  const ringRef = useRef<THREE.Mesh>(null!)
  const nodeRefs = useRef<(THREE.Mesh | null)[]>([])
  // refs to each label's parent group so we can opacity-modulate based on
  // front-ness (subtle, not hiding — just softening back labels).
  const labelGroupRefs = useRef<(THREE.Group | null)[]>([])

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
      const scrollRotation = (sp - 0.316) * 5.5
      groupRef.current.rotation.y = scrollRotation + t * 0.05
      groupRef.current.rotation.x = ORBIT_TILT_X
      groupRef.current.scale.setScalar(act3Alpha)
      groupRef.current.visible = act3Alpha > 0.001
    }

    nodeRefs.current.forEach((mesh, i) => {
      if (!mesh) return
      const isHovered = hoveredCapability === i
      const basePulse = 1 + Math.sin(t * 1.5 + i * 0.6) * 0.15
      const hoverBoost = isHovered ? 1.9 : 1.0
      mesh.scale.setScalar(basePulse * hoverBoost)
      mesh.material = isHovered ? hoveredNodeMaterial : nodeMaterial

      // Label groups fade subtly by world z — front labels at ~1.0 opacity,
      // back labels at ~0.2. SDF text z-sorts against the M naturally, but
      // this smooths the feeling further (a back label is *also* faded
      // mid-air, not just behind the M).
      const worldPos = new THREE.Vector3()
      mesh.getWorldPosition(worldPos)
      const frontBias = Math.max(
        0,
        Math.min(1, (worldPos.z + ORBIT_RADIUS) / (2 * ORBIT_RADIUS))
      )
      const labelGroup = labelGroupRefs.current[i]
      if (labelGroup) {
        const targetOpacity = 0.2 + Math.pow(frontBias, 2.2) * 0.8
        labelGroup.traverse((obj) => {
          const mat = (obj as unknown as { material?: THREE.Material })
            .material
          if (mat && 'opacity' in mat) {
            ;(mat as THREE.Material & { opacity: number }).opacity =
              targetOpacity
          }
        })
      }
    })
  })

  return (
    <group ref={groupRef} position={[0, 0.1, 0]}>
      {/* Orbit ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} material={ringMaterial}>
        <torusGeometry args={[ORBIT_RADIUS, 0.006, 8, 96]} />
      </mesh>

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
            {/* SDF label group — billboards so text always reads front-on
                regardless of orbit rotation. Two lines: M0x code in teal,
                title in white. Positioned slightly above the node. Mobile
                uses smaller fontSize + tighter offset to fit narrow aspect. */}
            <Billboard follow={true} position={[0, labelYOffset, 0]}>
              <group
                ref={(g) => {
                  labelGroupRefs.current[i] = g
                }}
              >
                <Text
                  fontSize={labelCodeSize}
                  color="#73C5CC"
                  anchorX="center"
                  anchorY="bottom"
                  position={[0, 0.02, 0]}
                  letterSpacing={0.25}
                  outlineWidth={0}
                  material-toneMapped={false}
                  material-transparent={true}
                >
                  {cap.code}
                </Text>
                <Text
                  fontSize={labelTitleSize}
                  color="#FFFFFF"
                  anchorX="center"
                  anchorY="top"
                  position={[0, -0.04, 0]}
                  fontWeight={500}
                  maxWidth={isMobile ? 2.4 : 4.0}
                  textAlign="center"
                  outlineWidth={0}
                  material-toneMapped={false}
                  material-transparent={true}
                >
                  {cap.title}
                </Text>
              </group>
            </Billboard>
          </group>
        )
      })}
    </group>
  )
}
