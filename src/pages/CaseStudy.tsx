import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Lenis from 'lenis'
import { Link, useParams, Navigate } from 'react-router-dom'
import { caseStudies } from '../lib/copy'
import { MindsMark } from '../three/MindsMark'
import { ParticleField } from '../three/ParticleField'
import { PostProcess } from '../three/PostProcess'
import { OrbitalStage, type Orbit } from '../three/OrbitalStage'
import { useAppStore } from '../lib/store'
import { useViewport } from '../lib/useViewport'

/**
 * /work/:id — dedicated case-study page.
 *
 * Composition (matches the home-page discipline):
 *   – M at ORIGIN, scale 0.82 (same as home)
 *   – Camera [0, 0.1, 7.5], fov 32 (same as home)
 *   – Three orbital rings around the M — ambient teal dust, NOT narrative
 *     content. The case study's story is told through the typography +
 *     the portal video; the M is the brand presence behind it all.
 *
 * Text discipline — hero anchored bottom-left, portal video in its own
 * full-bleed section (the M disappears behind it), narrative blocks in
 * narrow side-columns alternating L/R.
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

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    window.scrollTo(0, 0)
  }, [id])

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
  }, [setScrollProgress, id])

  useEffect(() => {
    if (!appReady) return
    const lenis = (window as unknown as { __lenis?: { start: () => void } })
      .__lenis
    if (lenis && typeof lenis.start === 'function') lenis.start()
  }, [appReady])

  // Ambient orbital system — three rings, subtle, no scroll-emphasis.
  // The M is the "brand" here; the story is carried by the DOM layer.
  const orbits: Orbit[] = useMemo(
    () => [
      {
        id: 'inner',
        radius: 2.0,
        speed: 0.11,
        tiltAxis: 'x',
        tilt: 0.35,
        ringOpacity: 0.1,
        satellites: Array.from({ length: 8 }, (_, i) => ({
          id: `inner-${i}`,
          size: 0.045,
        })),
      },
      {
        id: 'mid',
        radius: 3.1,
        speed: -0.06,
        tiltAxis: 'x',
        tilt: -0.15,
        ringOpacity: 0.12,
        satellites: Array.from({ length: 3 }, (_, i) => ({
          id: `mid-${i}`,
          size: 0.1,
        })),
      },
      {
        id: 'outer',
        radius: 4.5,
        speed: 0.035,
        tiltAxis: 'z',
        tilt: 0.4,
        ringOpacity: 0.05,
        satellites: Array.from({ length: 16 }, (_, i) => ({
          id: `outer-${i}`,
          size: 0.035,
        })),
      },
    ],
    []
  )

  if (!study) {
    return <Navigate to="/not-found-case" replace />
  }

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
            <CaseStudyCamera />
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
        {/* 01 — HERO. Title anchored bottom-left. M visible behind in the
            upper/right portion. */}
        <section className="min-h-screen flex flex-col justify-end px-6 md:px-12 lg:px-20 pb-[12vh] pt-[18vh]">
          <div className="max-w-[780px]">
            <div className="flex items-baseline gap-4 mb-6">
              <span className="text-brand-teal text-[10px] md:text-[11px] uppercase tracking-[0.3em] font-medium tabular-nums">
                {String(caseIndex + 1).padStart(2, '0')} /{' '}
                {String(caseStudies.length).padStart(2, '0')}
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

        {/* 02 — PORTAL. Video takes the full centre; the M disappears
            behind it for the length of this section and returns when
            you scroll past. */}
        <section className="relative min-h-[95vh] flex items-center justify-center px-4 md:px-10">
          <div className="relative w-full max-w-[1400px] aspect-[16/9]">
            <div
              className="absolute -inset-16 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(115,197,204,0.18) 0%, rgba(115,197,204,0.05) 40%, rgba(0,0,0,0) 70%)',
                filter: 'blur(30px)',
              }}
            />
            <div
              className="relative w-full h-full rounded-[4px] overflow-hidden border border-white/10"
              style={{
                boxShadow:
                  '0 80px 160px -40px rgba(0, 0, 0, 0.95),' +
                  '0 0 0 1px rgba(115, 197, 204, 0.12) inset,' +
                  '0 0 140px -20px rgba(115, 197, 204, 0.22)',
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
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(115,197,204,0.06) 92%, rgba(0,0,0,0.25) 100%)',
                }}
              />
            </div>
            <div className="pointer-events-none absolute inset-0">
              {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
                <div
                  key={corner}
                  className="absolute w-6 h-6 md:w-8 md:h-8"
                  style={{
                    top: corner.startsWith('t') ? -6 : undefined,
                    bottom: corner.startsWith('b') ? -6 : undefined,
                    left: corner.endsWith('l') ? -6 : undefined,
                    right: corner.endsWith('r') ? -6 : undefined,
                    borderTop: corner.startsWith('t')
                      ? '1px solid rgba(115,197,204,0.6)'
                      : 'none',
                    borderBottom: corner.startsWith('b')
                      ? '1px solid rgba(115,197,204,0.6)'
                      : 'none',
                    borderLeft: corner.endsWith('l')
                      ? '1px solid rgba(115,197,204,0.6)'
                      : 'none',
                    borderRight: corner.endsWith('r')
                      ? '1px solid rgba(115,197,204,0.6)'
                      : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        </section>

        {/* 03 — BRIEF (left column) */}
        <NarrativeBlock
          eyebrow="01 — The brief"
          body={study.copy.challenge}
          align="left"
        />

        {/* 04 — APPROACH (right column) */}
        <NarrativeBlock
          eyebrow="02 — The approach"
          body={study.copy.approach}
          align="right"
        />

        {/* 05 — RESULT. Bottom-left anchored so M stays upper-right. */}
        <section className="min-h-[80vh] flex items-end px-6 md:px-12 lg:px-20 pb-[12vh]">
          <div className="max-w-[780px]">
            <div className="text-brand-teal text-[10px] md:text-[11px] uppercase tracking-[0.4em] font-medium mb-8">
              03 — The result
            </div>
            <h2 className="text-text-primary font-black text-[clamp(2.25rem,7vw,6.5rem)] leading-[0.9] tracking-tight md:tracking-tightest">
              {study.metric}
            </h2>
          </div>
        </section>

        {/* 06 — PREV / NEXT */}
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

/**
 * Narrative block — narrow side-column (max ~40vw) alternating L/R.
 * Centre of the viewport stays open for the M + orbital rings.
 */
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
      (entries) =>
        entries.forEach((e) => e.isIntersecting && setVisible(true)),
      { threshold: 0.3 }
    )
    io.observe(ref)
    return () => io.disconnect()
  }, [ref])

  return (
    <section
      ref={setRef}
      className="min-h-[70vh] flex items-center px-6 md:px-12 lg:px-20"
    >
      <div
        className={
          'max-w-[440px] lg:max-w-[520px] w-full ' +
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
        <p className="text-text-primary font-medium text-[clamp(1.125rem,2.2vw,1.75rem)] leading-[1.3] tracking-tight">
          {body}
        </p>
      </div>
    </section>
  )
}

/**
 * Case-study camera — slow orbit around the M so the orbital rings read
 * as real rings in space. No scroll-dolly; the narrative is the DOM.
 */
function CaseStudyCamera() {
  const mouse = useRef({ x: 0, y: 0 })
  const mouseSmoothed = useRef({ x: 0, y: 0 })
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

    const yaw = Math.sin(t * 0.06) * 0.12 + mouseSmoothed.current.x * 0.15
    const orbitRadius = isMobile ? 10.5 : 7.5
    const cam = state.camera
    cam.position.x = Math.sin(yaw) * orbitRadius
    cam.position.y =
      0.2 + Math.cos(t * 0.05) * 0.08 + mouseSmoothed.current.y * 0.25
    cam.position.z = Math.cos(yaw) * orbitRadius
    cam.lookAt(0, mouseSmoothed.current.y * 0.04, 0)
    if ((cam as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const target = isMobile ? 40 : 32
      const pc = cam as THREE.PerspectiveCamera
      pc.fov += (target - pc.fov) * 0.18
      pc.updateProjectionMatrix()
    }
  })

  return null
}
