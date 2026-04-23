import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Link } from 'react-router-dom'
import { MindsMark } from '../three/MindsMark'
import { ParticleField } from '../three/ParticleField'
import { PostProcess } from '../three/PostProcess'

/**
 * /404 — the void page.
 *
 * User landed somewhere that doesn't exist. Rather than the default
 * browser / hosting-platform 404, give them a moment that's part of
 * the MindsAI universe: the M still here, but slightly displaced,
 * drifting. The copy acknowledges the wrong turn and points home.
 *
 * No scroll — single viewport. No Lenis, no progress, no outcome
 * panels. Just the M, the particles, the void, and one short line.
 */
export function NotFound() {
  const [dotMesh, setDotMesh] = useState<THREE.Mesh | null>(null)

  // Scroll must stay at 0 — no Lenis on this page, but browsers might
  // have restored a position from the previous page. Hard-zero it.
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
          camera={{ position: [0, 0, 8], fov: 36 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
          }}
          dpr={[1, 3]}
        >
          <fog attach="fog" args={['#000000', 8, 24]} />
          <Suspense fallback={null}>
            <LostCamera />
            <ParticleField />
            <MindsMark scale={0.65} onDotMount={setDotMesh} />
            <PostProcess sunMesh={dotMesh} />
          </Suspense>
        </Canvas>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="text-brand-teal text-[10px] md:text-[11px] uppercase tracking-[0.45em] font-medium mb-6">
          404
        </div>
        <h1 className="text-text-primary font-black text-[clamp(2.5rem,7vw,6rem)] leading-[0.9] tracking-tight md:tracking-tightest max-w-[920px]">
          Path lost
          <br />
          in the void.
        </h1>
        <p className="mt-6 text-text-secondary text-[13px] md:text-[14px] leading-relaxed max-w-[440px]">
          Breathe. Every lost signal was once on the way somewhere.
        </p>
        <Link
          to="/"
          className="mt-12 group inline-flex items-center gap-2 text-text-primary text-[11px] md:text-[12px] uppercase tracking-[0.3em] font-medium border border-brand-teal/40 hover:border-brand-teal px-6 py-3 rounded-[3px] transition-colors"
        >
          <span>←</span>
          <span>Return to ground</span>
        </Link>
      </div>
    </>
  )
}

/**
 * Camera drifts in a slow figure-eight so the M never sits dead still.
 * No scroll, no cursor parallax — just a slow meditative wander.
 */
function LostCamera() {
  const cursorRef = useRef({ x: 0, y: 0 })
  const cursorSmoothed = useRef({ x: 0, y: 0 })

  useEffect(() => {
    function onMove(e: MouseEvent) {
      cursorRef.current.x = (e.clientX / window.innerWidth) * 2 - 1
      cursorRef.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    cursorSmoothed.current.x +=
      (cursorRef.current.x - cursorSmoothed.current.x) * 0.04
    cursorSmoothed.current.y +=
      (cursorRef.current.y - cursorSmoothed.current.y) * 0.04
    const cam = state.camera
    // Slow figure-eight drift + cursor parallax.
    cam.position.x = Math.sin(t * 0.15) * 0.8 + cursorSmoothed.current.x * 0.5
    cam.position.y = Math.cos(t * 0.11) * 0.4 + cursorSmoothed.current.y * 0.3
    cam.position.z = 8 + Math.sin(t * 0.08) * 0.2
    cam.lookAt(0, 0, 0)
  })

  return null
}
