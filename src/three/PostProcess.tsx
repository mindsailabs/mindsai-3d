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
      <DepthOfField
        focusDistance={0.016}
        focalLength={0.06}
        bokehScale={3.5}
        height={720}
      />
      <Bloom
        intensity={0.85}
        luminanceThreshold={0.32}
        luminanceSmoothing={0.5}
        mipmapBlur
        kernelSize={KernelSize.LARGE}
      />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={new Vector2(0.0011, 0.0011)}
        radialModulation={false}
        modulationOffset={0}
      />
      <Noise premultiply opacity={0.06} />
      <Vignette offset={0.25} darkness={0.78} />
    </EffectComposer>
  )
}
