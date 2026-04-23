import { smoothFade } from '../lib/copy'
import { useAppStore } from '../lib/store'

/**
 * Act 3 — "How We Do It" — scroll 0.316 → 0.506
 *
 * Capability labels + nodes are 3D elements in the scene (see CapabilityNodes.tsx).
 * This component only renders the act HEADLINE at the top of the viewport.
 */
export function Act3Capabilities() {
  const progress = useAppStore((s) => s.scrollProgress)
  const opacity = smoothFade(progress, 0.316, 0.36, 0.47, 0.506)
  if (opacity <= 0.001) return null

  return (
    <div
      className="fixed inset-0 z-20 pointer-events-none"
      style={{ opacity }}
      aria-hidden={opacity < 0.5}
    >
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
    </div>
  )
}
