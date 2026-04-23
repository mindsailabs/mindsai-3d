import { useAppStore } from '../lib/store'

/**
 * Act 1 — Hero — scroll 0 → 0.15
 *
 * MindsAI lockup + tagline sit at the bottom of the hero. The 3D mark
 * renders in the fixed background. Everything fades as you scroll into Act 2.
 */
export function Act1Hero() {
  const progress = useAppStore((s) => s.scrollProgress)
  // Fade-out 0.03-0.11 — starts fading on the very first scroll tick so user
  // immediately sees the hero responding, then tight fade so Act 2 crossfade is clean.
  const opacity = Math.max(0, Math.min(1, (0.11 - progress) / 0.08))

  return (
    <div
      className="fixed inset-0 z-20 pointer-events-none"
      style={{ opacity }}
    >
      <div className="absolute bottom-[8vh] left-0 right-0 text-center px-6">
        <h1 className="font-black leading-[0.82] tracking-tightest text-text-primary text-[clamp(3rem,9.5vw,12rem)]">
          Minds<span className="text-brand-teal">AI</span>
        </h1>
        <p className="mt-2 text-text-primary/50 font-medium uppercase tracking-[0.3em] text-[0.65rem] md:text-[0.72rem]">
          Media
        </p>
        <p className="mt-8 text-text-secondary text-[10px] md:text-[11px] uppercase tracking-wider font-medium">
          Quietly harnessing the power of new age AI
        </p>
      </div>
    </div>
  )
}
