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
}))
