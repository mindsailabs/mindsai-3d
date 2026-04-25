import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Lenis from 'lenis'
import { useNavigate } from 'react-router-dom'
import { MindsMark } from '../three/MindsMark'
import { ParticleField } from '../three/ParticleField'
import { PostProcess } from '../three/PostProcess'
import { OrbitalStage, type Orbit } from '../three/OrbitalStage'
import { useAppStore } from '../lib/store'
import { useViewport } from '../lib/useViewport'
import { useReducedMotion } from '../lib/useReducedMotion'

/**
 * /manifesto — the philosophical thesis page.
 *
 * Composition (matches the home-page discipline):
 *   – M at ORIGIN, scale 0.82 (same as home)
 *   – Camera [0, 0.1, 7.5], fov 32 (same as home)
 *   – Three concentric orbital rings of small teal satellites around
 *     the M. Scroll emphasis picks up the inner ring, lighting each
 *     stanza's corresponding satellite as you pass the stanza.
 *
 * Text discipline — no hero or stanza copy sits directly over the M:
 *   – Hero title pinned to BOTTOM-LEFT
 *   – Stanzas render as narrow (max 36vw) side-columns alternating L/R
 *     so the M + orbital rings always stay visible in the other half.
 */

interface Stanza {
  eyebrow?: string
  lines: string[]
  emphasis?: string
}

const STANZAS: Stanza[] = [
  {
    eyebrow: 'A manifesto',
    lines: ['There is a difference', 'between noise', 'and signal.'],
  },
  { lines: ['Most advertising', 'is noise.'] },
  { lines: ['We are not', 'most.'], emphasis: 'most' },
  { eyebrow: 'One', lines: ['We listen first.'] },
  { eyebrow: 'Two', lines: ['We model.'] },
  { eyebrow: 'Three', lines: ['We build.'] },
  { eyebrow: 'Four', lines: ['We measure.'], emphasis: 'measure' },
  { lines: ['And we do all of it', 'quietly.'] },
  {
    lines: ['The result', 'is compounded silence', 'in your favour.'],
    emphasis: 'in your favour',
  },
]

export function Manifesto() {
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

  // Three-ring orbital config. Inner has one satellite per stanza, so
  // scroll-emphasis lights the "current" stanza's satellite brightly.
  const orbits: Orbit[] = useMemo(
    () => [
      {
        id: 'stanzas',
        radius: 2.2,
        speed: 0.07,
        tiltAxis: 'x',
        tilt: 0.26,
        ringOpacity: 0.16,
        scrollEmphasis: true,
        satellites: STANZAS.map((_, i) => ({
          id: `stanza-${i}`,
          size: 0.075,
        })),
      },
      {
        id: 'mid',
        radius: 3.4,
        speed: -0.05,
        tiltAxis: 'x',
        tilt: -0.18,
        ringOpacity: 0.1,
        satellites: Array.from({ length: 4 }, (_, i) => ({
          id: `mid-${i}`,
          size: 0.12,
        })),
      },
      {
        id: 'outer',
        radius: 4.9,
        speed: 0.03,
        tiltAxis: 'z',
        tilt: 0.42,
        ringOpacity: 0.06,
        satellites: Array.from({ length: 16 }, (_, i) => ({
          id: `outer-${i}`,
          size: 0.035,
        })),
      },
    ],
    []
  )

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
            <ManifestoCamera />
            <ParticleField />
            <MindsMark scale={0.82} onDotMount={setDotMesh} />
            <OrbitalStage orbits={orbits} />
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
        {/* HERO — eyebrow top-left, title bottom-left. Centre of canvas
            stays clear for the M. */}
        <section className="min-h-screen flex flex-col justify-between px-6 md:px-12 lg:px-20 py-[14vh]">
          <div className="max-w-lg">
            <div className="text-brand-teal text-[10px] md:text-[11px] uppercase tracking-[0.4em] font-medium">
              Manifesto
            </div>
          </div>
          <div className="max-w-[700px]">
            <h1 className="text-text-primary font-black text-[clamp(3rem,9vw,10rem)] leading-[0.84] tracking-tight md:tracking-tightest">
              What we
              <br />
              believe.
            </h1>
            <div className="mt-10 text-text-secondary/60 text-[10px] uppercase tracking-[0.3em] animate-pulse">
              Scroll to drift
            </div>
          </div>
        </section>

        {/* Soft divider between hero and stanzas — visual hand-off. */}
        <div className="flex justify-center py-2">
          <div className="h-px w-24 bg-brand-teal/25" />
        </div>

        {STANZAS.map((stanza, i) => (
          <StanzaSection key={i} stanza={stanza} index={i} />
        ))}

        {/* Closing return — matches the centered ceremonial rhythm of
            the stanzas above, so the page reads as one cohesive scroll
            rather than alternating left-bias at the bottom. */}
        <section className="min-h-[55vh] flex flex-col items-center justify-center px-6 md:px-12 lg:px-20 py-[10vh] text-center">
          <div className="max-w-md flex flex-col items-center">
            <ManifestoReturnButton />
            <div className="mt-12 text-text-secondary/50 text-[10px] uppercase tracking-[0.3em] tabular-nums">
              MindsAI Media · London
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

/**
 * Stanza — centered, ceremonial composition. One stanza per ~half-
 * viewport so the page reads as a deliberate sequence of beats rather
 * than a series of side-aligned labels in 9 viewports of black.
 *
 * Manifesto text wants big + centered + ceremonial. Earlier "narrow
 * alternating L/R column" version made the eye bounce side-to-side
 * with no rhythm; now every stanza follows the same shape: optional
 * bracketed eyebrow above a centered display-scale title.
 */
function StanzaSection({
  stanza,
}: {
  stanza: Stanza
  index: number
}) {
  const [ref, setRef] = useState<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!ref) return
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => e.isIntersecting && setVisible(true)),
      { threshold: 0.4 }
    )
    io.observe(ref)
    return () => io.disconnect()
  }, [ref])

  return (
    <section
      ref={setRef}
      className="min-h-[55vh] md:min-h-[62vh] flex items-center justify-center px-6 md:px-12 lg:px-20 py-12"
    >
      <div
        className="max-w-[920px] w-full text-center"
        style={{
          opacity: visible ? 1 : 0,
          filter: visible ? 'blur(0)' : 'blur(14px)',
          transform: visible ? 'translateY(0)' : 'translateY(40px)',
          transition:
            'opacity 1300ms cubic-bezier(0.22, 1, 0.36, 1),' +
            ' filter 1100ms cubic-bezier(0.22, 1, 0.36, 1),' +
            ' transform 1300ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {stanza.eyebrow && (
          <div className="flex items-center justify-center gap-4 mb-8 md:mb-10">
            <span className="h-px w-10 md:w-16 bg-brand-teal/40" />
            <span className="text-brand-teal text-[10px] md:text-[11px] uppercase tracking-[0.45em] font-medium tabular-nums whitespace-nowrap">
              {stanza.eyebrow}
            </span>
            <span className="h-px w-10 md:w-16 bg-brand-teal/40" />
          </div>
        )}
        <div className="text-text-primary font-black text-[clamp(2.25rem,6vw,6.5rem)] leading-[0.9] tracking-tight md:tracking-tightest">
          {stanza.lines.map((line, li) => (
            <div key={li}>
              {stanza.emphasis && line.includes(stanza.emphasis) ? (
                <>
                  {line.split(stanza.emphasis).map((seg, si, arr) => (
                    <span key={si}>
                      {seg}
                      {si < arr.length - 1 && (
                        <span className="text-brand-teal">
                          {stanza.emphasis}
                        </span>
                      )}
                    </span>
                  ))}
                </>
              ) : (
                line
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * "Return to the work" — navigates home then scrolls to Act 4 (work
 * carousel). Plain <Link to="/"> would just land at hero.
 */
function ManifestoReturnButton() {
  const navigate = useNavigate()
  const scrollToWork = () => {
    const lenis = (
      window as unknown as {
        __lenis?: { limit: number; scrollTo: (v: number) => void }
      }
    ).__lenis
    if (lenis && typeof lenis.scrollTo === 'function') {
      lenis.scrollTo(lenis.limit * 0.68)
    } else {
      const max = document.documentElement.scrollHeight - window.innerHeight
      window.scrollTo({ top: max * 0.68, behavior: 'smooth' })
    }
  }
  const onClick = () => {
    if (window.location.pathname === '/') {
      scrollToWork()
    } else {
      navigate('/')
      window.setTimeout(scrollToWork, 300)
    }
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-2 text-brand-teal text-[11px] md:text-[12px] uppercase tracking-[0.3em] font-medium border-b border-brand-teal/30 hover:border-brand-teal pb-1 transition-colors cursor-pointer"
    >
      <span>←</span>
      <span>Return to the work</span>
    </button>
  )
}

/**
 * Manifesto camera — very slow drift with a gentle scroll-driven yaw
 * sweep so each stanza sees a slightly different facet of the M and its
 * orbital rings. No dramatic dolly.
 *
 * Mobile: pulls back 1.4× and widens FOV by 8° so the M fits inside the
 * portrait viewport without dominating the composition.
 */
function ManifestoCamera() {
  const mouse = useRef({ x: 0, y: 0 })
  const mouseSmoothed = useRef({ x: 0, y: 0 })
  const scrollProgress = useAppStore((s) => s.scrollProgress)
  const { isMobile } = useViewport()
  const reducedMotion = useReducedMotion()

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
    // Reduced motion: park the camera statically (yaw = 0, no time-
    // driven sine sweep, no cursor parallax).
    const yaw = reducedMotion ? 0 : sp * 0.5 + Math.sin(t * 0.07) * 0.05
    const orbitRadius = isMobile ? 10.5 : 7.5
    const parallaxAmp = reducedMotion ? 0 : 1
    const timeBreath = reducedMotion ? 0 : Math.cos(t * 0.05) * 0.06
    const camX =
      Math.sin(yaw) * orbitRadius + mouseSmoothed.current.x * 0.3 * parallaxAmp
    const camZ = Math.cos(yaw) * orbitRadius
    const camY =
      0.15 + timeBreath + mouseSmoothed.current.y * 0.2 * parallaxAmp

    const cam = state.camera
    cam.position.set(camX, camY, camZ)
    cam.lookAt(0, mouseSmoothed.current.y * 0.04, 0)
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
