import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Lenis from 'lenis'
import { Link } from 'react-router-dom'
import { capabilities } from '../lib/copy'
import { MindsMark } from '../three/MindsMark'
import { ParticleField } from '../three/ParticleField'
import { PostProcess } from '../three/PostProcess'
import { OrbitalStage, type Orbit } from '../three/OrbitalStage'
import { useAppStore } from '../lib/store'
import { useViewport } from '../lib/useViewport'

/**
 * /process — the apparatus around the mark.
 *
 * Composition (matches the home-page discipline):
 *   – M at ORIGIN, scale 0.82 (same as home)
 *   – Camera [0, 0.1, 7.5], fov 32 (same as home)
 *   – Seven module SATELLITES orbit the M on a main ring
 *   – Two ambient rings (inner + outer) add depth
 *   – As you scroll, the satellite that corresponds to the module you're
 *     reading brightens; the others dim. The ring rotates so every
 *     module passes through the foreground.
 *
 * Text discipline — no copy sits over the centre of the canvas:
 *   – Hero title pinned to TOP of its viewport
 *   – Module sections use a narrow (max 40vw) column alternating L/R so
 *     the M + orbital ring always stay visible in the other half.
 */

const NARRATIVE = {
  intro:
    'Every client sees a bespoke result. Behind each one is the same seven-module engine orbiting a single mark.',
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
      duration: 0.9,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.6,
      lerp: 0.14,
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

  // Build the orbital configuration. Primary ring = seven module satellites,
  // scroll-emphasis active. Inner + outer rings = ambient dust.
  const orbits: Orbit[] = useMemo(
    () => [
      // INNER AMBIENT — small, fast, very tilted so the ring line reads
      // as a horizontal pen-stroke behind the M.
      {
        id: 'inner-ambient',
        radius: 1.85,
        speed: 0.16,
        tiltAxis: 'x',
        tilt: 0.7,
        ringOpacity: 0.08,
        satellites: Array.from({ length: 12 }, (_, i) => ({
          id: `inner-${i}`,
          size: 0.035,
        })),
      },
      // PRIMARY MODULE RING — the seven capabilities, each a satellite
      // with its code label. Scroll-emphasis makes the active one glow.
      {
        id: 'modules',
        radius: 3.15,
        speed: 0.06,
        tiltAxis: 'x',
        tilt: 0.22,
        ringOpacity: 0.16,
        scrollEmphasis: true,
        satellites: capabilities.map((c) => ({
          id: c.id,
          label: c.code,
          size: 0.105,
        })),
      },
      // OUTER AMBIENT — slow counter-rotation, larger radius, faint.
      {
        id: 'outer-ambient',
        radius: 4.6,
        speed: -0.04,
        tiltAxis: 'z',
        tilt: 0.35,
        ringOpacity: 0.06,
        satellites: Array.from({ length: 18 }, (_, i) => ({
          id: `outer-${i}`,
          size: 0.04,
        })),
      },
    ],
    []
  )

  return (
    <>
      {/* Canvas: M at origin + three orbital rings + particles. Camera
          drifts slowly around Y, giving the whole system a gentle parallax. */}
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
            <ProcessCamera />
            <ParticleField />
            <MindsMark scale={0.82} onDotMount={setDotMesh} />
            <OrbitalStage orbits={orbits} />
            <PostProcess sunMesh={dotMesh} />
          </Suspense>
        </Canvas>
      </div>

      <div
        className="relative z-10 pointer-events-auto"
        style={{
          opacity: appReady ? 1 : 0,
          transition: 'opacity 600ms cubic-bezier(0.22, 1, 0.36, 1) 200ms',
        }}
      >
        {/* HERO — title anchored TOP, intro at bottom. M + orbital ring
            sit in the MIDDLE band of the viewport untouched. */}
        <section className="min-h-screen flex flex-col justify-between px-6 md:px-12 lg:px-20 py-[14vh]">
          <div className="max-w-[1100px] w-full">
            <div className="text-brand-teal text-[10px] md:text-[11px] uppercase tracking-[0.4em] font-medium mb-6">
              The process
            </div>
            <h1 className="text-text-primary font-black text-[clamp(2.75rem,8vw,9rem)] leading-[0.86] tracking-tight md:tracking-tightest">
              One engine.
              <br />
              Seven modules.
            </h1>
          </div>
          <div className="max-w-md md:max-w-lg">
            <p className="text-text-secondary text-[13px] md:text-[15px] leading-relaxed">
              {NARRATIVE.intro}
            </p>
            <div className="mt-6 text-text-secondary/50 text-[10px] uppercase tracking-[0.3em] animate-pulse">
              Scroll to orbit the apparatus
            </div>
          </div>
        </section>

        {/* SEVEN MODULES — narrow side-column alternating L/R so the
            centre of the viewport always shows the M + active satellite. */}
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

        {/* OUTRO — centred but text only, M still the focal point behind. */}
        <section className="min-h-screen flex flex-col items-start justify-end px-6 md:px-12 lg:px-20 pb-[14vh]">
          <div className="max-w-xl">
            <div className="text-brand-teal text-[10px] md:text-[11px] uppercase tracking-[0.4em] font-medium mb-6">
              The compound
            </div>
            <h2 className="text-text-primary font-black text-[clamp(2rem,5vw,4.5rem)] leading-[0.9] tracking-tight md:tracking-tightest">
              Every module compounds.
            </h2>
            <p className="mt-6 text-text-secondary text-[13px] md:text-[15px] leading-relaxed">
              {NARRATIVE.outro}
            </p>
            <div className="mt-12 flex flex-col gap-4">
              <Link
                to="/#contact"
                className="inline-flex items-center gap-2 text-text-primary text-[11px] md:text-[12px] uppercase tracking-[0.3em] font-medium border border-brand-teal/40 hover:border-brand-teal px-8 py-4 rounded-[3px] transition-colors w-fit"
              >
                Start a project →
              </Link>
              <Link
                to="/"
                className="text-text-secondary/70 hover:text-brand-teal text-[10px] uppercase tracking-[0.3em] font-medium transition-colors w-fit"
              >
                ← Return to the work
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

/**
 * ModuleSection — narrow column (max ~40vw) alternating left and right.
 * The centre of the screen is ALWAYS empty, so the M + orbital ring
 * remain the visible focus.
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
      (entries) =>
        entries.forEach((e) => e.isIntersecting && setVisible(true)),
      { threshold: 0.35 }
    )
    io.observe(ref)
    return () => io.disconnect()
  }, [ref])

  const alignRight = index % 2 === 1

  return (
    <section
      ref={setRef}
      className="min-h-screen flex items-center px-6 md:px-12 lg:px-20"
    >
      <div
        className={
          'max-w-[440px] lg:max-w-[480px] w-full ' +
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
          {code} · {String(index + 1).padStart(2, '0')} /{' '}
          {String(totalCount).padStart(2, '0')}
        </div>
        <h3 className="text-text-primary font-black text-[clamp(1.75rem,4.5vw,4rem)] leading-[0.92] tracking-tight md:tracking-tightest mb-5">
          {title}
        </h3>
        <p className="text-text-secondary text-[14px] md:text-[17px] leading-relaxed">
          {description}
        </p>
      </div>
    </section>
  )
}

/**
 * Process camera — slow orbit around the M with a scroll-driven yaw
 * sweep. Starts looking at the M from slightly above; as you scroll, the
 * camera rotates ~60° around the Y axis so each module satellite passes
 * through the foreground in turn.
 */
function ProcessCamera() {
  const mouse = useRef({ x: 0, y: 0 })
  const mouseSmoothed = useRef({ x: 0, y: 0 })
  const scrollProgress = useAppStore((s) => s.scrollProgress)
  const { isMobile } = useViewport()

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

    const sp = scrollProgress

    // Yaw sweep from 0 to ~1.05 rad (~60°) as you scroll.
    const yaw = sp * 1.05 + Math.sin(t * 0.08) * 0.04
    // Mobile: pull back so the M + orbital rings fit portrait.
    const baseRadius = isMobile ? 10.5 : 7.5
    const orbitRadius = baseRadius - sp * 0.8
    const camX =
      Math.sin(yaw) * orbitRadius + mouseSmoothed.current.x * 0.35
    const camZ = Math.cos(yaw) * orbitRadius
    const camY =
      0.2 + Math.cos(t * 0.06) * 0.08 + mouseSmoothed.current.y * 0.25

    const cam = state.camera
    cam.position.set(camX, camY, camZ)
    cam.lookAt(0, mouseSmoothed.current.y * 0.05, 0)
    // Widen FOV on mobile for a more generous field.
    if ((cam as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const target = isMobile ? 40 : 32
      const pc = cam as THREE.PerspectiveCamera
      pc.fov += (target - pc.fov) * 0.18
      pc.updateProjectionMatrix()
    }
  })

  return null
}
