import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import Lenis from 'lenis'
import { MindsMark } from './three/MindsMark'
import { ParticleField } from './three/ParticleField'
import { BackgroundFX } from './three/BackgroundFX'
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
import { useAppStore } from './lib/store'

export default function App() {
  const setScrollProgress = useAppStore((s) => s.setScrollProgress)
  const [dotMesh, setDotMesh] = useState<THREE.Mesh | null>(null)

  useEffect(() => {
    const lenis = new Lenis({
      // Cinematic scroll inertia — wheel flicks feel like a dolly move rather
      // than an immediate jump. Longer duration + easing means the scene
      // "continues" briefly after the user stops scrolling, which is the
      // premium-site feel Active Theory et al. share.
      duration: 1.6,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.4,
      lerp: 0.08,
    })

    lenis.on('scroll', (e: Lenis) => {
      setScrollProgress(e.progress)
    })

    let rafId = 0
    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    // Expose Lenis on window so Nav links + tests can use its scrollTo API.
    ;(window as unknown as { __lenis: Lenis }).__lenis = lenis

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [setScrollProgress])

  return (
    <>
      {/* Persistent 3D canvas */}
      <div className="fixed inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0.1, 7.5], fov: 32 }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
          }}
          dpr={[1, 2]}
        >
          <color attach="background" args={['#000000']} />
          <Suspense fallback={null}>
            <CameraRig />
            <BackgroundFX />
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

      {/* Persistent nav + audio toggle */}
      <NavLogo />
      <Nav />
      <AudioSystem />

      {/* Act overlays */}
      <Act1Hero />
      <Act2Outcomes />
      <Act3Capabilities />
      <Act4Work />
      <Act5Contact />
      <Footer />

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
