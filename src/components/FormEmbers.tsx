import { useMemo } from 'react'
import { useViewport } from '../lib/useViewport'

/**
 * FormEmbers — the payoff ember sequence after the contact form submits.
 *
 * On mount (Act5Contact renders this conditionally once `formSubmitted` is
 * true), a swarm of teal embers rises from the form's vertical centre
 * toward the M monument:
 *   – Desktop: M is on the LEFT, embers drift up AND left.
 *   – Mobile: M is ABOVE the form, embers drift straight up with small
 *     horizontal wobble.
 *
 * Each ember has a random delay (0–800ms), duration (2–3.5s), size (2–5px),
 * and drift amount. They fade in fast, hold, then fade out as they travel.
 * Rendered as absolutely positioned DOM elements with a single CSS keyframe
 * — cheaper than WebGL particles and animates smoothly on mid-range mobile.
 *
 * The component re-mounts every time formSubmitted flips to true (parent
 * uses `{submitted && <FormEmbers />}`), which resets the keyframe.
 */

const EMBER_COUNT = 48

export function FormEmbers() {
  const { isMobile } = useViewport()

  const embers = useMemo(
    () =>
      Array.from({ length: EMBER_COUNT }, (_, i) => {
        const delayMs = Math.random() * 900
        const durationMs = 2200 + Math.random() * 1600
        const size = 2 + Math.random() * 3.5
        // Starting position: near the form card's vertical centre.
        // Desktop: form is right-aligned → start in right half.
        // Mobile: form is centred → start centred.
        const startX = isMobile
          ? 40 + Math.random() * 20
          : 60 + Math.random() * 25
        const startY = 55 + Math.random() * 15
        // Drift target: toward the M.
        // Desktop: M is LEFT + UP → driftX negative, driftY negative (up).
        // Mobile: M is ABOVE form → driftX small wobble, driftY large negative.
        const driftX = isMobile
          ? (Math.random() - 0.5) * 20
          : -30 - Math.random() * 35
        const driftY = -55 - Math.random() * 25
        return {
          id: i,
          delayMs,
          durationMs,
          size,
          startX,
          startY,
          driftX,
          driftY,
        }
      }),
    [isMobile]
  )

  return (
    <div
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
      aria-hidden="true"
    >
      {embers.map((e) => (
        <div
          key={e.id}
          className="absolute rounded-full"
          style={
            {
              left: `${e.startX}%`,
              top: `${e.startY}%`,
              width: `${e.size}px`,
              height: `${e.size}px`,
              background: '#73C5CC',
              boxShadow: '0 0 10px rgba(115,197,204,0.85), 0 0 22px rgba(115,197,204,0.35)',
              opacity: 0,
              animation: `emberRise ${e.durationMs}ms ${e.delayMs}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`,
              ['--drift-x' as string]: `${e.driftX}vw`,
              ['--drift-y' as string]: `${e.driftY}vh`,
            } as React.CSSProperties
          }
        />
      ))}
      <style>{`
        @keyframes emberRise {
          0% {
            opacity: 0;
            transform: translate(0, 0) scale(0.2);
          }
          12% {
            opacity: 1;
            transform: translate(calc(var(--drift-x) * 0.12), calc(var(--drift-y) * 0.08)) scale(1);
          }
          70% {
            opacity: 0.75;
            transform: translate(calc(var(--drift-x) * 0.75), calc(var(--drift-y) * 0.75)) scale(1.1);
          }
          100% {
            opacity: 0;
            transform: translate(var(--drift-x), var(--drift-y)) scale(0.3);
          }
        }
      `}</style>
    </div>
  )
}
