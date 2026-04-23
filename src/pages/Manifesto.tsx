import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Lenis from 'lenis'
import { Link } from 'react-router-dom'
import { MindsMark } from '../three/MindsMark'
import { ParticleField } from '../three/ParticleField'
import { PostProcess } from '../three/PostProcess'
import { useAppStore } from '../lib/store'

/**
 * /manifesto — the philosophical thesis page.
 *
 * A typographic essay that reads like a short film: each stanza occupies
 * a viewport, fades up as you scroll, holds a beat, fades out. The M
 * floats in the background as a witness — smaller, off-centre, slow
 * idle breath. Atmospheric video continues from the shared App layer.
 *
 * No outcome panels, no capability nodes, no work carousel — only the
 * M, particles, and words. Intentionally sparse.
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
  {
    lines: ['Most advertising', 'is noise.'],
  },
  {
    lines: ['We are not', 'most.'],
    emphasis: 'most',
  },
  {
    eyebrow: 'One',
    lines: ['We listen first.'],
  },
  {
    eyebrow: 'Two',
    lines: ['We model.'],
  },
  {
    eyebrow: 'Three',
    lines: ['We build.'],
  },
  {
    eyebrow: 'Four',
    lines: ['We measure.'],
    emphasis: 'measure',
  },
  {
    lines: ['And we do all of it', 'quietly.'],
  },
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
      {/* Minimal 3D canvas — M + particles. Camera just breathes (no
          scroll-tied keyframes on this page, since the text IS the
          experience). */}
      <div className="fixed inset-0 z-[1]">
        <Canvas
          camera={{ position: [2.5, 0.2, 8], fov: 36 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
          }}
          dpr={[1, 3]}
        >
          <fog attach="fog" args={['#000000', 9, 26]} />
          <Suspense fallback={null}>
            <ManifestoCamera />
            <ParticleField />
            <MindsMark scale={0.55} onDotMount={setDotMesh} />
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
        {/* Opening section */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 md:px-12">
          <div className="text-brand-teal text-[10px] md:text-[11px] uppercase tracking-[0.4em] font-medium mb-6">
            Manifesto
          </div>
          <h1 className="text-text-primary font-black text-[clamp(3rem,9vw,10rem)] leading-[0.85] tracking-tight md:tracking-tightest text-center">
            What we
            <br />
            believe.
          </h1>
          <div className="mt-12 text-text-secondary/70 text-[10px] uppercase tracking-[0.3em] animate-pulse">
            Scroll
          </div>
        </section>

        {STANZAS.map((stanza, i) => (
          <StanzaSection key={i} stanza={stanza} index={i} />
        ))}

        {/* Closing return link */}
        <section className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
          <Link
            to="/"
            className="group inline-flex items-center gap-2 text-brand-teal text-[11px] md:text-[12px] uppercase tracking-[0.3em] font-medium border-b border-brand-teal/30 hover:border-brand-teal pb-1 transition-colors"
          >
            <span>←</span>
            <span>Return to the work</span>
          </Link>
          <div className="mt-16 text-text-secondary/50 text-[10px] uppercase tracking-[0.3em] tabular-nums">
            MindsAI Media · London
          </div>
        </section>
      </div>
    </>
  )
}

/**
 * StanzaSection — one stanza per viewport. Uses IntersectionObserver to
 * fade-in-from-blur when it enters view.
 */
function StanzaSection({
  stanza,
  index,
}: {
  stanza: Stanza
  index: number
}) {
  const [ref, setRef] = useState<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!ref) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setVisible(true)
        })
      },
      { threshold: 0.4 }
    )
    io.observe(ref)
    return () => io.disconnect()
  }, [ref])

  return (
    <section
      ref={setRef}
      className="min-h-screen flex items-center justify-center px-6 md:px-12"
    >
      <div
        className="max-w-[1200px] w-full"
        style={{
          opacity: visible ? 1 : 0,
          filter: visible ? 'blur(0)' : 'blur(16px)',
          transform: visible ? 'translateY(0)' : 'translateY(40px)',
          transition:
            'opacity 1400ms cubic-bezier(0.22, 1, 0.36, 1), filter 1200ms cubic-bezier(0.22, 1, 0.36, 1), transform 1400ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {stanza.eyebrow && (
          <div className="text-brand-teal text-[9px] md:text-[10px] uppercase tracking-[0.45em] font-medium mb-8 tabular-nums">
            {index % 2 === 0 ? (
              <span>{stanza.eyebrow}</span>
            ) : (
              <span className="inline-flex items-center gap-3">
                <span className="h-px w-8 bg-brand-teal/50" />
                {stanza.eyebrow}
              </span>
            )}
          </div>
        )}
        <div
          className="text-text-primary font-black text-[clamp(2.25rem,7vw,7rem)] leading-[0.88] tracking-tight md:tracking-tightest"
          style={{ textAlign: index % 2 === 0 ? 'left' : 'right' }}
        >
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
 * Slow breathing + cursor parallax for the camera. No scroll keyframes
 * (the manifesto's rhythm is the text, not the camera).
 */
function ManifestoCamera() {
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
    cam.position.x = 2.5 + Math.sin(t * 0.12) * 0.08 + mouseSmoothed.current.x * 0.4
    cam.position.y = 0.2 + Math.cos(t * 0.1) * 0.05 + mouseSmoothed.current.y * 0.25
    cam.position.z = 8 + Math.sin(t * 0.07) * 0.05
    cam.lookAt(
      0.5 + mouseSmoothed.current.x * 0.15,
      0.1 + mouseSmoothed.current.y * 0.08,
      0
    )
  })

  return null
}
