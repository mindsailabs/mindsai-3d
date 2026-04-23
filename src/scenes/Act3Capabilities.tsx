import { capabilities, smoothFade } from '../lib/copy'
import { useAppStore } from '../lib/store'
import { useViewport } from '../lib/useViewport'

/**
 * Act 3 — "How We Do It" — scroll 0.316 → 0.506
 *
 * Desktop: the 3D orbital ring (CapabilityNodes.tsx) is the whole show —
 * seven glowing nodes, each with an SDF text label floating above it.
 * Plenty of horizontal room for long titles like "Workflows & Automation
 * Systems". This overlay only contributes the act headline at top.
 *
 * Mobile: the orbital ring fits into portrait, but full titles can't.
 * CapabilityNodes.tsx therefore renders only the M-codes (M01–M07) in the
 * 3D scene on mobile, and this component renders the full capability list
 * as a clean stacked legend below the ring — code + title per row,
 * everything fits, nothing truncates.
 */
export function Act3Capabilities() {
  const progress = useAppStore((s) => s.scrollProgress)
  const opacity = smoothFade(progress, 0.316, 0.36, 0.47, 0.506)
  const { isMobile } = useViewport()
  if (opacity <= 0.001) return null

  return (
    <div
      className="fixed inset-0 z-20 pointer-events-none"
      style={{ opacity }}
      aria-hidden={opacity < 0.5}
    >
      {/* HEADLINE */}
      <div className="absolute top-[10vh] left-0 right-0 flex flex-col items-center">
        <div
          className="text-[10px] md:text-[11px] uppercase tracking-[0.4em] text-brand-teal font-medium"
          style={{
            transform: `translate3d(0, ${(1 - opacity) * -14}px, 0)`,
            transition: 'transform 700ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            willChange: 'transform',
          }}
        >
          How we do it
        </div>
        <h2
          className="mt-3 text-text-primary font-black leading-[0.85] tracking-tight md:tracking-tightest text-[clamp(2.25rem,5vw,5.5rem)] text-center max-w-3xl px-6"
          style={{
            transform: `translate3d(0, ${(1 - opacity) * -26}px, 0)`,
            transition: 'transform 800ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            willChange: 'transform',
          }}
        >
          Seven disciplines.
          <br />
          One system.
        </h2>
      </div>

      {/* MOBILE LEGEND — full capability names below the orbital ring. */}
      {isMobile && (
        <div className="absolute inset-x-0 bottom-[6vh] px-5">
          <div className="mx-auto max-w-[360px] grid grid-cols-1 gap-2">
            {capabilities.map((cap) => (
              <div
                key={cap.id}
                className="flex items-baseline gap-3 border-t border-white/[0.06] pt-2"
              >
                <span className="text-brand-teal text-[9px] uppercase tracking-[0.25em] font-medium tabular-nums shrink-0 w-[30px]">
                  {cap.code}
                </span>
                <span className="text-text-primary text-[12px] font-medium leading-tight">
                  {cap.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
