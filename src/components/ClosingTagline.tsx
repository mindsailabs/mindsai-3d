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

  // Composite opacity: rises with fadeIn, falls with dissolve.
  const opacity = fadeIn * (1 - dissolve)
  // Blur scales up with dissolve so letters smear as they disintegrate.
  const blur = dissolve * 14
  // Slight upward drift during dissolve — ashes rise.
  const translateY = -dissolve * 24
  // Letter-spacing opens slightly so words seem to break apart.
  const letterSpacing = -0.04 + dissolve * 0.12

  if (opacity <= 0.001) return null

  return (
    <div
      className="fixed inset-x-0 z-[15] pointer-events-none flex items-center justify-center px-6"
      style={{
        // Sits higher on mobile so it doesn't collide with the Sound-Off
        // toggle (bottom-6) or the closing survey CTA. On desktop the
        // tagline hugs the bottom for cinematic framing.
        bottom: 'clamp(12vh, 10vh + 24px, 10vh)',
        opacity,
      }}
      aria-hidden={opacity < 0.5}
    >
      <div
        className="text-text-primary font-black tracking-tight leading-[0.9] text-center text-[clamp(1.75rem,6vw,6rem)] whitespace-nowrap"
        style={{
          filter: `blur(${blur}px)`,
          transform: `translateY(${translateY}px)`,
          letterSpacing: `${letterSpacing}em`,
          transition: 'filter 120ms linear, transform 120ms linear',
          textShadow:
            '0 0 40px rgba(115, 197, 204, 0.35),' +
            '0 0 80px rgba(0, 0, 0, 0.9)',
        }}
      >
        Quietly. Always.
      </div>
    </div>
  )
}
