import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Nav, NavLogo } from './components/Nav'
import { AudioSystem } from './components/AudioSystem'
import { OpeningFade } from './components/OpeningFade'
import { Home } from './pages/Home'
import { Manifesto } from './pages/Manifesto'
import { Process } from './pages/Process'
import { CaseStudy } from './pages/CaseStudy'
import { NotFound } from './pages/NotFound'

/**
 * App is now the ROUTER shell.
 *
 * Shared layout that every route inherits:
 *   – Atmospheric video backdrop (Veo 3.1 seamless loop)
 *   – Persistent NavLogo (top-left) + Nav (top-right)
 *   – AudioSystem toggle (bottom-right)
 *   – OpeningFade black veil on first load (session-scoped)
 *
 * Per-route content (including its own <Canvas>, its own scroll logic,
 * and its own overlays) lives inside each Page component.
 *
 * Routes:
 *   /          →  Home (the 5-act scroll experience)
 *   /manifesto →  Manifesto (typographic essay)
 *   *          →  NotFound (custom 404 void page)
 *
 * Case-study pages /work/[id] and /process will join in the next batch.
 */
export default function App() {
  return (
    <BrowserRouter>
      <SharedLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/manifesto" element={<Manifesto />} />
          <Route path="/process" element={<Process />} />
          <Route path="/work/:id" element={<CaseStudy />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </SharedLayout>
    </BrowserRouter>
  )
}

function SharedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Atmospheric video layer — Veo-3.1-generated seamless loop of
          drifting teal light strata + particles. Sits BEHIND every page's
          WebGL canvas. Covers the whole viewport with object-fit:cover. */}
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
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 90% 70% at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.6) 85%, rgba(0,0,0,0.95) 100%)',
          }}
        />
      </div>

      {children}

      {/* Opening veil — first load only (session-scoped in OpeningFade) */}
      <OpeningFade />

      {/* Persistent chrome */}
      <NavLogo />
      <Nav />
      <AudioSystem />
    </>
  )
}
