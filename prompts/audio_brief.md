# Ambient Soundtrack — Sourcing Brief

**Purpose:** One ambient-electronic track that loops beneath the entire site. Muted on load; unmutes via toggle in bottom-right corner.

## Source
**Pixabay Music** (royalty-free, no attribution required under the current license).
Backup: Uppbeat free tier.

## Selection Criteria

**MUST have:**
- Deep bass drone as the foundation
- Subtle high-frequency shimmer / synth pad
- A rising pulse that breathes (something that builds slightly over 30–60s rather than a flat pad)
- 90+ seconds in duration (so it loops without an obvious return marker)
- Seamless loop possible (or gentle enough tail that a loop-stitch works)
- Genre neighbour: ByAstral's "YOU CAN ASK THE FLOWERS" (the reel's track)

**MUST NOT have:**
- Vocals (any — even chanting or whispers)
- A melody you could hum
- Distinct percussion (kick/snare). Atmospheric drum-pad or rolling bass OK.
- A hard drop or obvious climax that would disrupt the calm
- Any saturated EDM / club sound

## Tags to search on Pixabay
`ambient`, `electronic`, `cinematic`, `atmospheric`, `dark`, `slow`, `drone`, `pad`, `pulse`, `texture`, `breathing`

## File specs
- **Format:** MP3 (128–192 kbps — small enough for web, high enough for quality)
- **Duration:** 90s–180s
- **Drop path:** `public/assets/audio/ambient.mp3`
- Once dropped, the AudioSystem component will auto-use it (no code change needed)

## QA after drop
- Load page; toggle "Sound on" at bottom-right; track should fade in muted→full
- Scroll through all 5 acts; track should loop without a jarring stitch
- Audio should feel like it BELONGS under the visuals — if it fights for attention, reject and find a new one
