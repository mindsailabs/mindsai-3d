import { create } from 'zustand'

interface AppState {
  scrollProgress: number
  setScrollProgress: (p: number) => void
  audioEnabled: boolean
  toggleAudio: () => void
  hoveredCapability: number | null
  setHoveredCapability: (i: number | null) => void
  featuredWorkIndex: number
  setFeaturedWorkIndex: (i: number) => void
  featuredOutcome: number
  setFeaturedOutcome: (i: number) => void
  /** True once the preloader cinematic has completed and the user can scroll.
   *  Lenis is paused until this flips to true, so scroll can't "leak" past
   *  the opening shot. */
  appReady: boolean
  setAppReady: (r: boolean) => void
  /** Flipped to true when the contact form submits successfully. The M
   *  shader reads this to trigger a brightness/velocity pulse, and the
   *  FormEmbers overlay reads it to spawn the particle-rise sequence. */
  formSubmitted: boolean
  setFormSubmitted: (r: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  scrollProgress: 0,
  setScrollProgress: (p) => set({ scrollProgress: p }),
  audioEnabled: false,
  toggleAudio: () => set((s) => ({ audioEnabled: !s.audioEnabled })),
  hoveredCapability: null,
  setHoveredCapability: (i) => set({ hoveredCapability: i }),
  featuredWorkIndex: 0,
  setFeaturedWorkIndex: (i) => set({ featuredWorkIndex: i }),
  featuredOutcome: 0,
  setFeaturedOutcome: (i) => set({ featuredOutcome: i }),
  appReady: false,
  setAppReady: (r) => set({ appReady: r }),
  formSubmitted: false,
  setFormSubmitted: (r) => set({ formSubmitted: r }),
}))
