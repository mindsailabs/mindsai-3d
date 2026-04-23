import { caseStudies, smoothFade } from '../lib/copy'
import { useAppStore } from '../lib/store'

/**
 * Act 4 — "Selected Work" — scroll 0.506 → 0.861
 *
 * Cards + videos are 3D objects orbiting the M (see WorkOrbit.tsx).
 * This overlay renders: section headline at top, and clean metadata for
 * whichever case study is CURRENTLY FEATURED (closest to camera in the orbit),
 * anchored at the bottom of the viewport so it doesn't move with orbit rotation.
 */
export function Act4Work() {
  const progress = useAppStore((s) => s.scrollProgress)
  const featuredIndex = useAppStore((s) => s.featuredWorkIndex)
  const opacity = smoothFade(progress, 0.506, 0.58, 0.83, 0.861)
  if (opacity <= 0.001) return null

  const study = caseStudies[featuredIndex] ?? caseStudies[0]

  return (
    <div
      className="fixed inset-0 z-20 pointer-events-none"
      style={{ opacity }}
      aria-hidden={opacity < 0.5}
    >
      {/* Section header */}
      <div className="absolute top-[8vh] left-0 right-0 flex flex-col items-center">
        <div
          className="text-[10px] md:text-[11px] uppercase tracking-[0.4em] text-brand-teal font-medium"
          style={{
            transform: `translateY(${(1 - opacity) * -14}px)`,
            transition: 'transform 700ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          Selected work
        </div>
        <h2
          className="mt-3 text-text-primary font-black leading-[0.85] tracking-tightest text-[clamp(2.25rem,5vw,5.5rem)] text-center max-w-3xl px-6"
          style={{
            transform: `translateY(${(1 - opacity) * -26}px)`,
            transition: 'transform 800ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          A name mentioned
          <br />
          only in circles.
        </h2>
      </div>

      {/* Featured-card metadata — anchored to viewport bottom centre */}
      <div
        key={study.id}
        className="absolute bottom-[10vh] left-0 right-0 flex flex-col items-center text-center px-6"
        style={{
          animation: 'fadeUp 500ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="text-brand-teal text-[10px] uppercase tracking-[0.3em] font-medium">
            {study.service}
          </div>
          <div className="w-4 h-px bg-text-secondary/30" />
          <div className="text-text-secondary text-[10px] uppercase tracking-[0.25em]">
            {study.period}
          </div>
        </div>
        <h3 className="text-text-primary text-[clamp(1.75rem,3.2vw,2.75rem)] font-black tracking-tightest leading-tight">
          {study.name}
        </h3>
        <div className="text-text-secondary text-[12px] md:text-[13px] mt-1">
          {study.industry}
        </div>
        <div className="text-text-primary/90 text-[14px] md:text-[15px] mt-2 max-w-xl">
          {study.metric}
        </div>
        <div className="mt-4 flex items-center gap-2 text-[9px] uppercase tracking-[0.3em] text-text-secondary/60">
          {caseStudies.map((_, i) => (
            <div
              key={i}
              className={`h-px transition-all duration-500 ${
                i === featuredIndex ? 'w-6 bg-brand-teal' : 'w-3 bg-text-secondary/30'
              }`}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
