import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import Lenis from 'lenis'
import { MindsMark } from '../three/MindsMark'
import { ParticleField } from '../three/ParticleField'
import { CausticsFloor } from '../three/CausticsFloor'
import { CameraRig } from '../three/CameraRig'
import { CapabilityNodes } from '../three/CapabilityNodes'
import { DissolveBurst } from '../three/DissolveBurst'
import { OutcomePanels } from '../three/OutcomePanels'
import { WorkOrbit } from '../three/WorkOrbit'
import { MonumentFloor } from '../three/MonumentFloor'
import { PostProcess } from '../three/PostProcess'
import { Act1Hero } from '../scenes/Act1Hero'
import { Act2Outcomes } from '../scenes/Act2Outcomes'
import { Act3Capabilities } from '../scenes/Act3Capabilities'
import { Act4Work } from '../scenes/Act4Work'
import { Act5Contact } from '../scenes/Act5Contact'
import { Footer } from '../components/Footer'
import { ClosingTagline } from '../components/ClosingTagline'
import { TransitionFlare } from '../components/TransitionFlare'
import { useAppStore } from '../lib/store'

/**
 * Home — the 5-act scroll experience. Everything that used to live
 * directly in App.tsx now lives here. App.tsx is the router + shared
 * layout (atmosphere, nav, audio, opening fade) that wraps all routes.
 */
export function Home() {
  const setScrollProgress = useAppStore((s) => s.setScrollProgress)
  const appReady = useAppStore((s) => s.appReady)
  const [dotMesh, setDotMesh] = useState<THREE.Mesh | null>(null)

  // Browsers restore scroll on reload by default. For a scroll-choreographed
  // site we MUST start at 0 on every load — otherwise the first paint can
  // land mid-Act-3 with no context.
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    // Tighter Lenis so scroll feels like direct manipulation, not like
    // a fixed-speed animation playing over scroll input. Lower duration
    // + higher lerp + full wheel response = camera tracks user's wheel
    // velocity. Flicks scroll fast → acts rush past. Scroll slow → each
    // act has time to read.
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

    lenis.on('scroll', (e: Lenis) => {
      setScrollProgress(e.progress)
    })

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
    const lenis = (window as unknown as { __lenis?: { start: () => void } }).__lenis
    if (lenis && typeof lenis.start === 'function') lenis.start()
  }, [appReady])

  return (
    <>
      {/* 3D canvas — transparent, composes over the shared atmosphere video
          + the home page's own WebGL content (M, outcome panels, capability
          nodes, work carousel). Other routes render their own simpler canvas
          or none at all. */}
      <div className="fixed inset-0 z-[1]">
        <Canvas
          camera={{ position: [0, 0.1, 7.5], fov: 32 }}
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
            <CameraRig />
            <ParticleField />
            <CausticsFloor />
            <MonumentFloor />
            <MindsMark scale={0.82} onDotMount={setDotMesh} />
            <OutcomePanels />
            <CapabilityNodes />
            <WorkOrbit />
            <DissolveBurst />
            <PostProcess sunMesh={dotMesh} />
          </Suspense>
        </Canvas>
      </div>

      {/* Act overlays + footer + closing tagline — fade in after appReady */}
      <div
        style={{
          opacity: appReady ? 1 : 0,
          transition: 'opacity 600ms cubic-bezier(0.22, 1, 0.36, 1) 200ms',
        }}
      >
        <Act1Hero />
        <Act2Outcomes />
        <Act3Capabilities />
        <Act4Work />
        <Act5Contact />
        <ClosingTagline />
        <Footer />
        {/* VFX bridge — teal radial burst at each inter-act push frame.
            Mounted last so it overlays acts but sits below the nav. */}
        <TransitionFlare />
      </div>

      {/* Scroll container — 5 sections of viewport-relative height. */}
      <div className="relative z-10 pointer-events-none">
        <section className="h-screen" aria-label="Hero" />
        <section className="h-[150vh]" aria-label="Outcomes" />
        <section className="h-[150vh]" aria-label="Capabilities" />
        <section className="h-[280vh]" aria-label="Work" />
        <section className="h-[110vh]" aria-label="Contact" />
      </div>
    </>
  )
}
