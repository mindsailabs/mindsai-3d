import { useAppStore } from '../lib/store'
import { smoothFade } from '../lib/copy'

/**
 * Footer visible only when scrolled deep into Act 5. Two London addresses,
 * contact email, social icons, copyright line — agency-site convention.
 */
export function Footer() {
  const progress = useAppStore((s) => s.scrollProgress)
  // Fade in slightly after contact form appears; stays until page end
  const opacity = smoothFade(progress, 0.9, 0.95, 1.01, 1.02)
  if (opacity <= 0.001) return null

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-20 pointer-events-none"
      style={{ opacity }}
      aria-hidden={opacity < 0.5}
    >
      <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-16 pb-8 pt-4 pointer-events-auto">
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start md:items-end justify-between">
          {/* Addresses */}
          <div className="flex flex-col md:flex-row gap-5 md:gap-10 text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-text-secondary">
            <div>
              <div className="text-brand-teal/80 font-medium mb-1.5">London — North</div>
              <div className="not-italic leading-relaxed">
                Woodgate House
                <br />
                EN4 9HN
              </div>
            </div>
            <div>
              <div className="text-brand-teal/80 font-medium mb-1.5">London — Mayfair</div>
              <div className="not-italic leading-relaxed">
                48 Warwick St
                <br />
                W1B 5AW
              </div>
            </div>
          </div>

          {/* Email + socials */}
          <div className="flex flex-col items-start md:items-end gap-3">
            <a
              href="mailto:hello@mindsaimedia.com"
              className="text-text-primary text-[12px] md:text-[14px] font-medium hover:text-brand-teal transition-colors duration-300"
            >
              hello@mindsaimedia.com
            </a>
            <div className="flex gap-5 text-[10px] uppercase tracking-[0.2em] text-text-secondary">
              <SocialLink href="https://www.instagram.com/" label="Instagram" />
              <SocialLink href="https://www.linkedin.com/" label="LinkedIn" />
              <SocialLink href="https://x.com/" label="X" />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between text-[9px] uppercase tracking-[0.3em] text-text-secondary/60 border-t border-white/5 pt-4">
          <div>MindsAI Media · London</div>
          <div>© {new Date().getFullYear()}</div>
        </div>
      </div>
    </footer>
  )
}

function SocialLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="hover:text-brand-teal transition-colors duration-300"
    >
      {label}
    </a>
  )
}
