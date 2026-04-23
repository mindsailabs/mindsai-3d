import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Lenis from 'lenis'
import { Link } from 'react-router-dom'
import { Billboard, Text } from '@react-three/drei'
import { capabilities } from '../lib/copy'
import { ParticleField } from '../three/ParticleField'
import { PostProcess } from '../three/PostProcess'
import { useAppStore } from '../lib/store'

/**
 * /process — the apparatus in motion.
 *
 * Desktop: the seven capabilities arranged as a vertical data-flow
 * machine. Each discipline is a node with its code, title, and a
 * short description. A teal beam connects node-to-node, a pulse
 * travels top-to-bottom in a continuous loop.
 *
 * Scroll drives both the camera (gentle descent) and reveals each
 * capability one at a time — like walking through a Patek movement
 * under a loupe.
 *
 * Mobile: the vertical node list becomes a stacked timeline, identical
 * typography, no 3D machinery (portrait frame can't hold the vertical
 * apparatus gracefully). A soft M + particles backdrop remains.
 */

const NARRATIVE: { intro: string; outro: string } = {
  intro:
    'Every client sees a bespoke result. Behind each one is the same seven-stage engine.',
  outro:
    'Every module compounds. Listening shapes the model. The model writes the copy. The copy feeds the system. The system measures itself.',
}

export function Process() {
  const setScrollProgress = useAppStore((s) => s.setScrollProgress)
  const appReady = useAppStore((s) => s.appReady)
  const [dotMesh, setDotMesh] = useState<THREE.Mesh | null>(null)

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.6,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.4,
      lerp: 0.08,
    })
    lenis.stop()
    lenis.scrollTo(0, { immediate: true })
    lenis.on('scroll', (e: Lenis) => setScrollProgress(e.progress))
    let rafId = 0
    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)
    ;(window as unknown as { __lenis: Lenis }).__lenis = lenis
    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [setScrollProgress])

  useEffect(() => {
    if (!appReady) return
    const lenis = (window as unknown as { __lenis?: { start: () => void } })
      .__lenis
    if (lenis && typeof lenis.start === 'function') lenis.start()
  }, [appReady])

  return (
    <>
      {/* Minimal background canvas: particles + small M witness + camera drift */}
      <div className="fixed inset-0 z-[1]">
        <Canvas
          camera={{ position: [0, 0, 9], fov: 34 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
          }}
          dpr={[1, 3]}
        >
          <fog attach="fog" args={['#000000', 10, 26]} />
          <Suspense fallback={null}>
            <ProcessCamera />
            <ParticleField />
            <ApparatusPulse
              count={capabilities.length}
              onDotMount={setDotMesh}
            />
            <PostProcess sunMesh={dotMesh} />
          </Suspense>
        </Canvas>
      </div>

      <div
        className="relative z-10"
        style={{
          opacity: appReady ? 1 : 0,
          transition: 'opacity 600ms cubic-bezier(0.22, 1, 0.36, 1) 200ms',
        }}
      >
        {/* HERO */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 md:px-12">
          <div className="text-brand-teal text-[10px] md:text-[11px] uppercase tracking-[0.4em] font-medium mb-6">
            The process
          </div>
          <h1 className="text-text-primary font-black text-[clamp(3rem,9vw,10rem)] leading-[0.85] tracking-tight md:tracking-tightest text-center max-w-4xl">
            One engine.
            <br />
            Seven modules.
          </h1>
          <p className="mt-8 text-text-secondary text-[13px] md:text-[15px] leading-relaxed max-w-xl text-center">
            {NARRATIVE.intro}
          </p>
        </section>

        {/* SEVEN MODULES, one per viewport */}
        {capabilities.map((cap, i) => (
          <ModuleSection
            key={cap.id}
            index={i}
            code={cap.code}
            title={cap.title}
            description={cap.description}
            totalCount={capabilities.length}
          />
        ))}

        {/* OUTRO */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 md:px-12 text-center">
          <div className="text-brand-teal text-[10px] md:text-[11px] uppercase tracking-[0.4em] font-medium mb-6">
            The compound
          </div>
          <h2 className="text-text-primary font-black text-[clamp(2.25rem,5.5vw,5.5rem)] leading-[0.88] tracking-tight md:tracking-tightest max-w-[1100px]">
            Every module compounds.
          </h2>
          <p className="mt-8 text-text-secondary text-[13px] md:text-[15px] leading-relaxed max-w-xl">
            {NARRATIVE.outro}
          </p>
          <Link
            to="/#contact"
            className="mt-16 inline-flex items-center gap-2 text-text-primary text-[11px] md:text-[12px] uppercase tracking-[0.3em] font-medium border border-brand-teal/40 hover:border-brand-teal px-8 py-4 rounded-[3px] transition-colors"
          >
            Start a project →
          </Link>
          <Link
            to="/"
            className="mt-8 text-text-secondary/70 hover:text-brand-teal text-[10px] uppercase tracking-[0.3em] font-medium transition-colors"
          >
            ← Return to the work
          </Link>
        </section>
      </div>
    </>
  )
}

/**
 * One capability per viewport. Giant code + title + description,
 * alternating alignment, IntersectionObserver fade-in.
 */
function ModuleSection({
  index,
  code,
  title,
  description,
  totalCount,
}: {
  index: number
  code: string
  title: string
  description: string
  totalCount: number
}) {
  const [ref, setRef] = useState<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!ref) return
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setVisible(true)),
      { threshold: 0.35 }
    )
    io.observe(ref)
    return () => io.disconnect()
  }, [ref])

  const alignRight = index % 2 === 1

  return (
    <section
      ref={setRef}
      className="min-h-screen flex items-center justify-center px-6 md:px-12 lg:px-20"
    >
      <div
        className={
          'max-w-[1200px] w-full ' +
          (alignRight ? 'ml-auto text-right' : 'mr-auto')
        }
        style={{
          opacity: visible ? 1 : 0,
          filter: visible ? 'blur(0)' : 'blur(10px)',
          transform: visible ? 'translateY(0)' : 'translateY(32px)',
          transition:
            'opacity 1400ms cubic-bezier(0.22, 1, 0.36, 1),' +
            ' filter 1200ms cubic-bezier(0.22, 1, 0.36, 1),' +
            ' transform 1400ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div className="text-brand-teal text-[10px] md:text-[11px] uppercase tracking-[0.4em] font-medium mb-4 tabular-nums">
          {code} · {String(index + 1).padStart(2, '0')} / {String(totalCount).padStart(2, '0')}
        </div>
        <h3 className="text-text-primary font-black text-[clamp(2.25rem,7vw,7rem)] leading-[0.9] tracking-tight md:tracking-tightest mb-6 md:mb-8">
          {title}
        </h3>
        <p className="text-text-secondary text-[15px] md:text-[20px] leading-relaxed max-w-2xl md:max-w-[560px] ml-auto">
          {description}
        </p>
      </div>
    </section>
  )
}

/**
 * ApparatusPulse — 3D visualisation of the seven capabilities as nodes
 * connected by a glowing teal beam, with a bright pulse travelling top-
 * to-bottom in a continuous loop. Minimal, background-only; the DOM
 * text is the focus.
 *
 * Also exposes the top node as `sunMesh` for the GodRays post-process.
 */
function ApparatusPulse({
  count,
  onDotMount,
}: {
  count: number
  onDotMount?: (mesh: THREE.Mesh) => void
}) {
  const groupRef = useRef<THREE.Group>(null!)
  const pulseRef = useRef<THREE.Mesh>(null!)

  // Nodes stacked vertically at evenly-spaced heights, slight x jitter for life.
  const nodePositions = useMemo(() => {
    const positions: THREE.Vector3[] = []
    const totalHeight = 8
    for (let i = 0; i < count; i++) {
      const t = i / Math.max(1, count - 1)
      const y = totalHeight / 2 - t * totalHeight
      const x = Math.sin(i * 1.7) * 0.45 // gentle s-curve
      positions.push(new THREE.Vector3(x, y, 0))
    }
    return positions
  }, [count])

  const beamGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pts = new Float32Array((nodePositions.length - 1) * 2 * 3)
    for (let i = 0; i < nodePositions.length - 1; i++) {
      const a = nodePositions[i]
      const b = nodePositions[i + 1]
      pts[i * 6 + 0] = a.x
      pts[i * 6 + 1] = a.y
      pts[i * 6 + 2] = a.z
      pts[i * 6 + 3] = b.x
      pts[i * 6 + 4] = b.y
      pts[i * 6 + 5] = b.z
    }
    g.setAttribute('position', new THREE.BufferAttribute(pts, 3))
    return g
  }, [nodePositions])

  const beamMaterial = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#73C5CC'),
      transparent: true,
      opacity: 0.35,
    })
    ;(mat as unknown as { toneMapped: boolean }).toneMapped = false
    return mat
  }, [])

  const nodeMaterial = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#73C5CC').multiplyScalar(2.2),
    })
    mat.toneMapped = false
    return mat
  }, [])

  const pulseMaterial = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#73C5CC').multiplyScalar(4.5),
    })
    mat.toneMapped = false
    return mat
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (pulseRef.current) {
      // Pulse travels top→bottom in 5s, then loops.
      const u = (t / 5) % 1
      const totalHeight = 8
      const y = totalHeight / 2 - u * totalHeight
      // Interpolate x along the node curve at the current height.
      const x = Math.sin(u * Math.PI * 2 * 1.2) * 0.45
      pulseRef.current.position.set(x, y, 0)
      // Gentle scale pulse for life.
      const s = 1 + Math.sin(t * 2.5) * 0.15
      pulseRef.current.scale.setScalar(s)
    }
    if (groupRef.current) {
      // Subtle whole-apparatus breathing rotation.
      groupRef.current.rotation.y = Math.sin(t * 0.1) * 0.08
    }
  })

  return (
    <group ref={groupRef} position={[3.6, 0, 0]}>
      <lineSegments geometry={beamGeometry} material={beamMaterial} />
      {nodePositions.map((p, i) => (
        <group key={i} position={p}>
          <mesh
            material={nodeMaterial}
            ref={(m) => {
              if (m && i === 0 && onDotMount) onDotMount(m)
            }}
          >
            <sphereGeometry args={[0.11, 32, 32]} />
          </mesh>
          <Billboard follow={true} position={[0.55, 0, 0]}>
            <Text
              fontSize={0.22}
              color="#73C5CC"
              anchorX="left"
              anchorY="middle"
              outlineWidth={0}
              material-toneMapped={false}
              material-transparent={true}
            >
              M0{i + 1}
            </Text>
          </Billboard>
        </group>
      ))}
      <mesh ref={pulseRef} material={pulseMaterial}>
        <sphereGeometry args={[0.09, 24, 24]} />
      </mesh>
    </group>
  )
}

/**
 * Slow camera with cursor parallax. Text is the content; camera supports.
 */
function ProcessCamera() {
  const mouse = useRef({ x: 0, y: 0 })
  const mouseSmoothed = useRef({ x: 0, y: 0 })

  useEffect(() => {
    function onMove(e: MouseEvent) {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    mouseSmoothed.current.x +=
      (mouse.current.x - mouseSmoothed.current.x) * 0.04
    mouseSmoothed.current.y +=
      (mouse.current.y - mouseSmoothed.current.y) * 0.04
    const cam = state.camera
    cam.position.x = Math.sin(t * 0.08) * 0.1 + mouseSmoothed.current.x * 0.35
    cam.position.y = Math.cos(t * 0.06) * 0.08 + mouseSmoothed.current.y * 0.25
    cam.position.z = 9 + Math.sin(t * 0.05) * 0.1
    cam.lookAt(1.5 + mouseSmoothed.current.x * 0.2, mouseSmoothed.current.y * 0.15, 0)
  })

  return null
}
