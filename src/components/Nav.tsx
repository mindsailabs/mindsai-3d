import { Link, useLocation, useNavigate } from 'react-router-dom'

/**
 * Route prefetch — trigger the dynamic import for a lazy-loaded route
 * as soon as the user shows intent (hover / focus on its nav link). By
 * the time they click, the chunk is in the browser cache and the page
 * transition has zero fetch latency.
 *
 * Each entry matches one of the lazy routes defined in App.tsx.
 */
const routePrefetch: Record<string, () => Promise<unknown>> = {
  '/manifesto': () => import('../pages/Manifesto'),
  '/process': () => import('../pages/Process'),
}
const prefetched = new Set<string>()
function prefetchRoute(to: string) {
  if (prefetched.has(to)) return
  const fn = routePrefetch[to]
  if (fn) {
    prefetched.add(to)
    fn().catch(() => {
      // Fetch failed (offline, CSP, etc.) — allow retry on next hover.
      prefetched.delete(to)
    })
  }
}

/**
 * Persistent nav capsule top-right + NavLogo top-left.
 *
 * Work / Contact remain scroll targets INSIDE the home route. If the user
 * is on another route (e.g. /manifesto), clicking Work/Contact first
 * navigates to / and then — one tick later — scrolls to the target.
 * Manifesto is a plain route link.
 *
 * NavLogo goes to / (Link) — if already on /, it ALSO scrolls to top
 * via Lenis.
 */
export function Nav() {
  const location = useLocation()
  const navigate = useNavigate()
  const onHome = location.pathname === '/'

  const scrollTo = (fraction: number) => {
    const lenis = (
      window as unknown as { __lenis?: { limit: number; scrollTo: (v: number) => void } }
    ).__lenis
    if (lenis) {
      lenis.scrollTo(lenis.limit * fraction)
    } else {
      const max = document.documentElement.scrollHeight - window.innerHeight
      window.scrollTo({ top: max * fraction, behavior: 'smooth' })
    }
  }

  const go = (fraction: number) => {
    if (onHome) {
      scrollTo(fraction)
    } else {
      navigate('/')
      // Let the home route mount + Lenis boot before scrolling.
      window.setTimeout(() => scrollTo(fraction), 300)
    }
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed top-4 right-2 md:top-6 md:right-8 z-30 pointer-events-auto"
    >
      <div className="flex items-center gap-0 md:gap-1 px-1.5 md:px-4 py-1.5 md:py-2 rounded-full border border-white/15 bg-black/30 backdrop-blur-md">
        <NavButton label="Work" onClick={() => go(0.68)} />
        <NavDivider />
        <NavButton label="Process" asLink to="/process" />
        <NavDivider />
        {/* Manifesto hides on very narrow viewports to keep the pill inside
            375px; still reachable via the home link + mobile users have
            Contact + Work + Process as the primary triad. */}
        <span className="hidden sm:contents">
          <NavButton label="Manifesto" asLink to="/manifesto" />
          <NavDivider />
        </span>
        <NavButton label="Contact" onClick={() => go(0.95)} />
      </div>
    </nav>
  )
}

function NavDivider() {
  return <div className="w-2 md:w-6 h-px bg-white/15" />
}

interface NavButtonProps {
  label: string
  onClick?: () => void
  asLink?: boolean
  to?: string
}

function NavButton({ label, onClick, asLink, to }: NavButtonProps) {
  // Tap target compliance: on mobile the pill buttons are visually ~22px
  // tall (font-size 9px + py-1). Apple HIG / WCAG 2.5.5 require a 44pt
  // minimum touch target. We extend the tap area via an invisible
  // pseudo-element ::after that overlaps neighbouring whitespace so the
  // pill stays visually compact while taps land reliably.
  const className =
    'relative text-[9px] md:text-[11px] uppercase tracking-[0.1em] md:tracking-[0.2em] font-medium text-text-primary/80 hover:text-brand-teal px-1 md:px-2 py-1 transition-colors duration-300 ' +
    "after:content-[''] after:absolute after:inset-x-0 after:-inset-y-3 md:after:inset-0"
  if (asLink && to) {
    return (
      <Link
        to={to}
        className={className}
        onMouseEnter={() => prefetchRoute(to)}
        onFocus={() => prefetchRoute(to)}
        onTouchStart={() => prefetchRoute(to)}
      >
        {label}
      </Link>
    )
  }
  return (
    <button onClick={onClick} className={className}>
      {label}
    </button>
  )
}

/**
 * NavLogo — MindsAI wordmark, top-left. Routes back to / and (when
 * already on /) scrolls to top.
 */
export function NavLogo() {
  const location = useLocation()
  const navigate = useNavigate()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (location.pathname !== '/') {
      navigate('/')
    } else {
      const lenis = (
        window as unknown as { __lenis?: { scrollTo: (v: number) => void } }
      ).__lenis
      if (lenis) lenis.scrollTo(0)
      else window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <a
      href="/"
      onClick={handleClick}
      aria-label="MindsAI Media — return home"
      className="fixed top-5 left-5 md:top-6 md:left-8 z-30 pointer-events-auto text-text-primary font-black text-[13px] tracking-tight relative after:content-[''] after:absolute after:-inset-3 md:after:inset-0"
    >
      Minds<span className="text-brand-teal">AI</span>
    </a>
  )
}
