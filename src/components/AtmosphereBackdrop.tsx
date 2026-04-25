import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../lib/useReducedMotion'

/**
 * AtmosphereBackdrop — the Veo 3.1 ambient teal loop that sits behind
 * every page's WebGL canvas.
 *
 * v2 — scroll-velocity coupled. The video element gains a CSS filter
 * that intensifies with Lenis scroll velocity:
 *   – blur up to 6px during fast scroll (motion-blur for the entire
 *     backdrop, ties together with the foreground media-plane shaders
 *     that ripple at the same velocity)
 *   – saturate boost up to 1.4× (colour pops as the scene speeds past)
 *   – brightness slight bump
 * On idle, the filter is exactly identity (blur 0, saturate 1) so the
 * atmosphere reads crisp.
 *
 * Reduced motion: filters disabled.
 *
 * The radial-gradient corner-darkening overlay stays unchanged on top —
 * keeps the cinematic frame regardless of velocity.
 */
export function AtmosphereBackdrop() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const reducedMotion = useReducedMotion()
  const smoothedVelocity = useRef(0)

  useEffect(() => {
    if (reducedMotion) return
    let raf = 0
    function tick() {
      const lenis = (
        window as unknown as { __lenis?: { velocity?: number } }
      ).__lenis
      const rawVel = lenis?.velocity ?? 0
      const targetVel = Math.min(1, Math.abs(rawVel) / 30)
      // Smooth so the filter doesn't strobe on each frame.
      smoothedVelocity.current +=
        (targetVel - smoothedVelocity.current) * 0.15

      const v = videoRef.current
      if (v) {
        const blur = smoothedVelocity.current * 5
        const saturate = 1 + smoothedVelocity.current * 0.35
        const brightness = 1 + smoothedVelocity.current * 0.08
        v.style.filter =
          `blur(${blur.toFixed(2)}px) saturate(${saturate.toFixed(2)}) brightness(${brightness.toFixed(2)})`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reducedMotion])

  return (
    <div className="fixed inset-0 z-0 pointer-events-none bg-black overflow-hidden">
      <video
        ref={videoRef}
        src="/assets/atmosphere_loop.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: 0.55,
          // willChange: 'filter' hints the browser to GPU-composite the
          // filter chain rather than re-rasterising every frame.
          willChange: 'filter',
        }}
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
  )
}
