export interface Outcome {
  id: string
  title: string
  description: string
}

export const outcomes: Outcome[] = [
  {
    id: 'sales',
    title: 'Generate Sales',
    description: 'Conversion-focused ads. Automated purchase journeys.',
  },
  {
    id: 'leads',
    title: 'Generate Leads',
    description: 'High-quality prospects. Qualified pipeline.',
  },
  {
    id: 'appointments',
    title: 'Fill Appointments',
    description: 'Calendar automation. Conversion funnels.',
  },
  {
    id: 'awareness',
    title: 'Build Awareness',
    description: 'Brand visibility. Trust, compounded.',
  },
]

export interface Capability {
  id: string
  code: string
  title: string
  description: string
}

export const capabilities: Capability[] = [
  { id: 'c01', code: 'M01', title: 'Smart Ad Management', description: 'Meta, Google, LinkedIn, TikTok.' },
  { id: 'c02', code: 'M02', title: 'User Journey Strategy', description: 'Lifecycle blueprinting.' },
  { id: 'c03', code: 'M03', title: 'Engagement & Audience Capture', description: 'Community systems.' },
  { id: 'c04', code: 'M04', title: 'Workflows & Automation Systems', description: 'Multi-channel orchestration.' },
  { id: 'c05', code: 'M05', title: 'Creative Asset Development', description: 'Ads, landing pages, motion.' },
  { id: 'c06', code: 'M06', title: 'Performance Copywriting', description: 'Conversion-driven writing.' },
  { id: 'c07', code: 'M07', title: 'Technical Infrastructure', description: 'CDP, pixel, data pipelines.' },
]

// Scroll windows — calibrated to actual scroll-section heights in App.tsx.
// Total scroll = 790vh (hero 100 + outcomes 150 + capabilities 150 + work 280 + contact 110).
// Work section got expanded so users have ~45vh per case-study video instead
// of the 25vh/slot that felt too fast.
export const scrollWindows = {
  act1: [0.0, 0.127] as const,
  act2: [0.127, 0.316] as const,
  act3: [0.316, 0.506] as const,
  act4: [0.506, 0.861] as const,
  act5: [0.861, 1.0] as const,
}

export interface CaseStudy {
  id: string
  name: string
  industry: string
  service: string
  metric: string
  period: string
  videoPath: string
  copy: {
    challenge: string
    approach: string
  }
}

// Phase-3 seed case studies — invented-but-believable until real work replaces them.
// Video paths match Veo 3.1 output_paths in prompts/veo_prompts.json.
export const caseStudies: CaseStudy[] = [
  {
    id: 'northwood-atelier',
    name: 'Northwood Atelier',
    industry: 'Luxury Furniture · UK',
    service: 'Generate Sales',
    metric: '340% ROAS on Meta cold traffic',
    period: 'Q3 2025',
    videoPath: '/assets/Videos/case_01_northwood.mp4',
    copy: {
      challenge: 'A heritage atelier with no performance infrastructure, reliant on word of mouth.',
      approach: 'Meta cold-traffic conversion campaigns mapped to a reworked purchase journey.',
    },
  },
  {
    id: 'helio-clinic',
    name: 'Helio Clinic',
    industry: 'Private Healthcare · London',
    service: 'Fill Appointments',
    metric: '1,200+ consultation bookings / month at £6.80 CPA',
    period: 'Q4 2025',
    videoPath: '/assets/Videos/case_02_helio.mp4',
    copy: {
      challenge: 'Premium clinic with inconsistent booking volume and a 30-day appointment pipeline.',
      approach: 'Calendar automation, landing page rebuild, Google performance search, end-to-end SMS workflow.',
    },
  },
  {
    id: 'orbit-capital',
    name: 'Orbit Capital',
    industry: 'Wealth Management · Mayfair',
    service: 'Generate Leads',
    metric: '5.2× qualified-lead volume across LinkedIn + Google',
    period: '2025',
    videoPath: '/assets/Videos/case_03_orbit.mp4',
    copy: {
      challenge: 'High-net-worth advisory firm needing discreet, trust-led lead generation.',
      approach: 'LinkedIn thought-leadership + Google brand search + lifecycle qualification workflow.',
    },
  },
  {
    id: 'kelvin-rowe',
    name: 'Kelvin & Rowe',
    industry: 'D2C Spirits · UK',
    service: 'Build Awareness',
    metric: '11M impressions · 420k engaged in 90 days',
    period: 'Q2 2025',
    videoPath: '/assets/Videos/case_04_kelvin.mp4',
    copy: {
      challenge: 'Emerging independent distillery needing mindshare against heritage incumbents.',
      approach: 'Multi-channel creative ecosystem — editorial ads, founder-led content, TikTok native.',
    },
  },
  {
    id: 'marlow-studios',
    name: 'Marlow Studios',
    industry: 'Architecture · International',
    service: 'Generate Leads',
    metric: '£14M pipeline attributed in 6 months',
    period: '2025',
    videoPath: '/assets/Videos/case_05_marlow.mp4',
    copy: {
      challenge: 'Award-winning practice with a 12-month project cycle and no inbound flywheel.',
      approach: 'Portfolio-led paid media + long-form content engine + commercial qualification.',
    },
  },
  {
    id: 'aether-labs',
    name: 'Aether Labs',
    industry: 'B2B SaaS · Series A',
    service: 'Generate Sales',
    metric: '$2.1M ARR from paid in Year 1',
    period: '2025',
    videoPath: '/assets/Videos/case_06_aether.mp4',
    copy: {
      challenge: 'Early-stage SaaS with product-market fit but no scalable acquisition motion.',
      approach: 'Full-funnel paid infrastructure, ICP segmentation, in-product activation sequences.',
    },
  },
]

// Small helper for fade-in-out curves
export function fadeInOut(
  progress: number,
  start: number,
  fullStart: number,
  fullEnd: number,
  end: number
): number {
  if (progress <= start || progress >= end) return 0
  if (progress >= fullStart && progress <= fullEnd) return 1
  if (progress < fullStart) return (progress - start) / (fullStart - start)
  return (end - progress) / (end - fullEnd)
}

export function smoothFade(
  progress: number,
  start: number,
  fullStart: number,
  fullEnd: number,
  end: number
): number {
  const linear = fadeInOut(progress, start, fullStart, fullEnd, end)
  return linear * linear * (3 - 2 * linear) // smoothstep
}
