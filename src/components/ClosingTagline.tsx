import { useAppStore } from '../lib/store'

/**
 * ClosingTagline — the final beat of the site.
 *
 * Sits under the Act 5 contact form. Fades in once the visitor is ~93%
 * through scroll, sits present through 0.99, then over the final 1%
 * dissolves with an SVG turbulence filter mask — letters break into
 * noise like the "gommage" effect from Codrops.
 *
 * The dissolution is driven entirely by scroll progress (no timer), so
 * it's reversible: scroll back up, the tagline re-forms. This keeps the
 * moment feeling *physical* rather than animated.
 *
 * Copy: "Quietly. Always." — echoes the hero tagline and exits the site
 * on the brand voice. Resolve as a promise the visitor walks away with.
 */
export function ClosingTagline() {
  const progress = useAppStore((s) => s.scrollProgress)

  // Fade in 0.93 → 0.97 (full).
  const fadeIn = Math.max(0, Math.min(1, (progress - 0.93) / 0.04))
  // Dissolve 0.98 → 1.0 (fully dissolved).
  const dissolve = Math.max(0, Math.min(1, (progress - 0.98) / 0.02))

  // v2 — user feedback: the tagline was fighting the Act 5 contact
  // form for attention. Dropped to a whisper (max 18% opacity), shrunk
  // font so it's no longer a massive hero-scale phrase, and anchored
  // to the VERY bottom of the viewport so it reads as a closing
  // flourish under the form rather than a background sign over it.
  const opacity = fadeIn * (1 - dissolve) * 0.18
  // Blur scales up with dissolve so letters smear as they disintegrate.
  const blur = dissolve * 14
  // Letter-spacing opens slightly so words seem to break apart.
  const letterSpacing = dissolve * 0.12

  if (opacity <= 0.001) return null

  return (
    <div
      className="fixed inset-x-0 bottom-4 md:bottom-6 z-[15] pointer-events-none flex items-center justify-center px-6"
      style={{ opacity }}
      aria-hidden={opacity < 0.5}
    >
      <div
        className="text-text-primary font-medium tracking-[0.2em] uppercase text-center text-[10px] md:text-[11px] whitespace-nowrap"
        style={{
          filter: `blur(${blur}px)`,
          letterSpacing: `${0.2 + letterSpacing}em`,
          transition: 'filter 120ms linear',
        }}
      >
        Quietly. Always.
      </div>
    </div>
  )
}
