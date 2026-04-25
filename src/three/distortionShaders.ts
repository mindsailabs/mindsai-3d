/**
 * Scroll-velocity-driven media distortion shaders.
 *
 * Used by DistortedMediaPlane to render any sampler2D source (VideoTexture
 * for case-study videos, CanvasTexture for outcome panels) with effects
 * that intensify with Lenis scroll velocity:
 *
 *   1. RIPPLE WARP   — UV displacement emanating from centre, sin-based
 *                       cresting waves. Velocity-gated.
 *   2. PIXELATION    — UV quantization into a pixel grid. Kicks in above
 *                       velocity 0.4. Net effect: fast scroll briefly
 *                       resolves the image into a crunched mosaic before
 *                       it settles back to crisp.
 *   3. CHROMATIC ABERRATION — Per-channel UV offset from centre. RGB
 *                       splits along the radial direction; intensifies
 *                       with velocity. Reads as "lens stress at speed."
 *   4. VIGNETTE      — Subtle radial dim toward edges, always on. Holds
 *                       the cinematic frame regardless of scroll state.
 *
 * Every effect collapses to identity when uVelocity = 0 → idle scene
 * shows the source media crisp and clean. When user scrolls fast, the
 * visual chaos peaks; when they stop, it settles in ~200ms via JS-side
 * exponential smoothing of uVelocity.
 */

export const distortionVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const distortionFragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uVelocity;       // 0..1 (smoothed scroll velocity)
  uniform float uTime;            // seconds since render start
  uniform float uHover;           // 0..1 hover spike
  uniform float uOpacity;         // 0..1 plane opacity (for fades)
  uniform float uReduceMotion;    // 1 = reduced-motion mode → kill effects
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    vec2 center = vec2(0.5);

    // Intensity = scroll velocity ONLY. Earlier version added a 30%
    // always-on contribution from uHover for "featured" cards, which
    // produced a constant wobble on idle videos (user feedback: case
    // study videos looked bent at rest). Now hover only drives the
    // vignette brightness in step 4 — ripple/CA/pixelation are pure
    // velocity-driven, idle = perfectly crisp.
    float intensity = uVelocity * (1.0 - uReduceMotion);

    // ─── 1. RIPPLE WARP ────────────────────────────────────────────
    // Concentric sine ripple radiating from centre. Phase animates
    // with uTime so the wave moves outward continuously when active.
    vec2 toCenter = uv - center;
    float dist = length(toCenter);
    float ripple = sin(dist * 22.0 - uTime * 3.5) * 0.06 * intensity;
    uv += toCenter * ripple;

    // ─── 2. PIXELATION ─────────────────────────────────────────────
    // Above velocity 0.35, quantize UVs into a pixel grid that gets
    // coarser with velocity. Smoothstep gate avoids a hard pop.
    float pixelGate = smoothstep(0.35, 0.85, uVelocity) * (1.0 - uReduceMotion);
    if (pixelGate > 0.0) {
      float pixelSize = mix(800.0, 60.0, pixelGate);
      vec2 pixelUv = floor(uv * pixelSize) / pixelSize;
      uv = mix(uv, pixelUv, pixelGate);
    }

    // ─── 3. CHROMATIC ABERRATION ──────────────────────────────────
    // RGB channel offset along the radial direction. Centre stays
    // clean; edges get the most splitting.
    float caStrength = intensity * 0.014;
    vec2 dir = normalize(toCenter + 0.0001) * dist;
    float r = texture2D(uTexture, uv - dir * caStrength).r;
    float g = texture2D(uTexture, uv).g;
    float b = texture2D(uTexture, uv + dir * caStrength).b;
    vec3 color = vec3(r, g, b);

    // ─── 4. VIGNETTE ───────────────────────────────────────────────
    // Always-on subtle radial darkening toward edges. Independent of
    // velocity — keeps the cinematic frame on idle states. Hover
    // brightens the centre slightly (the only effect uHover drives now)
    // so featured cards have a subtle "spotlight on me" cue without
    // the wobble that plagued v1.
    float vignette = 1.0 - smoothstep(0.5, 0.95, dist);
    color *= mix(0.85, 1.0, vignette);
    color *= 1.0 + uHover * 0.12 * (1.0 - dist);

    // Final alpha — uOpacity for plane-level fades.
    gl_FragColor = vec4(color, uOpacity);
  }
`
