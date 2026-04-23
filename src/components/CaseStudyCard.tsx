import { useEffect, useRef, useState } from 'react'
import type { CaseStudy } from '../lib/copy'
import { useAppStore } from '../lib/store'

interface CaseStudyCardProps {
  study: CaseStudy
  index: number
  parentOpacity: number
}

/**
 * Single work-grid card.
 *   – Videos auto-play (muted + loop) once we approach Act 4 — no hover gate.
 *   – Subtle 3D perspective tilt per card, driven by scroll progress + mouse position.
 *   – Metadata below the media frame.
 *
 * Performance: videos don't mount until scrollProgress > 0.55 (user is entering
 * Act 3 → about to hit Act 4) so we don't 50MB-download on initial page load.
 */
export function CaseStudyCard({ study, index, parentOpacity }: CaseStudyCardProps) {
  const progress = useAppStore((s) => s.scrollProgress)
  const videoRef = useRef<HTMLVideoElement>(null)
  const cardRef = useRef<HTMLElement>(null)
  const [videoErrored, setVideoErrored] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [mouseTilt, setMouseTilt] = useState({ x: 0, y: 0 })

  // Mount video when user is approaching Act 4 (scroll > 0.55).
  // Keeps initial page load light but gives videos time to buffer before visible.
  const shouldMountVideo = progress > 0.55

  // Column for tilt bias
  const col = index % 3 // 0, 1, 2

  // Scroll-based tilt: cards rotate subtly as you scroll through Act 4.
  // At progress=0.65 (start of Act 4) tilt is +X°, at 0.88 (end) it's -X°.
  // Creates "flipping through a gallery" sensation.
  const act4Local = Math.max(0, Math.min(1, (progress - 0.65) / (0.88 - 0.65)))
  const scrollTiltX = (0.5 - act4Local) * 6 // +3° to -3° across Act 4
  const scrollTiltY = (col - 1) * 2 // -2°, 0°, +2° per column for depth

  // Combined tilt with mouse parallax
  const tiltX = scrollTiltX - mouseTilt.y * 5
  const tiltY = scrollTiltY + mouseTilt.x * 5

  useEffect(() => {
    const v = videoRef.current
    if (!v || videoErrored) return
    if (shouldMountVideo) {
      v.play().catch(() => {
        // Some browsers block autoplay with audio — we're muted so should be fine,
        // but catch just in case and mark errored.
        setVideoErrored(true)
      })
    }
  }, [shouldMountVideo, videoErrored])

  const handleMouseEnter = () => setIsHovered(true)
  const handleMouseLeave = () => {
    setIsHovered(false)
    setMouseTilt({ x: 0, y: 0 })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5 // -0.5..0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setMouseTilt({ x, y })
  }

  const stagger = index * 80

  return (
    <article
      ref={cardRef}
      className="group relative pointer-events-auto cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      style={{
        transform: `
          perspective(1200px)
          translateY(${(1 - parentOpacity) * 40}px)
          rotateX(${tiltX}deg)
          rotateY(${tiltY}deg)
        `,
        transition: `transform 600ms ${stagger}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
        transformStyle: 'preserve-3d',
      }}
    >
      <div className="relative w-full aspect-[16/9] overflow-hidden rounded-sm bg-black">
        {/* Placeholder — radial teal glow under the video */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 55%, rgba(115,197,204,0.14), rgba(0,0,0,0.9) 68%), linear-gradient(180deg, #0a0e10 0%, #000000 100%)',
          }}
        />

        <div
          className="absolute inset-0 mix-blend-overlay opacity-40 pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.4 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.06'/></svg>\")",
          }}
        />

        {/* Video — mounts when we approach Act 4, autoplays, muted, loops */}
        {shouldMountVideo && !videoErrored && (
          <video
            ref={videoRef}
            src={study.videoPath}
            muted
            loop
            playsInline
            autoPlay
            preload="auto"
            onError={() => setVideoErrored(true)}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
            style={{ opacity: 1 }}
          />
        )}

        {/* Hover scrim — brighter teal edge when hovered */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
          style={{
            opacity: isHovered ? 1 : 0,
            boxShadow: 'inset 0 0 80px 0 rgba(115,197,204,0.45)',
          }}
        />

        {/* Service chip */}
        <div className="absolute top-4 left-4 text-[9px] md:text-[10px] uppercase tracking-[0.25em] font-medium text-brand-teal/90 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-sm">
          {study.service}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-text-primary text-[18px] md:text-[22px] font-black tracking-tightest leading-tight">
            {study.name}
          </h3>
          <span className="text-text-secondary text-[10px] md:text-[11px] uppercase tracking-wider shrink-0">
            {study.period}
          </span>
        </div>
        <div className="text-text-secondary text-[11px] md:text-[12px]">{study.industry}</div>
        <div className="mt-1 text-text-primary/85 text-[12px] md:text-[13px] leading-snug">
          {study.metric}
        </div>
      </div>
    </article>
  )
}
