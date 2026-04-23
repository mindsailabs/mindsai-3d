import { useEffect, useState } from 'react'

export interface Viewport {
  width: number
  height: number
  /** true if width < 768px (mobile / narrow tablet portrait). */
  isMobile: boolean
  /** true if width < 1024px (tablet landscape / narrow laptop). */
  isTablet: boolean
}

/**
 * Shared viewport size hook. Components (2D overlays AND 3D shader uniforms)
 * branch on `isMobile` to fall back to compact layouts, smaller font sizes,
 * and pulled-back cameras. One single source of truth — no per-component
 * window.matchMedia scattered everywhere.
 */
export function useViewport(): Viewport {
  const [state, setState] = useState<Viewport>(() => {
    if (typeof window === 'undefined') {
      return { width: 1280, height: 800, isMobile: false, isTablet: false }
    }
    const w = window.innerWidth
    const h = window.innerHeight
    return { width: w, height: h, isMobile: w < 768, isTablet: w < 1024 }
  })

  useEffect(() => {
    let raf = 0
    function update() {
      const w = window.innerWidth
      const h = window.innerHeight
      setState({ width: w, height: h, isMobile: w < 768, isTablet: w < 1024 })
    }
    function onResize() {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(raf)
    }
  }, [])

  return state
}
