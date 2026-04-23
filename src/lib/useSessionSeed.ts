import { useEffect, useState } from 'react'

/**
 * Generative session seed — the quiet personalisation hook.
 *
 * On first visit we mint a short hash (`M-XXXX-XXXX`) and persist it in
 * localStorage. On subsequent visits during the same calendar day the
 * same seed is returned, so the visitor sees "their" M again; past
 * midnight local time a new seed is generated.
 *
 * The seed is:
 *   – exposed in the preloader ("M-7F3A-89EC")
 *   – shown on the contact-success state ("your signature: …")
 *   – fed as a uniform into the M shader (uSeed) so iridescence
 *     phase + displacement offset are unique per visit
 *
 * Returns a stable `{ seed, numeric }` object. numeric is a float in
 * [0, 1) derived from the seed, safe to pass directly to GLSL uniforms.
 */

const STORAGE_KEY = 'mindsai:session-seed:v1'

function formatSeed(): string {
  // 8 hex chars, split "XXXX-XXXX" for readability.
  const a = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, '0')
    .toUpperCase()
  const b = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, '0')
    .toUpperCase()
  return `${a}-${b}`
}

function seedToNumeric(seed: string): number {
  // FNV-1a hash of the seed → [0, 1). Stable; reproducible for a given seed.
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return ((h >>> 0) % 10_000_000) / 10_000_000
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export interface SessionSeed {
  seed: string
  numeric: number
  isReturning: boolean
}

export function useSessionSeed(): SessionSeed {
  const [state] = useState<SessionSeed>(() => {
    if (typeof window === 'undefined') {
      return { seed: 'M-0000-0000', numeric: 0.5, isReturning: false }
    }
    const today = todayKey()
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as { seed: string; day: string }
        if (parsed.day === today && /^[0-9A-F]{4}-[0-9A-F]{4}$/.test(parsed.seed)) {
          return {
            seed: `M-${parsed.seed}`,
            numeric: seedToNumeric(parsed.seed),
            isReturning: true,
          }
        }
      }
    } catch {
      // localStorage blocked — fall through to fresh seed.
    }
    const freshRaw = formatSeed()
    const fresh = { seed: `M-${freshRaw}`, numeric: seedToNumeric(freshRaw), isReturning: false }
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ seed: freshRaw, day: today })
      )
    } catch {
      // noop
    }
    return fresh
  })

  // In StrictMode we might mount twice; don't re-mint on the second mount.
  useEffect(() => {
    /* no-op — state is frozen in useState initialiser */
  }, [])

  return state
}
