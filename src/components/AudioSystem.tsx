import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../lib/store'

/**
 * Ambient audio system.
 *
 * Standard agency-site pattern: muted autoplay of one looping track,
 * unmute toggle in top-right. We respect the browser's autoplay policy —
 * audio only starts after the first user interaction.
 *
 * Drop a Pixabay Music track (ambient electronic with slow rising pulse)
 * at public/assets/audio/ambient.mp3. The file is intentionally not
 * committed — generation brief is in prompts/audio_brief.md.
 */

const AUDIO_PATH = '/assets/audio/ambient.mp3'

export function AudioSystem() {
  const audioEnabled = useAppStore((s) => s.audioEnabled)
  const toggleAudio = useAppStore((s) => s.toggleAudio)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [ready, setReady] = useState(false)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    const a = new Audio(AUDIO_PATH)
    a.loop = true
    a.muted = true
    a.volume = 0.6
    a.preload = 'auto'
    a.addEventListener('canplay', () => setReady(true))
    a.addEventListener('error', () => setErrored(true))
    audioRef.current = a

    // Try muted autoplay — allowed by most browsers
    a.play().catch(() => {
      /* Silently fail — will start on first user interaction */
    })

    return () => {
      a.pause()
      a.src = ''
    }
  }, [])

  useEffect(() => {
    const a = audioRef.current
    if (!a || errored) return
    a.muted = !audioEnabled
    if (audioEnabled) {
      a.play().catch(() => {})
    }
  }, [audioEnabled, errored])

  if (errored) return null // silently omit if the audio file is missing

  return (
    <button
      onClick={toggleAudio}
      aria-label={audioEnabled ? 'Mute ambient audio' : 'Unmute ambient audio'}
      className="fixed bottom-6 right-6 z-30 pointer-events-auto group"
    >
      <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-white/15 bg-black/30 backdrop-blur-md hover:border-brand-teal/50 transition-colors">
        {/* Simple wave glyph — three bars that scale with audioEnabled */}
        <div className="flex items-end gap-[3px] h-3">
          <span
            className={`w-[2px] bg-brand-teal transition-all duration-300 ${audioEnabled ? 'h-full animate-pulse' : 'h-1/3'}`}
          />
          <span
            className={`w-[2px] bg-brand-teal transition-all duration-500 ${audioEnabled ? 'h-2/3 animate-pulse' : 'h-1/3'}`}
            style={{ animationDelay: '0.1s' }}
          />
          <span
            className={`w-[2px] bg-brand-teal transition-all duration-400 ${audioEnabled ? 'h-full animate-pulse' : 'h-1/3'}`}
            style={{ animationDelay: '0.2s' }}
          />
        </div>
        <span className="text-[9px] uppercase tracking-[0.25em] font-medium text-text-primary/80 group-hover:text-brand-teal transition-colors">
          {audioEnabled ? 'Sound on' : 'Sound off'}
        </span>
      </div>
      {!ready && !errored && (
        <span className="sr-only">Loading audio…</span>
      )}
    </button>
  )
}
