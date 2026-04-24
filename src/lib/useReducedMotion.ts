import { useEffect, useState } from 'react'

/**
 * Respects the user's `prefers-reduced-motion` OS preference.
 *
 * Users with vestibular disorders, migraines, or photosensitive
 * conditions genuinely get sick from heavy scroll-driven 3D motion.
 * When this returns true, components should:
 *   – Disable scroll-driven camera moves (park at settled frames)
 *   – Disable idle drift + sway animations
 *   – Disable the TransitionFlare (no bright bursts)
 *   – Disable particle motion (or reduce to a trickle)
 *   – Keep the CONTENT readable (titles, text, forms still work)
 *
 * The site is still beautiful in reduced-motion mode — just more like
 * a still photograph of the 3D scene than a motion piece.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    if (mql.addEventListener) {
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    }
    // Safari < 14 fallback
    mql.addListener(onChange)
    return () => mql.removeListener(onChange)
  }, [])

  return reduced
}
