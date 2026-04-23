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
const ORBIT_RADIUS_DESKTOP = 2.6
// Mobile: tighter orbit so the ring fits within the portrait viewport AND
// so labels at the 3 o'clock / 9 o'clock positions don't extend past the
// frame edge. Calibrated against a 375-wide viewport with the wider mobile
// FOV (38°) from CameraRig.
// Mobile orbit stays tight but no longer has to accommodate full titles
// (those live in a legend at the bottom of the viewport — see Act3Capabilities).
const ORBIT_RADIUS_MOBILE = 1.7
const ORBIT_TILT_X = 0.22

export function CapabilityNodes() {
  const progress = useAppStore((s) => s.scrollProgress)
  const hoveredCapability = useAppStore((s) => s.hoveredCapability)
  const setHoveredCapability = useAppStore((s) => s.setHoveredCapability)
  const { isMobile } = useViewport()

  // SDF text size in world units scales down on mobile — the camera is
  // closer in relative terms and the aspect is narrower, so the same
  // fontSize reads as giant clipping text.
  const labelCodeSize = isMobile ? 0.04 : 0.09
  const labelTitleSize = isMobile ? 0.055 : 0.15
  const labelYOffset = isMobile ? 0.2 : 0.36
  const orbitRadius = isMobile ? ORBIT_RADIUS_MOBILE : ORBIT_RADIUS_DESKTOP
  // maxWidth 0.85 on mobile forces ALL titles (even "Workflows & Automation
  // Systems") onto 2-3 lines inside the viewport. Compact layout >
  // spilling edges.
  const labelMaxWidth = isMobile ? 0.85 : 4.0

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

  // ────────── Capability constellation beams ──────────
  // Seven line segments connecting adjacent orbital nodes. Each segment
  // has a time-based pulse (staggered by index) so the "system" reads as
  // ALIVE rather than as a static wireframe. Hover any node → all seven
  // beams brighten together briefly (handled via uniform).
  const beamGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const positions = new Float32Array(NODE_COUNT * 2 * 3) // start + end per segment
    const segIndices = new Float32Array(NODE_COUNT * 2) // per-vertex seg-index
    for (let i = 0; i < NODE_COUNT; i++) {
      const a = baseAngles[i]
      const b = baseAngles[(i + 1) % NODE_COUNT]
      positions[i * 6 + 0] = Math.cos(a) * orbitRadius
      positions[i * 6 + 1] = 0
      positions[i * 6 + 2] = Math.sin(a) * orbitRadius
      positions[i * 6 + 3] = Math.cos(b) * orbitRadius
      positions[i * 6 + 4] = 0
      positions[i * 6 + 5] = Math.sin(b) * orbitRadius
      segIndices[i * 2 + 0] = i
      segIndices[i * 2 + 1] = i
    }
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('aSegIdx', new THREE.BufferAttribute(segIndices, 1))
    return g
  }, [baseAngles, orbitRadius])

  const beamUniformsRef = useRef({
    uTime: { value: 0 },
    uHoverPulse: { value: 0 },
  })

  const beamMaterial = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: beamUniformsRef.current,
      vertexShader: /* glsl */ `
        attribute float aSegIdx;
        varying float vSegIdx;
        void main() {
          vSegIdx = aSegIdx;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uHoverPulse;
        varying float vSegIdx;
        void main() {
          // Each segment pulses on its own phase, staggered by index.
          float phase = vSegIdx * 0.9;
          float pulse = 0.5 + 0.5 * sin(uTime * 1.1 + phase);
          pulse = pow(pulse, 2.0);
          float alpha = 0.08 + pulse * 0.35 + uHoverPulse * 0.5;
          // Teal — slightly brighter than the ring.
          vec3 color = vec3(0.45, 0.77, 0.8) * (1.0 + pulse * 0.4 + uHoverPulse * 1.2);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    ;(mat as unknown as { toneMapped: boolean }).toneMapped = false
    return mat
  }, [])

  // Smoothed hover pulse — hovering ANY node briefly spikes it, decays back.
  const hoverPulseRef = useRef(0)

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

    // Animate beam uniforms. uHoverPulse = 1 while any node hovered, eases to 0.
    const targetPulse = hoveredCapability !== null ? 1 : 0
    hoverPulseRef.current += (targetPulse - hoverPulseRef.current) * 0.08
    beamUniformsRef.current.uTime.value = t
    beamUniformsRef.current.uHoverPulse.value = hoverPulseRef.current

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
        Math.min(1, (worldPos.z + orbitRadius) / (2 * orbitRadius))
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
        <torusGeometry args={[orbitRadius, 0.006, 8, 96]} />
      </mesh>

      {/* Constellation beams — seven line segments connecting adjacent
          nodes with staggered time-based pulse. Draws additively over the
          ring so beams read as "the system is live" rather than as
          static architecture. */}
      <lineSegments geometry={beamGeometry} material={beamMaterial} />


      {baseAngles.map((angle, i) => {
        const x = Math.cos(angle) * orbitRadius
        const z = Math.sin(angle) * orbitRadius
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
            {/* SDF label group. Desktop: full code + title. Mobile: just
                the M-code — full titles live in a viewport-anchored legend
                (see Act3Capabilities.tsx) so the 3D orbit stays composed
                inside the portrait frame. */}
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
                {!isMobile && (
                  <Text
                    fontSize={labelTitleSize}
                    color="#FFFFFF"
                    anchorX="center"
                    anchorY="top"
                    position={[0, -0.04, 0]}
                    fontWeight={500}
                    maxWidth={labelMaxWidth}
                    textAlign="center"
                    outlineWidth={0}
                    material-toneMapped={false}
                    material-transparent={true}
                  >
                    {cap.title}
                  </Text>
                )}
              </group>
            </Billboard>
          </group>
        )
      })}
    </group>
  )
}
