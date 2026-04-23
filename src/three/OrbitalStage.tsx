import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Billboard, Text } from '@react-three/drei'
import { useAppStore } from '../lib/store'

/**
 * OrbitalStage — a composable ring system that renders satellites
 * orbiting a center (always the M). Designed so each page can compose
 * its own narrative: Manifesto gets philosophical shards on 3 rings,
 * Process gets 7 module satellites on individual tilted orbits, and
 * so on.
 *
 * Each orbit is tilted, rotates at its own speed, and may emphasise
 * a particular satellite based on scroll progress (so scrolling through
 * a page "activates" the nodes in sequence).
 */

export interface Satellite {
  id: string
  label?: string
  sublabel?: string
  // radius override — otherwise inherits orbit.radius.
  overrideRadius?: number
  // per-satellite size (0.04–0.22 typical).
  size?: number
  // Initial angle on its ring (rad). Evenly spaced if omitted.
  angle?: number
  // Called for the FIRST satellite of the FIRST orbit only — so the caller
  // can wire the node mesh into PostProcess's GodRays "sun" socket.
  // We wire this at the orbit-level instead for cleaner typing.
}

export interface Orbit {
  id: string
  radius: number
  // angular speed, rad/sec. Negative = counter-clockwise.
  speed: number
  // Tilt axis and angle of the ring (gives the system depth).
  tiltAxis?: 'x' | 'z'
  tilt?: number
  satellites: Satellite[]
  // Ring opacity — set to 0 to hide the ring line, ~0.12 to show subtly.
  ringOpacity?: number
  // When set, the satellite whose fractional position in the array is
  // closest to scrollProgress gets a brightness spike.
  scrollEmphasis?: boolean
  // Optional hue override for the whole orbit (otherwise teal).
  tint?: string
}

export function OrbitalStage({
  orbits,
  position = [0, 0, 0],
  onFirstSatelliteMount,
}: {
  orbits: Orbit[]
  position?: [number, number, number]
  // Optional hook to expose the first satellite mesh as the GodRays "sun".
  onFirstSatelliteMount?: (mesh: THREE.Mesh) => void
}) {
  const scrollProgress = useAppStore((s) => s.scrollProgress)

  // Per-orbit rotating group refs so we can spin each ring independently.
  const orbitRefs = useRef<(THREE.Group | null)[]>([])
  // Per-satellite material refs for the emphasis pulse.
  const satMaterials = useRef<THREE.MeshBasicMaterial[][]>([])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const sp = scrollProgress

    orbits.forEach((orbit, oi) => {
      const g = orbitRefs.current[oi]
      if (g) g.rotation.y = t * orbit.speed

      if (orbit.scrollEmphasis && satMaterials.current[oi]) {
        const count = orbit.satellites.length
        satMaterials.current[oi].forEach((mat, si) => {
          if (!mat) return
          const frac = si / Math.max(1, count - 1)
          // Bell curve centred on the scroll-aligned satellite.
          const d = Math.abs(frac - sp)
          const emphasis = Math.exp(-(d * d) / 0.02) // peak 1.0, falls off at ~d=0.2
          const base = orbit.tint ? 2.2 : 2.2
          const boost = base + emphasis * 3.8
          mat.color = new THREE.Color(orbit.tint ?? '#73C5CC').multiplyScalar(boost)
        })
      }
    })
  })

  return (
    <group position={position}>
      {orbits.map((orbit, oi) => {
        const tiltAxis = orbit.tiltAxis ?? 'x'
        const tilt = orbit.tilt ?? 0
        const ringOpacity = orbit.ringOpacity ?? 0.12

        // Wrapper applies tilt to the whole ring + satellites.
        const tiltRotation: [number, number, number] =
          tiltAxis === 'x' ? [tilt, 0, 0] : [0, 0, tilt]

        return (
          <group key={orbit.id} rotation={tiltRotation}>
            {/* Ring line — a thin teal circle lying on the XZ plane. */}
            {ringOpacity > 0 && (
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry
                  args={[orbit.radius - 0.008, orbit.radius + 0.008, 180]}
                />
                <meshBasicMaterial
                  color={orbit.tint ?? '#73C5CC'}
                  transparent
                  opacity={ringOpacity}
                  side={THREE.DoubleSide}
                  toneMapped={false}
                />
              </mesh>
            )}

            {/* Rotating satellites group. */}
            <group
              ref={(g) => {
                orbitRefs.current[oi] = g
              }}
            >
              {orbit.satellites.map((sat, si) => {
                const count = orbit.satellites.length
                const baseAngle =
                  sat.angle ?? (si / count) * Math.PI * 2
                const r = sat.overrideRadius ?? orbit.radius
                const sx = Math.cos(baseAngle) * r
                const sz = Math.sin(baseAngle) * r
                const size = sat.size ?? 0.075

                return (
                  <group key={sat.id} position={[sx, 0, sz]}>
                    {/* Glow halo behind satellite — faint ring */}
                    <mesh>
                      <ringGeometry args={[size * 1.6, size * 2.4, 24]} />
                      <meshBasicMaterial
                        color={orbit.tint ?? '#73C5CC'}
                        transparent
                        opacity={0.28}
                        toneMapped={false}
                        side={THREE.DoubleSide}
                      />
                    </mesh>
                    {/* Core satellite */}
                    <mesh
                      ref={(m) => {
                        if (!m) return
                        if (oi === 0 && si === 0 && onFirstSatelliteMount) {
                          onFirstSatelliteMount(m)
                        }
                        if (!satMaterials.current[oi]) satMaterials.current[oi] = []
                        satMaterials.current[oi][si] =
                          m.material as THREE.MeshBasicMaterial
                      }}
                    >
                      <sphereGeometry args={[size, 20, 20]} />
                      <meshBasicMaterial
                        color={
                          new THREE.Color(orbit.tint ?? '#73C5CC').multiplyScalar(
                            2.2
                          )
                        }
                        toneMapped={false}
                      />
                    </mesh>
                    {sat.label && (
                      <Billboard
                        follow
                        position={[0, size + 0.22, 0]}
                      >
                        <Text
                          fontSize={0.13}
                          color={orbit.tint ?? '#73C5CC'}
                          anchorX="center"
                          anchorY="middle"
                          material-toneMapped={false}
                          material-transparent={true}
                        >
                          {sat.label}
                        </Text>
                        {sat.sublabel && (
                          <Text
                            position={[0, -0.16, 0]}
                            fontSize={0.075}
                            color="#FFFFFF"
                            anchorX="center"
                            anchorY="middle"
                            material-toneMapped={false}
                            material-transparent={true}
                            fillOpacity={0.55}
                          >
                            {sat.sublabel}
                          </Text>
                        )}
                      </Billboard>
                    )}
                  </group>
                )
              })}
            </group>
          </group>
        )
      })}
    </group>
  )
}

/**
 * useDefaultOrbitsForStanzas — helper that builds a standard 3-ring
 * orbital config given a count of satellites. Convenient for Manifesto.
 */
export function useStanzaOrbits(count: number): Orbit[] {
  return useMemo<Orbit[]>(
    () => [
      {
        id: 'inner',
        radius: 2.2,
        speed: 0.08,
        tiltAxis: 'x',
        tilt: 0.22,
        ringOpacity: 0.14,
        scrollEmphasis: true,
        satellites: Array.from({ length: count }, (_, i) => ({
          id: `stanza-${i}`,
          size: 0.07,
        })),
      },
      {
        id: 'mid',
        radius: 3.3,
        speed: -0.05,
        tiltAxis: 'x',
        tilt: -0.18,
        ringOpacity: 0.1,
        satellites: Array.from({ length: 4 }, (_, i) => ({
          id: `mid-${i}`,
          size: 0.11,
        })),
      },
      {
        id: 'outer',
        radius: 4.8,
        speed: 0.03,
        tiltAxis: 'z',
        tilt: 0.42,
        ringOpacity: 0.06,
        satellites: Array.from({ length: 14 }, (_, i) => ({
          id: `outer-${i}`,
          size: 0.035,
        })),
      },
    ],
    [count]
  )
}
