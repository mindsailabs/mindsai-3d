/**
 * Thin persistent nav capsule — top-right, matches the agency-site convention
 * seen in the reel. Two targets: WORK (scrolls to Act 4) and CONTACT
 * (scrolls to Act 5). Uses Lenis' scrollTo for smooth behaviour.
 */
export function Nav() {
  const scrollTo = (fraction: number) => {
    const lenis = (window as unknown as { __lenis?: { limit: number; scrollTo: (v: number) => void } }).__lenis
    if (lenis) {
      lenis.scrollTo(lenis.limit * fraction)
    } else {
      const max = document.documentElement.scrollHeight - window.innerHeight
      window.scrollTo({ top: max * fraction, behavior: 'smooth' })
    }
  }

  return (
    <nav className="fixed top-5 right-5 md:top-6 md:right-8 z-30 pointer-events-auto">
      <div className="flex items-center gap-1 px-4 py-2 rounded-full border border-white/15 bg-black/30 backdrop-blur-md">
        <NavLink label="Work" onClick={() => scrollTo(0.68)} />
        <div className="w-6 h-px bg-white/15" />
        <NavLink label="Contact" onClick={() => scrollTo(0.95)} />
      </div>
    </nav>
  )
}

interface NavLinkProps {
  label: string
  onClick: () => void
}

function NavLink({ label, onClick }: NavLinkProps) {
  return (
    <button
      onClick={onClick}
      className="text-[10px] md:text-[11px] uppercase tracking-[0.2em] font-medium text-text-primary/80 hover:text-brand-teal px-2 py-1 transition-colors duration-300"
    >
      {label}
    </button>
  )
}

/**
 * Tiny Mindsai wordmark that lives at top-LEFT of the viewport across all acts —
 * a persistent brand anchor independent of the big 3D mark in the scene.
 */
export function NavLogo() {
  const scrollTo = () => {
    const lenis = (window as unknown as { __lenis?: { scrollTo: (v: number) => void } }).__lenis
    if (lenis) lenis.scrollTo(0)
    else window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <button
      onClick={scrollTo}
      className="fixed top-5 left-5 md:top-6 md:left-8 z-30 pointer-events-auto text-text-primary font-black text-[13px] tracking-tight"
    >
      Minds<span className="text-brand-teal">AI</span>
    </button>
  )
}
