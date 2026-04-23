import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Lenis from 'lenis'
import { Link, useParams, Navigate } from 'react-router-dom'
import { caseStudies } from '../lib/copy'
import { MindsMark } from '../three/MindsMark'
import { ParticleField } from '../three/ParticleField'
import { PostProcess } from '../three/PostProcess'
import { useAppStore } from '../lib/store'

/**
 * /work/:id — dedicated case-study page.
 *
 * One template, six clients. Each client (northwood-atelier, helio-clinic,
 * orbit-capital, kelvin-rowe, marlow-studios, aether-labs) renders with:
 *
 *   – Full-bleed Veo case-study video at the top, scroll-scrubbed so it
 *     plays faster as the user moves down.
 *   – Client name + industry + service chip (big typographic hero).
 *   – Three narrative sections:
 *       1. THE BRIEF (challenge — from copy.ts)
 *       2. THE APPROACH (how we built it)
 *       3. THE RESULT (metric, oversized)
 *   – Prev / Next nav between case studies + return link.
 *
 * The M floats as a small witness in the background (scale 0.4, off-centre)
 * so the visitor never fully leaves the MindsAI universe.
 *
 * Atmospheric video + persistent nav + audio bus all inherited from the
 * shared App layout.
 */

export function CaseStudy() {
  const { id } = useParams<{ id: string }>()
  const setScrollProgress = useAppStore((s) => s.setScrollProgress)
  const appReady = useAppStore((s) => s.appReady)
  const [dotMesh, setDotMesh] = useState<THREE.Mesh | null>(null)

  const caseIndex = useMemo(
    () => caseStudies.findIndex((c) => c.id === id),
    [id]
  )
  const study = caseIndex >= 0 ? caseStudies[caseIndex] : null
  const prev = caseIndex > 0 ? caseStudies[caseIndex - 1] : null
  const next =
    caseIndex >= 0 && caseIndex < caseStudies.length - 1
      ? caseStudies[caseIndex + 1]
      : null

  // Must run hooks in consistent order regardless of guard branch.
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    window.scrollTo(0, 0)
  }, [id])

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
  }, [setScrollProgress, id])

  useEffect(() => {
    if (!appReady) return
    const lenis = (window as unknown as { __lenis?: { start: () => void } })
      .__lenis
    if (lenis && typeof lenis.start === 'function') lenis.start()
  }, [appReady])

  // Unknown id → 404 route.
  if (!study) {
    return <Navigate to="/not-found-case" replace />
  }

  return (
    <>
      {/* Minimal canvas — M as witness. No orbital content. */}
      <div className="fixed inset-0 z-[1]">
        <Canvas
          camera={{ position: [-3, 0.3, 8.5], fov: 34 }}
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
            <WitnessCamera />
            <ParticleField />
            <MindsMark scale={0.4} onDotMount={setDotMesh} />
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
        {/* 01 — HERO */}
        <section className="min-h-screen flex flex-col justify-end px-6 md:px-12 lg:px-20 pb-[14vh] pt-[16vh]">
          <div className="max-w-[1200px] mx-auto w-full">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="text-brand-teal text-[10px] md:text-[11px] uppercase tracking-[0.3em] font-medium tabular-nums">
                {String(caseIndex + 1).padStart(2, '0')} / {String(caseStudies.length).padStart(2, '0')}
              </span>
              <span className="h-px w-10 bg-brand-teal/40" />
              <span className="text-text-secondary text-[10px] md:text-[11px] uppercase tracking-[0.3em]">
                {study.service}
              </span>
            </div>
            <h1 className="text-text-primary font-black text-[clamp(2.75rem,8vw,8rem)] leading-[0.88] tracking-tight md:tracking-tightest">
              {study.name}
            </h1>
            <p className="mt-4 md:mt-5 text-text-secondary text-[12px] md:text-[14px] uppercase tracking-[0.2em]">
              {study.industry} · {study.period}
            </p>
          </div>
        </section>

        {/* 02 — FULL-BLEED VIDEO */}
        <section className="relative min-h-[90vh] flex items-center justify-center px-4 md:px-10">
          <div
            className="relative w-full max-w-[1400px] aspect-[16/9] rounded-[4px] overflow-hidden border border-white/10"
            style={{
              boxShadow:
                '0 60px 120px -30px rgba(0, 0, 0, 0.9),' +
                '0 0 0 1px rgba(115, 197, 204, 0.08) inset,' +
                '0 0 120px -20px rgba(115, 197, 204, 0.12)',
            }}
          >
            <video
              src={study.videoPath}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </section>

        {/* 03 — BRIEF */}
        <NarrativeBlock eyebrow="01 — The brief" body={study.copy.challenge} align="left" />

        {/* 04 — APPROACH */}
        <NarrativeBlock
          eyebrow="02 — The approach"
          body={study.copy.approach}
          align="right"
        />

        {/* 05 — RESULT (big metric) */}
        <section className="min-h-[80vh] flex items-center justify-center px-6 md:px-12">
          <div className="max-w-[1100px] w-full text-center">
            <div className="text-brand-teal text-[10px] md:text-[11px] uppercase tracking-[0.4em] font-medium mb-8">
              03 — The result
            </div>
            <h2 className="text-text-primary font-black text-[clamp(2.25rem,7vw,7rem)] leading-[0.9] tracking-tight md:tracking-tightest">
              {study.metric}
            </h2>
          </div>
        </section>

        {/* 06 — PREV / NEXT + RETURN */}
        <section className="px-6 md:px-12 lg:px-20 py-[10vh]">
          <div className="max-w-[1200px] mx-auto w-full">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 md:gap-4">
              <div className="flex-1 text-left">
                {prev ? (
                  <Link
                    to={`/work/${prev.id}`}
                    className="group inline-flex flex-col gap-2 text-left"
                  >
                    <span className="text-text-secondary text-[9px] uppercase tracking-[0.3em]">
                      ← Previous
                    </span>
                    <span className="text-text-primary text-[18px] md:text-[22px] font-black tracking-tight group-hover:text-brand-teal transition-colors">
                      {prev.name}
                    </span>
                  </Link>
                ) : (
                  <div className="text-text-secondary/50 text-[9px] uppercase tracking-[0.3em]">
                    ← First in the ledger
                  </div>
                )}
              </div>

              <Link
                to="/#work"
                className="text-brand-teal text-[11px] md:text-[12px] uppercase tracking-[0.3em] font-medium border-b border-brand-teal/30 hover:border-brand-teal pb-1 transition-colors self-center"
              >
                All work
              </Link>

              <div className="flex-1 text-right">
                {next ? (
                  <Link
                    to={`/work/${next.id}`}
                    className="group inline-flex flex-col gap-2 text-right"
                  >
                    <span className="text-text-secondary text-[9px] uppercase tracking-[0.3em]">
                      Next →
                    </span>
                    <span className="text-text-primary text-[18px] md:text-[22px] font-black tracking-tight group-hover:text-brand-teal transition-colors">
                      {next.name}
                    </span>
                  </Link>
                ) : (
                  <div className="text-text-secondary/50 text-[9px] uppercase tracking-[0.3em]">
                    End of the ledger →
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

function NarrativeBlock({
  eyebrow,
  body,
  align,
}: {
  eyebrow: string
  body: string
  align: 'left' | 'right'
}) {
  const [ref, setRef] = useState<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!ref) return
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setVisible(true)),
      { threshold: 0.3 }
    )
    io.observe(ref)
    return () => io.disconnect()
  }, [ref])

  return (
    <section
      ref={setRef}
      className="min-h-[70vh] flex items-center justify-center px-6 md:px-12 lg:px-20"
    >
      <div
        className={
          'max-w-[980px] w-full ' +
          (align === 'right' ? 'ml-auto text-right' : 'mr-auto')
        }
        style={{
          opacity: visible ? 1 : 0,
          filter: visible ? 'blur(0)' : 'blur(10px)',
          transform: visible ? 'translateY(0)' : 'translateY(24px)',
          transition:
            'opacity 1200ms cubic-bezier(0.22, 1, 0.36, 1),' +
            ' filter 1000ms cubic-bezier(0.22, 1, 0.36, 1),' +
            ' transform 1200ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div className="text-brand-teal text-[9px] md:text-[10px] uppercase tracking-[0.4em] font-medium mb-6 md:mb-8">
          {eyebrow}
        </div>
        <p className="text-text-primary font-medium text-[clamp(1.125rem,2.4vw,2rem)] leading-[1.3] tracking-tight">
          {body}
        </p>
      </div>
    </section>
  )
}

/**
 * Slow cinematic drift camera — the M floats as a background witness.
 * No scroll-tied keyframes (the content is the story, not the camera).
 */
function WitnessCamera() {
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
    cam.position.x = -3 + Math.sin(t * 0.1) * 0.15 + mouseSmoothed.current.x * 0.4
    cam.position.y = 0.3 + Math.cos(t * 0.08) * 0.1 + mouseSmoothed.current.y * 0.25
    cam.position.z = 8.5 + Math.sin(t * 0.06) * 0.15
    cam.lookAt(-0.5 + mouseSmoothed.current.x * 0.1, 0, 0)
  })

  return null
}
