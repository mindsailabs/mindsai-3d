import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import Lenis from 'lenis'
import { MindsMark } from './three/MindsMark'
import { ParticleField } from './three/ParticleField'
import { CausticsFloor } from './three/CausticsFloor'
import { CameraRig } from './three/CameraRig'
import { CapabilityNodes } from './three/CapabilityNodes'
import { DissolveBurst } from './three/DissolveBurst'
import { OutcomePanels } from './three/OutcomePanels'
import { WorkOrbit } from './three/WorkOrbit'
import { MonumentFloor } from './three/MonumentFloor'
import { PostProcess } from './three/PostProcess'
import { Act1Hero } from './scenes/Act1Hero'
import { Act2Outcomes } from './scenes/Act2Outcomes'
import { Act3Capabilities } from './scenes/Act3Capabilities'
import { Act4Work } from './scenes/Act4Work'
import { Act5Contact } from './scenes/Act5Contact'
import { Nav, NavLogo } from './components/Nav'
import { Footer } from './components/Footer'
import { AudioSystem } from './components/AudioSystem'
import { OpeningFade } from './components/OpeningFade'
import { useAppStore } from './lib/store'

export default function App() {
  const setScrollProgress = useAppStore((s) => s.setScrollProgress)
  const appReady = useAppStore((s) => s.appReady)
  const [dotMesh, setDotMesh] = useState<THREE.Mesh | null>(null)

  // Browsers restore scroll on reload by default. For a scroll-choreographed
  // site we MUST start at 0 on every load — otherwise the first paint can
  // land mid-Act-3 with no context. Disable browser's scrollRestoration and
  // hard-zero the scroll position before Lenis mounts.
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

    // Lenis spawns running. We pause it until the preloader cinematic
    // completes (`appReady` flips true) so scroll cannot leak past the
    // opening shot. A simple flag keeps the RAF loop running (three.js
    // still renders, the canvas still animates) while the SCROLL value
    // stays pinned at 0.
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

  // When the preloader finishes, start Lenis.
  useEffect(() => {
    if (!appReady) return
    const lenis = (window as unknown as { __lenis?: { start: () => void } }).__lenis
    if (lenis && typeof lenis.start === 'function') lenis.start()
  }, [appReady])

  return (
    <>
      {/* Atmospheric video layer — Veo-3.1-generated seamless loop of drifting
          teal light strata + particles. Sits BEHIND the WebGL canvas. Muted,
          autoplays, loops, playsInline for mobile Safari. Covers the whole
          viewport with object-fit:cover so it never letterboxes.
          Darkened with a dark overlay so it reads as atmospheric BED, not
          foreground content. */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-black overflow-hidden">
        <video
          src="/assets/atmosphere_loop.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.55 }}
          aria-hidden="true"
        />
        {/* Dark edge vignette — keeps the centre strata visible (where the
            atmosphere has most content) while fading the extreme edges to
            near-black so vignette-style framing reads cinematic. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 90% 70% at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.6) 85%, rgba(0,0,0,0.95) 100%)',
          }}
        />
      </div>

      {/* Persistent 3D canvas — TRANSPARENT so the video layer shows through.
          alpha:true + no <color attach="background"> means the renderer
          doesn't paint a black clear every frame. */}
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
          {/* Linear fog: near = 9 world units (past the M), far = 26. Objects
              closer than 9u render fully (M stays crystal clear in the hero
              framing). Objects past 26u fade to pure black. Distant
              particles, outcome panels in their back positions, and the
              far side of the work carousel pick up depth cueing — the
              void gains volume. */}
          <fog attach="fog" args={['#000000', 9, 26]} />
          <Suspense fallback={null}>
            <CameraRig />
            {/* BackgroundFX removed — the Veo atmosphere video behind the
                canvas replaces its role. Letting the canvas stay transparent
                in empty areas means the cinematic backdrop breathes through. */}
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

      {/* Opening veil — black curtain over the scene until the first
          render settles, then lifts in 900ms. No decorated preloader. */}
      <OpeningFade />

      {/* Everything else fades in 400ms AFTER the preloader completes so the
          reveal is a clean beat, not a messy simultaneous entrance. */}
      <div
        style={{
          opacity: appReady ? 1 : 0,
          transition: 'opacity 600ms cubic-bezier(0.22, 1, 0.36, 1) 200ms',
        }}
      >
        <NavLogo />
        <Nav />
        <AudioSystem />
        <Act1Hero />
        <Act2Outcomes />
        <Act3Capabilities />
        <Act4Work />
        <Act5Contact />
        <Footer />
      </div>

      {/* Scroll container — provides 7+ viewports of scroll distance.
          Work section gets extra height so each of 6 case-study videos has
          ~45vh of hold time, not the 25vh/slot users complained was too fast. */}
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
