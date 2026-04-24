import { useAppStore } from '../lib/store'
import { useReducedMotion } from '../lib/useReducedMotion'

/**
 * TransitionFlare — the VFX bridge between acts.
 *
 * Cinematic films never CUT directly from one scene to another at full
 * intensity. They use light: a lens flare, a dissolve, a white flash.
 * The eye briefly registers "something intense happened" and the next
 * scene appears behind it.
 *
 * On this site each inter-act PUSH (camera diving toward the M, panels,
 * or planets before the next act resolves) is the moment of maximum
 * intensity. This component overlays a radial teal → white burst that
 * PEAKS at those exact scroll positions and dissipates before and
 * after. The net effect is: the scene "blooms" around the M at the
 * push frame and the next act resolves out of the light.
 *
 * z-index 15 sits above the canvas (z=1) but below the act headline
 * overlays (z=20), so headlines still read clearly through the flare.
 */

// Keep these in sync with the PUSH keyframes in CameraRig.tsx.
const PUSH_SCROLLS = [
  0.12, // Act 1 → Act 2
  0.325, // Act 2 → Act 3
  0.515, // Act 3 → Act 4
  0.87, // Act 4 → Act 5
]

// How wide (in scroll units) the flare extends around each peak.
// Tightened from 0.045 → 0.028 so the flare is punchier and doesn't
// bleed measurably into the act-settled windows (user noticed residual
// glow over the solar system).
const FLARE_WIDTH = 0.028

export function TransitionFlare() {
  const sp = useAppStore((s) => s.scrollProgress)
  const reducedMotion = useReducedMotion()

  // Reduced motion: the bright teal bursts + lens streaks can trigger
  // photosensitive migraines + vestibular symptoms. Suppress the
  // entire flare system — transitions between acts happen silently.
  if (reducedMotion) return null

  // Gaussian peak at each PUSH scroll. Take the max over all peaks —
  // no two are close enough to overlap at meaningful intensity.
  let intensity = 0
  for (const ps of PUSH_SCROLLS) {
    const d = sp - ps
    const bell = Math.exp(-(d * d) / (FLARE_WIDTH * FLARE_WIDTH * 0.5))
    intensity = Math.max(intensity, bell)
  }

  // Tight cap so the flare NEVER fully white-outs (you'd lose the M
  // entirely). 0.88 lets ~12% of the scene read through at peak.
  const opacity = Math.min(0.88, intensity)

  // The inner hot-spot (white) saturates faster than the outer teal
  // glow, so at peak the centre is white-hot and the edges are
  // teal-luminous. Mimics a real lens flare.
  const hotspot = Math.pow(intensity, 1.8)

  return (
    <>
      {/* Outer teal radial glow — big, soft. */}
      <div
        className="fixed inset-0 z-[15] pointer-events-none"
        style={{
          opacity,
          background: `radial-gradient(circle at 50% 45%, rgba(115, 197, 204, 0.55) 0%, rgba(115, 197, 204, 0.22) 30%, rgba(115, 197, 204, 0.06) 55%, rgba(0, 0, 0, 0) 80%)`,
          mixBlendMode: 'screen',
          willChange: 'opacity',
        }}
        aria-hidden
      />
      {/* Inner white-hot core — small, bright, only at peak. */}
      <div
        className="fixed inset-0 z-[16] pointer-events-none"
        style={{
          opacity: hotspot * 0.9,
          background: `radial-gradient(circle at 50% 45%, rgba(255, 255, 255, 0.82) 0%, rgba(228, 244, 246, 0.5) 8%, rgba(115, 197, 204, 0.15) 22%, rgba(0, 0, 0, 0) 45%)`,
          mixBlendMode: 'screen',
          willChange: 'opacity',
        }}
        aria-hidden
      />
      {/* Streak bars — horizontal lens-flare bands. Only visible at
          peak intensity; they add cinematic anamorphic feel. */}
      <div
        className="fixed inset-0 z-[16] pointer-events-none"
        style={{
          opacity: Math.pow(intensity, 2.2) * 0.75,
          background: `linear-gradient(90deg, rgba(0,0,0,0) 10%, rgba(115,197,204,0.35) 50%, rgba(0,0,0,0) 90%)`,
          maskImage: `linear-gradient(180deg, transparent 42%, black 48%, black 52%, transparent 58%)`,
          WebkitMaskImage: `linear-gradient(180deg, transparent 42%, black 48%, black 52%, transparent 58%)`,
          mixBlendMode: 'screen',
          willChange: 'opacity',
        }}
        aria-hidden
      />
    </>
  )
}
