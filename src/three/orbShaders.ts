export const vertexShader = /* glsl */ `
  // Stefan Gustavson / Ashima 3D simplex noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  vec3 snoiseVec3(vec3 x) {
    return vec3(
      snoise(vec3(x.x, x.y, x.z)),
      snoise(vec3(x.x + 100.0, x.y - 100.0, x.z + 100.0)),
      snoise(vec3(x.x - 100.0, x.y + 100.0, x.z - 100.0))
    );
  }

  vec3 curlNoise(vec3 p) {
    const float e = 0.1;
    vec3 dx = vec3(e, 0.0, 0.0);
    vec3 dy = vec3(0.0, e, 0.0);
    vec3 dz = vec3(0.0, 0.0, e);
    vec3 p_x0 = snoiseVec3(p - dx);
    vec3 p_x1 = snoiseVec3(p + dx);
    vec3 p_y0 = snoiseVec3(p - dy);
    vec3 p_y1 = snoiseVec3(p + dy);
    vec3 p_z0 = snoiseVec3(p - dz);
    vec3 p_z1 = snoiseVec3(p + dz);
    float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;
    float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;
    float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;
    const float divisor = 1.0 / (2.0 * e);
    return vec3(x, y, z) * divisor;
  }

  uniform float uTime;
  uniform float uDisplacementStrength;
  uniform float uNoiseScale;
  uniform float uVelocity;

  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewDirection;
  varying float vVelocity;

  void main() {
    vec3 np = position * uNoiseScale + vec3(uTime * 0.15);
    vec3 noise = curlNoise(np);
    // Velocity boosts displacement so fast scroll ripples the glass surface
    // visibly, like a wave passing through water. Base + up to 5× on flick.
    float disp = length(noise) * uDisplacementStrength * (1.0 + uVelocity * 5.0);
    vec3 displaced = position + normal * disp;

    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vWorldPosition = worldPos.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDirection = normalize(cameraPosition - worldPos.xyz);
    vVelocity = uVelocity;

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

export const fragmentShader = /* glsl */ `
  uniform sampler2D uEnvMap;
  uniform float uIOR;
  uniform float uDispersion;
  uniform vec3 uTint;
  uniform float uTintStrength;
  uniform float uFresnelPower;
  uniform float uFresnelBoost;
  uniform float uReflectionMix;
  uniform float uTime;
  uniform float uIridescenceStrength;
  uniform float uSeed;
  uniform float uOpacity;

  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewDirection;
  varying float vVelocity;

  #define PI 3.14159265359
  #define TAU 6.28318530718

  vec2 equirectUv(vec3 dir) {
    return vec2(
      atan(dir.z, dir.x) * (1.0 / TAU) + 0.5,
      asin(clamp(dir.y, -1.0, 1.0)) * (1.0 / PI) + 0.5
    );
  }

  // Rec.709 luma coefficients
  float rgbLuma(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
  }

  // Reinhard tone map — compresses HDR (0..inf) into LDR (0..1)
  float tonemap(float x) {
    x = max(x, 0.0);
    return x / (1.0 + x);
  }

  // Hash-based noise for surface micro-imperfections (scratches / brush strokes)
  float hash31(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float surfaceNoise(vec3 p) {
    // fBm with two octaves — enough for subtle texture, cheap
    float n = 0.0;
    n += hash31(p * 40.0) * 0.5;
    n += hash31(p * 90.0) * 0.25;
    return n;
  }

  // Thin-film iridescence: map a phase value to a spectral rainbow colour.
  // Phase is driven by (viewing angle + surface position + time) so the
  // iridescent sheen subtly shifts as the viewer/camera moves relative
  // to the glass. Cheap version — full spectral solver would be overkill.
  vec3 iridescence(float phase) {
    phase = fract(phase);
    // Three sine waves offset by 120° → smooth rainbow.
    return vec3(
      0.5 + 0.5 * sin(phase * TAU + 0.0),
      0.5 + 0.5 * sin(phase * TAU + 2.094),
      0.5 + 0.5 * sin(phase * TAU + 4.189)
    );
  }

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(vViewDirection);

    // Surface micro-imperfection: perturb normal by a tiny noise-driven delta.
    // Simulates the imperceptible roughness of hand-polished glass.
    float scratchX = (surfaceNoise(vWorldPosition + 3.7) - 0.5) * 0.025;
    float scratchY = (surfaceNoise(vWorldPosition + 11.3) - 0.5) * 0.025;
    N = normalize(N + vec3(scratchX, scratchY, 0.0));

    // Velocity-pumped dispersion: scrolling fast widens the RGB IOR split,
    // so the rainbow fringe on bar edges visibly blooms during a flick.
    float dispScale = uDispersion * (1.0 + vVelocity * 3.0);
    float iorR = 1.0 / (uIOR - dispScale);
    float iorG = 1.0 / uIOR;
    float iorB = 1.0 / (uIOR + dispScale);

    vec3 refR = refract(-V, N, iorR);
    vec3 refG = refract(-V, N, iorG);
    vec3 refB = refract(-V, N, iorB);

    // Body exposure — deliberately dim so the orb reads as glass, not a lightbulb.
    // The teal rim + inner glow provide the brand accent against this dim body.
    float exposure = 0.85;

    // Body: single-direction grayscale, Reinhard-tonemapped
    float bodyLum = tonemap(rgbLuma(texture2D(uEnvMap, equirectUv(refG)).rgb) * exposure);
    vec3 body = vec3(bodyLum);

    // Reflection: pure grayscale, slightly brighter than body (glass rim highlights)
    float reflectLum = tonemap(rgbLuma(texture2D(uEnvMap, equirectUv(reflect(-V, N))).rgb) * exposure * 1.6);
    vec3 reflected = vec3(reflectLum);

    float NdotV = max(dot(N, V), 0.0);
    float fresnel = pow(1.0 - NdotV, uFresnelPower);

    // Base glass: body interior, reflection rim
    vec3 color = mix(body, reflected, fresnel * uReflectionMix);

    // Dispersion fringe (grayscale body; RGB split only at silhouette via fresnel^2)
    float lumR = tonemap(rgbLuma(texture2D(uEnvMap, equirectUv(refR)).rgb) * exposure);
    float lumB = tonemap(rgbLuma(texture2D(uEnvMap, equirectUv(refB)).rgb) * exposure);
    vec3 fringe = vec3(lumR - bodyLum, 0.0, lumB - bodyLum);
    color += fringe * fresnel * fresnel * 1.6;

    // IRIDESCENCE — thin-film-style spectral sheen. Clamped to the
    // silhouette via fresnel^3 and weighted low so it's a *whisper* of
    // rainbow, not a disco ball. The orb should read as premium dark
    // glass first, iridescent second. Per-visitor seed offsets the phase
    // so two visitors see subtly different sheen patterns — the
    // "it remembers me" brand tell.
    float iridPhase =
      NdotV * 2.5
      + vWorldPosition.y * 0.35
      + uTime * 0.08
      + uSeed * 6.283;
    vec3 iridColor = iridescence(iridPhase);
    color += iridColor * fresnel * fresnel * fresnel * uIridescenceStrength;

    // ANISOTROPY — subtle directional specular, also rim-gated. The
    // stripe pattern simulates a polished brushed finish on the bars.
    vec3 H = normalize(V + vec3(0.0, 1.0, 0.0));
    float aniso = pow(max(dot(N, H), 0.0), 96.0);
    aniso *= (0.5 + 0.5 * sin(vWorldPosition.y * 22.0));
    // Gate by fresnel so the highlight only appears near edges, not across
    // the flat face of the bar (which would read like a white box).
    color += vec3(aniso) * 0.08 * fresnel;

    // Teal ACCENT 1: Fresnel rim — the signature brand tell.
    // Velocity pumps rim intensity so fast scroll makes the orb glow brighter.
    color += uTint * fresnel * uFresnelBoost * (1.0 + vVelocity * 0.8);

    // Teal ACCENT 2: soft inner luminosity — orb whispers teal from within
    float inner = smoothstep(0.0, 0.7, 1.0 - NdotV);
    color += uTint * inner * 0.25;

    // uOpacity fades the whole mark out when the camera gets
    // dangerously close to the geometry (prevents near-plane clipping
    // + "hollow inside of mesh" artifacts during Act 1→2 push frames).
    gl_FragColor = vec4(color, uOpacity);
  }
`
