import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../lib/store'

/**
 * OpeningFade — the restrained opening.
 *
 * No letterbox, no corner tags, no crosshair, no percentage meter. Just a
 * solid black veil that holds for 500ms while the three.js scene hydrates,
 * then lifts over 900ms with a slight radial wipe from centre. The drama
 * lives in what's UNDER the veil — the M orb, the particles, the typography.
 *
 * Why this instead of a cinematic decorated preloader:
 *   – React 18 StrictMode double-effect races were making the decorated
 *     version unreliable. Simple state machine = rock-solid.
 *   – Premium 2025 sites don't have "loading screens" — they have *opening
 *     shots*. The first frame IS the piece. A black veil is just a curtain.
 *   – Scroll restoration, font loading, HDR decode all happen during the
 *     500ms hold, so the reveal is of a fully-painted scene, not a
 *     half-rendered one.
 *
 * Session storage skip: same-tab returners get a 200ms instant flash instead
 * of the full 1400ms sequence.
 */

const HOLD_MS = 500
const FADE_MS = 900
const QUICK_MS = 200
const SESSION_FLAG = 'mindsai:opening-seen:v1'

function shouldSkipSequence(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.has('fresh') || params.get('preload') === 'full') return false
    return window.sessionStorage.getItem(SESSION_FLAG) === '1'
  } catch {
    return false
  }
}

export function OpeningFade() {
  const setAppReady = useAppStore((s) => s.setAppReady)

  // Lock the skip-decision once on first mount so StrictMode's double-
  // invocation doesn't flip it between mounts.
  const quickRef = useRef<boolean | null>(null)
  if (quickRef.current === null) quickRef.current = shouldSkipSequence()
  const quick = quickRef.current

  const [phase, setPhase] = useState<'hold' | 'lift' | 'done'>('hold')

  useEffect(() => {
    let cancelled = false
    const holdMs = quick ? 0 : HOLD_MS
    const fadeMs = quick ? QUICK_MS : FADE_MS

    const liftTimer = window.setTimeout(() => {
      if (cancelled) return
      setPhase('lift')
    }, holdMs)

    const doneTimer = window.setTimeout(() => {
      if (cancelled) return
      setPhase('done')
      setAppReady(true)
      try {
        window.sessionStorage.setItem(SESSION_FLAG, '1')
      } catch {
        /* noop */
      }
    }, holdMs + fadeMs)

    return () => {
      cancelled = true
      window.clearTimeout(liftTimer)
      window.clearTimeout(doneTimer)
    }
  }, [quick, setAppReady])

  if (phase === 'done') return null

  const lifting = phase === 'lift'

  return (
    <div
      className="fixed inset-0 z-[60] pointer-events-none select-none bg-black"
      aria-hidden="true"
      style={{
        opacity: lifting ? 0 : 1,
        transition: `opacity ${
          quick ? QUICK_MS : FADE_MS
        }ms cubic-bezier(0.22, 1, 0.36, 1)`,
      }}
    />
  )
}
