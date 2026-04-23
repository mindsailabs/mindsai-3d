import { outcomes, smoothFade } from '../lib/copy'
import { useAppStore } from '../lib/store'

/**
 * Act 2 — "What You Get"
 *
 * The outcome titles/descriptions are BAKED INTO the 3D panel textures
 * (composited via canvas in OutcomePanels.tsx), so text rotates with panels.
 * This overlay only renders the act headline at the top and pagination dots
 * at the bottom indicating which outcome is currently featured.
 */
export function Act2Outcomes() {
  const progress = useAppStore((s) => s.scrollProgress)
  const featuredIndex = useAppStore((s) => s.featuredOutcome)
  const opacity = smoothFade(progress, 0.11, 0.17, 0.27, 0.316)
  if (opacity <= 0.001) return null

  return (
    <div
      className="fixed inset-0 z-20 pointer-events-none"
      style={{ opacity }}
      aria-hidden={opacity < 0.5}
    >
      <div className="absolute top-[8vh] left-0 right-0 flex flex-col items-center">
        <div
          className="text-[10px] md:text-[11px] uppercase tracking-[0.4em] text-brand-teal font-medium"
          style={{
            transform: `translateY(${(1 - opacity) * -14}px)`,
            transition: 'transform 700ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          What you get
        </div>
        <h2
          className="mt-3 text-text-primary font-black leading-[0.85] tracking-tightest text-[clamp(2.25rem,5vw,5.5rem)] text-center max-w-3xl px-6"
          style={{
            transform: `translateY(${(1 - opacity) * -26}px)`,
            transition: 'transform 800ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          Four outcomes.
          <br />
          One engine.
        </h2>
      </div>

      {/* Pagination dots — show which outcome panel is currently featured */}
      <div className="absolute bottom-[8vh] left-0 right-0 flex items-center justify-center gap-2">
        {outcomes.map((_, i) => (
          <div
            key={i}
            className={`h-px transition-all duration-500 ${
              i === featuredIndex ? 'w-6 bg-brand-teal' : 'w-3 bg-text-secondary/30'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
