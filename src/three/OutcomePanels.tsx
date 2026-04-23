import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { outcomes, smoothFade } from '../lib/copy'
import { useAppStore } from '../lib/store'

/**
 * Four outcome panels orbit the M during Act 2. Each panel has a composite
 * texture: the Nano-Banana-generated background image + the outcome name
 * composited as baked-in typography via CanvasTexture. Text is literally
 * PART of the image, so when the 3D panel rotates, the text rotates with it.
 *
 * Featured-one-at-a-time: the panel closest to camera is largest + brightest;
 * others recede.
 */

const ORBIT_RADIUS = 3.4
const PANEL_WIDTH = 2.6
const PANEL_HEIGHT = 1.6

/** Smoothstep helper — t outside [edge0, edge1] clamps. */
function smoothstep(edge0: number, edge1: number, t: number): number {
  const c = Math.max(0, Math.min(1, (t - edge0) / (edge1 - edge0)))
  return c * c * (3 - 2 * c)
}
// Canvas is sized 2x the panel's likely on-screen pixel width so text stays
// crisp on retina / high-DPI displays without magnification blur.
const CANVAS_W = 2560
const CANVAS_H = 1600

const OUTCOME_BG_PATHS = [
  '/assets/outcomes/outcome_01_sales.png',
  '/assets/outcomes/outcome_02_leads.png',
  '/assets/outcomes/outcome_03_appointments.png',
  '/assets/outcomes/outcome_04_awareness.png',
]

/**
 * Build a CanvasTexture that composites: (background image) + (dark overlay)
 * + (outcome index + title + description) as baked-in typography.
 *
 * This is the "text embedded in the image" behaviour — when the 3D panel
 * rotates, the text goes with it.
 */
function useCompositeTexture(
  image: HTMLImageElement | undefined,
  index: number,
  title: string,
  description: string
): THREE.CanvasTexture | null {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null)

  useEffect(() => {
    if (!image) return
    const canvas = document.createElement('canvas')
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 1) Background image (cover fit)
    const imgAspect = image.width / image.height
    const canvasAspect = canvas.width / canvas.height
    let dw = canvas.width
    let dh = canvas.height
    let dx = 0
    let dy = 0
    if (imgAspect > canvasAspect) {
      dw = canvas.height * imgAspect
      dx = (canvas.width - dw) / 2
    } else {
      dh = canvas.width / imgAspect
      dy = (canvas.height - dh) / 2
    }
    ctx.drawImage(image, dx, dy, dw, dh)

    // 2) Left-side gradient darkening so text reads well on the image
    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0)
    grad.addColorStop(0, 'rgba(0,0,0,0.78)')
    grad.addColorStop(0.5, 'rgba(0,0,0,0.45)')
    grad.addColorStop(1, 'rgba(0,0,0,0.2)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 3) Subtle bottom gradient for description readability
    const bgrad = ctx.createLinearGradient(0, canvas.height * 0.55, 0, canvas.height)
    bgrad.addColorStop(0, 'rgba(0,0,0,0)')
    bgrad.addColorStop(1, 'rgba(0,0,0,0.65)')
    ctx.fillStyle = bgrad
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Sizes scale with canvas resolution so bumping CANVAS_W/H just increases
    // rendering fidelity, keeping the same visual composition.
    const s = canvas.width / 1536
    const padX = 80 * s

    // 4) Text — index (01/02/03/04)
    ctx.fillStyle = '#73C5CC'
    ctx.font = `500 ${Math.round(42 * s)}px Satoshi, Inter, system-ui, sans-serif`
    ctx.letterSpacing = `${Math.round(8 * s)}px`
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'
    ctx.fillText(String(index + 1).padStart(2, '0'), padX, 90 * s)

    // 5) Title — big bold
    ctx.fillStyle = '#FFFFFF'
    ctx.font = `900 ${Math.round(140 * s)}px Satoshi, Inter, system-ui, sans-serif`
    ctx.fillText(title, padX, canvas.height / 2 - 90 * s)

    // 6) Description — smaller, muted
    ctx.fillStyle = 'rgba(200, 205, 215, 0.75)'
    ctx.font = `500 ${Math.round(40 * s)}px Satoshi, Inter, system-ui, sans-serif`
    // Word-wrap description to fit panel width
    const maxWidth = canvas.width - padX * 2 - 100 * s
    const words = description.split(' ')
    let line = ''
    let y = canvas.height / 2 + 90 * s
    const lineHeight = 52 * s
    for (const w of words) {
      const test = line + w + ' '
      if (ctx.measureText(test).width > maxWidth && line.length > 0) {
        ctx.fillText(line, padX, y)
        line = w + ' '
        y += lineHeight
      } else {
        line = test
      }
    }
    ctx.fillText(line, padX, y)

    // 7) Teal accent bar — bottom-left
    ctx.fillStyle = '#73C5CC'
    ctx.fillRect(padX, y + lineHeight + 30 * s, 80 * s, 3 * s)

    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.minFilter = THREE.LinearMipmapLinearFilter
    tex.magFilter = THREE.LinearFilter
    tex.anisotropy = 16
    tex.generateMipmaps = true
    tex.needsUpdate = true
    setTexture(tex)

    return () => {
      tex.dispose()
    }
  }, [image, index, title, description])

  return texture
}

/** Helper hook that loads an <img> element from a src — useful for manual composite. */
function useHtmlImage(src: string): HTMLImageElement | undefined {
  const [img, setImg] = useState<HTMLImageElement | undefined>(undefined)
  useEffect(() => {
    const im = new Image()
    im.crossOrigin = 'anonymous'
    im.onload = () => setImg(im)
    im.src = src
  }, [src])
  return img
}

export function OutcomePanels() {
  const progress = useAppStore((s) => s.scrollProgress)
  const setFeaturedOutcome = useAppStore((s) => s.setFeaturedOutcome)
  const groupRef = useRef<THREE.Group>(null!)
  const currentRotationRef = useRef(0)
  const lastFeaturedRef = useRef(-1)

  const borderMat = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#73C5CC').multiplyScalar(1.6),
      transparent: true,
      opacity: 0.65,
    })
    ;(mat as unknown as { toneMapped: boolean }).toneMapped = false
    return mat
  }, [])

  const borderGeom = useMemo(() => {
    const w = PANEL_WIDTH / 2
    const h = PANEL_HEIGHT / 2
    const g = new THREE.BufferGeometry()
    const pts = new Float32Array([
      -w, h, 0.02,
      w, h, 0.02,
      w, -h, 0.02,
      -w, -h, 0.02,
      -w, h, 0.02,
    ])
    g.setAttribute('position', new THREE.BufferAttribute(pts, 3))
    return g
  }, [])

  useFrame(() => {
    const sp = progress
    // v3 — aligned with new camera push/settle timing.
    // Push at 0.12, settled at 0.16. Panels fade IN 0.095→0.16 so by
    // the time camera settles they're fully visible. Fade OUT 0.29→0.325
    // timed to the Act 2→3 push.
    const act2Alpha = smoothFade(sp, 0.095, 0.16, 0.29, 0.325)

    if (groupRef.current) {
      // SNAP-SCROLL: divide Act 2 (0.127-0.316) into 4 slots — one per outcome.
      // Each slot HOLDS rotation for first 60% (user reads text, absorbs) and
      // TRANSITIONS over last 40% to the next panel. Purely scroll-driven:
      // user's scroll position uniquely determines which panel is featured.
      const act2Linear = Math.max(0, Math.min(1, (sp - 0.127) / (0.316 - 0.127)))
      const slotCount = outcomes.length
      const slotPos = act2Linear * slotCount
      const slotIdx = Math.min(slotCount - 1, Math.floor(slotPos))
      const slotFrac = slotPos - slotIdx
      const snapT = smoothstep(0.6, 1.0, slotFrac)
      const displayPos = slotIdx + snapT

      // Rotation offset chosen so slotIdx=0 lands Panel 0 at camera (+Z).
      // Three.js rotation.y: a panel initially at (r cos α, 0, r sin α) ends
      // up at z-world = r sin(α - rot). Max (front-facing) when α - rot = π/2.
      // For slot 0 (α=0): rot = -π/2. For slot i: rot = -π/2 + i·π/2.
      const rot = -Math.PI / 2 + displayPos * (Math.PI / 2)
      groupRef.current.rotation.y = rot
      groupRef.current.rotation.x = 0.04
      currentRotationRef.current = rot

      groupRef.current.scale.setScalar(act2Alpha)
      groupRef.current.visible = act2Alpha > 0.01

      if (slotIdx !== lastFeaturedRef.current) {
        lastFeaturedRef.current = slotIdx
        setFeaturedOutcome(slotIdx)
      }
    }
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {outcomes.map((o, i) => {
        const angle = (i / outcomes.length) * Math.PI * 2
        const x = Math.cos(angle) * ORBIT_RADIUS
        const z = Math.sin(angle) * ORBIT_RADIUS
        return (
          <AnglingPanel
            key={o.id}
            position={[x, 0, z]}
            baseAngle={angle}
            bgSrc={OUTCOME_BG_PATHS[i]}
            index={i}
            title={o.title}
            description={o.description}
            borderMat={borderMat}
            borderGeom={borderGeom}
            currentRotationRef={currentRotationRef}
          />
        )
      })}
    </group>
  )
}

interface AnglingPanelProps {
  position: [number, number, number]
  baseAngle: number
  bgSrc: string
  index: number
  title: string
  description: string
  borderMat: THREE.LineBasicMaterial
  borderGeom: THREE.BufferGeometry
  currentRotationRef: React.MutableRefObject<number>
}

function AnglingPanel({
  position,
  baseAngle,
  bgSrc,
  index,
  title,
  description,
  borderMat: _sharedBorderMat,
  borderGeom,
  currentRotationRef,
}: AnglingPanelProps) {
  // Frontness state only drives imperative material/scale updates inside
  // useFrame — we don't render it, so we skip the value from destructuring
  // to keep TS strict-mode happy.
  const [, setFrontness] = useState(0)
  // Emerge group wraps the Billboard. Its position lerps from (0,0,0) to the
  // panel's orbital target over a per-panel staggered window early in Act 2,
  // so the panels visibly FLY OUT FROM THE M'S CENTRE rather than appearing
  // already-in-position. Panel scale also ramps 0→1 across the same window.
  const emergeGroupRef = useRef<THREE.Group>(null!)
  const panelScaleRef = useRef<THREE.Group>(null!)
  const image = useHtmlImage(bgSrc)
  const texture = useCompositeTexture(image, index, title, description)
  const progress = useAppStore((s) => s.scrollProgress)

  const panelMat = useMemo(() => {
    if (!texture) return null
    return new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.05,
      toneMapped: false,
    })
  }, [texture])

  // Per-panel border material so we can fade each panel's frame independently
  // based on its frontness (the shared prop would affect all panels at once).
  const borderMat = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#73C5CC').multiplyScalar(1.6),
      transparent: true,
      opacity: 0.05,
    })
    ;(mat as unknown as { toneMapped: boolean }).toneMapped = false
    return mat
  }, [])

  useFrame(() => {
    // ─── Emergence animation ──────────────────────────────────────────
    // v3 — emergeStart aligned with push 0.12 so panels materialise
    // DURING the flare. Panel 0: 0.10 → 0.16, Panel 3: 0.136 → 0.196.
    // By the time camera settles at 0.16, panel 0 is fully emerged,
    // panels 1-3 are still materialising, which reads as "they're still
    // arriving" and hides any abrupt camera transition.
    const emergeStart = 0.10 + index * 0.012
    const emergeEnd = emergeStart + 0.06
    const rawEmerge = Math.max(
      0,
      Math.min(1, (progress - emergeStart) / (emergeEnd - emergeStart))
    )
    // Smooth the ramp so panels don't snap at window edges.
    const emergenceT = rawEmerge * rawEmerge * (3 - 2 * rawEmerge)

    if (emergeGroupRef.current) {
      emergeGroupRef.current.position.x = position[0] * emergenceT
      emergeGroupRef.current.position.z = position[2] * emergenceT
      emergeGroupRef.current.scale.setScalar(emergenceT)
    }

    // ─── Frontness (for orbital featured / ghost scaling) ─────────────
    // Frontness matches actual world z after group rotation:
    //   z' = r sin(baseAngle - rot)
    // Max at baseAngle - rot = π/2 → panel faces camera.
    const worldAngle = baseAngle - currentRotationRef.current
    const f = (Math.sin(worldAngle) + 1) * 0.5
    setFrontness(f)

    if (panelScaleRef.current) {
      const s = 0.35 + Math.pow(f, 1.4) * 0.9
      panelScaleRef.current.scale.setScalar(s)
    }

    // Panels fade back-to-invisible via opacity, but during emergence
    // we need the panel to be visible at all EMERGENCE values (not just
    // when front-facing) — otherwise newly-emerging panels are invisible
    // because they start at baseAngle that may not face camera. So we
    // weight opacity by emergenceT too: during emergence the panel is
    // visible regardless of frontness; after emergence, the normal
    // front/back opacity applies.
    const frontOpacity = 0.05 + Math.pow(f, 3.0) * 0.9
    const emergenceOpacity = Math.min(
      1,
      emergenceT + frontOpacity
    )

    if (panelMat) {
      panelMat.opacity = emergenceOpacity
    }
    if (borderMat) {
      borderMat.opacity = Math.min(0.8, emergenceT * 0.6 + Math.pow(f, 3.0) * 0.7)
    }
  })

  if (!panelMat) return null

  return (
    <group ref={emergeGroupRef}>
      <Billboard follow={true}>
        <group ref={panelScaleRef}>
          <mesh material={panelMat}>
            <planeGeometry args={[PANEL_WIDTH, PANEL_HEIGHT]} />
          </mesh>
          <lineSegments>
            <bufferGeometry attach="geometry" {...borderGeom} />
            <primitive object={borderMat} attach="material" />
          </lineSegments>
        </group>
      </Billboard>
    </group>
  )
}
