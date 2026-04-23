# CLAUDE.md — Mindsai Media Website Working Protocol

## CRITICAL: READ `PROJECT_BRIEF.md` BEFORE ANYTHING ELSE

Your first action in every session on this project is to read `/PROJECT_BRIEF.md` in full. It is the source of truth for:
- What we're building and why
- The reference reel we're matching (see `reference/reel_video.mp4` and `reference/reel_frames/`)
- Brand, palette, typography, voice
- The 5-act site architecture
- The signature 3D effect (the teal orb) — full shader spec
- Tech stack and project structure
- Phase plan (currently: **Phase 1 — Foundation + Hero Orb**)
- Success criteria

After you've read it, read this file (CLAUDE.md) for working protocol, then begin Phase 1.

---

## Who You're Working With

**Abhishek Satuluri** — founder of Mindsai Media. No traditional coding background. Builds entirely through AI-assisted development in Claude Code / Google Antigravity IDE. Prefers structured, phased work with visible verification at each step.

Abhishek is the **director**. You are the **implementer**. Architecture decisions, scope decisions, and visual direction have already been made in `PROJECT_BRIEF.md`. Your job is to execute at a world-class standard within those constraints.

---

## What This Project Is

A single-page, scroll-driven, WebGL-immersive marketing website for Mindsai Media (an AI advertising & automation agency in London). It is also a deliberate capabilities test for **Claude Opus 4.7** — can the model build something on par with agency-quality sites like activetheory.net, given a clear brief and reference material?

The answer needs to be **yes**.

---

## The Reference Reel (Study This)

`reference/reel_video.mp4` is a 15-second Instagram reel of someone scrolling `activetheory.net`. The associated frames are in `reference/reel_frames/01…11_*.jpg`. These frames ARE the target aesthetic.

**Reference frames to study before writing any shader code:**
- `01_hero_logo.jpg` — dormant point-of-light + particle sparks
- `02_liquid_droplet.jpg` — curl-noise displaced refractive glass
- `06_refractive_cards.jpg` — dispersion / chromatic aberration reference
- `09_white_refraction.jpg` — peak bloom moment
- `10_pedestal_monument.jpg` — the "object as monument" framing we use in Act 5

We are **not copying** Active Theory's code, shaders, GLTF models, layout, or color system. We are working in the **same visual genre** (one shared across 20+ premium agencies — Resn, Lusion, Hello Monday, Ueno, Basement, Obys, Work & Co) with **our own brand direction**: black + teal `#73C5CC`, orb-as-protagonist narrative, Mindsai voice.

---

## Working Protocol — The Rules

### RULE 1: One phase at a time
Phases are defined in `PROJECT_BRIEF.md §8`. You work on the current phase only. Finish it, verify it against the phase exit criteria, report to Abhishek, wait for sign-off, then move to the next phase.

**Current phase: Phase 1 — Foundation + Hero Orb.**

### RULE 2: Do not skip ahead
Do not scaffold Phase 2 code "just to save time." Do not add the capabilities nodes when the brief says to build the hero orb. One phase, all the way done, before the next begins.

### RULE 3: Exit criteria matter
Every phase has an exit criterion in the brief. Phase 1's is explicit:
> The hero orb screenshot, placed next to a frame from the reel, should look like a peer — not a worse cousin. If a designer can tell which is AI-built and which is agency work at a glance, iterate.

If the orb doesn't hit the bar, we iterate in Phase 1. We do not move on and hope it looks better later.

### RULE 4: Ask when unsure; do not improvise
If something in the brief is ambiguous, ask. Do not invent new features, new sections, new copy, or new visual elements that are not in `PROJECT_BRIEF.md`. If you think the brief is wrong about something, raise it — don't silently change course.

### RULE 5: Report after every meaningful change
After each significant step (scaffolding, installing, implementing the orb, deploying), report to Abhishek with:
- What you did
- What to verify (exact steps — "scroll the page and observe X")
- What's next
- Anything unexpected

### RULE 6: Visual verification is the only verification that matters
This is a craft project. Passing tests, clean TypeScript, and a successful `npm run build` do not prove the site looks right. **Take screenshots, compare to reel frames, be honest about the gap.** If you have access to a browser preview tool, use it. If not, build locally, tell Abhishek the URL, let him look.

### RULE 7: Deploy early, deploy often
Every phase ends with a Vercel deploy. Abhishek should always have a live URL showing latest state. If `vercel deploy` fails, fix it — don't declare phase complete with a broken deploy.

### RULE 8: Never touch destructive git / deploy commands without explicit ask
No force-pushing, no reverting on main, no overwriting deploys. Abhishek drives those decisions.

### RULE 9: Respect the brand palette, typography, and voice
The six colors in `PROJECT_BRIEF.md §4` are the ONLY colors on this site. Satoshi is the ONLY typeface. The voice is provocative-exclusive. Do not soften copy, do not add stock wellness-agency language, do not introduce a second accent color for "visual interest." The discipline IS the design.

### RULE 10: When in doubt, bias toward cinematic
If a choice is between "clean and safe" vs "bold and cinematic," go cinematic. This site has to shock visitors. A conservative version of this site is a failed version.

---

## How Abhishek Works

- **He directs; you execute.** Don't second-guess architecture.
- **Step-by-step with verification.** He wants to see the result after each step before approving the next.
- **He runs asset generation separately.** HDRI, videos, and music are generated by Abhishek in Nano Banana Pro / Veo 3.1 / Pixabay using the prompts in `prompts/`. You do not write those assets — you consume them. If an asset isn't ready, either use a temporary placeholder (and flag it clearly) or wait.
- **He will give explicit instructions per session.** Listen to what he says *this* session. Don't assume you know his current priority from a previous session.
- **Reports should be concise.** A 1-paragraph status beats a 10-bullet wall of text.

---

## Tech Stack (Locked — See Brief §7 for Details)

- **Vite + React 18 + TypeScript**
- **three.js + @react-three/fiber + @react-three/drei + @react-three/postprocessing**
- **postprocessing** (pmndrs)
- **@studio-freight/lenis** (smooth scroll)
- **gsap** + ScrollTrigger (timelines)
- **zustand** (one store: scroll progress, audio state)
- **Tailwind CSS 3** (utility only — no component library)
- **react-hook-form + zod** (contact form)
- **Deploy: Vercel**

Do not add frameworks not listed here (no Next.js, no Framer Motion, no Material UI, no Bootstrap). Every additional dep is a decision that should be raised before making it.

---

## Starting A New Session — FIRST DO ANALYSIS, NOT EXECUTION

When Abhishek starts a new Claude Code session in this directory:

1. **Read `PROJECT_BRIEF.md`** (full)
2. **Read this file** (CLAUDE.md)
3. **Watch the reference reel** (`reference/reel_video.mp4`) and study the key frames (`reference/reel_frames/*`) — especially `02_liquid_droplet.jpg`, `06_refractive_cards.jpg`, `10_pedestal_monument.jpg`. Calibrate your visual target before writing any code.
4. **Report back to Abhishek** in a short message:
   - What you understand the project to be (1 sentence)
   - What phase you're about to start and what its exit criteria are
   - What you propose as the first 2–3 concrete steps
   - Any clarifying questions
5. **Wait for Abhishek's go-ahead** before running any commands. Do not scaffold, install, or generate anything until he confirms the approach.
6. Only once aligned, begin executing in small verifiable steps. Each step gets its own Vercel deploy. Abhishek verifies visually before you move on.

### The build-vs-ask decision for assets (READ CAREFULLY)

**Principle: you generate as many assets as you can yourself. Abhishek is the last resort, not the first.**

You have an enormous amount of asset-generation capability right in the build itself:
- **Procedural shaders** can produce HDRIs, particle fields, animated backgrounds, case-study ambient loops, caustic patterns, nebula textures — all as GLSL
- **Canvas + CSS** can produce gradients, noise, logos, icons
- **Free libraries** — Poly Haven for HDRIs, lucide-react for icons, Three.js examples for reference implementations
- **Any MCP / image-generation tools available in your environment** — use them

For each asset the site needs, the order of operations is:

1. **Generate it yourself** — procedural shader, procedural texture, downloaded free asset (Poly Haven etc.), or any image-gen tool you have access to.
2. **Integrate it.** Drop it into the site in context.
3. **Judge the quality honestly.** Put a screenshot next to the reel reference frames. Is this on par? Or is it visibly weaker?
4. **Iterate on your own generation once or twice.** Tune the shader parameters, try a different HDRI, try a different procedural approach.
5. **Only if it's still not good enough** — or if the task is genuinely impossible for you (e.g., real-world cinematic video footage you can't fake) — then hand Abhishek a prompt.

### When you do need Abhishek to generate via Gemini (Veo 3.1 / Nano Banana Pro)

Write the prompt *at the moment of need*, with context:

- **Veo 3.1 prompts:** JSON-structured, including keys for subject, action, style, camera, lighting, color palette (always reference brand teal `#73C5CC` and pure black `#000000`), duration (usually 5s), seamless_loop (true), aspect_ratio, and output file path (e.g. `public/assets/veo/hero_ambient.mp4`).
- **Nano Banana Pro prompts:** descriptive text, specifying exact resolution, composition, palette, mood, and what to avoid (no stock clichés — no binary code, circuit boards, rotating globes, glowing hexagons). Specify output file path.
- **Pixabay Music briefs:** search criteria + qualifying/disqualifying characteristics + target file path.

State clearly: *"I tried X (procedural shader / Poly Haven HDRI / etc.), result was Y (not cinematic enough / wrong mood / quality gap vs. reel), I'm asking for a bespoke asset because Z. Here's the prompt."* Abhishek generates it via Gemini, drops the file at the specified path, and you continue.

**Do not pre-author prompts speculatively** — write them only when you've actually attempted the alternative and determined it's insufficient.

### Phase 1 scaffold structure (once the discussion is done and you're executing)

Typical order, but stay flexible based on what Abhishek agrees:
- (a) Vite + React + TS + Tailwind scaffold
- (b) Satoshi font + brand palette tokens
- (c) Lenis smooth scroll + zustand progress store
- (d) R3F canvas mounted
- (e) Basic icosahedron rendered
- (f) Custom shader material with curl-noise displacement
- (g) Refraction + dispersion + Fresnel (with a Poly Haven HDRI as starter)
- (h) Post-process chain (Bloom + CA + Noise + Vignette)
- (i) Typography reveal + tagline
- (j) Particle field ambience

Each milestone = Vercel deploy + a screenshot compared against `reference/reel_frames/02_liquid_droplet.jpg`. If the orb looks cheap at any point, iterate there — do not keep adding features on top of a flat-looking orb.

---

## Red Flags That Mean Stop and Ask

- You're about to add a new color that isn't in the palette
- You're about to install a dep not in the brief
- You're about to add a new section / feature not in the 5-act architecture
- The orb looks wrong and you're going to "ship it anyway"
- You can't find an asset that the brief says should exist (HDRI not yet generated, etc.)
- A shader won't compile and you're about to remove the effect to make the build pass

In all of these cases: **stop, surface the issue, wait for direction.**

---

## One Final Note — What "Shock Everyone" Actually Means

Abhishek's stated outcome: "The outcome should shock everyone. 3D and immersive, exactly like the reference."

Translated into engineering terms:
- First paint should feel expensive within 1 second
- The first scroll should trigger a real visual event the user can't predict
- Every typographic moment should be oversized and confident
- Motion should feel choreographed, not reactive
- Nothing should look stock, templated, or "Bootstrap-y"

If anything you build feels like a good portfolio-template site, it's failed. We're not trying to be better than Wix. We're trying to stand next to Active Theory.

---

**You're building something that's supposed to shock people. Remember that every time you write a line of code.**
