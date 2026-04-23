import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Noise,
  Vignette,
  DepthOfField,
  GodRays,
} from '@react-three/postprocessing'
import { BlendFunction, KernelSize } from 'postprocessing'
import { Vector2 } from 'three'
import type * as THREE from 'three'

interface PostProcessProps {
  sunMesh?: THREE.Mesh | null
}

export function PostProcess({ sunMesh }: PostProcessProps) {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {sunMesh ? (
        <GodRays
          sun={sunMesh}
          blendFunction={BlendFunction.SCREEN}
          samples={28}
          density={0.92}
          decay={0.94}
          weight={0.12}
          exposure={0.14}
          clampMax={0.7}
          kernelSize={KernelSize.SMALL}
          blur={true}
        />
      ) : (
        <></>
      )}
      {/* DoF: focusDistance now 0.5 (was 0.016 which put focus plane ~1.6%
          of scene depth from camera, throwing HTML-overlay-depth text into
          bokeh). Bokeh scale reduced so depth separation is cinematic but
          doesn't over-blur mid-ground cards. */}
      <DepthOfField
        focusDistance={0.5}
        focalLength={0.08}
        bokehScale={1.5}
        height={720}
      />
      {/* Bloom: threshold raised 0.32 → 0.7 so only genuinely emissive 3D
          (teal dot, particles, god-ray source) blooms. White UI text used
          to cross the 0.32 threshold and halo — no more. */}
      <Bloom
        intensity={0.75}
        luminanceThreshold={0.7}
        luminanceSmoothing={0.35}
        mipmapBlur
        kernelSize={KernelSize.MEDIUM}
      />
      {/* CA: offset dropped to ~1/3, radialModulation ON so chromatic split
          only visibly fringes at screen edges (like a real lens), not across
          every letter of body copy. modulationOffset=0.35 keeps the centre
          third clean — where most reading happens. */}
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={new Vector2(0.00035, 0.00035)}
        radialModulation={true}
        modulationOffset={0.35}
      />
      <Noise premultiply opacity={0.045} />
      <Vignette offset={0.28} darkness={0.82} />
    </EffectComposer>
  )
}
