import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Link } from 'react-router-dom'
import { MindsMark } from '../three/MindsMark'
import { ParticleField } from '../three/ParticleField'
import { PostProcess } from '../three/PostProcess'
import { useViewport } from '../lib/useViewport'

/**
 * /404 — the void page.
 *
 * The M remains the centre; fragments orbit it in decaying spirals,
 * as if gravity has partly broken. Text sits at the edges so the M
 * stays clearly visible through the middle of the viewport.
 *
 * No scroll, no Lenis — single viewport.
 */
export function NotFound() {
  const [dotMesh, setDotMesh] = useState<THREE.Mesh | null>(null)

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    window.scrollTo(0, 0)
  }, [])

  return (
    <>
      <div className="fixed inset-0 z-[1]">
        <Canvas
          camera={{ position: [0, 0.1, 7.5], fov: 32, near: 0.5, far: 60 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
          }}
          dpr={[1, 2]}
        >
          <fog attach="fog" args={['#000000', 9, 26]} />
          <Suspense fallback={null}>
            <LostCamera />
            <ParticleField />
            {/* Broken-orbit shards — tetrahedrons on three chaotic rings
                with individual radial pulsing so the system feels like
                it's DECAYING not resting. */}
            <ShardRings />
            {/* Glitched M — position + rotation tremor. */}
            <GlitchingM>
              <MindsMark scale={0.82} onDotMount={setDotMesh} />
            </GlitchingM>
            <PostProcess sunMesh={dotMesh} />
          </Suspense>
        </Canvas>
      </div>

      {/* Text sits at the corners — title bottom-left, 404 top-left,
          return-home link bottom-right. Middle of the viewport stays
          clear for the M + orbiting shards. */}
      <div className="relative z-10 min-h-screen flex flex-col justify-between px-6 md:px-12 lg:px-20 py-[12vh] pointer-events-none">
        <div className="text-brand-teal text-[10px] md:text-[11px] uppercase tracking-[0.45em] font-medium">
          404
        </div>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-12">
          <div className="max-w-[640px] pointer-events-auto">
            <h1 className="text-text-primary font-black text-[clamp(2.5rem,7vw,6rem)] leading-[0.88] tracking-tight md:tracking-tightest">
              Path lost
              <br />
              in the void.
            </h1>
            <p className="mt-6 text-text-secondary text-[13px] md:text-[14px] leading-relaxed max-w-[440px]">
              Breathe. Every lost signal was once on the way somewhere.
            </p>
          </div>
          <div className="pointer-events-auto">
            <Link
              to="/"
              className="group inline-flex items-center gap-2 text-text-primary text-[11px] md:text-[12px] uppercase tracking-[0.3em] font-medium border border-brand-teal/40 hover:border-brand-teal px-6 py-3 rounded-[3px] transition-colors"
            >
              <span>←</span>
              <span>Return to ground</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

/**
 * GlitchingM — position + rotation jitter every 0.2-0.6s, eased between
 * jitter targets so it reads as a tremor, not a strobe.
 */
function GlitchingM({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null!)
  const nextJitterAt = useRef(0)
  const jitter = useRef({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 })

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (t > nextJitterAt.current) {
      nextJitterAt.current = t + 0.2 + Math.random() * 0.4
      jitter.current = {
        x: (Math.random() - 0.5) * 0.1,
        y: (Math.random() - 0.5) * 0.07,
        z: (Math.random() - 0.5) * 0.05,
        rx: (Math.random() - 0.5) * 0.06,
        ry: (Math.random() - 0.5) * 0.08,
        rz: (Math.random() - 0.5) * 0.04,
      }
    }
    if (groupRef.current) {
      const g = groupRef.current
      const ease = 0.25
      g.position.x += (jitter.current.x - g.position.x) * ease
      g.position.y += (jitter.current.y - g.position.y) * ease
      g.position.z += (jitter.current.z - g.position.z) * ease
      g.rotation.x += (jitter.current.rx - g.rotation.x) * ease
      g.rotation.y += (jitter.current.ry - g.rotation.y) * ease
      g.rotation.z += (jitter.current.rz - g.rotation.z) * ease
    }
  })

  return <group ref={groupRef}>{children}</group>
}

/**
 * ShardRings — three rings of tetrahedrons orbiting the M at different
 * radii, tilts, speeds. Each shard also radial-pulses (breathes in/out)
 * and pulses opacity, so the system reads as "gravity decaying" rather
 * than a tidy orbit.
 */
function ShardRings() {
  const rings = useMemo(
    () => [
      { count: 14, radius: 2.2, tilt: 0.25, speed: 0.25, axis: 'x' as const },
      { count: 16, radius: 3.3, tilt: -0.18, speed: -0.18, axis: 'x' as const },
      { count: 10, radius: 4.4, tilt: 0.42, speed: 0.12, axis: 'z' as const },
    ],
    []
  )

  const shardData = useMemo(
    () =>
      rings.flatMap((ring, ri) =>
        Array.from({ length: ring.count }, (_, i) => ({
          ringIndex: ri,
          angle: (i / ring.count) * Math.PI * 2,
          baseRadius: ring.radius,
          tilt: ring.tilt,
          axis: ring.axis,
          speed: ring.speed,
          rotSpeed: (Math.random() - 0.5) * 0.9,
          initialRot: new THREE.Euler(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
          ),
          size: 0.08 + Math.random() * 0.12,
          seed: Math.random() * 6.28,
          pulseSpeed: 1.0 + Math.random() * 1.5,
          radialPulseAmp: 0.08 + Math.random() * 0.18,
        }))
      ),
    [rings]
  )

  const meshRefs = useRef<(THREE.Mesh | null)[]>([])

  const sharedMaterial = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#73C5CC').multiplyScalar(1.8),
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    })
    m.toneMapped = false
    return m
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    shardData.forEach((s, i) => {
      const mesh = meshRefs.current[i]
      if (!mesh) return
      // Orbital angle (with ring-specific speed).
      const angle = s.angle + t * s.speed
      // Radius pulses in/out — "decaying orbit."
      const r = s.baseRadius + Math.sin(t * s.pulseSpeed + s.seed) * s.radialPulseAmp
      const planarX = Math.cos(angle) * r
      const planarZ = Math.sin(angle) * r
      // Apply tilt so the ring isn't flat.
      if (s.axis === 'x') {
        const cy = Math.cos(s.tilt)
        const sy = Math.sin(s.tilt)
        mesh.position.x = planarX
        mesh.position.y = planarZ * sy
        mesh.position.z = planarZ * cy
      } else {
        const cz = Math.cos(s.tilt)
        const sz = Math.sin(s.tilt)
        mesh.position.x = planarX * cz - 0 * sz
        mesh.position.y = planarX * sz
        mesh.position.z = planarZ
      }
      // Tumble.
      mesh.rotation.x = s.initialRot.x + t * s.rotSpeed
      mesh.rotation.y = s.initialRot.y + t * s.rotSpeed * 0.7
      mesh.rotation.z = s.initialRot.z + t * s.rotSpeed * 0.3
      // Opacity pulse.
      const op = 0.35 + 0.4 * Math.sin(t * 1.4 + s.seed * 3.2)
      ;(mesh.material as THREE.MeshBasicMaterial).opacity = op
    })
  })

  return (
    <group>
      {shardData.map((s, i) => (
        <mesh
          key={i}
          ref={(m) => {
            meshRefs.current[i] = m
          }}
          scale={s.size}
          material={sharedMaterial.clone()}
        >
          <tetrahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Camera drifts in a slow figure-eight so the M never sits dead still.
 * Cursor parallax layered on top.
 */
function LostCamera() {
  const cursor = useRef({ x: 0, y: 0 })
  const cursorSmoothed = useRef({ x: 0, y: 0 })
  const { isMobile } = useViewport()

  useEffect(() => {
    function onMove(e: MouseEvent) {
      cursor.current.x = (e.clientX / window.innerWidth) * 2 - 1
      cursor.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    cursorSmoothed.current.x +=
      (cursor.current.x - cursorSmoothed.current.x) * 0.04
    cursorSmoothed.current.y +=
      (cursor.current.y - cursorSmoothed.current.y) * 0.04
    const cam = state.camera
    cam.position.x =
      Math.sin(t * 0.12) * 0.6 + cursorSmoothed.current.x * 0.4
    cam.position.y =
      Math.cos(t * 0.09) * 0.3 + cursorSmoothed.current.y * 0.25
    cam.position.z =
      (isMobile ? 10.5 : 7.5) + Math.sin(t * 0.07) * 0.15
    cam.lookAt(0, 0, 0)
    if ((cam as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const target = isMobile ? 42 : 36
      const pc = cam as THREE.PerspectiveCamera
      pc.fov += (target - pc.fov) * 0.18
      pc.updateProjectionMatrix()
    }
  })

  return null
}
