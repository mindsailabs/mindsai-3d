import { useLoader, useFrame } from '@react-three/fiber'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { vertexShader, fragmentShader } from './orbShaders'
import { useAppStore } from '../lib/store'
import { useSessionSeed } from '../lib/useSessionSeed'
import { useReducedMotion } from '../lib/useReducedMotion'

/**
 * MindsAI mark — the narrative spine.
 *   – Two slanting glass BARS leaning LEFT (tops tilt left, bottoms right)
 *   – One emissive teal SPHERE dot at the lower-left
 *
 * Scroll choreography:
 *   Act 1 (0-0.127):    hero state, subtle sway
 *   Act 2 (0.127-0.316): bars SEPARATE horizontally (M "dissolves"), dim slightly
 *   Act 3 (0.316-0.506): bars reform + contract slightly, orbital nodes appear around it
 *   Act 4 (0.506-0.861): work cards dominate the orbit, M shrinks
 *   Act 5 (0.861-1.0):   monument pedestal — M returns larger
 */

interface MindsMarkProps {
  scale?: number
  onDotMount?: (mesh: THREE.Mesh) => void
}

const BAR_WIDTH = 0.52
const BAR_HEIGHT = 1.7
const BAR_DEPTH = 0.52
const LEAN_RADIANS = THREE.MathUtils.degToRad(16)
const BAR_SEPARATION = 0.66

// Dot matches the official MindsAI logo mark: a solid teal circle positioned
// OUTSIDE-LEFT of the M, roughly 84% down the bar height (near the bottom).
// Sits OUTSIDE the swaying innerRef so it stays anchored as the bars tumble
// above it. Measured from reference/logo/mindsai_icon_512.png — the dot is
// ~45% of bar width in diameter, lower-left position, nearly touching the
// left bar's left edge.
const DOT_POSITION: [number, number, number] = [-0.9, -0.6, 0]
const DOT_RADIUS = 0.26

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export function MindsMark({ scale = 1, onDotMount }: MindsMarkProps) {
  const hdr = useLoader(RGBELoader, '/assets/hdri/brown_photostudio_01_2k.hdr')
  hdr.mapping = THREE.EquirectangularReflectionMapping

  const scrollProgress = useAppStore((s) => s.scrollProgress)
  const formSubmitted = useAppStore((s) => s.formSubmitted)
  const { numeric: seedNumeric } = useSessionSeed()
  const reducedMotion = useReducedMotion()

  const groupRef = useRef<THREE.Group>(null!)
  const innerRef = useRef<THREE.Group>(null!)
  const leftBarRef = useRef<THREE.Mesh>(null!)
  const rightBarRef = useRef<THREE.Mesh>(null!)
  const leftMatRef = useRef<THREE.ShaderMaterial>(null!)
  const dotRef = useRef<THREE.Mesh>(null!)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uEnvMap: { value: hdr },
      uIOR: { value: 1.48 },
      uDispersion: { value: 0.055 },
      uTint: { value: new THREE.Color('#73C5CC') },
      uTintStrength: { value: 0.0 },
      uFresnelPower: { value: 2.0 },
      uFresnelBoost: { value: 1.75 },
      uReflectionMix: { value: 0.55 },
      uDisplacementStrength: { value: 0.0012 },
      uNoiseScale: { value: 1.2 },
      // Scroll velocity (smoothed) — the shader uses this to pump dispersion
      // and displacement when users flick scroll. Idle = 0, active scroll
      // pushes it toward ~1.5. Populated from Lenis in useFrame.
      uVelocity: { value: 0 },
      // Iridescence strength — kept subtle so the orb still reads as
      // premium dark glass first, with a whisper of rainbow sheen only
      // at the silhouette.
      uIridescenceStrength: { value: 0.18 },
      // Session seed — a float in [0,1) unique to this visitor this day.
      // Feeds into iridescence phase offset + a subtle displacement bias
      // so each visitor's M is a one-of-one variation. Almost imperceptible
      // individually, but combined with the "Your signature: M-XXXX-XXXX"
      // reveal on the contact success state, creates the "it remembered
      // me" brand moment.
      uSeed: { value: seedNumeric },
      // Near-plane fade. 1 = fully visible, 0 = invisible. Driven by
      // camera distance in useFrame — prevents the M from clipping into
      // the near plane during Act 1→2 and Act 3→4 push frames.
      uOpacity: { value: 1 },
    }),
    [hdr, seedNumeric]
  )

  const dotMaterial = useMemo(() => {
    // Solid teal — no emissive multiplier. The logo dot is a flat brand color,
    // not a glowing bead. Keeps the mark reading as the official logo.
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#73C5CC'),
    })
    mat.toneMapped = false
    return mat
  }, [])

  // Smoothed scroll velocity — read from Lenis each frame. Exponential decay
  // means a fast wheel-flick pumps the value up, then it eases back down
  // over ~0.4s even if the user stops scrolling.
  const smoothedVelocity = useRef(0)

  // Hover spike — pointer entering the M's 3D bounds adds a temporary
  // bump to the effective velocity. Decays over ~0.6s after hover leaves.
  const hoverSpike = useRef(0)
  const hoverTarget = useRef(0)

  // Submit pulse — a big one-shot spike when the contact form submits. The
  // M "answers" by pumping fresnel + dispersion for ~3s, then settling.
  const submitPulse = useRef(0)
  const submitPulseStart = useRef<number | null>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const sp = scrollProgress

    // Read Lenis velocity off window.__lenis (set by App.tsx). Normalise to
    // roughly [0, 1.5] and decay toward target each frame.
    const lenis = (window as unknown as { __lenis?: { velocity: number } }).__lenis
    const rawVel = lenis ? Math.abs(lenis.velocity) : 0
    const targetVel = Math.min(1.8, rawVel * 0.015)
    smoothedVelocity.current +=
      (targetVel - smoothedVelocity.current) * 0.14

    // Ease hover spike toward target (1 when hovered, 0 when not) with a
    // slower rise than fall so hover feels deliberate, not twitchy.
    const hoverLerpRate =
      hoverTarget.current > hoverSpike.current ? 0.08 : 0.04
    hoverSpike.current +=
      (hoverTarget.current - hoverSpike.current) * hoverLerpRate

    // Submit pulse: when the form submits, trigger a 3-second bell curve
    // of pump intensity. Read the elapsed time to shape it.
    if (formSubmitted && submitPulseStart.current === null) {
      submitPulseStart.current = t
    } else if (!formSubmitted && submitPulseStart.current !== null) {
      submitPulseStart.current = null
      submitPulse.current = 0
    }
    if (submitPulseStart.current !== null) {
      const dt = t - submitPulseStart.current
      // Bell curve peaked at t=1.0s, back to ~0 at t=3.0s.
      // Shape: 2.2 * dt * exp(-1.2 * dt^2) — fast rise, exponential decay.
      const shape = 2.2 * dt * Math.exp(-1.2 * dt * dt)
      submitPulse.current = Math.max(0, Math.min(2.0, shape))
    }

    // Combined uniform = scroll velocity + hover bump + submit pulse. The
    // submit pulse is the biggest of the three so the "we received you"
    // moment is unmistakable on the orb itself.
    const combinedVelocity =
      smoothedVelocity.current +
      hoverSpike.current * 0.9 +
      submitPulse.current * 1.3

    // Near-plane fade: measure camera distance to the M group. When
    // camera is very close (< 2.2 units), start fading the shader alpha
    // so the mesh dissolves gracefully instead of clipping the near plane.
    // Safe zone (>= 3.0): fully opaque. Fade band 3.0 → 1.2. Below 1.2 =
    // fully invisible (camera is essentially inside the mark).
    let nearFade = 1.0
    if (groupRef.current) {
      const camPos = state.camera.position
      const markPos = groupRef.current.position
      const dx = camPos.x - markPos.x
      const dy = camPos.y - markPos.y
      const dz = camPos.z - markPos.z
      const camDistance = Math.sqrt(dx * dx + dy * dy + dz * dz)
      // smoothstep(1.2, 3.0, camDistance) — fade in as camera moves away
      const t1 = Math.max(0, Math.min(1, (camDistance - 1.2) / (3.0 - 1.2)))
      nearFade = t1 * t1 * (3 - 2 * t1)
    }

    // Close-range premium-glass boost factor, applied to per-uniform
    // updates below once toAct5 etc. are declared. 1 at peak push,
    // 0 at safe distance (>= 3 units).
    const closeRange = 1 - nearFade

    if (leftMatRef.current) {
      leftMatRef.current.uniforms.uTime.value = t
      leftMatRef.current.uniforms.uVelocity.value = combinedVelocity
      leftMatRef.current.uniforms.uOpacity.value = nearFade
    }

    // ---- Scroll-driven choreography ----

    // SPINE BEHAVIOR: M stays visible in every act as the anchor. It scales
    // per act, shrinking when orbital content needs room and returning to
    // full height for the hero and monument moments.
    //
    // Act 1 (0-0.127):    1.00, hero framing
    // Act 2 (0.127-0.316): 0.55, outcome panels orbit around it
    // Act 3 (0.316-0.506): 1.00, centre of capability ring
    // Act 4 (0.506-0.861): 0.40, work cards dominate the orbit
    // Act 5 (0.861-1.0):   1.10, monument pedestal — slightly larger than hero

    const toAct2 = smoothstep(0.10, 0.15, sp)
    const fromAct2 = smoothstep(0.28, 0.33, sp)
    const inAct2 = toAct2 * (1 - fromAct2)

    // Act 3: the M is the centre of the capability apparatus. Its expression
    // should read as FOCUSED / COMPRESSED — reduced sway, bars slightly
    // contracted, subtle extra teal inner glow (the mind "gathers in").
    const toAct3 = smoothstep(0.32, 0.36, sp)
    const fromAct3 = smoothstep(0.48, 0.52, sp)
    const inAct3 = toAct3 * (1 - fromAct3)

    const toAct4 = smoothstep(0.48, 0.55, sp)
    const fromAct4 = smoothstep(0.84, 0.88, sp)
    const inAct4 = toAct4 * (1 - fromAct4)

    const toAct5 = smoothstep(0.85, 0.90, sp)

    const scaleCurve = 1 - inAct2 * 0.45 - inAct4 * 0.6 + toAct5 * 0.1

    const act2Pulse = inAct2 * 0.15
    // Act 3 contraction: bars draw slightly inward.
    const act3Contraction = inAct3 * 0.06
    const extraSeparation = act2Pulse - act3Contraction
    const extraY = 0

    const act2Scale = scaleCurve
    const act3Scale = 1
    const act4Fade = 1

    // Sway dampening — Act 3 halves sway, Act 4 further reduces (M
    // withdrawn, cards lead), Act 5 near-stills it (monument stance).
    const swayDamp =
      (1 - inAct3 * 0.5) * (1 - inAct4 * 0.7) * (1 - toAct5 * 0.88)

    // Per-act uniform tweaks for the shader. Fresnel rim dims in Act 4
    // (silhouette / withdrawn), brightens in Act 5 (monument glow).
    // Close-range boosts (see `closeRange` above) pump reflection +
    // iridescence + teal tint when the camera is near the M, so push
    // frames read as luminous frosted glass instead of the flat gray
    // that low-Fresnel at close range would otherwise produce.
    const fresnelActBias = -inAct4 * 0.55 + toAct5 * 0.6
    if (leftMatRef.current) {
      leftMatRef.current.uniforms.uFresnelBoost.value =
        1.75 + fresnelActBias + closeRange * 0.9
      leftMatRef.current.uniforms.uIridescenceStrength.value =
        0.18 + toAct5 * 0.08 + closeRange * 0.32
      leftMatRef.current.uniforms.uReflectionMix.value =
        0.55 + closeRange * 0.35
      leftMatRef.current.uniforms.uTintStrength.value = closeRange * 0.25
    }

    // ---- Apply transformations ----

    // Bars fly outward (x) AND upward (y) during Act 2 dissolve — creates sense
    // of light streaming off-frame toward the 4 outcome corners.
    if (leftBarRef.current) {
      leftBarRef.current.position.x = -BAR_SEPARATION / 2 - extraSeparation
      leftBarRef.current.position.y = extraY
    }
    if (rightBarRef.current) {
      rightBarRef.current.position.x = BAR_SEPARATION / 2 + extraSeparation
      rightBarRef.current.position.y = extraY
    }

    if (innerRef.current) {
      // Oscillating sway. swayDamp squeezes amplitude in Acts 3/4/5 so
      // the M's character shifts from "restless glass" in Act 1/2 to
      // "focused" (3) → "withdrawn" (4) → "monument stillness" (5).
      // Reduced motion: zero sway — the M is a still portrait.
      const swayScale = reducedMotion ? 0 : swayDamp
      innerRef.current.rotation.y = Math.sin(t * 0.35) * 0.55 * swayScale
      innerRef.current.rotation.x = Math.sin(t * 0.22) * 0.09 * swayScale
      innerRef.current.rotation.z = Math.sin(t * 0.15) * 0.03 * swayScale
    }

    if (groupRef.current) {
      const breathe = 1 + Math.sin(t * 0.5) * 0.012
      const combinedScale = scale * act2Scale * act3Scale * act4Fade * breathe
      groupRef.current.scale.setScalar(combinedScale)
      groupRef.current.visible = combinedScale > 0.01

      // Act 5: translate M LEFT so the contact form has clean room on the right.
      const baseX = 0.1
      const act5OffsetX = toAct5 * -2.8
      groupRef.current.position.x = baseX + act5OffsetX
    }

    if (dotRef.current) {
      const pulse = 1 + Math.sin(t * 1.1) * 0.14
      const act2DotBoost = 1 + inAct2 * 0.3
      dotRef.current.scale.setScalar(pulse * act2DotBoost)
      // Match the nearFade on the dot so it dissolves in sync with the
      // bars (otherwise a lone teal circle would hover on-screen while
      // the M bars fade out during push frames).
      const dm = dotRef.current.material as THREE.MeshBasicMaterial
      if (dm) {
        dm.transparent = true
        dm.opacity = nearFade
      }
    }
  })

  return (
    <group
      ref={groupRef}
      position={[0.1, 0.25, 0]}
      onPointerOver={(e) => {
        e.stopPropagation()
        hoverTarget.current = 1
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        hoverTarget.current = 0
        document.body.style.cursor = ''
      }}
    >
      <group ref={innerRef}>
        <mesh ref={leftBarRef} position={[-BAR_SEPARATION / 2, 0, 0]} rotation={[0, 0, LEAN_RADIANS]}>
          <boxGeometry args={[BAR_WIDTH, BAR_HEIGHT, BAR_DEPTH, 2, 8, 2]} />
          <shaderMaterial
            key={`bar-${vertexShader.length}-${fragmentShader.length}-L`}
            ref={leftMatRef}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            uniforms={uniforms}
            transparent
          />
        </mesh>

        <mesh ref={rightBarRef} position={[BAR_SEPARATION / 2, 0, 0]} rotation={[0, 0, LEAN_RADIANS]}>
          <boxGeometry args={[BAR_WIDTH, BAR_HEIGHT, BAR_DEPTH, 2, 8, 2]} />
          <shaderMaterial
            key={`bar-${vertexShader.length}-${fragmentShader.length}-R`}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            uniforms={uniforms}
            transparent
          />
        </mesh>
      </group>

      {/* Teal "AI" dot — OUTSIDE innerRef so it stays pinned at the base while
          the bars sway above. Acts as a fixed anchor in the composition. */}
      <mesh
        ref={(m) => {
          if (m) {
            dotRef.current = m
            if (onDotMount) onDotMount(m)
          }
        }}
        position={DOT_POSITION}
        material={dotMaterial}
      >
        <sphereGeometry args={[DOT_RADIUS, 64, 64]} />
      </mesh>
    </group>
  )
}
