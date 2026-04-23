# MINDSAI MEDIA — Website Project Brief

**Status:** Pre-build. All decisions locked. Ready for Phase 1 execution.
**Owner:** Abhishek Satuluri (founder, Mindsai Media).
**Codebase dir:** `/Users/abhisheksatuluri/Desktop/Mindsai Media/`
**Deploy target:** Vercel (preview URL first; cut over `mindsaimedia.com` only on approval).
**Dual purpose:** (a) ship a world-class marketing site for Mindsai Media; (b) capabilities test for Claude Opus 4.7 — can it build something on par with agency work like activetheory.net.

---

## 1. THE MISSION IN ONE SENTENCE

Build a single-page, scroll-driven, WebGL-immersive website for Mindsai Media — an AI advertising & automation agency based in London — whose craft bar matches **activetheory.net** (the site in the reference reel at `reference/reel_video.mp4`). The outcome should feel inevitable: visitors who land think *"this is the most premium agency on the internet right now."*

Not a clone of Active Theory. A peer of Active Theory — in our own brand language.

---

## 2. WHAT WE'RE REPLICATING — AND WHAT WE'RE NOT

### What we ARE replicating (the genre / visual grammar)
- **Single long scroll**, scroll drives a normalized 0→1 progress that controls a 3D camera path.
- **One signature 3D object** (refractive, dispersive glass) that acts as the protagonist of the page and transforms through the scroll.
- **Dark, cinematic palette.** Deep black base, one accent color, enormous white display type.
- **Post-process chain:** UnrealBloom + chromatic aberration + film grain + vignette, applied globally.
- **Typographic moments** — huge headlines that hold attention for 1–2 seconds before the next scene.
- **Ambient / electronic soundtrack** with rising pulse.

### What we are NOT replicating
- ❌ Active Theory's code, shaders, GLTF models, Hydra engine, UIL config, specific layout, specific typography, specific scroll choreography. None of it.
- ❌ Active Theory's color system (chrome/violet/white) — ours is **black + teal `#73C5CC`**.
- ❌ Their "floating project cards" layout — our protagonist is the **teal orb**, not a grid of tiles.
- ❌ Their copy voice ("Creative Digital Experiences") — ours is provocative-exclusive ("Quietly harnessing the power of new age AI").

**Test:** When a designer who knows the agency scene lands on our site, they should think *"this is Active-Theory-tier"* (a compliment), not *"this is a ripoff of page X"* (a failure). If anyone in a QA review says the latter, we dial back.

### Reference materials in this repo
- `reference/reel_video.mp4` — the 15s Instagram reel by @jerrythewebdev
- `reference/reel_frames/01…11_*.jpg` — 11 key frames annotated by scene
- `reference/reel_metadata.json` — full scrape via Apify (caption, comments, hashtags)
- `reference/logo/mindsai_logo_full.png` — full wordmark (grey on transparent)
- `reference/logo/mindsai_icon_512.png` — icon-only (black M + teal dot) — **source of truth for brand color**
- `reference/mindsai_home.html` — scrape of current WP site for copy voice + office addresses

---

## 3. THE REFERENCE REEL — FRAME-BY-FRAME

The reel is a handheld phone recording of someone scrolling `activetheory.net` on a MacBook. It is compressed, shaky, imperfect — which makes it *achievable.* Our goal is the site behind the reel, not the reel itself.

| Frame | File | What's shown | What we take |
|-------|------|--------------|--------------|
| 01 | `01_hero_logo.jpg` | Glowing circular "a" logo, particle sparks drifting, dark nebula BG | Hero: dormant single-point-of-light moment |
| 02 | `02_liquid_droplet.jpg` | Logo deforms into a tall refractive liquid droplet | Curl-noise displacement on the orb's geometry |
| 03 | `03_explosion_transition.jpg` | Overbright transitional bloom | Bloom pass calibration reference |
| 04 | `04_creative_digital_experiences.jpg` | Huge "CREATIVE DIGITAL EXPERIENCES" type with chrome torus distorting letters | Typography treatment — Mindsai's tagline lives here |
| 05 | `05_work_grid_prometheus.jpg` | 3D floating project cards (PROMETHEUS visible) | NOT used — we diverge here intentionally (our Act 3 is orbital nodes, not cards) |
| 06 | `06_refractive_cards.jpg` | Heavy glass refraction + chromatic aberration on cards | Refraction shader reference |
| 07 | `07_harmonic_state.jpg` | Same grid, different card (HARMONIC STATE) | — |
| 08 | `08_echo_card.jpg` | ECHO card with garbled text from refraction | Dispersion strength reference |
| 09 | `09_white_refraction.jpg` | Peak bloom / dispersion moment | Post-process reference |
| 10 | `10_pedestal_monument.jpg` | Giant glowing "a" on a pedestal, wet floor, god-rays | The "signature object as monument" idea — we use for Act 5 contact moment |
| 11 | `11_the_lab.jpg` | Half-sphere speaker-grille render with "// THE LAB →" tagline | Footer rhythm reference |

**What we keep from the reel:** the signature refractive-object-as-protagonist, the liquid-glass treatment, the scroll-as-cinema pacing, the cinematic palette, the ambient-pulse audio.

**What we change:** protagonist is a sphere not a logo mark; our color is teal not chrome-white; our acts tell the Mindsai story (quiet AI power + services + work + contact), not the Active Theory story (creative digital experiences + agency work).

---

## 4. THE BRAND

### Name
**Mindsai Media** — stylized lockup `M.indsai` (the period after "M" is the teal dot).

### Logo
- Icon: `reference/logo/mindsai_icon_512.png` — bold black "M" (two angled pillars, reading as "AI" stylized) + **teal dot** in the lower left.
- Wordmark: `reference/logo/mindsai_logo_full.png` — grey on transparent.

### Colors (brand-locked)
| Token | Hex | Use |
|-------|-----|-----|
| `bg-black` | `#000000` | Page background everywhere |
| `brand-teal` | `#73C5CC` | The dot / the orb / every accent highlight |
| `brand-teal-deep` | `#2B4E55` | Deeper shadow variant of teal (for gradients) |
| `text-primary` | `#FFFFFF` | Headlines + display type |
| `text-secondary` | `#7D8591` | Body / supporting copy |
| `grain-overlay` | `rgba(255,255,255,0.02)` | Subtle film grain pass |

No other colors. Any color that isn't one of these six does not belong on this site.

### Typography
**Satoshi** (Fontshare, free, commercial OK) — one typeface, entire site.
- Display (hero headlines): Satoshi Variable, weight 900, size 8vw+, tight letter-spacing (-0.04em)
- H1/H2: Satoshi 700, 3–6vw
- Body: Satoshi 400, 16–18px, 1.6 line-height
- Caption/kicker: Satoshi 500 uppercase, 11–12px, letter-spacing 0.15em

Load via: `https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,400&display=swap`

### Voice (locked — double down on this)
- Provocative, exclusive, quietly confident. **Short sentences. Line breaks like poetry.**
- Hero-register phrases to keep: *"Quietly harnessing the power of new age AI."* · *"A name mentioned only in circles of those that know."* · *"The masters of AI advertising & automations."*
- Never explain too much. Never corporate-speak. Never "synergy," "leverage," "unlock."
- First person plural ("we") when referring to Mindsai. Second person ("you") when talking about the client.
- British English spelling (we're London).

### Soundtrack
**Genre match:** ambient-electronic with rising pulse (same family as the reel's ByAstral track "YOU CAN ASK THE FLOWERS").
**Source:** Pixabay Music (royalty-free, no attribution required under their current license). Backup: Uppbeat free tier.
**Selection criteria:** deep bass drone + subtle high-frequency shimmer + a pulse/build that syncs loosely to scroll milestones. No vocals. No melody you could hum.
**Implementation:** autoplay muted. Unmute button in top-right corner (standard agency convention). One track, looped.

---

## 5. SITE ARCHITECTURE — 5 ACTS, ONE SCROLL

Single page. ~6 viewport heights of scroll. Scroll position `0 → 1` drives every animated value on the page.

### Act 1 — THE DOT (0.00 → 0.15)
A single teal point of light in the center of a black void. Breathes. Subtle particle sparks drift past. As the user scrolls, camera pulls back → the point reveals itself as a refractive glass orb. The word `Mindsai` types in letter-by-letter beside it at the end of Act 1. Tagline fades in below: *"Quietly harnessing the power of new age AI."*

### Act 2 — WHAT YOU GET (0.15 → 0.40)
The orb splits into four streams of refracted light. Each stream resolves into an outcome with huge type:
- **Generate Sales** — "Conversion-focused ads. Automated purchase journeys."
- **Generate Leads** — "High-quality prospects. Qualified pipeline."
- **Fill Appointments** — "Calendar automation. Conversion funnels."
- **Build Awareness** — "Brand visibility. Trust, compounded."

Streams return to the orb. Orb continues.

### Act 3 — HOW WE DO IT (0.40 → 0.65)
Seven capability nodes orbit the orb in 3D space. Hover / scroll-anchor each node → its title and a one-sentence description appear. Uppercase kicker: **M01 → M07**.
- **M01 · Smart Ad Management** — Meta, Google, LinkedIn, TikTok.
- **M02 · User Journey Strategy** — Lifecycle blueprinting.
- **M03 · Engagement & Audience Capture**
- **M04 · Workflows & Automation Systems**
- **M05 · Creative Asset Development**
- **M06 · Performance Copywriting**
- **M07 · Technical Infrastructure**

### Act 4 — SELECTED WORK (0.65 → 0.88)
Dark grid, 6 placeholder case studies (see §9). Hover reveals a Veo 3.1 video loop behind the card. Click opens a minimal case study overlay (client name, industry, 2 lines of outcome + a metric). Case studies are **fake but believable** until real ones ship.

### Act 5 — START A PROJECT (0.88 → 1.00)
The orb returns to center — now sitting on a subtle reflective plane (nod to frame 10 of the reel, the "monument" shot). Simple contact form: Name, Email, What you need (textarea), Budget bracket (dropdown: £5k–15k / £15k–50k / £50k+ / Not sure). Submit → confirmation state.

Footer: two London addresses (Woodgate House EN4 9HN · 48 Warwick St W1B 5AW), `hello@mindsaimedia.com`, social icons, tiny copyright line.

---

## 6. THE ONE SIGNATURE 3D EFFECT — THE ORB

This is the whole ballgame. If the orb doesn't look expensive, the site doesn't work.

### Geometry
- `IcosahedronGeometry(radius=1, detail=64)` — high subdivision for smooth curl-noise displacement
- Vertex normals recomputed after displacement

### Vertex shader
```glsl
// 3D curl noise displacement
uniform float uTime;
uniform float uDisplacementStrength; // ~0.08 default, animates per act
varying vec3 vNormal;
varying vec3 vViewPosition;

vec3 curlNoise(vec3 p) {
  // Standard curl noise implementation — 3 cross-derivatives of 3D simplex noise
  // Reference: cabbibo / three.js curl noise examples
}

void main() {
  vec3 displaced = position + normal * length(curlNoise(position * 1.5 + uTime * 0.2)) * uDisplacementStrength;
  vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
  vViewPosition = -mvPosition.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mvPosition;
}
```

### Fragment shader
```glsl
// Refraction + dispersion + Fresnel
uniform samplerCube uEnvMap;
uniform float uIOR;       // ~1.45
uniform float uDispersion; // ~0.03 — RGB channel IOR offset for chromatic aberration
uniform vec3 uTint;       // vec3(0.45, 0.77, 0.80) — brand teal multiplier
uniform float uFresnelPower; // ~3.0
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 V = normalize(vViewPosition);
  vec3 N = normalize(vNormal);
  
  // Per-channel refraction for dispersion
  vec3 refR = refract(-V, N, 1.0 / (uIOR - uDispersion));
  vec3 refG = refract(-V, N, 1.0 / uIOR);
  vec3 refB = refract(-V, N, 1.0 / (uIOR + uDispersion));
  
  float r = textureCube(uEnvMap, refR).r;
  float g = textureCube(uEnvMap, refG).g;
  float b = textureCube(uEnvMap, refB).b;
  
  vec3 refraction = vec3(r, g, b) * uTint;
  
  // Fresnel rim
  float fresnel = pow(1.0 - max(dot(N, V), 0.0), uFresnelPower);
  vec3 rim = uTint * fresnel * 1.5;
  
  gl_FragColor = vec4(refraction + rim, 1.0);
}
```

### Environment map
The HDRI determines how "expensive" the glass looks — it's the single biggest lever on whether the orb reads as premium. Work through these options in order:

1. **Start with a Poly Haven HDRI** (https://polyhaven.com/hdris) — filter dark / studio / night. Get the full shader pipeline end-to-end working with a free placeholder first. Many Poly Haven HDRIs are genuinely excellent; the orb may already look right.
2. **If the Poly Haven option doesn't hit the bar** against the reel reference frames, try a **procedurally-generated equirectangular map** — render a GLSL shader of scattered teal-cyan light sources (matching `#73C5CC`) against pure black to a 2048×1024 render target at load time, then feed that into the refraction shader.
3. **Only if both options fall short** against the reference → ask Abhishek to generate a bespoke 2048×1024 HDRI via Nano Banana Pro. Write the prompt at that moment, not speculatively.

Judge honestly at each step. If option 1 looks great, ship it and move on. If option 2 works, ship it. Don't over-invest in bespoke unless the placeholder is visibly the weak link.

### Post-processing chain (pmndrs `postprocessing` library)
```
EffectComposer
├── RenderPass (orb scene)
├── BloomEffect (intensity 1.2, luminanceThreshold 0.2, luminanceSmoothing 0.4, mipmapBlur true, kernelSize LARGE)
├── ChromaticAberrationEffect (offset [0.0015, 0.0015])
├── NoiseEffect (premultiply true, opacity 0.04)
└── VignetteEffect (offset 0.3, darkness 0.6)
```

### Orb state through scroll
| Scroll | Position | Displacement | Color shift | Notes |
|-------:|----------|:------------:|:-----------:|-------|
| 0.00 | (0, 0, 5) | 0.02 | brand teal | Dormant point-of-light |
| 0.10 | (0, 0, 0) | 0.04 | brand teal | Reveals as orb, breathes |
| 0.25 | splits into 4 | 0.10 | adds white burst | Outcomes section |
| 0.50 | (0, 0, -2) | 0.06 | brand teal | Orbit of 7 nodes around it |
| 0.75 | fade to bg | 0.03 | desaturated | Work grid takes over |
| 0.95 | (0, -1, 0) on floor | 0.05 | brand teal + reflection | Contact monument |

---

## 7. TECH STACK

```
Framework:     Vite + React 18 + TypeScript
3D:            three.js + @react-three/fiber + @react-three/drei
Post:          postprocessing (pmndrs) + @react-three/postprocessing
Scroll:        @studio-freight/lenis
Animation:     gsap (+ ScrollTrigger) + @react-three/drei useFrame
State:         zustand (one global store: scroll progress + audio state)
Styling:       Tailwind CSS 3 (utility layer only — no component lib)
Forms:         react-hook-form + zod validation
Icons:         lucide-react
Fonts:         Satoshi via Fontshare CDN
Deploy:        Vercel
```

### Project structure (target)
```
mindsai-media/
├── public/
│   ├── assets/
│   │   ├── logo/          (copied from reference/logo)
│   │   ├── hdri/          (Nano Banana Pro output)
│   │   ├── veo/           (Veo 3.1 MP4 loops for work cards)
│   │   ├── audio/         (one Pixabay track + UI sounds)
│   │   └── textures/      (optional Nano Banana Pro stills)
│   └── favicon.ico
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── scenes/
│   │   ├── Act1Hero.tsx
│   │   ├── Act2Outcomes.tsx
│   │   ├── Act3Capabilities.tsx
│   │   ├── Act4Work.tsx
│   │   └── Act5Contact.tsx
│   ├── three/
│   │   ├── Orb.tsx
│   │   ├── OrbShader.glsl.ts
│   │   ├── ParticleField.tsx
│   │   └── PostProcess.tsx
│   ├── components/
│   │   ├── Nav.tsx
│   │   ├── AudioToggle.tsx
│   │   ├── WorkCard.tsx
│   │   └── ContactForm.tsx
│   ├── lib/
│   │   ├── scroll.ts      (Lenis instance + progress store)
│   │   ├── audio.ts
│   │   └── copy.ts        (all site copy in one file — single source of truth)
│   └── styles/
│       └── globals.css    (Tailwind + Satoshi @font-face + CSS vars)
├── PROJECT_BRIEF.md       (this file — read before doing anything)
├── CLAUDE.md              (working protocol)
├── reference/             (reel, frames, logo, analysis)
├── prompts/               (Veo + Nano Banana prompts)
├── vercel.json
├── tailwind.config.ts
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 8. PHASE PLAN

Each phase produces something demo-able. Deploy to Vercel after every phase. Do not start phase N+1 without Abhishek's sign-off on phase N.

### Phase 1 — Foundation + Hero Orb ⭐ (the capabilities test)
**Goal:** Prove Opus 4.7 can render an orb on par with the reel.
- Scaffold Vite + React + TS, install all deps
- Tailwind config with brand tokens
- Satoshi loaded, globals.css with CSS custom properties for the palette
- Lenis smooth scroll + zustand store for scroll progress
- **The Orb**: R3F scene with the icosahedron, custom shader material, curl-noise displacement, refraction + dispersion, Fresnel rim
- Custom HDRI env map loaded (from Nano Banana output, Phase 1A below)
- Post chain: Bloom + CA + Noise + Vignette
- Hero typography: "Mindsai" lockup + tagline
- Deploy to Vercel preview URL

**Phase 1 exit criteria:** the orb, in a black void with the tagline, must look screenshot-worthy. If it doesn't, we iterate here until it does. **No phase 2 without a gorgeous orb.**

### Phase 1A (parallel) — Asset generation
Abhishek generates:
- 1× custom HDRI via Nano Banana Pro (prompt in `prompts/nano_banana_prompts.md`)
- 1× audio track selected from Pixabay Music (criteria in §4)

### Phase 2 — Acts 2 & 3
- Scroll-bound scene transitions (camera path + orb state keyframes)
- Orb splits into 4 outcome streams (Act 2)
- 7 orbital capability nodes with hover reveals (Act 3)
- Typography reveals tied to scroll

### Phase 3 — Act 4 Work Grid
- 6 fake case study cards (see §9)
- Video-on-hover with Veo 3.1 loops (Abhishek generates via prompts in `prompts/veo_prompts.json`)
- Case study overlay modal

### Phase 4 — Act 5 Contact + Audio + Polish
- Contact form (react-hook-form + zod) → POSTs to a Vercel serverless function that emails `hello@mindsaimedia.com`
- Audio integration (muted autoplay + unmute toggle)
- Scroll-sync of audio swells to act transitions
- Final polish pass: motion curves, typography rhythm, micro-interactions

### Phase 5 — Optimization + Launch Prep
- Lighthouse 95+ on performance (code-split Three.js, lazy-load work videos)
- Accessibility pass (prefers-reduced-motion fallback → static hero image)
- SEO meta tags, OG image, favicon
- Final Vercel prod deploy

---

## 9. FAKE CASE STUDIES (Phase 3 seed data)

Six plausible entries. Names, metrics, and industries are invented — but they should feel real. Abhishek can swap any of these for actual client work later.

```json
[
  {
    "id": "northwood-atelier",
    "name": "Northwood Atelier",
    "industry": "Luxury Furniture · UK",
    "service": "Generate Sales",
    "metric": "340% ROAS on Meta cold traffic",
    "period": "Q3 2025",
    "veo_prompt_id": "case_01"
  },
  {
    "id": "helio-clinic",
    "name": "Helio Clinic",
    "industry": "Private Healthcare · London",
    "service": "Fill Appointments",
    "metric": "1,200+ consultation bookings / month at £6.80 CPA",
    "period": "Q4 2025",
    "veo_prompt_id": "case_02"
  },
  {
    "id": "orbit-capital",
    "name": "Orbit Capital",
    "industry": "Wealth Management · Mayfair",
    "service": "Generate Leads",
    "metric": "5.2× qualified-lead volume across LinkedIn + Google",
    "period": "2025",
    "veo_prompt_id": "case_03"
  },
  {
    "id": "kelvin-rowe",
    "name": "Kelvin & Rowe",
    "industry": "D2C Spirits · UK",
    "service": "Build Awareness",
    "metric": "11M impressions · 420k engaged in 90 days",
    "period": "Q2 2025",
    "veo_prompt_id": "case_04"
  },
  {
    "id": "marlow-studios",
    "name": "Marlow Studios",
    "industry": "Architecture · International",
    "service": "Generate Leads",
    "metric": "£14M pipeline attributed in 6 months",
    "period": "2025",
    "veo_prompt_id": "case_05"
  },
  {
    "id": "aether-labs",
    "name": "Aether Labs",
    "industry": "B2B SaaS · Series A",
    "service": "Generate Sales",
    "metric": "$2.1M ARR from paid in Year 1",
    "period": "2025",
    "veo_prompt_id": "case_06"
  }
]
```

Full copy for each case study overlay (2 lines) lives in `src/lib/copy.ts`, generated in Phase 3.

---

## 10. DEFAULT DECISIONS (noted here so nothing stalls)

Where Abhishek did not specify, these are locked until he overrides:

1. **Logo in hero:** only the teal **dot** is rendered as the 3D orb. The black "M" appears as flat HTML next to the orb once the orb settles. Then "indsai" types in letter-by-letter.
2. **Background color:** pure `#000000`. Not navy.
3. **Case studies:** invented (see §9). Abhishek reviews and overrides any before Phase 3 ships.
4. **Domain:** Vercel preview URL first. Swap `mindsaimedia.com` DNS only when Abhishek approves.
5. **Scroll length:** tight — 30–45 seconds to scroll through the whole thing at a natural pace. Agency convention.
6. **Font:** Satoshi (Fontshare, free commercial).
7. **Music:** Pixabay Music free-tier ambient-electronic track (shortlist in Phase 4).

---

## 11. ASSETS — GENERATE YOURSELF FIRST, ASK AS LAST RESORT

**The working principle: the new Claude Code session generates as many assets as it can itself. Abhishek's Gemini tools (Veo 3.1 / Nano Banana Pro) are the last resort, not the first.**

### Self-generate via
- **Procedural GLSL shaders** — HDRIs, particle fields, caustic patterns, ambient loops, background plates
- **Canvas / CSS** — gradients, noise overlays, loader art
- **Free asset libraries** — Poly Haven HDRIs, lucide-react icons, Three.js example materials
- **Any MCP or image-generation tools available to the new Claude Code session itself**

### Escalation to Abhishek (only when all of the above fail)
If a self-generated asset is genuinely not of high enough quality — screenshot next to reference reel frame, be honest about the gap — *then* the new session:

1. Clearly states: *"I tried X, result was Y, asking for bespoke asset because Z"*
2. Writes the prompt right there, in context:
   - **Veo 3.1** → JSON-structured prompt (subject / action / style / camera / lighting / palette / duration / seamless_loop / aspect_ratio / output_path)
   - **Nano Banana Pro** → descriptive text with resolution, composition, palette (brand teal `#73C5CC` + pure black), mood, "no stock clichés," output path
   - **Pixabay Music** → search brief with qualifying/disqualifying characteristics
3. Waits for Abhishek to generate via Gemini and drop the file at the specified path
4. Continues the build

**Do not pre-author prompts as a deliverable. Write them only when self-generation has demonstrably failed.**

---

## 12. SUCCESS CRITERIA — THE REAL TEST

Phase 1 has **one** success criterion:

> Take a screenshot of the hero at full resolution. Put it next to a frame from the Active Theory reel. If a designer looking at both can't immediately tell which one is an agency site and which one is an AI-built marketing site, we pass. If they can tell, we iterate until they can't.

Beyond Phase 1, success criteria are:
- **Visual:** the final site, sent to 3 working designers, gets "premium-agency tier" comments.
- **Technical:** Lighthouse Performance ≥ 85, Accessibility ≥ 95, SEO 100.
- **Business:** one inbound lead from the site within 30 days of launch.
- **Capabilities test:** Abhishek can tell the story of this build — *"Opus 4.7 did this, with me directing"* — and nobody calls it marketing fluff.

---

## 13. FILES IN THIS REPO (handoff state)

```
Mindsai Media/
├── PROJECT_BRIEF.md           ← this file, source of truth
├── CLAUDE.md                  ← working protocol for Claude Code
└── reference/
    ├── reel_video.mp4         ← the 15s Active Theory reel
    ├── reel_metadata.json     ← Apify scrape (caption, author, stats)
    ├── reel_frames/           ← 11 annotated key frames (01…11)
    ├── logo/                  ← Mindsai brand assets (wordmark + icon)
    └── mindsai_home.html      ← current WP site source (for copy voice reference)
```

Everything the new Claude Code session needs to **start the conversation** is in this folder. No external context required. Asset prompts (Veo / Nano Banana / Pixabay) will be written **by the new session at the moment of need** — not pre-authored.

---

**END OF BRIEF.** Next step: open a new Claude Code session in this folder and begin Phase 1.
