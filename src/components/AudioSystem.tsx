import { useEffect, useRef } from 'react'
import { useAppStore } from '../lib/store'

/**
 * Ambient audio — a fully synthesised drone bed (no audio asset files).
 *
 * Web Audio API graph:
 *
 *   Oscillator (A3 sine, 110 Hz)  ──┐
 *   Oscillator (E4 sine, 164.8 Hz) ──┤
 *   Oscillator (A4 sine, 220 Hz, gentle detune LFO) ──┐
 *                                                     │
 *                               gainMix (pre-filter) ─┤
 *                                                     │
 *                            biquadLowPass (scroll-velocity-driven cutoff)
 *                                                     │
 *                                       masterGain ───┤
 *                                                     │
 *                                     audioCtx.destination
 *
 * Design decisions:
 *   – Three octave-stacked sine oscillators give a warm, non-musical pad.
 *   – A slow (0.06 Hz) LFO detunes the top oscillator by ±4 cents for life.
 *   – The biquad lowpass opens from 420 Hz at rest to 14 kHz on fast scroll
 *     velocity — ears perceive this as "the scene breathing with you."
 *   – Master gain defaults to 0 (silent) until the user clicks the
 *     toggle. First click starts the AudioContext (browser policy) + ramps
 *     gain up. Second click ramps down.
 *   – No file downloads; keeps the page lean.
 *
 * Cost: ~0.1% CPU on a decent laptop, negligible battery on mobile.
 */

const TARGET_GAIN = 0.14 // final volume when "on"
const RAMP_TIME = 1.4 // seconds

export function AudioSystem() {
  const audioEnabled = useAppStore((s) => s.audioEnabled)
  const toggleAudio = useAppStore((s) => s.toggleAudio)

  const ctxRef = useRef<AudioContext | null>(null)
  const masterRef = useRef<GainNode | null>(null)
  const filterRef = useRef<BiquadFilterNode | null>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    // Build the graph only once the user has enabled audio — browsers
    // block AudioContext creation until a user gesture occurs.
    if (!audioEnabled && !ctxRef.current) return
    if (!ctxRef.current) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      const ctx = new AC()
      ctxRef.current = ctx

      const master = ctx.createGain()
      master.gain.value = 0
      master.connect(ctx.destination)
      masterRef.current = master

      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 420
      filter.Q.value = 0.8
      filter.connect(master)
      filterRef.current = filter

      const mix = ctx.createGain()
      mix.gain.value = 0.35
      mix.connect(filter)

      // A3, E4, A4 — pentatonic-flavoured octave stack, non-melodic.
      const freqs = [110, 164.81, 220]
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = f
        const oscGain = ctx.createGain()
        oscGain.gain.value = [0.6, 0.35, 0.25][i]
        osc.connect(oscGain)
        oscGain.connect(mix)
        osc.start()

        // Subtle detune LFO on the top osc for movement.
        if (i === 2) {
          const lfo = ctx.createOscillator()
          lfo.type = 'sine'
          lfo.frequency.value = 0.06
          const lfoDepth = ctx.createGain()
          lfoDepth.gain.value = 4 // cents
          lfo.connect(lfoDepth)
          lfoDepth.connect(osc.detune)
          lfo.start()
        }
      })
    }

    const ctx = ctxRef.current!
    const master = masterRef.current!
    const filter = filterRef.current!
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime
    const target = audioEnabled ? TARGET_GAIN : 0
    master.gain.cancelScheduledValues(now)
    master.gain.setTargetAtTime(target, now, RAMP_TIME / 4)

    // Scroll-velocity-driven filter cutoff. Polls lenis.velocity each
    // frame; maps |velocity| to a cutoff between 420 Hz (rest) and
    // 14 kHz (fast flick). Smooth exponential ramp so changes feel
    // musical, not stepped.
    let cancelled = false
    function pollVelocity() {
      if (cancelled) return
      rafRef.current = requestAnimationFrame(pollVelocity)
      if (!audioEnabled) return
      const lenis = (window as unknown as { __lenis?: { velocity: number } })
        .__lenis
      const rawVel = lenis ? Math.abs(lenis.velocity) : 0
      // velocity in px/s — cap at ~2500 for our mapping.
      const normalised = Math.min(1, rawVel / 2500)
      const cutoff = 420 + Math.pow(normalised, 0.7) * 14000
      filter.frequency.setTargetAtTime(cutoff, ctx.currentTime, 0.08)
    }
    pollVelocity()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
    }
  }, [audioEnabled])

  return (
    <button
      onClick={toggleAudio}
      aria-label={audioEnabled ? 'Mute ambient audio' : 'Unmute ambient audio'}
      className="fixed bottom-6 right-6 z-30 pointer-events-auto group"
    >
      <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-white/15 bg-black/30 backdrop-blur-md hover:border-brand-teal/50 transition-colors">
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
    </button>
  )
}
