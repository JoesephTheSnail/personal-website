'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { Billboard, OrbitControls, RoundedBox, SoftShadows, Text } from '@react-three/drei';
import * as THREE from 'three';
import {
  toUnits,
  MODULE,
  MODULE_HEIGHT,
  TANK,
  TANK_UNIT_HEIGHT,
  BULK_BIN,
  PANEL,
  TRUCK,
  PANEL_TOP_OFFSET_BELOW_ROOF,
  ASSEMBLY_GAP,
  TEG_SLEEVE,
  TEG_UNIT,
  INTERNALS,
  DEMISTER,
  PCM_BLOCK,
  RICH_AMINE_POOL,
  RETURN_PUMP,
} from './captureUnitParts';
import { sfx, installAudioUnlock, setMuted, useSfxMuted } from './sfx';
import Tutorial, { TutorialHelpButton } from './Tutorial';

// ---------------------------------------------------------------------------
// Palette — one hue per part family, replacing the old run of near-identical
// greys (module #9aa0a6, bin #7b828a, TEG housing #5b7280, rails #5b6168 …
// sat as little as ΔE2000 5-10 apart and the module was only ~2:1 against the
// sky). Every family is at least ΔE2000 20 from every other, and clearly off
// the #dce9f2 sky, so they read as separate things at a glance. The legend,
// the 3D labels' dots and the guide card all read from here so they can't
// drift from the model. The truck stays neutral on purpose — it's context.
// ---------------------------------------------------------------------------
const PALETTE = {
  // capture module: indigo, with lighter tints for the small fittings
  module: { body: '#6b79d6', light: '#aab3ec', pale: '#dfe3fa' },
  // module mounting rail + brackets: a darker cousin of the module's indigo
  rail: { bar: '#4c5694', bracket: '#39427a' },
  // CO₂ tanks: cyan. `fill` is the liquid you see once the shell goes glassy.
  tanks: { body: '#2fa6c4', fill: '#161b1f', glow: '#35566a', hardware: '#b08d57', cap: '#c9a227' },
  // bulk amine bin + auger: ochre
  bin: { shell: '#c4943a', fill: '#bd8a2e', glow: '#d9952f', mid: '#a8803a', dark: '#8a6a2e', pale: '#e8d3a3' },
  // waste-heat recovery: sage-green housing, copper lead, peach sleeve
  teg: { housing: '#4f9a7c', lead: '#b9795a', sleeveWire: '#c98f77', sleeve: '#e8a98f' },
} as const;

// Text drawn on the guide card (rgba(21,23,26,0.86) over a scene that can be
// as bright as the sky, i.e. as light as #31343a) must hold WCAG contrast.
// Accents double as swatches/icons and as coloured text, so each is nudged
// lighter (same hue) only as far as the use needs: 3:1 for the non-text dot,
// border and icon, 4.5:1 for the part name.
const CARD_WORST_BG = '#31343a';
function relLum(hex: string) {
  const c = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrastRatio(a: string, b: string) {
  const [hi, lo] = [relLum(a), relLum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
const inkCache = new Map<string, string>();
/** Lightens `hex` (same hue) until it reaches `min`:1 against the card. */
function onCard(hex: string, min: number) {
  const key = `${hex}|${min}`;
  const hit = inkCache.get(key);
  if (hit) return hit;
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  let out = hex;
  for (let l = hsl.l; contrastRatio(out, CARD_WORST_BG) < min && l < 0.97; l += 0.005) {
    c.setHSL(hsl.h, hsl.s, l);
    out = `#${c.getHexString()}`;
  }
  inkCache.set(key, out);
  return out;
}

// ---------------------------------------------------------------------------
// Layout — every position below is derived from captureUnitParts.ts, in
// inches, then converted to scene units at the end of this block. Nothing
// here is a hand-tuned magic number; if a dimension changes in
// captureUnitParts.ts, this layout follows it.
// ---------------------------------------------------------------------------

const cabX0 = 0;
const cabX1 = TRUCK.cabLength;
const gapX0 = cabX1;
const gapX1 = gapX0 + TRUCK.gapLength;
const trailerX0 = gapX1;
const trailerX1 = trailerX0 + TRUCK.trailerStubLength;
const TRAILER_CORNER_R = 3; // in — the trailer body's corner rounding
// The equipment deck (always there, trailer or not) runs 120in back from the
// cab — about 10ft of flatbed with its own rear axle — instead of stopping
// just past the equipment, where it looked like a stub. The part of the bed
// under the trailer carries on from here and leaves with it.
const BED_A_END = cabX1 + 120;
const REAR_AXLE_X = cabX1 + 98;

const panelTop = TRUCK.cabRoofHeight - PANEL_TOP_OFFSET_BELOW_ROOF;
const panelBottom = panelTop - PANEL.height;
const assemblyTop = panelTop - PANEL.clearanceTop;
const assemblyBottom = assemblyTop - MODULE_HEIGHT;

// module on the +Z (stack) side, tanks on the -Z (ladder) side — matches
// the 2D rear-view layout
const tankZ0 = -(PANEL.width / 2 - PANEL.clearanceSide);
const tankZ1 = tankZ0 + TANK.diameter;
const moduleZ0 = tankZ1 + ASSEMBLY_GAP;
const moduleZ1 = moduleZ0 + MODULE.width;
const moduleZCenter = (moduleZ0 + moduleZ1) / 2;
const tankZCenter = (tankZ0 + tankZ1) / 2;

// every wall-mounted part sits flush against the cab's back face, but at
// EXACTLY the same X as that face two opaque surfaces would z-fight; this
// embeds them a hair into the cab instead — invisible at this scale (0.2in
// in a 170in cab), but a real surface instead of a coincident one
const WALL_EMBED = 0.2;

// How present the trailer is (1 = there, 0 = gone). Only the closing "Full
// system" step takes it away, so the whole rig reads on its own instead of
// repeating the overview's trailer shot. Module-scope (like hoverState)
// because it's written by TourController and read by TruckContext, which sit
// on opposite sides of Rig.
const trailerFade = { current: 1 } as MutableRefObject<number>;

const moduleX0 = cabX1 - WALL_EMBED; // flush with the cab's back wall
const moduleX1 = moduleX0 + MODULE.depth;
const tankX0 = cabX1 - WALL_EMBED;
const tankX1 = tankX0 + TANK.diameter; // shallower — sits closer to the wall

const stackX = cabX1 - 10;
const stackZ = moduleZCenter; // same side as the module, for the short tap-off

// bulk bin sits directly beneath the capture module, flush against the same
// back wall, so the module + bin read as one vertical stack instead of two
// separate pieces joined by a hose. Flush with moduleX0 (not centered on the
// module) — the bin is wider than the module is deep (20in vs 17in), so
// centering it would have pushed its near face 1.5in into the cab's own body.
const moduleXCenter = (moduleX0 + moduleX1) / 2;
const bulkBinX0 = moduleX0;
const bulkBinX1 = bulkBinX0 + BULK_BIN.width;
const bulkBinZCenter = moduleZCenter;

// truck bed — deck plate over twin chassis rails (see GroundAndRail). Named
// here, once, so anything that's supposed to rest on the bed (the bulk bin,
// the trailer body) sits on its actual top surface instead of a separately
// hand-picked Y that can drift out of sync with it and float.
const BED_DECK_THICKNESS = 4;
const BED_DECK_CENTER_Y = TRUCK.frameHeight - 3;
const BED_RAIL_THICKNESS = 6;
const BED_RAIL_CENTER_Y = TRUCK.frameHeight - 8;
const bedTopY = BED_DECK_CENTER_Y + BED_DECK_THICKNESS / 2;

const bulkBinY0 = bedTopY; // rests on top of the bed deck (checked clear of wheels: nearest wheel is 19in further along X)
const bulkBinY1 = bulkBinY0 + BULK_BIN.height;

// TEG sleeve: clamps around the existing stack, roughly level with the module's
// own vertical band so the lead run to the radiator unit stays short
const moduleYCenter = (assemblyBottom + assemblyTop) / 2;
const tegSleeveY0 = moduleYCenter - TEG_SLEEVE.length / 2;
const tegSleeveY1 = moduleYCenter + TEG_SLEEVE.length / 2;
const tegSleeveYCenter = moduleYCenter;

// radiator/controller unit: same wall, same flush depth as the module, offset
// in Z beyond the module's far edge — "Waste-heat recovery unit" figure
const tegUnitX0 = moduleX0;
const tegUnitX1 = tegUnitX0 + TEG_UNIT.width;
const tegUnitZ0 = moduleZ1 + ASSEMBLY_GAP;
const tegUnitZ1 = tegUnitZ0 + TEG_UNIT.depth;
const tegUnitZCenter = (tegUnitZ0 + tegUnitZ1) / 2;
const tegUnitY0 = assemblyBottom;
const tegUnitY1 = tegUnitY0 + TEG_UNIT.height;

// module body bounds (pre-chimney) — shared by the shell and its internals
const bodyY0 = assemblyBottom;
const bodyY1 = assemblyTop - MODULE.chimneyHeight;

// internal chamber bands, stacked bottom-up with no gaps: reservoir ->
// heating/regen -> de-tox -> headspace, reaching the shell's inner top
const intZ0 = moduleZ0 + INTERNALS.wallMargin;
const intZ1 = moduleZ1 - INTERNALS.wallMargin;
const intX0 = moduleX0 + INTERNALS.wallMargin;
const intX1 = moduleX1 - INTERNALS.wallMargin;

const reservoirY0 = bodyY0 + INTERNALS.bottomClearance;
const reservoirY1 = reservoirY0 + INTERNALS.reservoirHeight;
const heatingY0 = reservoirY1;
const heatingY1 = heatingY0 + INTERNALS.heatingHeight;
const detoxY0 = heatingY1;
const detoxY1 = detoxY0 + INTERNALS.detoxHeight;

const demisterY1 = bodyY1 - DEMISTER.offsetBelowBodyTop;
const demisterY0 = demisterY1 - DEMISTER.height;

// PCM block: exhaust-inlet side of the heating band
const pcmZ0 = intZ0 + PCM_BLOCK.offsetFromInletEdge;
const pcmZ1 = pcmZ0 + PCM_BLOCK.width;
const pcmY0 = heatingY0;
const pcmY1 = pcmY0 + PCM_BLOCK.height;

// rich amine pool: fills the rest of the heating band's width, at its bottom
const poolZ0 = pcmZ1;
const poolZ1 = intZ1;
const poolY0 = heatingY0;
const poolY1 = poolY0 + RICH_AMINE_POOL.height;

// explode offsets (inches) for the guided-tour "inside the module" step —
// shell lifts clear of the internals; internal bands spread apart from the
// reservoir (the anchor) in the same bottom-up order they're stacked in
const EXPLODE = {
  shellLift: 42,
  heatingLift: 10,
  detoxLift: 20,
  demisterLift: 30,
} as const;

const IN = toUnits;

// shared geometries for parts that repeat (wheels ×6, tank body/dome ×2,
// bulk-bin feet ×2) — built once at module load instead of once per mesh,
// so repeating a part doesn't repeat its geometry buffer
const wheelGeometry = new THREE.CylinderGeometry(
  IN(TRUCK.tireRadius),
  IN(TRUCK.tireRadius),
  IN(TRUCK.tireWidth),
  24
);
const rimGeometry = new THREE.CylinderGeometry(IN(13), IN(13), IN(TRUCK.tireWidth + 0.6), 20);
const fuelTankGeometry = new THREE.CylinderGeometry(IN(8), IN(8), IN(50), 20);
const mirrorArmGeometry = new THREE.CylinderGeometry(IN(0.6), IN(0.6), IN(10), 8);
const tankBodyGeometry = new THREE.CylinderGeometry(
  IN(TANK.diameter / 2),
  IN(TANK.diameter / 2),
  IN(TANK_UNIT_HEIGHT - TANK.domeHeight),
  28
);
const tankDomeGeometry = new THREE.ConeGeometry(IN(TANK.diameter / 2), IN(TANK.domeHeight), 28);
const tankCapGeometry = new THREE.SphereGeometry(IN(0.6), 12, 12);
const bulkBinFootGeometry = new THREE.BoxGeometry(IN(14), IN(4), IN(3));

function GroundAndRail() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[IN(trailerX1 / 2), 0, 0]} receiveShadow>
        <planeGeometry args={[IN(trailerX1) + 20, 60]} />
        <meshStandardMaterial color="#d7e6d2" roughness={0.95} />
      </mesh>
      {/* truck bed — a deck plate (catches the bulk bin + trailer, same as
          before) over twin chassis rails underneath it, instead of looking
          like a single slab with nothing structural to it */}
      <mesh position={[IN((cabX1 - 10 + BED_A_END) / 2), IN(BED_DECK_CENTER_Y), 0]} receiveShadow>
        <boxGeometry args={[IN(BED_A_END - cabX1 + 10), IN(BED_DECK_THICKNESS), IN(TRUCK.cabWidth - 10)]} />
        <meshStandardMaterial color="#9aa0a6" metalness={0.3} roughness={0.6} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[IN((cabX1 - 10 + BED_A_END) / 2), IN(BED_RAIL_CENTER_Y), IN(side * 24)]}
        >
          <boxGeometry args={[IN(BED_A_END - cabX1 + 10), IN(BED_RAIL_THICKNESS), IN(7)]} />
          <meshStandardMaterial color="#6b7076" metalness={0.4} roughness={0.55} />
        </mesh>
      ))}
    </>
  );
}

function Wheel({ x, z }: { x: number; z: number }) {
  // CylinderGeometry's axis runs along local +Y by default; rotating about
  // X (not Z) is what swings that axis onto world Z — the truck's lateral
  // (axle) axis — so the tire's round face lands in the X-Y plane and reads
  // as a wheel from the side, instead of edge-on with the tread facing
  // forward/back along the truck's length.
  return (
    <group position={[IN(x), IN(TRUCK.tireRadius), IN(z)]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh geometry={wheelGeometry} castShadow receiveShadow>
        <meshStandardMaterial color="#111318" roughness={0.9} />
      </mesh>
      {/* rim — same shared geometry on every wheel, just two-toning what
          was a flat black cylinder */}
      <mesh geometry={rimGeometry}>
        <meshStandardMaterial color="#8a8f96" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

/** Fades everything under the returned group ref toward `opacityRef.current`
 *  every frame, by walking its actual mesh tree rather than threading an
 *  opacity prop through every individual material. Shared by the truck body
 *  and the mounting rail — each gets its own opacityRef, so one can go
 *  fully invisible while the other just dims.
 *
 *  `tintRef` is a second, optional multiplier applied only to meshes tagged
 *  `userData.fadeTint = true` — used for the cab shell's own per-step "see
 *  through" amount, which is independent of whether the truck as a whole is
 *  shown or hidden. depthWrite is deliberately keyed to `opacityRef` alone,
 *  not the tint: letting it drop below the 0.9 threshold whenever the cab
 *  goes translucent broke depth sorting against everything else parked
 *  inside/behind it (wheels, frame rails, mirrors), which popped in and out
 *  depending on camera angle — keeping depthWrite tied only to the
 *  truck-level fade keeps that occlusion correct regardless of the tint. */
function useFadeGroup(
  opacityRef: MutableRefObject<number>,
  tintRef?: MutableRefObject<number>,
  trailerRef?: MutableRefObject<number>,
) {
  const groupRef = useRef<THREE.Group>(null);
  const lastOpacity = useRef<number | null>(null);
  const lastTint = useRef<number | null>(null);
  const lastTrailer = useRef<number | null>(null);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const opacity = opacityRef.current;
    const tint = tintRef ? tintRef.current : 1;
    const trailer = trailerRef ? trailerRef.current : 1;
    // walking the whole mesh tree is only worth doing when a value has
    // actually moved — skipping it once steady (or during a run of rapid
    // step changes that keep landing on the same values before these refs
    // even update again) is one less full-tree traversal competing for
    // frame time against everything else animating at once
    const opacitySteady = lastOpacity.current !== null && Math.abs(lastOpacity.current - opacity) < 0.001;
    const tintSteady = lastTint.current !== null && Math.abs(lastTint.current - tint) < 0.001;
    const trailerSteady = lastTrailer.current !== null && Math.abs(lastTrailer.current - trailer) < 0.001;
    if (opacitySteady && tintSteady && trailerSteady) return;
    lastOpacity.current = opacity;
    lastTint.current = tint;
    lastTrailer.current = trailer;
    const visible = opacity > 0.004;
    group.visible = visible;
    if (!visible) return;
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      // anything under a group flagged `fadeTrailer` also fades with the trailer
      let isTrailer = false;
      for (let n: THREE.Object3D | null = mesh; n && n !== group; n = n.parent) {
        if (n.userData.fadeTrailer) {
          isTrailer = true;
          break;
        }
      }
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const tinted = mesh.userData.fadeTint === true;
      // the cab panels (hood/cabin/visor) are the only meshes this ever
      // tints below 1 (module-exterior is the one step that does) — every
      // other step leaves tint at 1, so depthWrite/renderOrder below fall
      // straight back to their old opacity-only behavior there, unchanged.
      const effectiveOpacity = (tinted ? opacity * tint : opacity) * (isTrailer ? trailer : 1);
      materials.forEach((mat) => {
        const m = mat as THREE.MeshStandardMaterial;
        if (!m) return;
        // capture each material's own starting opacity once — the
        // windshield and door windows are already semi-transparent glass,
        // and scaling THAT down by the fade (rather than overwriting it
        // with the fade value) keeps them reading as glass instead of
        // flashing fully solid at opacity 1
        if (m.userData.baseOpacity === undefined) m.userData.baseOpacity = m.opacity;
        m.transparent = true;
        m.opacity = m.userData.baseOpacity * effectiveOpacity;
        // Previously keyed only to the truck-level `opacity` (never the
        // tint) — on module-exterior the cab panels stay at opacity=1
        // (fully shown) while tint alone drops them to ~0.82, which kept
        // depthWrite TRUE on a visually-translucent surface. Four of these
        // panels (hood/cabin/windshield/visor) overlap each other at their
        // seams, and three.js's transparent-pass sort is per-object
        // (bounding-sphere distance), not per-triangle — so at those seams
        // it can render them in an order where one panel's depth write
        // fails a LATER panel's depth test at that exact pixel, or where a
        // translucent panel in front occludes something genuinely behind
        // it as if it were opaque. Both read as "parts disappearing" when
        // orbiting. Using the REAL rendered opacity (tint included) to
        // decide depthWrite, and pushing the tinted panels to a high
        // renderOrder so they're always drawn last regardless of sort
        // order, means a translucent cab panel never corrupts anything
        // else's depth test — worst case two translucent panels
        // double-blend at a seam, which is a faint, harmless overlap
        // instead of a hole.
        m.depthWrite = effectiveOpacity > 0.9;
      });
      mesh.renderOrder = tinted && tint < 0.95 ? 50 : 0;
      mesh.castShadow = effectiveOpacity > 0.5;
      mesh.visible = !isTrailer || trailer > 0.004;
    });
  });

  return groupRef;
}

/** The truck body — cab, trailer, wheels, lights, doors. The ground/bed deck
 *  and the CO2 capture equipment live outside this group (see Rig), so
 *  they're untouched by the fade — only the vehicle itself steps back (or
 *  disappears entirely) once the tour moves past the intro. */
function TruckContext({
  opacityRef,
  cabTintRef,
  onSelectPart,
}: {
  opacityRef: MutableRefObject<number>;
  cabTintRef: MutableRefObject<number>;
  onSelectPart: SelectPartFn;
}) {
  const half = TRUCK.axleTrack / 2;
  const cabBottom = TRUCK.frameHeight - 6;
  const hoodLen = 42; // front hood/engine section, shorter than the cabin behind it
  const hoodTop = 72;
  const cabinX0 = hoodLen; // where the taller cabin/sleeper volume starts
  const cabColor = '#d94f4f'; // red cab, closer to the reference than the old navy box
  const groupRef = useFadeGroup(opacityRef, cabTintRef, trailerFade);
  // only the module-exterior step wants to see the exhaust stack/duct through
  // the cab — overview and the closing full-system shot keep it solid, per
  // useFadeGroup's own tag mechanism (see its docstring for why depthWrite
  // stays tied to opacityRef rather than this tint)
  const cabTintTag = { fadeTint: true };
  const exhaustStackRef = useRef<THREE.Group>(null);
  const exhaustStackHoverAmt = useRef(0);
  useFrame(() => {
    if (exhaustStackRef.current) applyHoverGlow(exhaustStackRef.current, 'exhaustStack', exhaustStackHoverAmt);
  });

  return (
    <group ref={groupRef}>
      {/* hood — shorter and lower than the cabin, so the silhouette isn't
          one giant prism; rounded edges instead of hard box corners */}
      <RoundedBox
        args={[IN(hoodLen), IN(hoodTop - cabBottom), IN(TRUCK.cabWidth)]}
        radius={IN(3)}
        smoothness={4}
        position={[IN(hoodLen / 2), IN((cabBottom + hoodTop) / 2), 0]}
        castShadow
        userData={cabTintTag}
      >
        <meshStandardMaterial color={cabColor} metalness={0.15} roughness={0.45} />
      </RoundedBox>

      {/* cabin — taller, sits behind the hood */}
      <RoundedBox
        args={[IN(cabX1 - cabinX0), IN(TRUCK.cabRoofHeight - cabBottom), IN(TRUCK.cabWidth)]}
        radius={IN(4)}
        smoothness={4}
        position={[IN((cabinX0 + cabX1) / 2), IN((cabBottom + TRUCK.cabRoofHeight) / 2), 0]}
        castShadow
        userData={cabTintTag}
      >
        <meshStandardMaterial color={cabColor} metalness={0.15} roughness={0.45} />
      </RoundedBox>

      {/* windshield — on the cabin's front face, above the hood line, raked
          back slightly instead of sitting dead vertical */}
      <RoundedBox
        args={[IN(0.6), IN(48), IN(72)]}
        radius={IN(3)}
        smoothness={3}
        position={[IN(cabinX0 - 0.6), IN(101), 0]}
        rotation={[0, 0, -0.1]}
      >
        <meshStandardMaterial color="#9fd3e8" metalness={0.2} roughness={0.1} transparent opacity={0.55} />
      </RoundedBox>

      {/* sun visor, over the top of the windshield */}
      <RoundedBox
        args={[IN(3), IN(0.6), IN(76)]}
        radius={IN(0.3)}
        smoothness={2}
        position={[IN(cabinX0 + 1), IN(127), 0]}
        rotation={[0, 0, 0.05]}
        userData={cabTintTag}
      >
        <meshStandardMaterial color={cabColor} metalness={0.15} roughness={0.45} />
      </RoundedBox>

      {/* cab roof marker lights */}
      {[-30, -15, 0, 15, 30].map((z) => (
        <mesh key={z} position={[IN(cabinX0 - 1), IN(133), IN(z)]}>
          <sphereGeometry args={[IN(0.8), 10, 10]} />
          <meshStandardMaterial color="#ffb347" emissive="#ff8c1a" emissiveIntensity={0.5} />
        </mesh>
      ))}

      {/* grille, lower hood front */}
      <RoundedBox args={[IN(0.6), IN(16), IN(36)]} radius={IN(1.5)} smoothness={3} position={[IN(-0.2), IN(50), 0]}>
        <meshStandardMaterial color="#2b2e33" metalness={0.5} roughness={0.5} />
      </RoundedBox>
      {[44, 48.5, 53, 57.5].map((y) => (
        <mesh key={y} position={[IN(0.05), IN(y), 0]}>
          <boxGeometry args={[IN(0.5), IN(1.2), IN(34)]} />
          <meshStandardMaterial color="#e8eaec" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}

      {/* headlights, flanking the grille */}
      {[-28, 28].map((z) => (
        <mesh key={z} position={[IN(-0.3), IN(50), IN(z)]}>
          <boxGeometry args={[IN(0.5), IN(8), IN(7)]} />
          <meshStandardMaterial color="#fff3d6" emissive="#ffe9a8" emissiveIntensity={0.3} roughness={0.3} />
        </mesh>
      ))}

      {/* amber turn signals, inboard of the headlights */}
      {[-20, 20].map((z) => (
        <mesh key={z} position={[IN(-0.3), IN(44), IN(z)]}>
          <boxGeometry args={[IN(0.5), IN(4), IN(4)]} />
          <meshStandardMaterial color="#e2883f" emissive="#c9671f" emissiveIntensity={0.4} roughness={0.3} />
        </mesh>
      ))}

      {/* hood side vents, both flanks */}
      {[-1, 1].map((side) => (
        <group key={side}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[IN(18 + i * 6), IN(60), IN(side * 48.2)]}>
              <boxGeometry args={[IN(4), IN(5), IN(0.3)]} />
              <meshStandardMaterial color="#b23f3f" metalness={0.2} roughness={0.5} />
            </mesh>
          ))}
        </group>
      ))}

      {/* front bumper */}
      <RoundedBox args={[IN(1), IN(5), IN(88)]} radius={IN(1.5)} smoothness={3} position={[IN(-0.5), IN(36.5), 0]}>
        <meshStandardMaterial color="#e8eaec" metalness={0.5} roughness={0.4} />
      </RoundedBox>

      {/* front license plate */}
      <mesh position={[IN(-0.6), IN(40), 0]}>
        <boxGeometry args={[IN(0.3), IN(6), IN(12)]} />
        <meshStandardMaterial color="#e8eaec" roughness={0.5} />
      </mesh>

      {/* mirrors — mounted off the A-pillar, where the windshield meets the hood */}
      {[-1, 1].map((side) => (
        <group key={side} position={[IN(cabinX0 + 5), IN(100), IN(side * 53)]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} geometry={mirrorArmGeometry}>
            <meshStandardMaterial color="#2b2e33" metalness={0.5} roughness={0.5} />
          </mesh>
          <mesh position={[0, IN(10), 0]}>
            <boxGeometry args={[IN(1.5), IN(9), IN(5)]} />
            <meshStandardMaterial color="#13202c" metalness={0.6} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* saddle fuel tanks, along the cabin's lower sides */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[IN(70), IN(46), IN(side * 54)]}
          rotation={[0, 0, Math.PI / 2]}
          geometry={fuelTankGeometry}
          castShadow
        >
          <meshStandardMaterial color="#e8eaec" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}

      {/* cab steps, at the cabin's front corner (door position) */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[IN(cabinX0 + 8), IN(38), IN(side * 50)]}>
          <boxGeometry args={[IN(14), IN(2.5), IN(8)]} />
          <meshStandardMaterial color="#2b2e33" metalness={0.4} roughness={0.6} />
        </mesh>
      ))}

      {/* cab doors — seam outline, a tinted window, and a handle, raised a
          hair off the cab surface so they read as panels instead of being
          a solid red box with a window floating on it */}
      {[-1, 1].map((side) => {
        const doorX0 = cabinX0 + 2;
        const doorX1 = cabinX0 + 38;
        const doorXCenter = (doorX0 + doorX1) / 2;
        const doorY0 = cabBottom;
        const doorY1 = 80;
        const windowY1 = 97;
        const zFace = side * (TRUCK.cabWidth / 2 + 0.15);
        return (
          <group key={side}>
            <mesh position={[IN(doorX0), IN((doorY0 + doorY1) / 2), IN(zFace)]}>
              <boxGeometry args={[IN(0.4), IN(doorY1 - doorY0), IN(0.4)]} />
              <meshStandardMaterial color="#a33f3f" metalness={0.15} roughness={0.5} />
            </mesh>
            <mesh position={[IN(doorX1), IN((doorY0 + doorY1) / 2), IN(zFace)]}>
              <boxGeometry args={[IN(0.4), IN(doorY1 - doorY0), IN(0.4)]} />
              <meshStandardMaterial color="#a33f3f" metalness={0.15} roughness={0.5} />
            </mesh>
            <mesh position={[IN(doorXCenter), IN(doorY1), IN(zFace)]}>
              <boxGeometry args={[IN(doorX1 - doorX0), IN(0.4), IN(0.4)]} />
              <meshStandardMaterial color="#a33f3f" metalness={0.15} roughness={0.5} />
            </mesh>
            {/* door window */}
            <mesh position={[IN(doorXCenter), IN((doorY1 + windowY1) / 2), IN(zFace)]}>
              <boxGeometry args={[IN(doorX1 - doorX0 - 6), IN(windowY1 - doorY1), IN(0.3)]} />
              <meshStandardMaterial color="#13202c" metalness={0.3} roughness={0.2} transparent opacity={0.8} />
            </mesh>
            {/* door handle */}
            <mesh position={[IN(doorX1 - 5), IN(60), IN(zFace + side * 0.3)]}>
              <boxGeometry args={[IN(5), IN(1.2), IN(0.8)]} />
              <meshStandardMaterial color="#2b2e33" metalness={0.5} roughness={0.4} />
            </mesh>
          </group>
        );
      })}

      <group userData={{ fadeTrailer: true }}>
      {/* trailer stub — floor sits on the bed's actual top surface (bedTopY),
          not a hand-picked height that used to sit 9in above it, floating
          clear of both the deck and the wheels underneath */}
      <RoundedBox
        args={[IN(trailerX1 - trailerX0), IN(TRUCK.trailerRoofHeight - bedTopY), IN(TRUCK.trailerWidth)]}
        radius={IN(TRAILER_CORNER_R)}
        smoothness={4}
        position={[IN((trailerX0 + trailerX1) / 2), IN((bedTopY + TRUCK.trailerRoofHeight) / 2), 0]}
        castShadow
      >
        <meshStandardMaterial color="#f3f0e8" roughness={0.7} />
      </RoundedBox>

      {/* side panel lines — the dry-van/reefer look, not a flat slab. They stop
          where the body's rounded corners begin: when they ran the full
          length their end faces sat in exactly the same plane as the
          trailer's front/rear faces, and two coincident surfaces in
          different colours fight for the same pixels (the broken-looking
          texture on the back of the truck). */}
      {[72, 100, 128].map((y) => (
        <mesh key={y} position={[IN((trailerX0 + trailerX1) / 2), IN(y), 0]}>
          <boxGeometry args={[IN(trailerX1 - trailerX0 - TRAILER_CORNER_R * 2), IN(1.5), IN(TRUCK.trailerWidth + 1)]} />
          <meshStandardMaterial color="#d8d4c4" roughness={0.7} />
        </mesh>
      ))}

      {/* rear ICC bumper — stands 0.8in proud of the rear face (its back face
          used to end exactly flush with it, another coincident-surface
          fight) */}
      <mesh position={[IN(trailerX1 - 0.2), IN(51), 0]}>
        <boxGeometry args={[IN(2), IN(6), IN(TRUCK.trailerWidth - 8)]} />
        <meshStandardMaterial color="#2b2e33" metalness={0.4} roughness={0.55} />
      </mesh>

      {/* mud flaps, behind the trailer's rear wheels */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[IN(trailerX1 - 25 - TRUCK.tireWidth), IN(TRUCK.frameHeight - 10), IN(side * (TRUCK.axleTrack / 2))]}
        >
          <boxGeometry args={[IN(0.3), IN(16), IN(10)]} />
          <meshStandardMaterial color="#2b2e33" roughness={0.9} />
        </mesh>
      ))}


      {/* the part of the bed that runs under the trailer — it leaves with the
          trailer, so the equipment's own deck (see GroundAndRail) is all
          that's left on the Full system step. Starts 0.2in inside the
          equipment deck so the two overlap instead of butting at one plane. */}
      <mesh position={[IN((BED_A_END - 0.2 + trailerX1 + 10) / 2), IN(BED_DECK_CENTER_Y), 0]} receiveShadow>
        <boxGeometry args={[IN(trailerX1 + 10 - BED_A_END + 0.2), IN(BED_DECK_THICKNESS), IN(TRUCK.cabWidth - 10)]} />
        <meshStandardMaterial color="#9aa0a6" metalness={0.3} roughness={0.6} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[IN((BED_A_END - 0.2 + trailerX1 + 10) / 2), IN(BED_RAIL_CENTER_Y), IN(side * 24)]}>
          <boxGeometry args={[IN(trailerX1 + 10 - BED_A_END + 0.2), IN(BED_RAIL_THICKNESS), IN(7)]} />
          <meshStandardMaterial color="#6b7076" metalness={0.4} roughness={0.55} />
        </mesh>
      ))}
      <Wheel x={trailerX1 - 25} z={half} />
      <Wheel x={trailerX1 - 25} z={-half} />
      </group>

      {/* wheels */}
      <Wheel x={cabX0 + 30} z={half} />
      <Wheel x={cabX0 + 30} z={-half} />
      <Wheel x={cabX1 - 24} z={half} />
      <Wheel x={cabX1 - 24} z={-half} />
      {/* rear axle under the equipment deck, so the bed has wheels of its own
          once the trailer is gone */}
      <Wheel x={REAR_AXLE_X} z={half} />
      <Wheel x={REAR_AXLE_X} z={-half} />

      {/* exhaust stack */}
      <group ref={exhaustStackRef} {...clickable('exhaustStack', onSelectPart)}>
        <mesh position={[IN(stackX), IN((TRUCK.frameHeight + TRUCK.stackHeight) / 2), IN(stackZ)]} castShadow>
          <cylinderGeometry args={[IN(TRUCK.stackDiameter / 2), IN(TRUCK.stackDiameter / 2), IN(TRUCK.stackHeight - TRUCK.frameHeight), 16]} />
          <meshStandardMaterial color="#8a8f96" metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[IN(stackX), IN(TRUCK.stackHeight + 2), IN(stackZ)]}>
          <cylinderGeometry args={[IN(TRUCK.stackDiameter / 2 + 1), IN(TRUCK.stackDiameter / 2 + 1), IN(4), 16]} />
          <meshStandardMaterial color="#6b7076" metalness={0.6} roughness={0.35} />
        </mesh>
      </group>
    </group>
  );
}

/** Small, soft, slow-moving markers tracing an actual process path —
 *  reused across every system page (module interior, tanks, bulk bin, TEG)
 *  so "how does this part work" always gets the same visual language.
 *  `updateWaypoints` is called every frame to (re)fill the waypoint array —
 *  for the module this recomputes each chamber's current (possibly
 *  exploded) position; for the others it's normally just fixed points —
 *  and particles lerp between consecutive waypoints on a loop, fading in
 *  at the start and out at the end of each pass (`oneWay`) rather than
 *  popping or jumping, since this is showing material moving THROUGH the
 *  system once, not orbiting in a circle. depthTest is off deliberately:
 *  the path often runs through the middle of solid parts (a chamber, a
 *  shell), and a particle that vanishes behind anything opaque reads as
 *  broken, not calm — this renders like a projected overlay instead. */
function FlowTrail({
  activeRef,
  waypointCount,
  updateWaypoints,
  count = 3,
  loopSeconds = 7,
  color = '#fff6e0',
  emissive = '#fff0c2',
  emissiveIntensity = 0.55,
  size = 0.5,
  maxOpacity = 0.42,
  activeThreshold = 0.05,
  oneWay = true,
}: {
  activeRef: MutableRefObject<number>;
  waypointCount: number;
  updateWaypoints: (pts: THREE.Vector3[]) => void;
  count?: number;
  loopSeconds?: number;
  color?: string;
  emissive?: string;
  emissiveIntensity?: number;
  size?: number;
  maxOpacity?: number;
  activeThreshold?: number;
  oneWay?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const sphereRefs = useRef<(THREE.Mesh | null)[]>([]);
  const waypoints = useMemo(() => Array.from({ length: waypointCount }, () => new THREE.Vector3()), [waypointCount]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const active = activeRef.current;
    group.visible = active > activeThreshold;
    if (!group.visible) return;

    updateWaypoints(waypoints);

    const t = (performance.now() / 1000 / loopSeconds) % 1;
    sphereRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const phase = (t + i / count) % 1;
      const segT = phase * (waypoints.length - 1);
      const segIndex = Math.min(Math.floor(segT), waypoints.length - 2);
      mesh.position.lerpVectors(waypoints[segIndex], waypoints[segIndex + 1], segT - segIndex);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = oneWay
        ? maxOpacity * active * Math.min(1, phase * 6, (1 - phase) * 6)
        : maxOpacity * active;
    });
  });

  return (
    <group ref={groupRef} visible={false}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh
          key={i}
          renderOrder={10}
          ref={(el) => {
            sphereRefs.current[i] = el;
          }}
        >
          <sphereGeometry args={[IN(size), 12, 12]} />
          <meshStandardMaterial
            color={color}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/** A camera-facing text label that only shows once the relevant step is
 *  actually active (same activeRef/threshold pattern as the fade groups
 *  and flow trails) — this is the direct answer to "I don't know what
 *  these layers are": every highlighted part gets its name on screen, in
 *  the same white-on-black-outline treatment the 2D overlay already uses
 *  for guaranteed readability against any background. */
function Label({
  activeRef,
  computePosition,
  text,
  fontSize = 2.5,
  activeThreshold = 0.3,
  color = '#ffffff',
  hoverId,
  facingDir,
}: {
  activeRef: MutableRefObject<number>;
  // inches; recomputed every frame from the current activeRef value, so a
  // label on a part that moves (the exploded module's chambers) tracks it
  // instead of only being right once the explode animation finishes
  computePosition: (active: number) => [number, number, number];
  text: string;
  fontSize?: number;
  activeThreshold?: number;
  // the black outline (below) is what actually guarantees legibility against
  // any background — this only tints the fill, so a chamber's label can
  // match its own color-coded part without losing that guarantee
  color?: string;
  // the PART_FACTS id this label names, if any — when that part is
  // hovered, the label grows slightly in step with it. Scale (not an
  // emissive glow, as applyHoverGlow uses for the 3D geometry) is safe here
  // specifically BECAUSE a label floats in open space above its part with
  // nothing packed against it, unlike the module interior's own chambers —
  // the one place scale caused real trouble.
  hoverId?: string;
  // the world-space direction this label is actually meant to be READ
  // from — normally just that step's own arrival camera direction (see the
  // *_FACING constants below Rig). Depth testing is off (see onSync), on
  // purpose, so a label is never hidden by geometry that's legitimately in
  // front of it — but without this, a viewer who orbits all the way around
  // a part keeps seeing that label fully legible on what's now the FAR
  // side, floating in front of whatever's actually facing the camera and
  // naming a part that isn't in view any more. Each frame this dots the
  // direction from the label to the camera against facingDir: dead-on with
  // it (the step's own default vantage) is fully opaque, past roughly 100°
  // off it fades to fully transparent, so the label reads correctly from
  // "its own side" and quietly gets out of the way everywhere else —
  // cheap (one dot product), and tied to the actual geometric reason a
  // label would be "on the back" in the first place, rather than a true
  // occlusion raycast against every possible blocker. Omit to keep a label
  // always fully opaque regardless of viewing angle (used for labels with
  // no single obvious "front").
  facingDir?: [number, number, number];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const hoverAmt = useRef(0);
  const visAmt = useRef(1);
  const matsRef = useRef<THREE.Material[]>([]);
  const { camera } = useThree();
  const facingVec = useMemo(
    () => (facingDir ? new THREE.Vector3(...facingDir).normalize() : null),
    [facingDir]
  );

  useFrame(() => {
    const active = activeRef.current;
    const group = groupRef.current;
    if (!group) return;
    group.visible = active > activeThreshold;
    if (!group.visible) return;
    const [x, y, z] = computePosition(active);
    group.position.set(IN(x), IN(y), IN(z));
    const target = hoverId && hoverState.id === hoverId ? 1 : 0;
    hoverAmt.current = stepHover(hoverAmt.current, target);
    group.scale.setScalar(1 + hoverAmt.current * 0.18);

    let visTarget = 1;
    if (facingVec) {
      const toCamera = camera.position.clone().sub(group.position).normalize();
      const dot = toCamera.dot(facingVec);
      visTarget = THREE.MathUtils.smoothstep(dot, -0.25, 0.15);
    }
    visAmt.current += (visTarget - visAmt.current) * (1 - Math.exp(-9 * hoverDelta));
    matsRef.current.forEach((m) => {
      (m as THREE.Material & { opacity: number }).opacity = visAmt.current;
    });
  });

  return (
    <group ref={groupRef} visible={false}>
      <Billboard>
        <Text
          fontSize={IN(fontSize)}
          color={color}
          outlineWidth={IN(fontSize) * 0.09}
          outlineColor="#000000"
          anchorX="center"
          anchorY="middle"
          renderOrder={11}
          // the label sits just outside its part's edge, but Billboard can
          // still tip it to face the camera through the part's own volume,
          // other chambers, or the translucent shell at some angles — the
          // negative depth offset (troika's own mechanism for this) wasn't
          // enough on its own (still washed out behind stacked translucent
          // layers in practice), so depth testing is dropped entirely: the
          // label always wins, the same guarantee a 2D HUD label would have.
          // (See facingDir above for how "on the back" is handled instead.)
          // NOTE: every label here sets outlineWidth, which makes troika
          // hand back `mesh.material` as a [outline, fill] ARRAY (its own
          // multi-material trick for drawing the outline first) — so the
          // dash-prop shortcut (`material-depthTest`) silently sets a stray
          // property on the array object itself, not on either real
          // material, and never actually disables depth testing. Setting it
          // in onSync, on each material in that array explicitly, is what
          // actually reaches them — same reason facingDir's opacity fade is
          // written into matsRef here instead of a dash prop.
          depthOffset={-200}
          onSync={(mesh: THREE.Mesh) => {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((m) => {
              m.depthTest = false;
              m.transparent = true;
            });
            matsRef.current = mats;
          }}
        >
          {text}
        </Text>
      </Billboard>
    </group>
  );
}

type SelectPartFn = (id: string) => void;

// Which part (if any) the pointer is currently over — a single module-scope
// slot rather than something threaded through props, since there's only
// ever one of this scene mounted at a time and every clickable part/label
// already lives in this one file. Read each frame by applyHoverGlow and by
// Label (see below); written only by clickable()'s own pointer handlers.
const hoverState: { id: string | null } = { id: null };

/** Spread onto any mesh/group to make it a clickable "what does this do"
 *  target — stopPropagation keeps a click from also selecting whatever sits
 *  behind it along the same ray.
 *
 *  This used to also scale the hovered part up ~6% as the "this responds to
 *  you" affordance. Dropped: the module interior's chambers sit flush
 *  against each other with zero clearance (that's the real cutaway
 *  geometry, not a gap left for this), so growing any one of them pushed it
 *  straight into its neighbor — visibly "colliding". Scale is also a
 *  transform on the SAME object other per-frame code already drives
 *  (explode position, open/closed lerps), and snapping it on pointer
 *  events rather than easing it each frame was never going to feel smooth
 *  on top of that. Hover feedback is now `applyHoverGlow` below instead —
 *  an emissive brighten, which can't collide with anything and composes
 *  with whatever per-frame code a part already has instead of fighting it. */
function clickable(id: string, onSelect: SelectPartFn) {
  return {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onSelect(id);
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      document.body.style.cursor = 'pointer';
      hoverState.id = id;
      if (e.nativeEvent.pointerType !== 'touch') sfx.hover(id);
    },
    onPointerOut: (e: ThreeEvent<PointerEvent>) => {
      document.body.style.cursor = 'auto';
      if (hoverState.id === id) hoverState.id = null;
    },
  };
}

/** Eases `amountRef` toward 1 while `id` is the hovered part (0 otherwise),
 *  then nudges every material under `root` toward a bright white emissive
 *  by that amount — restoring each material's own actual emissive once the
 *  amount settles back near 0. Call this from a per-frame callback that
 *  ALREADY drives `root`'s own animation (explode position, fade opacity,
 *  …) rather than giving a part a second independent useFrame: emissive is
 *  the one property no other system here writes, so this never has two
 *  writers racing for the last word on the same frame — which is exactly
 *  what made the old scale-based hover "fight" parts that already had
 *  their own per-frame glow (the de-tox chamber among them). For a part
 *  that already drives its OWN emissive per frame (the module-interior
 *  chambers, a tank's liquid fill, the bulk bin's amine fill, the TEG
 *  sleeve/modules), add `amount(id)` into that existing formula directly
 *  instead of calling this — walking into those materials from here too
 *  would reintroduce the same dual-writer fight for exactly those. */
// Hard ceiling on any emissiveIntensity this file ever writes from a hover
// or "open" pulse. Several parts add a hover boost ON TOP OF an existing
// open/pulse glow that can already sit close to 1 on its own (the module
// interior's chambers, the TEG hot-side modules) — stacking a second boost
// on top of that pushed the combined value past the point where the
// material's own diffuse color and shading gradient stop being visible at
// all and it just reads as flat white, exactly the "removes all textures"
// complaint. Clamping every writer to this one ceiling is cheaper and more
// robust than trying to re-tune each boost by hand against whatever that
// part's own base glow happens to peak at.
const EMISSIVE_CLAMP = 0.95;

// Hover easing. The glow used to chase its target by a fixed fraction PER
// FRAME, so how fast it moved depended on the frame rate — fine at 60 fps,
// but on a busy or throttled device the frames arrive unevenly and the glow
// visibly steps. This measures real elapsed time instead (an exponential
// approach, so the same hover takes the same ~0.35 s on any device), ramps
// in a touch faster than it fades out, and clamps a long frame so a hitch
// can't make the value jump.
let hoverDelta = 1 / 60;
function HoverClock() {
  // priority -1000 runs before every other useFrame, so everything easing a
  // hover amount this frame sees the same, current delta
  useFrame((_, delta) => {
    hoverDelta = Math.min(delta, 0.05);
  }, -1000);
  return null;
}
function stepHover(current: number, target: number) {
  const rate = target > current ? 9 : 6; // per second
  return current + (target - current) * (1 - Math.exp(-rate * hoverDelta));
}

// Strength of the white "this is hoverable" glow at full hover, as emissive
// radiance. Measured against the live scene (ACES tone mapping, the scene's
// ambient+hemisphere+key lights): a mid-grey panel reads ~115 → ~158 of 255
// at 0.12 — a clearly visible but soft lift that keeps the panel's own
// shading and colour. Above ~0.5 it starts reading as a flat white card.
const HOVER_GLOW_BOOST = 0.12;

function applyHoverGlow(
  root: THREE.Object3D,
  id: string,
  amountRef: MutableRefObject<number>,
  boost = HOVER_GLOW_BOOST,
) {
  const target = hoverState.id === id ? 1 : 0;
  amountRef.current = stepHover(amountRef.current, target);
  const a = amountRef.current < 0.003 ? 0 : amountRef.current;
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((mat) => {
      const m = mat as THREE.MeshStandardMaterial;
      if (!m || !m.emissive) return;
      if (m.userData.hoverBaseEmissiveHex === undefined) {
        m.userData.hoverBaseEmissiveHex = m.emissive.getHex();
        m.userData.hoverBaseEmissiveIntensity = m.emissiveIntensity;
      }
      if (a <= 0) {
        m.emissive.setHex(m.userData.hoverBaseEmissiveHex);
        m.emissiveIntensity = m.userData.hoverBaseEmissiveIntensity;
      } else {
        // A material's own emitted light is `emissive × emissiveIntensity`.
        // The hover glow is ADDED to that as a small white term. (This used
        // to swap the colour to white and keep `savedIntensity + a*boost`
        // as the intensity — but three.js's default emissiveIntensity is 1
        // even on a material whose emissive is black, where it contributes
        // nothing. That stray 1 became the baseline of the white glow, so
        // every non-emissive part jumped to white @ >=1.0 on the first
        // hover frame, was clamped to 0.95, and read as a flat white card no
        // matter how small `boost` was tuned. Folding the intensity into
        // the colour first makes a black-emissive part contribute exactly
        // zero baseline, and keeps an already-glowing part's own colour.)
        m.emissive
          .setHex(m.userData.hoverBaseEmissiveHex)
          .multiplyScalar(m.userData.hoverBaseEmissiveIntensity)
          .addScalar(a * boost);
        m.emissiveIntensity = 1;
      }
    });
  });
}

/** 0..1 — how "hovered" a given part id is right now, eased the same way
 *  applyHoverGlow eases its own amount. Label uses its own copy of this
 *  (rather than sharing a ref with the 3D part) since a label's lifetime
 *  and a part's aren't the same thing — a label can mount/unmount across
 *  tour steps independent of the mesh it names. */
function useHoverAmount(id: string | undefined) {
  const amountRef = useRef(0);
  useFrame(() => {
    const target = id && hoverState.id === id ? 1 : 0;
    amountRef.current = stepHover(amountRef.current, target);
    if (amountRef.current < 0.003) amountRef.current = 0;
  });
  return amountRef;
}

function CaptureModule({
  explodeRef,
  onSelectPart,
}: {
  explodeRef: MutableRefObject<number>;
  onSelectPart: SelectPartFn;
}) {
  const chimneyY1 = assemblyTop;
  const shellRef = useRef<THREE.Group>(null);
  const hoverAmt = useRef(0);
  // the flange and transfer-port nubs below carry their OWN ids ('exhaustFeed',
  // 'fillLine' — the latter shared with the external TankFillLine tube, so
  // hovering either highlights both), not 'module' — but they're still
  // inside shellRef's subtree, which the 'module' pass above walks whenever
  // the shell itself is hovered. Running their own passes AFTER that one
  // each frame means they always get the last, correct word on their own
  // two materials: lit when their own id is hovered, otherwise settled back
  // to base even if the broader 'module' pass just lit them up in passing.
  const flangeRef = useRef<THREE.Mesh>(null);
  const flangeHoverAmt = useRef(0);
  const transferPortRef = useRef<THREE.Mesh>(null);
  const transferPortHoverAmt = useRef(0);

  useFrame(() => {
    if (shellRef.current) {
      shellRef.current.position.y = IN(explodeRef.current * EXPLODE.shellLift);
      applyHoverGlow(shellRef.current, 'module', hoverAmt);
    }
    if (flangeRef.current) applyHoverGlow(flangeRef.current, 'exhaustFeed', flangeHoverAmt);
    if (transferPortRef.current) applyHoverGlow(transferPortRef.current, 'fillLine', transferPortHoverAmt);
  });

  return (
    <group ref={shellRef}>
      {/* body */}
      <mesh
        position={[IN((moduleX0 + moduleX1) / 2), IN((bodyY0 + bodyY1) / 2), IN(moduleZCenter)]}
        castShadow
        receiveShadow
        {...clickable('module', onSelectPart)}
      >
        <boxGeometry args={[IN(moduleX1 - moduleX0), IN(bodyY1 - bodyY0), IN(moduleZ1 - moduleZ0)]} />
        <meshStandardMaterial color={PALETTE.module.body} metalness={0.25} roughness={0.55} />
      </mesh>

      {/* chimney */}
      <mesh
        position={[IN((moduleX0 + moduleX1) / 2), IN((bodyY1 + chimneyY1) / 2), IN(moduleZCenter)]}
        castShadow
        {...clickable('module', onSelectPart)}
      >
        <boxGeometry args={[IN(MODULE.chimneyDepth), IN(chimneyY1 - bodyY1), IN(MODULE.chimneyWidth)]} />
        <meshStandardMaterial color={PALETTE.module.light} metalness={0.3} roughness={0.5} />
      </mesh>

      {/* ID plate, front face */}
      <mesh position={[IN(moduleX0 - 0.3), IN(bodyY0 + 18), IN(moduleZCenter)]}>
        <boxGeometry args={[IN(0.6), IN(2.2), IN(8)]} />
        <meshStandardMaterial color={PALETTE.module.pale} metalness={0.4} roughness={0.4} />
      </mesh>

      {/* access port, front face */}
      <mesh position={[IN(moduleX0 - 0.3), IN(bodyY0 + 10), IN(moduleZCenter)]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[IN(3), IN(3), IN(0.6), 24]} />
        <meshStandardMaterial color={PALETTE.module.light} metalness={0.5} roughness={0.4} />
      </mesh>

      {/* exhaust inlet coupling (flange), stack-side face (same side the
          exhaust stack itself sits on) — where ExhaustFeed's duct actually
          ties in; the user-visible answer to "how does exhaust get in here
          at all". Sized to read as a flange around that duct (radius 1.8in),
          not a narrow instrument fitting */}
      <mesh
        ref={flangeRef}
        position={[IN((moduleX0 + moduleX1) / 2), IN(bodyY0 + 12), IN(moduleZ1 + 1)]}
        rotation={[Math.PI / 2, 0, 0]}
        {...clickable('exhaustFeed', onSelectPart)}
      >
        <cylinderGeometry args={[IN(2.1), IN(2.1), IN(2), 20]} />
        <meshStandardMaterial color="#e2883f" metalness={0.4} roughness={0.4} />
      </mesh>

      {/* CO2 transfer port, tank-side face — the tanks sit right off this
          face (moduleZ0 = tankZ1 + gap), which is also where TankFillLine's
          own curve actually starts */}
      <mesh
        ref={transferPortRef}
        position={[IN((moduleX0 + moduleX1) / 2), IN(bodyY0 + 17), IN(moduleZ0 - 1)]}
        rotation={[Math.PI / 2, 0, 0]}
        {...clickable('fillLine', onSelectPart)}
      >
        <cylinderGeometry args={[IN(0.65), IN(0.65), IN(2), 16]} />
        <meshStandardMaterial color="#2f8f8a" metalness={0.4} roughness={0.4} />
      </mesh>
    </group>
  );
}

/** Mounting rail + wall brackets — the 2D elevations call these out
 *  explicitly (8, 12) as what actually carries the module+tank assembly off
 *  the cab's back wall, but the 3D build never modeled them; the assembly
 *  just touched the wall directly. Bridges the small WALL_EMBED gap between
 *  the cab's real back face and the embedded equipment. Fades independently
 *  of the truck body (see TruckContext) — on "inside the module" the truck
 *  disappears entirely but this stays dimly visible, since it's the one
 *  piece that shows how the system is actually attached to anything. */
function MountingRail({
  opacityRef,
  onSelectPart,
}: {
  opacityRef: MutableRefObject<number>;
  onSelectPart: SelectPartFn;
}) {
  const railXCenter = cabX1 - 0.75;
  const railXThickness = 1.6;
  const railZ0 = tankZ0;
  const railZ1 = moduleZ1;
  // frames the equipment from OUTSIDE its own envelope (panelTop/panelBottom
  // — the backing-panel bounds, already sized with real clearance around
  // assemblyTop/assemblyBottom), not 2in INSIDE it. The previous
  // `assemblyTop - 2` / `assemblyBottom + 2` placed these bars inside the
  // equipment's own footprint — invisible against the module's opaque box,
  // but visibly slicing straight through the CO2 tanks' round cross-section
  // (a real bug, not just hidden geometry: fully visible once the tank
  // shell goes glass-like on the "tanks" hologram step). A frame has to sit
  // outside what it's framing.
  const railTop = panelTop - 1;
  const railBottom = panelBottom + 1;
  const railHeight = 1.2;
  const groupRef = useFadeGroup(opacityRef);
  const hoverAmt = useRef(0);
  useFrame(() => {
    // this rail/bracket set used to be the one solid, substantial-looking
    // piece of geometry in the whole scene with no click response at all —
    // easy to mistake for a part that just doesn't work, since everything
    // else responds. useFadeGroup (above) already walks this same group
    // every frame for opacity, but only on an opacity CHANGE, which won't
    // reliably coincide with a hover — so this gets its own pass, over the
    // same group, touching only emissive (never fought by useFadeGroup,
    // which never touches emissive itself).
    if (groupRef.current) applyHoverGlow(groupRef.current, 'mountingRail', hoverAmt);
  });

  return (
    <group ref={groupRef} {...clickable('mountingRail', onSelectPart)}>
      {[railTop, railBottom].map((y) => (
        <mesh key={y} position={[IN(railXCenter), IN(y), IN((railZ0 + railZ1) / 2)]}>
          <boxGeometry args={[IN(railXThickness), IN(railHeight), IN(railZ1 - railZ0)]} />
          <meshStandardMaterial color={PALETTE.rail.bar} metalness={0.3} roughness={0.6} />
        </mesh>
      ))}
      {/* wall brackets — tie the rails to the cab's structural mounts */}
      {[tankZCenter, moduleZCenter].map((z) => (
        <mesh key={z} position={[IN(railXCenter), IN((railTop + railBottom) / 2), IN(z)]}>
          <boxGeometry args={[IN(railXThickness + 0.6), IN(railBottom - railTop), IN(2.5)]} />
          <meshStandardMaterial color={PALETTE.rail.bracket} metalness={0.25} roughness={0.65} />
        </mesh>
      ))}
    </group>
  );
}

/** Internal process chambers — de-tox/absorption, heating/regen (PCM + rich
 *  amine pool), reservoir, demister, return pump and piping — positioned to
 *  match the 2D cutaway exactly. Sits inside the module's shell, so nothing
 *  here is visible yet; this is the geometry a later exploded-view tour will
 *  reveal by moving the shell away, not something wired up in this pass. */
// gentle, slow breathing pulse — used everywhere a "this is the highlighted
// part" glow needs to feel alive without being distracting
function glowPulse() {
  return 0.7 + 0.3 * Math.sin(performance.now() / 1000 * 1.1);
}

function ModuleInternals({
  explodeRef,
  onSelectPart,
}: {
  explodeRef: MutableRefObject<number>;
  onSelectPart: SelectPartFn;
}) {
  const intXCenter = (intX0 + intX1) / 2;
  const intZCenter = (intZ0 + intZ1) / 2;
  const pumpX = intX0 + 2;
  const pumpZ = intZ1 - 2;

  const heatingRef = useRef<THREE.Group>(null);
  const detoxRef = useRef<THREE.Group>(null);
  const demisterRef = useRef<THREE.Group>(null);
  const downcomerMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const returnLineMatRef = useRef<THREE.MeshStandardMaterial>(null);

  // one glow ref per chamber, each keeping its own base color — only used
  // once explodeRef shows this view is actually the one on screen
  const reservoirMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const pcmMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const poolMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const detoxMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const demisterMatRef = useRef<THREE.MeshStandardMaterial>(null);

  // hover amount per chamber — folded into the SAME emissiveIntensity write
  // each chamber's glow already gets below, rather than a second useFrame
  // reaching into the same materials (that dual-writer fight, once explode
  // position and hover scale both touched the de-tox chamber's own group,
  // is what made it visibly "bug out" on hover)
  const chamberGlowRefs: [MutableRefObject<THREE.MeshStandardMaterial | null>, string][] = [
    [reservoirMatRef, 'reservoir'],
    [pcmMatRef, 'pcm'],
    [poolMatRef, 'pool'],
    [detoxMatRef, 'detox'],
    [demisterMatRef, 'demister'],
  ];
  const chamberHoverAmts = useRef(chamberGlowRefs.map(() => 0));

  useFrame(() => {
    const e = explodeRef.current;
    if (heatingRef.current) heatingRef.current.position.y = IN(e * EXPLODE.heatingLift);
    if (detoxRef.current) detoxRef.current.position.y = IN(e * EXPLODE.detoxLift);
    if (demisterRef.current) demisterRef.current.position.y = IN(e * EXPLODE.demisterLift);
    // the downcomer/return-line connectors have a fixed length baked into
    // their geometry, so stretching them as the chambers they join spread
    // apart isn't worth the complexity — fade them out instead, the way an
    // exploded parts diagram typically drops connecting hardware
    const fade = 1 - e;
    if (downcomerMatRef.current) downcomerMatRef.current.opacity = fade;
    if (returnLineMatRef.current) returnLineMatRef.current.opacity = fade;

    const glow = e * glowPulse() * 1.1;
    chamberGlowRefs.forEach(([ref, id], i) => {
      const target = hoverState.id === id ? 1 : 0;
      chamberHoverAmts.current[i] = stepHover(chamberHoverAmts.current[i], target);
      if (ref.current) ref.current.emissiveIntensity = Math.min(EMISSIVE_CLAMP, glow + chamberHoverAmts.current[i] * 0.12);
    });
  });

  return (
    <group>
      {/* lean amine reservoir — the anchor; everything above spreads away from it */}
      <mesh
        position={[IN(intXCenter), IN((reservoirY0 + reservoirY1) / 2), IN(intZCenter)]}
        {...clickable('reservoir', onSelectPart)}
      >
        <boxGeometry args={[IN(intX1 - intX0), IN(reservoirY1 - reservoirY0), IN(intZ1 - intZ0)]} />
        <meshStandardMaterial
          ref={reservoirMatRef}
          color="#ab8a2a"
          emissive="#ffd27a"
          emissiveIntensity={0}
          transparent
          opacity={0.55}
        />
      </mesh>

      <group ref={heatingRef}>
        {/* PCM thermal buffer */}
        <mesh
          position={[IN(intXCenter), IN((pcmY0 + pcmY1) / 2), IN((pcmZ0 + pcmZ1) / 2)]}
          {...clickable('pcm', onSelectPart)}
        >
          <boxGeometry args={[IN(intX1 - intX0), IN(pcmY1 - pcmY0), IN(pcmZ1 - pcmZ0)]} />
          <meshStandardMaterial ref={pcmMatRef} color="#b23b3b" emissive="#ff6b5b" emissiveIntensity={0} roughness={0.7} />
        </mesh>

        {/* rich amine pool, awaiting regeneration */}
        <mesh
          position={[IN(intXCenter), IN((poolY0 + poolY1) / 2), IN((poolZ0 + poolZ1) / 2)]}
          {...clickable('pool', onSelectPart)}
        >
          <boxGeometry args={[IN(intX1 - intX0), IN(poolY1 - poolY0), IN(poolZ1 - poolZ0)]} />
          <meshStandardMaterial
            ref={poolMatRef}
            color="#7a3a5a"
            emissive="#ff8fc7"
            emissiveIntensity={0}
            transparent
            opacity={0.6}
          />
        </mesh>
      </group>

      {/* de-tox / absorption chamber — the active gas-liquid contact volume */}
      <group ref={detoxRef} {...clickable('detox', onSelectPart)}>
        <mesh position={[IN(intXCenter), IN((detoxY0 + detoxY1) / 2), IN(intZCenter)]}>
          <boxGeometry args={[IN(intX1 - intX0), IN(detoxY1 - detoxY0), IN(intZ1 - intZ0)]} />
          <meshStandardMaterial
            ref={detoxMatRef}
            color="#2f8f8a"
            emissive="#5be0d6"
            emissiveIntensity={0}
            transparent
            opacity={0.3}
          />
        </mesh>
      </group>

      {/* demister pad */}
      <group ref={demisterRef} {...clickable('demister', onSelectPart)}>
        <mesh position={[IN(intXCenter), IN((demisterY0 + demisterY1) / 2), IN(intZCenter)]}>
          <boxGeometry args={[IN(intX1 - intX0), IN(demisterY1 - demisterY0), IN(intZ1 - intZ0)]} />
          <meshStandardMaterial ref={demisterMatRef} color={PALETTE.module.light} emissive="#ffffff" emissiveIntensity={0} wireframe />
        </mesh>
      </group>

      {/* return pump — anchored with the reservoir */}
      <mesh position={[IN(pumpX), IN(reservoirY0 + RETURN_PUMP.height / 2), IN(pumpZ)]}>
        <cylinderGeometry args={[IN(RETURN_PUMP.diameter / 2), IN(RETURN_PUMP.diameter / 2), IN(RETURN_PUMP.height), 16]} />
        <meshStandardMaterial color="#ab8a2a" metalness={0.4} roughness={0.4} />
      </mesh>

      {/* rich amine downcomer — short stub straddling the de-tox/heating boundary */}
      <mesh position={[IN(intXCenter), IN(detoxY0), IN(intZCenter)]}>
        <cylinderGeometry args={[IN(0.5), IN(0.5), IN(1.5), 12]} />
        <meshStandardMaterial ref={downcomerMatRef} color="#7a3a5a" metalness={0.3} roughness={0.5} transparent />
      </mesh>

      {/* return line: pump up to the spray header near the de-tox chamber top */}
      <mesh
        position={[
          IN(pumpX),
          IN((reservoirY0 + RETURN_PUMP.height + detoxY1) / 2),
          IN(pumpZ),
        ]}
      >
        <cylinderGeometry
          args={[IN(0.4), IN(0.4), IN(detoxY1 - (reservoirY0 + RETURN_PUMP.height)), 12]}
        />
        <meshStandardMaterial ref={returnLineMatRef} color="#ab8a2a" metalness={0.3} roughness={0.5} transparent />
      </mesh>
    </group>
  );
}

// liquid fill level inside each tank body — same ratio used by both units,
// reused so the shared geometry only has to be built once
const TANK_FILL_RATIO = 0.65;
const tankFillGeometry = new THREE.CylinderGeometry(
  IN(TANK.diameter / 2 - 0.5),
  IN(TANK.diameter / 2 - 0.5),
  IN(TANK.bodyHeight * TANK_FILL_RATIO),
  28
);
const tankDipTubeGeometry = new THREE.CylinderGeometry(IN(0.3), IN(0.3), IN(TANK.bodyHeight - 1.5), 10);
const tankValveGeometry = new THREE.CylinderGeometry(IN(0.7), IN(0.7), IN(1.6), 14);

/** One pressure vessel: body + dome shell (fades toward glass-like when
 *  openRef is 1, via its own material refs — not the shared useFadeGroup
 *  helper, since the fill/dip-tube/valve inside must stay fully opaque
 *  while only the shell itself goes translucent), plus liquid CO2 fill, a
 *  dip tube for liquid draw-off, and a pressure relief valve. Research
 *  note: these internals are a reasonable-engineering-judgment fill, not a
 *  measured spec — real tank internals vary by vendor and duty.
 */
// 14s read as static: a cosine ease spends roughly half of every cycle
// parked near its two extremes, so a viewer glancing for a few seconds had
// good odds of sampling only the "settled" portions and seeing no motion at
// all. Shortened so a full rise-and-settle completes within an ordinary
// glance at the step.
const FILL_CYCLE_SECONDS = 6;

function Tank({
  y0,
  y1,
  openRef,
  onSelectPart,
}: {
  y0: number;
  y1: number;
  openRef: MutableRefObject<number>;
  onSelectPart: SelectPartFn;
}) {
  const bodyMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const domeMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const fillMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const fillMeshRef = useRef<THREE.Mesh>(null);
  const shellHoverAmt = useRef(0);

  const bodyHeight = y1 - y0 - TANK.domeHeight;
  const fillHeight = TANK.bodyHeight * TANK_FILL_RATIO;

  useFrame(() => {
    const open = openRef.current;
    const shellOpacity = 1 - open * 0.82; // 1 → 0.18, glass-like once opened
    // folded into this same shell loop rather than a separate applyHoverGlow
    // pass — this is the one material pair that's already walked every
    // frame for opacity, so a second independent walk would just be two
    // writers landing on the same two materials
    const hoverTarget = hoverState.id === 'tanks' ? 1 : 0;
    shellHoverAmt.current = stepHover(shellHoverAmt.current, hoverTarget);
    const hoverGlow = shellHoverAmt.current < 0.003 ? 0 : shellHoverAmt.current;
    [bodyMatRef.current, domeMatRef.current].forEach((m) => {
      if (!m) return;
      m.transparent = true;
      m.opacity = shellOpacity;
      m.depthWrite = shellOpacity > 0.9;
      if (hoverGlow > 0) {
        m.emissive.setHex(0xffffff);
        m.emissiveIntensity = hoverGlow * HOVER_GLOW_BOOST;
      } else {
        // back to the shell's declared look (no emissive at all) — the
        // colour used to be left white at intensity 0 after the first hover
        m.emissive.setHex(0x000000);
        m.emissiveIntensity = 0;
      }
    });
    // the liquid itself is the "this is CO2" highlight once the shell opens
    if (fillMatRef.current) fillMatRef.current.emissiveIntensity = open * glowPulse() * 0.9;

    // a slow breathing cycle — level eases up toward the target fill ratio,
    // holds, eases back down toward a third full, and repeats. Scaling the
    // existing fill cylinder on Y (instead of swapping geometry) and
    // re-anchoring its position keeps the bottom fixed at the tank floor
    // as the top rises and falls, the way an actual liquid level would.
    const cyclePos = (performance.now() / 1000 / FILL_CYCLE_SECONDS) % 1;
    const growT = 0.15 + 0.85 * (0.5 - 0.5 * Math.cos(cyclePos * Math.PI * 2));
    if (fillMeshRef.current) {
      fillMeshRef.current.scale.y = growT;
      fillMeshRef.current.position.y = IN(y0 + (fillHeight * growT) / 2);
    }
  });

  return (
    <group position={[IN((tankX0 + tankX1) / 2), 0, IN(tankZCenter)]} {...clickable('tanks', onSelectPart)}>
      <mesh position={[0, IN(y0 + bodyHeight / 2), 0]} geometry={tankBodyGeometry} castShadow receiveShadow>
        <meshStandardMaterial ref={bodyMatRef} color={PALETTE.tanks.body} metalness={0.45} roughness={0.35} />
      </mesh>
      <mesh position={[0, IN(y1 - TANK.domeHeight / 2), 0]} geometry={tankDomeGeometry} castShadow>
        <meshStandardMaterial ref={domeMatRef} color={PALETTE.tanks.body} metalness={0.45} roughness={0.35} />
      </mesh>
      <mesh position={[0, IN(y1 + 0.3), 0]} geometry={tankCapGeometry}>
        <meshStandardMaterial color={PALETTE.tanks.cap} metalness={0.5} roughness={0.35} />
      </mesh>

      {/* liquid CO2 fill, sitting on the floor of the body — scaled on Y
          each frame above to animate the level rising/settling */}
      <mesh ref={fillMeshRef} position={[0, IN(y0 + fillHeight / 2), 0]} geometry={tankFillGeometry}>
        <meshStandardMaterial
          ref={fillMatRef}
          color={PALETTE.tanks.fill}
          emissive={PALETTE.tanks.glow}
          emissiveIntensity={0}
          transparent
          opacity={0.92}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      {/* dip tube — draws liquid from near the bottom, feeds out the top */}
      <mesh position={[IN(1.6), IN(y0 + (TANK.bodyHeight - 1.5) / 2 + 0.75), 0]} geometry={tankDipTubeGeometry}>
        <meshStandardMaterial color={PALETTE.tanks.hardware} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* pressure relief valve, on the dome */}
      <mesh
        position={[IN(2.2), IN(y1 - TANK.domeHeight * 0.6), 0]}
        rotation={[0, 0, Math.PI / 2]}
        geometry={tankValveGeometry}
      >
        <meshStandardMaterial color="#c0392b" metalness={0.3} roughness={0.5} />
      </mesh>
    </group>
  );
}

function StackedTanks({
  openRef,
  onSelectPart,
}: {
  openRef: MutableRefObject<number>;
  onSelectPart: SelectPartFn;
}) {
  const tank2Y0 = assemblyBottom;
  const tank2Y1 = tank2Y0 + TANK_UNIT_HEIGHT;
  const tank1Y0 = tank2Y1 + TANK.gap;
  const tank1Y1 = tank1Y0 + TANK_UNIT_HEIGHT;

  return (
    <group>
      <Tank y0={tank2Y0} y1={tank2Y1} openRef={openRef} onSelectPart={onSelectPart} />
      <Tank y0={tank1Y0} y1={tank1Y1} openRef={openRef} onSelectPart={onSelectPart} />
      {/* inter-tank transfer line */}
      <mesh position={[IN((tankX0 + tankX1) / 2), IN((tank2Y1 + tank1Y0) / 2), IN(tankZCenter)]}>
        <cylinderGeometry args={[IN(0.8), IN(0.8), IN(tank1Y0 - tank2Y1), 16]} />
        <meshStandardMaterial color="#e2883f" metalness={0.4} roughness={0.4} />
      </mesh>
    </group>
  );
}

// top of the upper tank — reused by the fill line (pipe) and the flow
// trail running through it, so both agree on exactly where it connects
const TANK_TOP_Y = assemblyBottom + TANK.gap + TANK_UNIT_HEIGHT * 2;
const tankXCenterTop = (tankX0 + tankX1) / 2;

/** The one pipe that's actually filling the tanks — CO2 leaves the module
 *  (its near, tank-facing wall) and enters the top of the upper tank. Static
 *  geometry, like the other inter-component tubes (TransferAuger, TEGLead);
 *  the flow trail (see Rig) is what shows it actively carrying CO2. */
function TankFillLine({ onSelectPart }: { onSelectPart: SelectPartFn }) {
  const points = useMemo(
    () => [
      new THREE.Vector3(IN(moduleXCenter), IN(bodyY1 - 2), IN(moduleZ0 - 0.5)),
      new THREE.Vector3(IN((moduleXCenter + tankXCenterTop) / 2), IN((bodyY1 + TANK_TOP_Y) / 2 + 3), IN((moduleZ0 + tankZ1) / 2)),
      new THREE.Vector3(IN(tankXCenterTop), IN(TANK_TOP_Y + 1), IN(tankZCenter)),
    ],
    []
  );
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points]);
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 28, IN(0.4), 10, false), [curve]);
  const meshRef = useRef<THREE.Mesh>(null);
  const hoverAmt = useRef(0);
  useFrame(() => {
    if (meshRef.current) applyHoverGlow(meshRef.current, 'fillLine', hoverAmt);
  });

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow {...clickable('fillLine', onSelectPart)}>
      <meshStandardMaterial color="#4fa8c7" metalness={0.4} roughness={0.4} />
    </mesh>
  );
}

// granular makeup-amine fill + vertical auger screw inside the bin — a
// reasonable-engineering-judgment fill, not a measured spec: the real
// media and screw geometry depend on the vendor and duty
const BIN_FILL_RATIO = 0.7;
const binFillGeometry = new THREE.BoxGeometry(
  IN(BULK_BIN.width - 2),
  IN(BULK_BIN.height * BIN_FILL_RATIO),
  IN(BULK_BIN.depth - 2)
);
// The screw runs the bin's full height and on up into the inlet nub (centre
// at bulkBinY1 + 1.5), at the same radius as the transfer tube above it, so
// the pipe is one unbroken line from the bottom of the bin to the module. It
// used to stop 1.5in short of the top plate and be narrower than the tube,
// which showed as a gap once the bin's shell goes glassy.
const AUGER_RADIUS = 0.6;
const AUGER_SHAFT_LENGTH = BULK_BIN.height; // from 1.5in above the bin floor to the nub's centre
const binAugerShaftGeometry = new THREE.CylinderGeometry(IN(AUGER_RADIUS), IN(AUGER_RADIUS), IN(AUGER_SHAFT_LENGTH), 10);
const binAugerFlightGeometry = new THREE.CylinderGeometry(IN(2.6), IN(2.6), IN(0.4), 16);

function BulkBin({
  openRef,
  onSelectPart,
}: {
  openRef: MutableRefObject<number>;
  onSelectPart: SelectPartFn;
}) {
  const shellMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const fillMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const binGlowRef = useRef<THREE.Group>(null);
  const binHoverAmt = useRef(0);
  const augerGlowRef = useRef<THREE.Group>(null);
  const augerHoverAmt = useRef(0);

  useFrame(() => {
    const m = shellMatRef.current;
    const open = openRef.current;
    if (m) {
      m.transparent = true;
      m.opacity = 1 - open * 0.82; // 1 → 0.18
      m.depthWrite = m.opacity > 0.9;
    }
    // shell/nub/feet have no other per-frame writer, so this group gets the
    // generic hover-glow pass; the auger shaft+flights are a second,
    // separate part (same 'auger' id used by the standalone TransferAuger
    // tube too, so hovering either one highlights both) and get their own.
    // Both ease binHoverAmt/augerHoverAmt as a side effect — read AFTER
    // calling, not computed separately, so there's exactly one writer per ref.
    if (binGlowRef.current) applyHoverGlow(binGlowRef.current, 'bulkBin', binHoverAmt);
    if (augerGlowRef.current) applyHoverGlow(augerGlowRef.current, 'auger', augerHoverAmt);
    // the stored amine is the "this is what's inside" highlight, plus
    // whatever the shared bin hover amount adds on top
    if (fillMatRef.current) {
      fillMatRef.current.emissiveIntensity = Math.min(EMISSIVE_CLAMP, open * glowPulse() * 0.7 + binHoverAmt.current * 0.12);
    }
  });

  const binXCenter = (bulkBinX0 + bulkBinX1) / 2;
  const fillHeight = (bulkBinY1 - bulkBinY0) * BIN_FILL_RATIO;

  return (
    <group>
      <group ref={binGlowRef}>
        <mesh
          position={[IN(binXCenter), IN((bulkBinY0 + bulkBinY1) / 2), IN(bulkBinZCenter)]}
          castShadow
          {...clickable('bulkBin', onSelectPart)}
        >
          <boxGeometry args={[IN(bulkBinX1 - bulkBinX0), IN(bulkBinY1 - bulkBinY0), IN(BULK_BIN.depth)]} />
          <meshStandardMaterial ref={shellMatRef} color={PALETTE.bin.shell} metalness={0.25} roughness={0.6} />
        </mesh>
        {/* auger inlet nub — sits at moduleXCenter, not the bin's own center:
            that's where TransferAuger's tube actually arrives from above, and
            a nub centered on the (wider) bin box instead was sitting 1.5in
            off from the pipe feeding it */}
        <mesh position={[IN(moduleXCenter), IN(bulkBinY1 + 1.5), IN(bulkBinZCenter)]} {...clickable('bulkBin', onSelectPart)}>
          <cylinderGeometry args={[IN(1.8), IN(1.8), IN(3), 16]} />
          <meshStandardMaterial color={PALETTE.bin.pale} metalness={0.4} roughness={0.5} />
        </mesh>
        {/* frame-rail standoff feet */}
        {[-6, 6].map((dz) => (
          <mesh
            key={dz}
            position={[IN((bulkBinX0 + bulkBinX1) / 2), IN(bulkBinY0 - 2), IN(bulkBinZCenter + dz)]}
            geometry={bulkBinFootGeometry}
            {...clickable('bulkBin', onSelectPart)}
          >
            <meshStandardMaterial color={PALETTE.bin.dark} metalness={0.3} roughness={0.6} />
          </mesh>
        ))}
      </group>

      {/* makeup amine fill */}
      <mesh
        position={[IN((bulkBinX0 + bulkBinX1) / 2), IN(bulkBinY0 + fillHeight / 2), IN(bulkBinZCenter)]}
        geometry={binFillGeometry}
        {...clickable('bulkBin', onSelectPart)}
      >
        <meshStandardMaterial ref={fillMatRef} color={PALETTE.bin.fill} emissive={PALETTE.bin.glow} emissiveIntensity={0} roughness={0.95} />
      </mesh>
      {/* vertical auger screw, lifting media up to the inlet nub — same
          moduleXCenter column as the nub above it */}
      <group ref={augerGlowRef}>
        <mesh
          position={[IN(moduleXCenter), IN(bulkBinY0 + 1.5 + AUGER_SHAFT_LENGTH / 2), IN(bulkBinZCenter)]}
          geometry={binAugerShaftGeometry}
          {...clickable('auger', onSelectPart)}
        >
          <meshStandardMaterial color={PALETTE.bin.dark} metalness={0.5} roughness={0.4} />
        </mesh>
        {[0.2, 0.4, 0.6, 0.8].map((frac) => (
          <mesh
            key={frac}
            position={[IN(moduleXCenter), IN(bulkBinY0 + 1.5 + (BULK_BIN.height - 3) * frac), IN(bulkBinZCenter)]}
            geometry={binAugerFlightGeometry}
            {...clickable('auger', onSelectPart)}
          >
            <meshStandardMaterial color={PALETTE.bin.mid} metalness={0.5} roughness={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function TransferAuger({ onSelectPart }: { onSelectPart: SelectPartFn }) {
  // module and bin now share the same X/Z column, so this is a straight
  // vertical run rather than a sideways reach to a separate shelf
  const start = new THREE.Vector3(IN(moduleXCenter), IN(assemblyBottom), IN(moduleZCenter));
  const mid = new THREE.Vector3(IN(moduleXCenter), IN((assemblyBottom + bulkBinY1) / 2), IN(moduleZCenter));
  const end = new THREE.Vector3(IN(moduleXCenter), IN(bulkBinY1 + 1.5), IN(moduleZCenter));

  const curve = useMemo(() => new THREE.CatmullRomCurve3([start, mid, end]), []);
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 32, IN(0.6), 12, false), [curve]);
  const meshRef = useRef<THREE.Mesh>(null);
  const hoverAmt = useRef(0);
  useFrame(() => {
    if (meshRef.current) applyHoverGlow(meshRef.current, 'auger', hoverAmt);
  });

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow {...clickable('auger', onSelectPart)}>
      <meshStandardMaterial color={PALETTE.bin.dark} metalness={0.3} roughness={0.6} />
    </mesh>
  );
}

function TEGSleeve({
  openRef,
  onSelectPart,
}: {
  openRef: MutableRefObject<number>;
  onSelectPart: SelectPartFn;
}) {
  const r = TEG_SLEEVE.outerDiameter / 2;
  const sleeveMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const hoverAmt = useRef(0);

  useFrame(() => {
    const hoverTarget = hoverState.id === 'tegSleeve' ? 1 : 0;
    hoverAmt.current = stepHover(hoverAmt.current, hoverTarget);
    if (sleeveMatRef.current) {
      // glowPulse() swings 0.4..1.0, so the old `open * pulse * 0.8` took the
      // sleeve from a pale grey-peach to a strong peach and back every ~6s —
      // it never held one colour, and never matched the legend's swatch. The
      // pulse is now a narrow shimmer on top of a steady glow, so the sleeve
      // reads as the same salmon the whole time.
      const heat = openRef.current * (0.22 + 0.12 * glowPulse());
      sleeveMatRef.current.emissiveIntensity = Math.min(EMISSIVE_CLAMP, heat + hoverAmt.current * 0.12);
    }
  });

  return (
    <group position={[IN(stackX), IN(tegSleeveYCenter), IN(stackZ)]} {...clickable('tegSleeve', onSelectPart)}>
      <mesh castShadow>
        <cylinderGeometry args={[IN(r), IN(r), IN(TEG_SLEEVE.length), 24]} />
        <meshStandardMaterial ref={sleeveMatRef} color="#e8a98f" emissive="#f4a98c" emissiveIntensity={0} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* seam lines suggesting the tiled TEG modules, not modeled individually */}
      <mesh>
        <cylinderGeometry args={[IN(r + 0.05), IN(r + 0.05), IN(TEG_SLEEVE.length - 2), 24, 6, true]} />
        <meshStandardMaterial color={PALETTE.teg.sleeveWire} wireframe />
      </mesh>
    </group>
  );
}

// TEG modules on the hot (-X, stack-facing) wall, heat-exchanger fins on the
// cold (+X) wall, and a small controller board — a reasonable-engineering-
// judgment fill, not a measured spec: real Bi2Te3 module count/layout and
// fin geometry depend on the vendor and the stack's actual heat duty
const tegModuleGeometry = new THREE.BoxGeometry(IN(1), IN(2.2), IN(1.8));
const tegFinGeometry = new THREE.BoxGeometry(IN(0.15), IN(6), IN(5));
const tegControllerGeometry = new THREE.BoxGeometry(IN(3), IN(1.2), IN(2.5));

// ids of the sub-parts the housing physically encloses — used below to tell
// a click/hover that lands on one of THEM (deeper along the same ray than
// the housing's own near face) apart from one that lands on open housing
// surface with nothing more specific behind it
const TEG_UNIT_CHILD_IDS = new Set(['tegModules', 'tegFins', 'tegController']);

function TEGUnit({
  openRef,
  onSelectPart,
}: {
  openRef: MutableRefObject<number>;
  onSelectPart: SelectPartFn;
}) {
  const shellRef = useRef<THREE.Mesh>(null);
  const shellMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const shellHoverAmt = useRef(0);
  const moduleMatRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const modulesHoverAmt = useRef(0);
  const finsMatRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const finsHoverAmt = useRef(0);
  const controllerRef = useRef<THREE.Mesh>(null);
  const controllerHoverAmt = useRef(0);

  useFrame(() => {
    const m = shellMatRef.current;
    const open = openRef.current;
    if (m) {
      m.transparent = true;
      m.opacity = 1 - open * 0.82; // 1 → 0.18
      m.depthWrite = m.opacity > 0.9;
    }
    // the housing's OWN hover feedback — only ever touches emissive, never
    // fought by the opacity write above
    if (shellRef.current) applyHoverGlow(shellRef.current, 'tegUnit', shellHoverAmt, 0.12);
    // the hot-side TEG modules are the actual "waste heat recovery" part —
    // these are what glow, not the housing or the fins. 1.3 (vs. 0.8-0.9
    // everywhere else this same pattern is used — Tank, TEGSleeve) pushed
    // emissiveIntensity past clipping at the top of each pulse: the orange
    // emissive color blew out to flat white and the normal diffuse shading
    // gradient between the 3 adjacent module boxes disappeared with it,
    // reading as an unfinished/untextured panel rather than a glow.
    const glow = open * glowPulse() * 0.85;
    const modulesHoverTarget = hoverState.id === 'tegModules' ? 1 : 0;
    modulesHoverAmt.current = stepHover(modulesHoverAmt.current, modulesHoverTarget);
    moduleMatRefs.current.forEach((mat) => {
      if (mat) mat.emissiveIntensity = Math.min(EMISSIVE_CLAMP, glow + modulesHoverAmt.current * 0.12);
    });
    // the fins used to be a plain static grey (#c7ccd1) with no emissive of
    // their own at all — against the housing's own similarly-muted
    // #5b7280 shell, especially once that shell goes glass-like on this
    // step, a flat grey plate with nothing lighting it up reads as part of
    // the housing rather than its own labeled part. Giving them a cool
    // blue glow (the hot side's own warm orange glow's natural opposite —
    // this IS the cold side, thermally) makes them read as something
    // actively doing a job, the same way every other "this is the part
    // this step is about" element in the scene already does, rather than
    // depending on color/contrast alone to stand out.
    const finsGlow = open * glowPulse() * 0.5;
    const finsHoverTarget = hoverState.id === 'tegFins' ? 1 : 0;
    finsHoverAmt.current = stepHover(finsHoverAmt.current, finsHoverTarget);
    finsMatRefs.current.forEach((mat) => {
      if (mat) mat.emissiveIntensity = Math.min(EMISSIVE_CLAMP, finsGlow + finsHoverAmt.current * 0.12);
    });
    if (controllerRef.current) applyHoverGlow(controllerRef.current, 'tegController', controllerHoverAmt, 0.12);
  });

  const unitXCenter = (tegUnitX0 + tegUnitX1) / 2;
  const unitYCenter = (tegUnitY0 + tegUnitY1) / 2;

  // The housing used to have raycasting disabled outright so it never
  // blocked clicks on the modules/fins/controller sitting inside it — which
  // also meant clicking anywhere on the housing's OWN surface (anywhere not
  // directly in front of one of those three) did nothing at all, with no
  // way to even learn this box IS the waste-heat recovery unit's housing.
  // Raycasting is back on now as its own clickable('tegUnit', ...) target,
  // but WITHOUT unconditionally stopping propagation: the housing's near
  // face is always geometrically in front of whatever it encloses, so for
  // any ray that also reaches a module/fin/controller behind it, fiber
  // calls handlers nearest-first — this one fires, then that part's own
  // (farther) handler fires right after and simply overwrites the
  // selection/hover to the more specific id, so clicking precisely on a
  // module/fin/controller still selects THAT, not the housing.
  // e.intersections is checked only to avoid one edge case: stopping the
  // ray entirely when nothing more specific is behind it, so an unrelated
  // object further back along the same line of sight (nothing normally
  // sits there in this scene, but the check is cheap) can never hijack a
  // plain click on open housing surface.
  const hasTegChildBehind = (e: ThreeEvent<MouseEvent> | ThreeEvent<PointerEvent>) =>
    e.intersections.some((i) => TEG_UNIT_CHILD_IDS.has((i.object.userData as { partId?: string }).partId ?? ''));

  return (
    <group>
      <mesh
        ref={shellRef}
        position={[IN(unitXCenter), IN(unitYCenter), IN(tegUnitZCenter)]}
        castShadow
        onClick={(e) => {
          if (!hasTegChildBehind(e)) e.stopPropagation();
          onSelectPart('tegUnit');
        }}
        onPointerOver={(e) => {
          if (!hasTegChildBehind(e)) e.stopPropagation();
          document.body.style.cursor = 'pointer';
          hoverState.id = 'tegUnit';
          if (e.nativeEvent.pointerType !== 'touch') sfx.hover('tegUnit');
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
          if (hoverState.id === 'tegUnit') hoverState.id = null;
        }}
      >
        <boxGeometry args={[IN(tegUnitX1 - tegUnitX0), IN(tegUnitY1 - tegUnitY0), IN(tegUnitZ1 - tegUnitZ0)]} />
        <meshStandardMaterial ref={shellMatRef} color={PALETTE.teg.housing} metalness={0.3} roughness={0.55} />
      </mesh>
      {/* output connector nub */}
      <mesh position={[IN(tegUnitX0 - 0.3), IN(tegUnitY0 + 2), IN(tegUnitZCenter)]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[IN(0.5), IN(0.5), IN(0.6), 16]} />
        <meshStandardMaterial color="#1f6f43" metalness={0.4} roughness={0.4} />
      </mesh>

      {/* TEG modules, hot side — against the -X wall, facing the stack.
          userData.partId lets the housing's own handlers (above) tell these
          apart from "nothing specific behind this click" without a second
          registry. */}
      {[-2.5, 0, 2.5].map((dz, i) => (
        <mesh
          key={dz}
          position={[IN(tegUnitX0 + 1), IN(unitYCenter + 1.5), IN(tegUnitZCenter + dz)]}
          geometry={tegModuleGeometry}
          userData={{ partId: 'tegModules' }}
          {...clickable('tegModules', onSelectPart)}
        >
          <meshStandardMaterial
            ref={(el) => {
              moduleMatRefs.current[i] = el;
            }}
            color="#2b2e33"
            emissive="#ff9d5c"
            emissiveIntensity={0}
            roughness={0.6}
          />
        </mesh>
      ))}
      {/* heat-exchanger fins, cold side — against the +X wall. Lightened to
          a cool blue-white (was #c7ccd1, close enough to the housing's own
          #5b7280 to barely read as a separate part) and given their own
          cool emissive glow (see useFrame above) instead of a flat,
          unlit color */}
      {[-1.2, 0, 1.2].map((dz, i) => (
        <mesh
          key={dz}
          position={[IN(tegUnitX1 - 1.2), IN(unitYCenter + 0.5), IN(tegUnitZCenter + dz)]}
          geometry={tegFinGeometry}
          userData={{ partId: 'tegFins' }}
          {...clickable('tegFins', onSelectPart)}
        >
          <meshStandardMaterial
            ref={(el) => {
              finsMatRefs.current[i] = el;
            }}
            color="#e3ecf2"
            emissive="#6fc3e0"
            emissiveIntensity={0}
            metalness={0.65}
            roughness={0.25}
          />
        </mesh>
      ))}
      {/* DC-DC controller board, low in the housing */}
      <mesh
        ref={controllerRef}
        position={[IN(unitXCenter), IN(tegUnitY0 + 1.3), IN(tegUnitZCenter)]}
        geometry={tegControllerGeometry}
        userData={{ partId: 'tegController' }}
        {...clickable('tegController', onSelectPart)}
      >
        <meshStandardMaterial color="#1f6f43" roughness={0.5} />
      </mesh>
    </group>
  );
}

function TEGLead() {
  const start = new THREE.Vector3(
    IN(stackX + TEG_SLEEVE.outerDiameter / 2),
    IN(tegSleeveYCenter),
    IN(stackZ)
  );
  const mid = new THREE.Vector3(
    IN((stackX + tegUnitX1) / 2),
    IN((tegSleeveYCenter + tegUnitY1) / 2),
    IN((stackZ + tegUnitZCenter) / 2)
  );
  const end = new THREE.Vector3(IN((tegUnitX0 + tegUnitX1) / 2), IN(tegUnitY1), IN(tegUnitZCenter));

  const curve = useMemo(() => new THREE.CatmullRomCurve3([start, mid, end]), []);
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 24, IN(0.35), 10, false), [curve]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={PALETTE.teg.lead} metalness={0.3} roughness={0.6} />
    </mesh>
  );
}

// the primary feed: a slipstream of exhaust is tapped off the stack, lower
// down than the TEG's own tap (TEGLead, above), and ducted straight into the
// module's exhaust inlet coupling — this is the answer to "how does exhaust
// actually get in here", which previously had no visible path at all, just
// an unlabeled coupling nub on the module's own shell. Hidden once the
// module explodes (the shell — and the coupling riding along with it — is
// flying out of frame at that point anyway) rather than trying to keep a
// static tube glued to a moving target.
const EXHAUST_FEED_Y = bodyY0 + 12; // matches the coupling nub's own height
function ExhaustFeed({
  visibleRef,
  onSelectPart,
}: {
  visibleRef: MutableRefObject<number>;
  onSelectPart: SelectPartFn;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const hoverAmt = useRef(0);
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.visible = visibleRef.current > 0.5;
      applyHoverGlow(groupRef.current, 'exhaustFeed', hoverAmt);
    }
  });

  const points = useMemo(
    () => [
      new THREE.Vector3(IN(stackX), IN(EXHAUST_FEED_Y), IN(stackZ)),
      new THREE.Vector3(IN((stackX + moduleXCenter) / 2), IN(EXHAUST_FEED_Y), IN((stackZ + (moduleZ1 + 1)) / 2)),
      new THREE.Vector3(IN(moduleXCenter), IN(EXHAUST_FEED_Y), IN(moduleZ1 + 1)),
    ],
    []
  );
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points]);
  // noticeably thicker than the other inter-component tubes (TankFillLine,
  // TransferAuger, TEGLead) on purpose: those carry a thin liquid/solid
  // stream or a control line, while this one carries the truck's ENTIRE
  // exhaust flow — a real duct that size would read closer to the stack's
  // own diameter (5in) than to a 1in instrument line
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 24, IN(1.8), 14, false), [curve]);

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry} castShadow {...clickable('exhaustFeed', onSelectPart)}>
        <meshStandardMaterial color="#e2883f" metalness={0.4} roughness={0.45} />
      </mesh>
    </group>
  );
}

// Was aimed at the dead center of the whole truck+trailer length, from a
// far, dead-ahead elevated angle — geometrically reasonable for "show me
// the truck," but the capture equipment itself sits off to one side (in the
// cab/trailer gap, not the vehicle's own midpoint) and that angle put the
// cab's entire flank between the camera and it, hiding it completely at
// any orbit. Retargeted at the gap itself (where the equipment actually
// lives) and moved to a closer, elevated rear-three-quarter position so the
// sightline clears the cab roofline instead of being blocked by it — while
// still keeping both the cab and the trailer's leading edge in frame, so it
// still reads as "the whole truck," not a crop.
const OVERVIEW_TARGET: [number, number, number] = [
  IN((gapX0 + gapX1) / 2),
  IN((assemblyBottom + assemblyTop) / 2),
  0,
];
const OVERVIEW_POS: [number, number, number] = [9, 31, 24];

// The closing "whole system" shot used to just reuse OVERVIEW_POS/TARGET —
// identical to the opening screen, which is a flat way to end a tour whose
// whole point was showing what's inside that gap. This one targets the
// FULL equipment cluster's actual bounds (tanks on one side, the TEG unit
// well past the module on the other — a wider Z span than overview framed
// for) and sits closer in, since by this point the viewer already knows
// what they're looking at and the shot's job is to resolve it, not tease it.
const FULL_SYSTEM_TARGET: [number, number, number] = [
  IN((gapX0 + gapX1) / 2),
  IN((bulkBinY0 + assemblyTop) / 2),
  IN((tankZ0 + tegUnitZ1) / 2),
];
// With the trailer gone on this step, the camera can swing round behind the
// cab and look straight at the back wall everything is mounted to (the
// overview only ever sees it edge-on from the side).
const FULL_SYSTEM_POS: [number, number, number] = [27, 13, 14.5];

// ---------------------------------------------------------------------------
// Guided tour — one waypoint per component, in the same order as the legend.
// Each step is a camera position + look-at target (in inches, converted via
// IN() like everything else) plus an explode amount; "module-interior" is
// the only step that actually explodes anything right now.
// ---------------------------------------------------------------------------

type TourStep = {
  id: string;
  label: string;
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
  explode: number;
  // 1 = truck fully opaque, 0 = fully invisible. Full for the intro and the
  // closing "whole system" shot; translucent everywhere in between, where
  // the CO2 capture equipment — not the truck — is the point of the step.
  truckOpacity: number;
  // 1 = cab shell fully solid, <1 = see-through. Independent of truckOpacity
  // above: only "module-exterior" wants the cab translucent (so the exhaust
  // stack/duct it houses reads through instead of hiding behind solid red);
  // the overview and closing full-system shots are meant to read as a real
  // truck, not an X-ray, so they stay solid even though the truck itself is
  // fully opaque (shown) on both.
  cabTint: number;
  // the mounting rail + wall brackets the module/tanks actually bolt to —
  // normally fully opaque, but on "inside the module" the truck itself is
  // hidden entirely, so this is dimmed instead of hidden: it's the one
  // piece of "how this attaches to the truck" context left on screen.
  railOpacity: number;
  // each 0|1 — the shell of that one component turns glass-like and its
  // (always-rendered, otherwise hidden behind an opaque wall) interior
  // becomes visible. Three separate flags, not one shared "cutaway open"
  // value, because only ONE of these three is ever the step's own subject;
  // a shared flag would open all three together on any one of their steps.
  tankOpen: number;
  binOpen: number;
  tegOpen: number;
  // 1 = trailer shown (default), 0 = gone; see `trailerFade`
  trailerOpacity?: number;
};

const TRUCK_OPACITY_FULL = 1;
const TRUCK_OPACITY_FOCUSED = 0.12;
const TRUCK_OPACITY_HIDDEN = 0;
const CAB_TINT_SOLID = 1;
const CAB_TINT_SEE_THROUGH = 0.82;
const RAIL_OPACITY_FULL = 1;
const RAIL_OPACITY_DIMMED = 0.35;

const sceneVec = (xIn: number, yIn: number, zIn: number): [number, number, number] => [
  IN(xIn),
  IN(yIn),
  IN(zIn),
];

const tankXCenter = (tankX0 + tankX1) / 2;
const bulkBinXCenter = (bulkBinX0 + bulkBinX1) / 2;
const bulkBinYCenter = (bulkBinY0 + bulkBinY1) / 2;
const tegUnitXCenter = (tegUnitX0 + tegUnitX1) / 2;
const tegUnitYCenter = (tegUnitY0 + tegUnitY1) / 2;
// midpoint between the TEG sleeve (clamped on the stack) and the TEG unit —
// the two are only ~24in apart, so one close shot can include both
const tegMidX = (stackX + tegUnitXCenter) / 2;
const tegMidY = (tegSleeveYCenter + tegUnitYCenter) / 2;
const tegMidZ = (stackZ + tegUnitZCenter) / 2;

const TOUR_STEPS: TourStep[] = [
  {
    id: 'overview',
    label: 'Overview',
    cameraPos: OVERVIEW_POS,
    cameraTarget: OVERVIEW_TARGET,
    explode: 0,
    truckOpacity: TRUCK_OPACITY_FULL,
    cabTint: CAB_TINT_SOLID,
    railOpacity: RAIL_OPACITY_FULL,
    tankOpen: 0,
    binOpen: 0,
    tegOpen: 0,
  },
  {
    // closer, lower-elevation hero angle — the previous steep-overhead
    // framing cleared the cab/trailer reliably but read as a diagram shot
    // looking down at the assembly rather than a view of it mounted ON the
    // truck. This offset keeps the same general direction (clear of both
    // the cab and the trailer regardless of trailer length) but at roughly
    // the elevation and distance of a reference 3/4 shot taken from beside
    // and slightly above the truck.
    id: 'module-exterior',
    label: 'Capture module',
    // backed off from the first close pass — that one cropped in tight
    // enough to lose the sense of the assembly sitting on the truck
    cameraPos: sceneVec(moduleXCenter + 105, moduleYCenter + 82, moduleZCenter + 135),
    cameraTarget: sceneVec(moduleXCenter, moduleYCenter, moduleZCenter),
    explode: 0,
    truckOpacity: TRUCK_OPACITY_FULL,
    // the one step where the cab goes see-through — it's what houses the
    // exhaust stack/duct this whole demo is about, so seeing how it connects
    // is the point of this particular shot
    cabTint: CAB_TINT_SEE_THROUGH,
    railOpacity: RAIL_OPACITY_FULL,
    tankOpen: 0,
    binOpen: 0,
    tegOpen: 0,
  },
  {
    // exploded, the stack runs from the reservoir (anchored at ~89in) up
    // through the shell lifted 42in above its own top (~164.5in) — a ~75in
    // span, more than double the assembled height. Target Y sits a little
    // below that span's true midpoint (126.75) and the camera sits further
    // back than the first pass did — at the closer distance the base was
    // landing right at the bottom edge, nearly behind the legend panel;
    // backing off (and nudging the look-at point down slightly) gives the
    // reservoir real clearance without losing the chimney off the top.
    // A close, roughly eye-level hero angle (not the steep overhead framing
    // the other equipment steps use) — low enough elevation that it reads
    // like looking across at a hologram rather than down at a diagram;
    // paired with slow auto-rotate once arrived (see Rig) for the
    // "Stark/Jarvis" live-hologram feel.
    id: 'module-interior',
    label: 'Inside the module',
    cameraPos: sceneVec(moduleXCenter + 150, moduleYCenter + 160, moduleZCenter + 195),
    cameraTarget: sceneVec(moduleXCenter, 118, moduleZCenter),
    explode: 1,
    // the truck is hidden entirely here — only the mounting rail (dimmed,
    // not hidden) stays, as the one thread connecting the system to it
    truckOpacity: TRUCK_OPACITY_HIDDEN,
    cabTint: CAB_TINT_SOLID,
    railOpacity: RAIL_OPACITY_DIMMED,
    tankOpen: 0,
    binOpen: 0,
    tegOpen: 0,
  },
  {
    // close hero angle, matching module-interior's treatment: truck hidden
    // entirely, mounting rail dimmed (the tanks bolt to its bracket at
    // tankZCenter, unlike the bulk bin or TEG below), camera in close at a
    // dramatic elevation rather than looking straight down at a diagram.
    // Negative Z offset, not positive — the module sits on the +Z side of
    // the tanks, and a camera approaching from that side puts the (much
    // bigger) module right in the foreground, crowding the tanks out
    // exactly the way the old steep-overhead framing was built to avoid.
    id: 'tanks',
    label: 'CO₂ storage tanks',
    cameraPos: sceneVec(tankXCenter + 40, 105.5 + 60, tankZCenter - 70),
    cameraTarget: sceneVec(tankXCenter, 105.5, tankZCenter),
    explode: 0,
    truckOpacity: TRUCK_OPACITY_HIDDEN,
    cabTint: CAB_TINT_SOLID,
    railOpacity: RAIL_OPACITY_DIMMED,
    tankOpen: 1,
    binOpen: 0,
    tegOpen: 0,
  },
  {
    // same close-hero treatment; the bin stands on its own feet (not the
    // mounting rail), so the rail stays at full opacity here — dimming it
    // wouldn't show anything relevant to how THIS part attaches.
    // Target used to be the bin's own center alone — but the module (and
    // its auger-feed nub) stack directly above the bin and are always
    // rendered too, and from this step's close distance that stack rose
    // well above the bin with no headroom left, clipping its top out of
    // frame on arrival. Aimed higher (the midpoint between the bin's floor
    // and the module's own top) and pulled back a bit further so the whole
    // bin-to-module stack fits without needing a manual zoom-out.
    id: 'bulk-bin',
    label: 'Bulk storage + auger',
    cameraPos: sceneVec(bulkBinXCenter + 80, bulkBinYCenter + 100, bulkBinZCenter + 100),
    cameraTarget: sceneVec(bulkBinXCenter, (bulkBinY0 + assemblyTop) / 2, bulkBinZCenter),
    explode: 0,
    truckOpacity: TRUCK_OPACITY_HIDDEN,
    cabTint: CAB_TINT_SOLID,
    railOpacity: RAIL_OPACITY_FULL,
    tankOpen: 0,
    binOpen: 1,
    tegOpen: 0,
  },
  {
    // same close-hero treatment; the TEG clamps onto the exhaust stack, not
    // the mounting rail, so the rail stays full opacity here too. Targets
    // the midpoint between the sleeve and the unit (close enough together,
    // ~24in, that one tight shot covers both) and approaches from -X — the
    // sleeve sits at stackX (160), well before the module's own X range
    // (169.8+), so a negative X offset puts the camera on the stack's own
    // side, with the module behind the subject instead of blocking it
    id: 'teg',
    label: 'Waste-heat recovery',
    cameraPos: sceneVec(tegMidX - 35, tegMidY + 40, tegMidZ + 40),
    cameraTarget: sceneVec(tegMidX, tegMidY, tegMidZ),
    explode: 0,
    truckOpacity: TRUCK_OPACITY_HIDDEN,
    cabTint: CAB_TINT_SOLID,
    railOpacity: RAIL_OPACITY_FULL,
    tankOpen: 0,
    binOpen: 0,
    tegOpen: 1,
  },
  {
    id: 'full-system',
    label: 'Full system',
    cameraPos: FULL_SYSTEM_POS,
    cameraTarget: FULL_SYSTEM_TARGET,
    explode: 0,
    trailerOpacity: 0, // no trailer here: the whole rig on its own, and no repeat of the overview
    truckOpacity: TRUCK_OPACITY_FULL,
    cabTint: CAB_TINT_SOLID,
    railOpacity: RAIL_OPACITY_FULL,
    tankOpen: 0,
    binOpen: 0,
    tegOpen: 0,
  },
];

// Each hologram step's own "front" — the direction its arrival camera
// actually looks FROM, relative to its target. Passed to that step's
// labels as `facingDir` (see Label) so they read fully opaque from the
// vantage the step was framed for, and fade out as a viewer orbits toward
// the opposite side of the part instead of staying permanently legible no
// matter which way the model has been spun.
function stepFacingDir(id: string): [number, number, number] {
  const step = TOUR_STEPS.find((s) => s.id === id);
  if (!step) return [0, 0, 1];
  return new THREE.Vector3(...step.cameraPos).sub(new THREE.Vector3(...step.cameraTarget)).normalize().toArray() as [
    number,
    number,
    number,
  ];
}
const MODULE_EXTERIOR_FACING = stepFacingDir('module-exterior');
const MODULE_INTERIOR_FACING = stepFacingDir('module-interior');
const TANKS_FACING = stepFacingDir('tanks');
const BULK_BIN_FACING = stepFacingDir('bulk-bin');
const TEG_FACING = stepFacingDir('teg');

/** Forces the initial camera orientation. OrbitControls normally owns this
 *  via its `target` prop, but we also set it explicitly on mount so the very
 *  first rendered frame is correctly framed regardless of controls timing. */
function InitialLookAt() {
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(...OVERVIEW_TARGET);
  }, [camera]);
  return null;
}

// Duration scales with how far the camera actually has to travel: a small
// reframe (adjacent close-hero shots) stays snappy, while a long cross-scene
// jump (overview <-> a single-component focus step) gets noticeably more
// time to read as a deliberate camera move instead of a jump-cut. Clamped
// both ways so no transition feels rushed or sluggish.
const MIN_TRANSITION_DURATION = 0.75;
const MAX_TRANSITION_DURATION = 1.6;
const TRANSITION_DISTANCE_FACTOR = 0.014; // extra seconds per scene unit (foot) traveled

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Drives the camera, explode state, and truck opacity toward the active
 *  tour step on a fixed wall-clock timeline (not a per-frame multiplicative
 *  lerp). That matters because the old version advanced each property by a
 *  fraction of the time since the PREVIOUS rendered frame, clamped to at
 *  most 0.1s of "progress" per frame — fine at a steady 60fps, but the
 *  instant the real browser drops frames (a GPU hitch, a tab losing focus
 *  and coming back), the clamp caps how much ground that one big frame is
 *  allowed to cover, so the animation visibly stalls and then has to crawl
 *  the rest of the way — the "buggy transition" symptom. Timing it against
 *  performance.now() instead means whatever frame happens to render next
 *  always lands at the mathematically correct point for how much real time
 *  has actually passed, so a dropped frame skips smoothly ahead instead of
 *  stalling. The look-at point is also eased (not snapped to the new
 *  target immediately), which removes a whip-pan at the start of any
 *  transition whose target moves by more than a few degrees. */
type EasedScalar = {
  ref: MutableRefObject<number>;
  start: MutableRefObject<number>;
  get: (step: TourStep) => number;
};

function TourController({
  step,
  explodeRef,
  truckOpacityRef,
  cabTintRef,
  railOpacityRef,
  tankOpenRef,
  binOpenRef,
  tegOpenRef,
  transitioningRef,
  onArrive,
}: {
  step: TourStep;
  explodeRef: MutableRefObject<number>;
  truckOpacityRef: MutableRefObject<number>;
  cabTintRef: MutableRefObject<number>;
  railOpacityRef: MutableRefObject<number>;
  tankOpenRef: MutableRefObject<number>;
  binOpenRef: MutableRefObject<number>;
  tegOpenRef: MutableRefObject<number>;
  transitioningRef: MutableRefObject<boolean>;
  // called once the camera actually reaches `step` — lets the 2D chrome
  // (step label, Guide text) wait for the real arrival instead of swapping
  // the instant a Next/Back/jump click fires, while the 3D view is still up
  // to ~1.6s from catching up. See Scene3D's `displayedStepId`.
  onArrive: (stepId: string) => void;
}) {
  const { camera, controls } = useThree();
  const targetPos = useMemo(() => new THREE.Vector3(...step.cameraPos), [step]);
  const targetLook = useMemo(() => new THREE.Vector3(...step.cameraTarget), [step]);

  // Tracks whether we're actively flying to a step the user just requested
  // (Next/Back/Jump), as opposed to idling at a step the user is free to
  // orbit/pan/zoom away from. Driving this off step identity — not off how
  // far the camera currently sits from the step's waypoint — is what makes
  // free orbiting work: re-arming on position drift (the old approach)
  // would treat the user's own drag-to-orbit as "need to transition" and
  // yank the view back toward the last requested step.
  const activeStepId = useRef(step.id);
  const startTime = useRef<number | null>(null);
  const startPos = useRef(new THREE.Vector3());
  const startLook = useRef(new THREE.Vector3());
  const duration = useRef(MIN_TRANSITION_DURATION);

  // every other animated scalar (explode amount, truck/rail opacity, each
  // component's "open" state) eases on the same timeline via one small
  // table instead of a hand-written start/lerp/snap block per value
  const scalars = useMemo<EasedScalar[]>(
    () => [
      { ref: explodeRef, start: { current: 0 } as MutableRefObject<number>, get: (s) => s.explode },
      { ref: truckOpacityRef, start: { current: 1 } as MutableRefObject<number>, get: (s) => s.truckOpacity },
      { ref: cabTintRef, start: { current: 1 } as MutableRefObject<number>, get: (s) => s.cabTint },
      { ref: railOpacityRef, start: { current: 1 } as MutableRefObject<number>, get: (s) => s.railOpacity },
      { ref: tankOpenRef, start: { current: 0 } as MutableRefObject<number>, get: (s) => s.tankOpen },
      { ref: binOpenRef, start: { current: 0 } as MutableRefObject<number>, get: (s) => s.binOpen },
      { ref: tegOpenRef, start: { current: 0 } as MutableRefObject<number>, get: (s) => s.tegOpen },
      { ref: trailerFade, start: { current: 1 } as MutableRefObject<number>, get: (s) => s.trailerOpacity ?? 1 },
    ],
    // trailerFade is module-scope, listed so a hot reload that re-creates it re-binds this table
    [explodeRef, truckOpacityRef, cabTintRef, railOpacityRef, tankOpenRef, binOpenRef, tegOpenRef, trailerFade]
  );

  useEffect(() => {
    if (activeStepId.current !== step.id) {
      activeStepId.current = step.id;
      transitioningRef.current = true;
      startTime.current = null; // lazily re-captured on the next frame, once camera/controls are current
    }
  }, [step, transitioningRef]);

  useFrame(() => {
    if (!transitioningRef.current) return; // idling — OrbitControls owns the camera entirely

    const c = controls as {
      enabled: boolean;
      target: THREE.Vector3;
      update: () => void;
      minAzimuthAngle: number;
      maxAzimuthAngle: number;
    } | null;

    if (startTime.current === null) {
      startPos.current.copy(camera.position);
      startLook.current.copy(c?.target ?? targetLook);
      scalars.forEach((s) => {
        s.start.current = s.ref.current;
      });
      const travelDistance = startPos.current.distanceTo(targetPos);
      duration.current = THREE.MathUtils.clamp(
        MIN_TRANSITION_DURATION + travelDistance * TRANSITION_DISTANCE_FACTOR,
        MIN_TRANSITION_DURATION,
        MAX_TRANSITION_DURATION
      );
      startTime.current = performance.now() / 1000;
    }

    const elapsed = performance.now() / 1000 - startTime.current;
    const t = Math.min(elapsed / duration.current, 1);
    const eased = easeInOutCubic(t);

    if (t >= 1) {
      // arrived — snap to the exact values (no residual float error), then
      // hand position AND rotation back to OrbitControls so the user can
      // freely orbit/zoom; re-sync its target first or it would snap the
      // view back toward wherever it last thought it was aimed
      camera.position.copy(targetPos);
      camera.lookAt(targetLook);
      if (c) {
        c.target.copy(targetLook);
        // Used to clamp min/maxAzimuthAngle on the hologram steps to keep
        // idle auto-rotate from sweeping into a bad angle — but OrbitControls
        // applies that same limit to manual drag too, so it also locked the
        // viewer's own orbiting to a narrow arc, which read as the model
        // being broken/stuck rather than a deliberate limit. Reverted:
        // rotation (manual or auto) is unrestricted everywhere again. See
        // HologramAutoRotate for the auto-rotate-only fix that replaced this.
        c.minAzimuthAngle = -Infinity;
        c.maxAzimuthAngle = Infinity;
        c.enabled = true;
        c.update();
      }
      scalars.forEach((s) => {
        s.ref.current = s.get(step);
      });
      transitioningRef.current = false;
      onArrive(step.id);
      return;
    }

    // mid-transition: OrbitControls recomputes camera.position from its own
    // (stale) target + spherical state every frame it's enabled, which
    // fights any direct position change — so it's disabled for the
    // duration of the animation and camera.lookAt drives orientation
    // directly instead of going through controls.target
    if (c) c.enabled = false;
    camera.position.lerpVectors(startPos.current, targetPos, eased);
    camera.lookAt(startLook.current.clone().lerp(targetLook, eased));
    scalars.forEach((s) => {
      s.ref.current = s.start.current + (s.get(step) - s.start.current) * eased;
    });
  });

  return null;
}

// ~0.0628 rad/s at full ramp — equivalent to the old autoRotateSpeed=0.6
// (three.js's OrbitControls convention: speed 1.0 = one full turn per 60s)
const HOLOGRAM_SPIN_RAD_PER_SEC = 0.0628;
const HOLOGRAM_RESUME_DELAY = 5; // seconds of no interaction before spin resumes
const HOLOGRAM_RESUME_RAMP = 0.9; // seconds to ease back up to full speed
// how far the idle auto-rotate (see HologramAutoRotate) oscillates either
// side of wherever the camera is sitting when it kicks in — bounded so it
// never sweeps into an angle where the subject reads as occluded by nearby
// equipment or where thin geometry z-fights, without restricting the
// viewer's own manual orbiting (see HologramAutoRotate's own docstring)
const HOLOGRAM_ROTATE_ARC = Math.PI / 5; // ±36°
// every "focus on one component" step gets the same hologram treatment —
// truck hidden, close hero camera, slow self-rotation
const HOLOGRAM_STEP_IDS = new Set(['module-interior', 'tanks', 'bulk-bin', 'teg']);
// the exhaust duct + its label only belong in frame on the steps that are
// actually looking at (or near) the module from the outside — everywhere
// else it's either hidden by HOLOGRAM_STEP_IDS's truck-hidden treatment
// already (module-interior) or would just clutter an unrelated close-up
// (tanks/bulk-bin/teg)
const EXHAUST_VISIBLE_STEP_IDS = new Set(['overview', 'module-exterior', 'full-system']);

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/** Drives the "hologram" auto-spin on each single-component focus step by
 *  directly setting the camera's position each frame, rather than through
 *  OrbitControls' own `autoRotate` prop — that let the rotation run
 *  unbounded, which eventually swept past an angle where the subject read
 *  as occluded by nearby equipment or where thin geometry z-fights (see
 *  TourController's history). A first attempt fixed that by clamping
 *  OrbitControls' `minAzimuthAngle`/`maxAzimuthAngle`, but that limit
 *  applies to ALL rotation, manual drag included — it also locked the
 *  viewer's own orbiting to the same narrow arc, which read as the model
 *  being stuck rather than a deliberate guardrail. This version instead
 *  owns the auto-rotate's own angle directly: it oscillates a bounded
 *  azimuth offset back and forth (±HOLOGRAM_ROTATE_ARC) around wherever the
 *  camera happens to be sitting when idle rotation kicks in, bouncing
 *  direction at each edge, while OrbitControls itself stays fully
 *  unrestricted for the user's own dragging at all times.
 *
 *  Listens for the controls' own 'start'/'end' events: dragging stops the
 *  spin immediately (no reason to fight the user's own input), and
 *  releasing arms a 5-second idle timer; once that elapses the spin eases
 *  back in over HOLOGRAM_RESUME_RAMP seconds rather than snapping back on,
 *  and captures a fresh "home" position/azimuth to oscillate around — so it
 *  resumes from wherever the viewer left the camera, not a fixed framing.
 *  The same idle timer, primed to "already elapsed" on arrival, is what
 *  makes the very first spin start right away too. Keyed on stepId (not
 *  just the active flag) so moving straight from one focus step to another
 *  — module-interior to tanks, say — also resets to "spin immediately"
 *  instead of inheriting a stale pause from the step before.
 *
 *  `transitioningRef` (shared with TourController) is what makes "right
 *  away" actually safe: the idle timer's "-1e9 ⇒ already elapsed" trick
 *  means this component is willing to capture a "home" position and start
 *  moving the camera on the very first frame after stepId changes — but
 *  TourController's own fly-to animation is still running at that point
 *  (up to ~1.6s). Without this check, "home" got captured mid-flight, from
 *  wherever the camera happened to be a frame or two into that animation —
 *  nowhere near the step's actual resting framing — and every bit of
 *  further camera tuning on that step appeared to do nothing, because this
 *  component was silently overwriting it a frame later with a rotation
 *  centered on that wrong, stale position. */
function HologramAutoRotate({
  stepId,
  transitioningRef,
}: {
  stepId: string;
  transitioningRef: MutableRefObject<boolean>;
}) {
  const { controls, camera } = useThree();
  const active = HOLOGRAM_STEP_IDS.has(stepId);
  const interacting = useRef(false);
  const idleSince = useRef(-1e9);
  // re-captured fresh each time idle rotation actually starts moving —
  // see the "homeCaptured" check in the frame loop below
  const homeCaptured = useRef(false);
  const homeAzimuth = useRef(0);
  const homeRadius = useRef(0);
  const homePolar = useRef(0);
  const rotateOffset = useRef(0);
  const rotateDir = useRef(1);

  useEffect(() => {
    if (!active) return;
    idleSince.current = -1e9; // fresh arrival at this step — spin starts immediately
    interacting.current = false;
    homeCaptured.current = false;
  }, [stepId, active]);

  useEffect(() => {
    const c = controls as {
      addEventListener?: (type: string, cb: () => void) => void;
      removeEventListener?: (type: string, cb: () => void) => void;
    } | null;
    if (!active || !c?.addEventListener) return;
    const onStart = () => {
      interacting.current = true;
    };
    const onEnd = () => {
      interacting.current = false;
      idleSince.current = performance.now() / 1000;
      homeCaptured.current = false;
    };
    c.addEventListener('start', onStart);
    c.addEventListener('end', onEnd);
    return () => {
      c.removeEventListener?.('start', onStart);
      c.removeEventListener?.('end', onEnd);
    };
  }, [controls, active]);

  useFrame((_, delta) => {
    const c = controls as { target: THREE.Vector3; update: () => void } | null;
    if (!c || !active || interacting.current || transitioningRef.current) return;
    const elapsed = performance.now() / 1000 - idleSince.current;
    if (elapsed < HOLOGRAM_RESUME_DELAY) return;

    if (!homeCaptured.current) {
      const offset = camera.position.clone().sub(c.target);
      homeRadius.current = offset.length();
      if (homeRadius.current < 1e-4) return; // camera exactly on target — degenerate, wait a frame
      homePolar.current = Math.acos(THREE.MathUtils.clamp(offset.y / homeRadius.current, -1, 1));
      homeAzimuth.current = Math.atan2(offset.x, offset.z);
      rotateOffset.current = 0;
      rotateDir.current = 1;
      homeCaptured.current = true;
    }

    const rampT = Math.min((elapsed - HOLOGRAM_RESUME_DELAY) / HOLOGRAM_RESUME_RAMP, 1);
    const speed = HOLOGRAM_SPIN_RAD_PER_SEC * easeOutCubic(rampT);
    rotateOffset.current += rotateDir.current * speed * delta;
    if (rotateOffset.current > HOLOGRAM_ROTATE_ARC) {
      rotateOffset.current = HOLOGRAM_ROTATE_ARC;
      rotateDir.current = -1;
    } else if (rotateOffset.current < -HOLOGRAM_ROTATE_ARC) {
      rotateOffset.current = -HOLOGRAM_ROTATE_ARC;
      rotateDir.current = 1;
    }

    const azimuth = homeAzimuth.current + rotateOffset.current;
    const sinPolar = Math.sin(homePolar.current);
    camera.position.set(
      c.target.x + homeRadius.current * sinPolar * Math.sin(azimuth),
      c.target.y + homeRadius.current * Math.cos(homePolar.current),
      c.target.z + homeRadius.current * sinPolar * Math.cos(azimuth)
    );
    camera.lookAt(c.target);
    c.update();
  });

  return null;
}

// waypoint updaters for each system's flow trail — tanks/bulk-bin/teg are
// static paths (the geometry they trace doesn't move), so these are plain
// module-scope functions; the module's own trail needs the live explode
// amount and is defined inline in Rig instead, where explodeRef is in scope

function tankFlowWaypoints(pts: THREE.Vector3[]) {
  // mirrors TankFillLine's own three points exactly — this is the pipe
  // actually filling the tank, so the trail has to run along it precisely
  pts[0].set(IN(moduleXCenter), IN(bodyY1 - 2), IN(moduleZ0 - 0.5));
  pts[1].set(IN((moduleXCenter + tankXCenterTop) / 2), IN((bodyY1 + TANK_TOP_Y) / 2 + 3), IN((moduleZ0 + tankZ1) / 2));
  pts[2].set(IN(tankXCenterTop), IN(TANK_TOP_Y + 1), IN(tankZCenter));
}

function binFlowWaypoints(pts: THREE.Vector3[]) {
  // bottom-to-top, matching the physical direction material actually
  // travels: up through the bin's own auger, then up the transfer tube
  // into the module — the reverse of how TransferAuger's own start/end
  // happen to be ordered (that tube was defined module-side-first)
  pts[0].set(IN(moduleXCenter), IN(bulkBinY0 + 1.5), IN(bulkBinZCenter));
  pts[1].set(IN(moduleXCenter), IN(bulkBinY1 + 1.5), IN(bulkBinZCenter));
  pts[2].set(IN(moduleXCenter), IN((assemblyBottom + bulkBinY1) / 2), IN(moduleZCenter));
  pts[3].set(IN(moduleXCenter), IN(assemblyBottom), IN(moduleZCenter));
}

function tegFlowWaypoints(pts: THREE.Vector3[]) {
  // hot exhaust stack → TEG unit, the same path TEGLead's tube follows
  pts[0].set(IN(stackX + TEG_SLEEVE.outerDiameter / 2), IN(tegSleeveYCenter), IN(stackZ));
  pts[1].set(IN((stackX + tegUnitX1) / 2), IN((tegSleeveYCenter + tegUnitY1) / 2), IN((stackZ + tegUnitZCenter) / 2));
  pts[2].set(IN((tegUnitX0 + tegUnitX1) / 2), IN(tegUnitY1), IN(tegUnitZCenter));
}

// Every step's camera position was framed for a wide screen. On a narrower
// one (iPad held upright, a small window) the same vertical FOV leaves much
// less horizontal view, so the truck and the labels got cropped at the sides.
// This widens the vertical FOV just enough to keep the horizontal view the
// framing was designed around, capped so perspective doesn't get silly. Wide
// screens are untouched (aspect >= FRAMING_ASPECT keeps the base FOV).
const BASE_FOV = 48;
const FRAMING_ASPECT = 1.3;
const MAX_FOV = 80;

function AspectFov() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  useEffect(() => {
    const aspect = width / Math.max(1, height);
    let fov = BASE_FOV;
    if (aspect < FRAMING_ASPECT) {
      const halfBase = Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2));
      fov = Math.min(MAX_FOV, THREE.MathUtils.radToDeg(2 * Math.atan((halfBase * FRAMING_ASPECT) / aspect)));
    }
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }, [camera, width, height]);
  return null;
}

function Rig({
  step,
  explodeRef,
  truckOpacityRef,
  cabTintRef,
  railOpacityRef,
  tankOpenRef,
  binOpenRef,
  tegOpenRef,
  onSelectPart,
  onArrive,
}: {
  step: TourStep;
  explodeRef: MutableRefObject<number>;
  truckOpacityRef: MutableRefObject<number>;
  cabTintRef: MutableRefObject<number>;
  railOpacityRef: MutableRefObject<number>;
  tankOpenRef: MutableRefObject<number>;
  binOpenRef: MutableRefObject<number>;
  tegOpenRef: MutableRefObject<number>;
  onSelectPart: SelectPartFn;
  onArrive: (stepId: string) => void;
}) {
  const controlsRef = useRef<any>(null);
  // ExhaustFeed's duct only makes visual sense while the module shell sits
  // at rest — once it explodes away, the duct would have to stay glued to a
  // moving target, so this just hides it instead (inverse of explodeRef,
  // since Label/FlowTrail's own activeRef convention is "show above this").
  // Also hidden on the component-focus close-hero steps (tanks/bulk-bin/teg)
  // — it was staying visible there purely because none of those steps
  // explode anything, which let its "Exhaust Inlet" label drift into frame
  // and clutter close shots of totally unrelated equipment (most visibly on
  // "teg", whose camera happens to sit near the module).
  const exhaustVisibleRef = useRef(1);
  useFrame(() => {
    exhaustVisibleRef.current = explodeRef.current < 0.5 && EXHAUST_VISIBLE_STEP_IDS.has(step.id) ? 1 : 0;
  });
  // Shared between TourController and HologramAutoRotate so the latter can
  // tell a real idle pause apart from "still mid-flight to this step" — see
  // HologramAutoRotate's own docstring for why that distinction matters.
  const transitioningRef = useRef(true);
  return (
    <>
      <AspectFov />
      <InitialLookAt />
      <TourController
        step={step}
        explodeRef={explodeRef}
        truckOpacityRef={truckOpacityRef}
        cabTintRef={cabTintRef}
        railOpacityRef={railOpacityRef}
        tankOpenRef={tankOpenRef}
        binOpenRef={binOpenRef}
        tegOpenRef={tegOpenRef}
        transitioningRef={transitioningRef}
        onArrive={onArrive}
      />
      <HologramAutoRotate stepId={step.id} transitioningRef={transitioningRef} />
      {/* PCFShadowMap (the default now that PCFSoftShadowMap is gone from
          three.js) gives hard-edged shadows; this patches the shadow
          shader for a real soft falloff instead */}
      <SoftShadows size={18} samples={16} focus={0.5} />
      <ambientLight intensity={0.9} />
      <directionalLight
        position={[20, 30, 15]}
        intensity={1.3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={55}
        shadow-camera-bottom={-15}
        shadow-camera-near={1}
        shadow-camera-far={140}
        shadow-bias={-0.0015}
      />
      <directionalLight position={[-15, 10, -10]} intensity={0.55} />
      <hemisphereLight args={['#eaf4fb', '#cfe3c7', 0.85]} />
      {/* ground + bed deck live outside the truck's opacity group — the CO2
          equipment rests on this, so it stays visible even once the truck
          itself fades */}
      <HoverClock />
      <GroundAndRail />
      <TruckContext opacityRef={truckOpacityRef} cabTintRef={cabTintRef} onSelectPart={onSelectPart} />
      <CaptureModule explodeRef={explodeRef} onSelectPart={onSelectPart} />
      <MountingRail opacityRef={railOpacityRef} onSelectPart={onSelectPart} />
      <ModuleInternals explodeRef={explodeRef} onSelectPart={onSelectPart} />
      <ExhaustFeed visibleRef={exhaustVisibleRef} onSelectPart={onSelectPart} />
      <FlowTrail
        activeRef={exhaustVisibleRef}
        waypointCount={3}
        updateWaypoints={(pts) => {
          pts[0].set(IN(stackX), IN(EXHAUST_FEED_Y), IN(stackZ));
          pts[1].set(IN((stackX + moduleXCenter) / 2), IN(EXHAUST_FEED_Y), IN((stackZ + (moduleZ1 + 1)) / 2));
          pts[2].set(IN(moduleXCenter), IN(EXHAUST_FEED_Y), IN(moduleZ1 + 1));
        }}
        color="#ffcf9e"
        emissive="#ff9d5c"
        loopSeconds={4}
      />
      <Label
        activeRef={exhaustVisibleRef}
        text="Exhaust inlet"
        fontSize={1.8}
        // left at the default white rather than PART_FACTS.exhaustFeed's
        // warm-orange accent — that orange sits close enough in hue to the
        // translucent red cab behind it (the step this label is only ever
        // visible on) that the two nearly merged, even with the label's own
        // black outline. White reads cleanly against both the cab and the
        // grey module body on either side of it.
        hoverId="exhaustFeed"
        // directly above the coupling itself, out past the module's own
        // face — the midpoint-of-the-duct position this used to sit at put
        // it back behind the (now translucent) cab, where two stacked layers
        // of tinted glass washed white text out almost completely
        computePosition={() => [moduleXCenter, EXHAUST_FEED_Y + 10, moduleZ1 + 6]}
        facingDir={MODULE_EXTERIOR_FACING}
      />
      <FlowTrail
        activeRef={explodeRef}
        waypointCount={5}
        updateWaypoints={(pts) => {
          const e = explodeRef.current;
          const intXCenter = (intX0 + intX1) / 2;
          const intZCenter = (intZ0 + intZ1) / 2;
          pts[0].set(IN(intXCenter), IN((reservoirY0 + reservoirY1) / 2), IN(intZCenter));
          pts[1].set(IN(intXCenter), IN((reservoirY1 + detoxY0) / 2 + e * EXPLODE.heatingLift), IN(intZCenter));
          pts[2].set(IN(intXCenter), IN((detoxY0 + detoxY1) / 2 + e * EXPLODE.detoxLift), IN(intZCenter));
          pts[3].set(IN(intXCenter), IN((demisterY0 + demisterY1) / 2 + e * EXPLODE.demisterLift), IN(intZCenter));
          pts[4].set(IN(intXCenter), IN(assemblyTop + e * EXPLODE.shellLift), IN(intZCenter));
        }}
      />
      {/* the 5 chamber labels sit close together in real inches, and this
          camera angle compresses that further on screen — an increasing X
          fan-out (each one further out than the last) keeps them from
          overlapping each other now that depth testing is off (see Label),
          so geometry occlusion is no longer a reason to keep the font small.
          PCM/Pool are the one pair that share a height band (side-by-side
          chambers, not stacked) — ±1.5in of Y split wasn't enough once the
          font grew, so they're staggered on BOTH axes now (diagonal, not
          just vertical, separation) to keep them apart on screen too. */}
      <Label
        activeRef={explodeRef}
        text="Lean amine reservoir"
        fontSize={3}
        color={PART_FACTS.reservoir.accent}
        hoverId="reservoir"
        computePosition={() => [intX1 + 10, (reservoirY0 + reservoirY1) / 2, (intZ0 + intZ1) / 2]}
        facingDir={MODULE_INTERIOR_FACING}
      />
      <Label
        activeRef={explodeRef}
        text="PCM thermal buffer"
        fontSize={3}
        color={PART_FACTS.pcm.accent}
        hoverId="pcm"
        computePosition={(e) => [intX1 + 12, (reservoirY1 + detoxY0) / 2 + e * EXPLODE.heatingLift + 3, (pcmZ0 + pcmZ1) / 2]}
        facingDir={MODULE_INTERIOR_FACING}
      />
      <Label
        activeRef={explodeRef}
        text="Rich amine pool"
        fontSize={3}
        color={PART_FACTS.pool.accent}
        hoverId="pool"
        computePosition={(e) => [intX1 + 6, (reservoirY1 + detoxY0) / 2 + e * EXPLODE.heatingLift - 3, (poolZ0 + poolZ1) / 2]}
        facingDir={MODULE_INTERIOR_FACING}
      />
      <Label
        activeRef={explodeRef}
        text="De-tox chamber"
        fontSize={3}
        color={PART_FACTS.detox.accent}
        hoverId="detox"
        computePosition={(e) => [intX1 + 16, (detoxY0 + detoxY1) / 2 + e * EXPLODE.detoxLift, (intZ0 + intZ1) / 2]}
        facingDir={MODULE_INTERIOR_FACING}
      />
      <Label
        activeRef={explodeRef}
        text="Demister pad"
        fontSize={3}
        hoverId="demister"
        computePosition={(e) => [intX1 + 20, (demisterY0 + demisterY1) / 2 + e * EXPLODE.demisterLift, (intZ0 + intZ1) / 2]}
        facingDir={MODULE_INTERIOR_FACING}
      />
      <StackedTanks openRef={tankOpenRef} onSelectPart={onSelectPart} />
      <TankFillLine onSelectPart={onSelectPart} />
      {/* the hose is 0.4in in radius; the dots are 0.46in, so each one reads as
          a bead travelling inside the pipe instead of a ball bigger than it.
          They stay fairly opaque (0.85, vs FlowTrail's 0.42 default) so a
          bead that small still shows up against the hose. */}
      <FlowTrail
        activeRef={tankOpenRef}
        waypointCount={3}
        updateWaypoints={tankFlowWaypoints}
        color="#cfeeff"
        emissive="#9fe3ff"
        size={0.46}
        maxOpacity={0.85}
      />
      {/* tanks/bin/teg sit MUCH closer to their cameras than the module
          interior does (close-hero distance ~115-190in vs ~290in), so the
          same font size that read fine there is wildly oversized here —
          scaled down to roughly match on-screen size instead of real size */}
      <Label
        activeRef={tankOpenRef}
        text="CO2 storage tanks"
        fontSize={1.8}
        hoverId="tanks"
        computePosition={() => [tankXCenterTop + 7, 108, tankZCenter]}
        facingDir={TANKS_FACING}
      />
      <Label
        activeRef={tankOpenRef}
        text="Fill line (from module)"
        fontSize={1.4}
        hoverId="fillLine"
        computePosition={() => [moduleXCenter + 2, bodyY1 + 2, (moduleZ0 + tankZ1) / 2]}
        facingDir={TANKS_FACING}
      />
      <BulkBin openRef={binOpenRef} onSelectPart={onSelectPart} />
      <TransferAuger onSelectPart={onSelectPart} />
      <FlowTrail
        activeRef={binOpenRef}
        waypointCount={4}
        updateWaypoints={binFlowWaypoints}
        color="#f0dcae"
        emissive="#e8b870"
        size={0.4}
        loopSeconds={9}
      />
      <Label
        activeRef={binOpenRef}
        text="Makeup amine"
        fontSize={1.8}
        hoverId="bulkBin"
        // above the bin + inlet nub entirely, rather than tucked against its
        // side (only ~2in of clearance past the box's own half-width) where
        // it was reading as clipped by the box edge from an angled camera
        computePosition={() => [bulkBinXCenter, bulkBinY1 + 7, bulkBinZCenter]}
        facingDir={BULK_BIN_FACING}
      />
      <Label
        activeRef={binOpenRef}
        text="Auger screw"
        fontSize={1.4}
        hoverId="auger"
        computePosition={() => [moduleXCenter - 8, bulkBinY0 + 12, bulkBinZCenter]}
        facingDir={BULK_BIN_FACING}
      />
      <TEGSleeve openRef={tegOpenRef} onSelectPart={onSelectPart} />
      <TEGUnit openRef={tegOpenRef} onSelectPart={onSelectPart} />
      <TEGLead />
      <FlowTrail
        activeRef={tegOpenRef}
        waypointCount={3}
        updateWaypoints={tegFlowWaypoints}
        color="#ffcf9e"
        emissive="#ff9d5c"
        loopSeconds={5}
      />
      <Label
        activeRef={tegOpenRef}
        text="TEG modules (hot side)"
        fontSize={1.4}
        hoverId="tegModules"
        computePosition={() => [tegUnitX0 - 3, tegUnitYCenter + 4, tegUnitZCenter]}
        facingDir={TEG_FACING}
      />
      <Label
        activeRef={tegOpenRef}
        text="Heat-exchanger fins"
        fontSize={1.4}
        hoverId="tegFins"
        computePosition={() => [tegUnitX1 + 3, tegUnitYCenter + 2, tegUnitZCenter]}
        facingDir={TEG_FACING}
      />
      <Label
        activeRef={tegOpenRef}
        text="Controller"
        fontSize={1.4}
        hoverId="tegController"
        computePosition={() => [tegUnitXCenter, tegUnitY0 - 2, tegUnitZCenter]}
        facingDir={TEG_FACING}
      />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={OVERVIEW_TARGET}
        // lowered from 6: the close hero shots on the single-component focus
        // steps (tanks/bulk-bin/teg) sit well under 6ft from their target,
        // and at the old floor OrbitControls would clamp the camera back
        // out to 6ft the instant it re-enables on arrival, snapping the
        // shot wider right after the flight-in finished
        minDistance={2.5}
        maxDistance={110}
        maxPolarAngle={Math.PI / 2 - 0.03}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  );
}

// White text + a solid black outline reads on any background this scene can
// put behind it (sky, ground, truck paint, metal). Chosen over dynamically
// swapping between black/white text: that would need sampling the actual
// pixel colors of the WebGL canvas behind each DOM-positioned label every
// frame (expensive, and fragile the moment the camera moves or the truck
// fades), where a fixed outline is simple and unconditionally reliable.
const TEXT_OUTLINE: CSSProperties = {
  color: '#ffffff',
  textShadow:
    '-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000, 0 -1.5px 0 #000, 0 1.5px 0 #000, -1.5px 0 0 #000, 1.5px 0 0 #000',
};

// The truck is context, not the subject — this legend is for the CO2
// capture system itself, so the truck doesn't get an entry here.
// Colors here are what's actually DOMINANT on screen once each part's own
// step is reached, not each shell's base color — the shells themselves fade
// to ~18% opacity on their own step specifically so the viewer sees what's
// inside/on them instead (see Tank/BulkBin/TEGUnit's openRef-driven
// opacity), so a legend keyed to the shell color stopped matching what was
// actually visible for two of these: the bulk bin's own grey shell swatch
// against its tan/wheat amine fill, and the TEG unit's blue-grey housing
// swatch against the TEG sleeve's lit pink/salmon glow.
const LEGEND_ITEMS: { label: string; color: string; color2?: string }[] = [
  { label: 'Capture module', color: PALETTE.module.body },
  { label: 'CO₂ storage tanks', color: PALETTE.tanks.body, color2: PALETTE.tanks.fill },
  { label: 'Bulk storage bin', color: PALETTE.bin.fill },
  { label: 'Waste-heat recovery (TEG)', color: PALETTE.teg.sleeve },
];

// ---------------------------------------------------------------------------
// Responsive — this whole UI was built desktop-only (fixed pixel offsets,
// no media queries anywhere), which is exactly how the global top-left home
// button (SiteWrapper.tsx — a 40px circle at top:16/left:16, untouched here
// on purpose, it's shared site chrome) ended up overlapping the Guide card
// at phone width, and how the Legend and TourNav ended up overlapping each
// other at the bottom. `useViewport` gives every overlay a live device
// class to react to; DeviceClass is orientation-invariant (keyed off the
// LONGER edge, which a phone or tablet keeps constant across rotation) so
// turning a phone sideways doesn't suddenly reclassify it as a tablet.
// ---------------------------------------------------------------------------

type DeviceClass = 'phone' | 'tablet' | 'desktop';
const PHONE_MAX_EDGE = 900; // comfortably above the biggest real phones, below the smallest tablets (iPad mini: 1024)
const TABLET_MAX_EDGE = 1400; // covers up to a 12.9" iPad Pro landscape (1366)

function useViewport() {
  const [size, setSize] = useState(() => ({
    width: typeof window === 'undefined' ? 1280 : window.innerWidth,
    height: typeof window === 'undefined' ? 800 : window.innerHeight,
  }));

  useEffect(() => {
    const update = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    // iOS Safari fires `orientationchange` BEFORE innerWidth/innerHeight have
    // flipped (they still describe the old orientation for a beat), so a
    // plain read there gets the stale size and the gate would stick. Re-read
    // on the next frames and once more after the rotation animation settles;
    // `resize` and visualViewport (which also tracks the address bar
    // collapsing) cover everything that arrives later.
    let timer = 0;
    let raf = 0;
    const settle = () => {
      update();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        update();
        raf = requestAnimationFrame(update);
      });
      window.clearTimeout(timer);
      timer = window.setTimeout(update, 320);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', settle);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', settle);
      window.visualViewport?.removeEventListener('resize', update);
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, []);

  const longEdge = Math.max(size.width, size.height);
  const deviceClass: DeviceClass = longEdge <= PHONE_MAX_EDGE ? 'phone' : longEdge <= TABLET_MAX_EDGE ? 'tablet' : 'desktop';
  const isPortrait = size.height > size.width;

  return { ...size, deviceClass, isPortrait };
}

/** Full-screen gate shown only for a phone held in portrait — this tour's
 *  close-hero camera framing and the Guide/Legend/nav chrome around it were
 *  designed for a wide frame, and there's no amount of responsive squeezing
 *  that makes a 3D scene like this read well at phone-portrait proportions.
 *  Rather than ship a cramped compromise, this asks for what actually makes
 *  it work — same idea as a video player suggesting fullscreen. iOS Safari
 *  gives web pages no API to force the rotation itself (that's reserved for
 *  native apps / fullscreen video), so this is a prompt, not a lock. */
const ROTATE_FADE_MS = 550;

/** Keeps the gate mounted just long enough to fade out when the phone is
 *  turned sideways (and fade back in if it's turned upright again), instead
 *  of the old hard cut. Rotating back and forth mid-fade is safe: each
 *  change cancels the previous timers and the CSS transition simply retargets
 *  from wherever the opacity currently is. */
function RotateGate({ show }: { show: boolean }) {
  const [mounted, setMounted] = useState(show);
  const [shown, setShown] = useState(show);

  useEffect(() => {
    if (show) {
      setMounted(true);
      // two frames so a freshly-mounted gate paints at opacity 0 first and
      // the fade-in is an actual transition, not an instant appearance
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    setShown(false);
    const t = window.setTimeout(() => setMounted(false), ROTATE_FADE_MS + 80);
    return () => window.clearTimeout(t);
  }, [show]);

  if (!mounted) return null;
  return <RotateDeviceGate visible={shown} />;
}

function RotateDeviceGate({ visible }: { visible: boolean }) {
  return (
    <div
      data-testid="rotate-gate"
      aria-hidden={!visible}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        opacity: visible ? 1 : 0,
        // not interactive once it's on its way out, so a tap during the fade
        // lands on the tour underneath
        pointerEvents: visible ? 'auto' : 'none',
        transition: `opacity ${ROTATE_FADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        background: '#14161a',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        padding: '32px',
        textAlign: 'center',
        fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif',
      }}
    >
      {/* an iPhone, drawn in portrait: rounded body, Dynamic Island pill at
          the top, and a home indicator at the bottom. It
          turns a quarter turn counter-clockwise (so the island ends up on
          the left, like a real phone turned to landscape) and back. */}
      <svg
        width="76"
        height="76"
        viewBox="0 0 64 64"
        fill="none"
        stroke="#fff"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ animation: 'cc-rotate-hint 3.6s cubic-bezier(0.65, 0, 0.35, 1) infinite' }}
        aria-hidden="true"
      >
        <rect x="18" y="4" width="28" height="56" rx="7.5" />
        <rect x="27" y="9" width="10" height="3.4" rx="1.7" fill="#fff" stroke="none" />
        <rect x="26" y="54.2" width="12" height="1.8" rx="0.9" fill="#fff" fillOpacity={0.7} stroke="none" />
      </svg>
      <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '0.01em' }}>Turn your phone sideways</div>
      <div style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.65, maxWidth: 260 }}>
        This tour is built for landscape. Rotate your phone to see the whole system.
      </div>
    </div>
  );
}

function Legend({ deviceClass }: { deviceClass: DeviceClass }) {
  const compact = deviceClass !== 'desktop';
  return (
    <div
      style={{
        position: 'absolute',
        left: 16,
        // lifted clear of TourNav's own row at narrow widths — the two used
        // to be positioned as if there'd always be enough horizontal room
        // to sit side by side, which stopped being true well before phone
        // width (TourNav's centered Back/dots/Next row has a fixed minimum
        // width that doesn't shrink enough to leave the Legend's bottom-left
        // corner clear on its own)
        bottom: compact ? 92 : 16,
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 4 : 6,
        padding: compact ? '7px 10px' : '10px 14px',
        borderRadius: 10,
        background: 'rgba(21,23,26,0.72)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(6px)',
        fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif',
        fontSize: compact ? 11.5 : 14,
        fontWeight: 500,
        letterSpacing: '0.01em',
        pointerEvents: 'none',
        ...TEXT_OUTLINE,
      }}
    >
      {LEGEND_ITEMS.map((item) => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: compact ? 6 : 8 }}>
          <span
            style={{
              width: compact ? 9 : 11,
              height: compact ? 9 : 11,
              borderRadius: 3,
              background: item.color2 ? `linear-gradient(90deg, ${item.color} 50%, ${item.color2} 50%)` : item.color,
              flex: 'none',
              border: '1px solid rgba(255,255,255,0.4)',
            }}
          />
          {item.label}
        </div>
      ))}
    </div>
  );
}

/** Sound on/off. Remembered across visits (see sfx.ts). */
function MuteButton() {
  const muted = useSfxMuted();
  return (
    <button
      type="button"
      onClick={() => {
        setMuted(!muted);
        // a small confirmation when sound comes back on
        if (muted) sfx.on();
      }}
      aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
      aria-pressed={muted}
      title={muted ? 'Sound off' : 'Sound on'}
      style={{
        flex: 'none',
        width: 40,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.14)',
        background: 'rgba(21,23,26,0.78)',
        backdropFilter: 'blur(6px)',
        color: '#fff',
        cursor: 'pointer',
        padding: 0,
        touchAction: 'manipulation',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z" fill="#fff" fillOpacity={0.15} />
        {muted ? (
          <path d="M16.5 9.5l5 5M21.5 9.5l-5 5" />
        ) : (
          <>
            <path d="M15.5 9.2a4 4 0 0 1 0 5.6" />
            <path d="M18 7a7.4 7.4 0 0 1 0 10" />
          </>
        )}
      </svg>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Full screen. The Fullscreen API exists on iPad Safari and on Android/desktop
// browsers, but iPhone Safari does not expose it for ordinary pages (only
// video), so on an iPhone the address bar can't be hidden from script. Where
// the API is there, a button uses it. Where it isn't, a small dismissible tip
// explains the one thing that does work: add the page to the Home Screen and
// open it from there, which launches without Safari's bars.
// Both are hidden once they can't help: full screen already on, or the page
// already running as a home-screen app.
// ---------------------------------------------------------------------------

type FsDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

function readFullscreenSupport() {
  const doc = document as FsDocument;
  const el = document.documentElement as FsElement;
  const hasApi = typeof el.requestFullscreen === 'function' || typeof el.webkitRequestFullscreen === 'function';
  const enabled = doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled;
  return hasApi && enabled !== false;
}

function readFullscreenActive() {
  const doc = document as FsDocument;
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
}

function readStandalone() {
  const mq = (q: string) => typeof window.matchMedia === 'function' && window.matchMedia(q).matches;
  return (
    mq('(display-mode: standalone)') ||
    mq('(display-mode: fullscreen)') ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function readIsIOS() {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac, with touch
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

const A2HS_DISMISS_KEY = 'cc-a2hs-dismissed';

function useFullscreen() {
  const [state, setState] = useState({ supported: false, active: false, standalone: false, ios: false, failed: false });

  useEffect(() => {
    const sync = () =>
      setState((s) => ({
        ...s,
        supported: readFullscreenSupport(),
        active: readFullscreenActive(),
        standalone: readStandalone(),
        ios: readIsIOS(),
      }));
    sync();
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    const mq = window.matchMedia?.('(display-mode: standalone)');
    mq?.addEventListener?.('change', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
      mq?.removeEventListener?.('change', sync);
    };
  }, []);

  const enter = async () => {
    const el = document.documentElement as FsElement;
    try {
      const result = el.requestFullscreen
        ? el.requestFullscreen({ navigationUI: 'hide' })
        : el.webkitRequestFullscreen?.();
      if (result && typeof (result as Promise<void>).then === 'function') await result;
    } catch {
      // the browser said no (permissions policy, not a user gesture, …) —
      // stop offering a button that doesn't work
      setState((s) => ({ ...s, failed: true }));
    }
  };

  return { ...state, enter };
}

function FullscreenControl({ deviceClass, isPortrait }: { deviceClass: DeviceClass; isPortrait: boolean }) {
  const fs = useFullscreen();
  const [tipDismissed, setTipDismissed] = useState(true); // true until storage is read, so it never flashes
  useEffect(() => {
    try {
      setTipDismissed(window.localStorage.getItem(A2HS_DISMISS_KEY) === '1');
    } catch {
      setTipDismissed(false);
    }
  }, []);

  // phone/tablet only (desktop browsers have their own full-screen key), and
  // never under the rotate gate
  if (deviceClass === 'desktop' || (deviceClass === 'phone' && isPortrait)) return null;
  if (fs.active || fs.standalone) return null;

  if (fs.supported && !fs.failed) {
    return (
      <button
        type="button"
        onClick={fs.enter}
        aria-label="Enter full screen"
        title="Full screen"
        style={{
          flex: 'none',
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.14)',
          background: 'rgba(21,23,26,0.78)',
          backdropFilter: 'blur(6px)',
          color: '#fff',
          cursor: 'pointer',
          padding: 0,
          touchAction: 'manipulation',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        </svg>
      </button>
    );
  }

  // no Fullscreen API (iPhone Safari): offer the Home Screen route, only on
  // iOS where it's the real answer, and only until it's dismissed
  if (fs.ios && !tipDismissed) {
    return (
      <div
        role="note"
        style={{
          maxWidth: 'min(400px, calc(100vw - 444px))',
          minWidth: 200,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 6px 8px 12px',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(21,23,26,0.86)',
          backdropFilter: 'blur(8px)',
          color: '#fff',
          fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif',
          fontSize: 11.5,
          lineHeight: 1.4,
          animation: 'cc-facts-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both',
        }}
      >
        <span>Want the address bar gone? Tap Share, then Add to Home Screen, and open it from there.</span>
        <button
          type="button"
          aria-label="Dismiss tip"
          onClick={() => {
            setTipDismissed(true);
            try {
              window.localStorage.setItem(A2HS_DISMISS_KEY, '1');
            } catch {
              /* private mode — it just comes back next visit */
            }
          }}
          style={{
            flex: 'none',
            width: 32,
            height: 32,
            border: 'none',
            background: 'transparent',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 13,
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >
          ✕
        </button>
      </div>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Facts — kept deliberately minimal. STEP_FACTS is just the one-line default
// shown for whatever step the tour is on; the real depth lives in
// PART_FACTS, surfaced only when a viewer actually clicks a part (see
// `clickable` above) rather than dumped on screen by default. Every claim
// here traces to real research (see the memory file's correction note on the
// one figure, a truck-specific 64%/19% net-vs-gross pairing, that didn't
// survive a second pass and was dropped rather than kept for being dramatic).
// ---------------------------------------------------------------------------

type IconId = 'truck' | 'flask' | 'cycle' | 'cylinder' | 'droplet' | 'bolt' | 'flag';

type StepFacts = {
  icon: IconId;
  accent: string;
  headline: string;
};

const STEP_FACTS: Record<string, StepFacts> = {
  overview: {
    icon: 'truck',
    accent: '#e2883f',
    headline: 'This truck catches CO₂ before it leaves the tailpipe.',
  },
  'module-exterior': {
    icon: 'flask',
    accent: PALETTE.module.body,
    headline: "The amine soaks up CO₂ when it's cool and lets it go when it's hot.",
  },
  'module-interior': {
    icon: 'cycle',
    accent: PALETTE.module.body,
    headline: 'Amine full of CO₂ comes in, gets heated, drops the CO₂, and goes back for more.',
  },
  tanks: {
    icon: 'cylinder',
    accent: PALETTE.tanks.body,
    headline: 'The CO₂ gets compressed and stored on the truck until it can be offloaded.',
  },
  'bulk-bin': {
    icon: 'droplet',
    accent: PALETTE.bin.fill,
    headline: 'Why the truck carries a bin of spare amine.',
  },
  teg: {
    icon: 'bolt',
    accent: PALETTE.teg.sleeve,
    headline: "The exhaust's heat gets turned into a bit of electricity.",
  },
  'full-system': {
    icon: 'flag',
    accent: '#e2883f',
    headline: "What counts is the net CO₂ cut after the system's own energy use, not how much it captures.",
  },
};

// One short, fact-grounded line per clickable part — this is the "click to
// understand what it does" content. Condensed from the same research that
// backed the old per-step bullets (see memory), just scoped to one part at
// a time instead of a whole step's worth of text at once.
type PartFacts = {
  label: string;
  accent: string;
  blurb: string;
};

const PART_FACTS: Record<string, PartFacts> = {
  exhaustStack: {
    label: 'Exhaust stack',
    accent: '#8a8f96',
    blurb: "The truck's normal diesel exhaust stack. Exhaust gets tapped off it for both the capture module and the TEG unit.",
  },
  exhaustFeed: {
    label: 'Exhaust inlet',
    accent: '#e2883f',
    blurb: "Some of the exhaust gets ducted off the stack into the module, and cooled down before it touches the amine.",
  },
  module: {
    label: 'Capture module',
    accent: PALETTE.module.body,
    blurb: 'The sealed unit where cooled exhaust meets the amine. The amine pulls the CO₂ out and the cleaner gas leaves.',
  },
  demister: {
    label: 'Demister pad',
    accent: PALETTE.module.light,
    blurb: 'Catches stray amine droplets before the gas leaves. Without it, droplets carry amine out with the exhaust and you lose solvent.',
  },
  detox: {
    label: 'De-tox chamber',
    accent: '#5be0d6',
    blurb: 'Where cooled exhaust (about 40°C) meets a spray of lean amine, and the amine absorbs the CO₂ out of the gas.',
  },
  pcm: {
    label: 'PCM thermal buffer',
    accent: '#ff6b5b',
    blurb: "Stores the exhaust's own waste heat and feeds it into regeneration at a steady rate, so there's no need for a separate diesel burner.",
  },
  pool: {
    label: 'Rich amine pool',
    accent: '#ff8fc7',
    blurb: "Amine that's full of CO₂ (\"rich\"), waiting to be heated to about 90 to 100°C so the CO₂ comes back out.",
  },
  reservoir: {
    label: 'Lean amine reservoir',
    accent: '#ffd27a',
    blurb: "Amine that's dropped its CO₂ and settled. It gets pumped back up to absorb the next batch.",
  },
  tanks: {
    label: 'CO₂ storage tanks',
    accent: PALETTE.tanks.body,
    blurb: "Holds the captured CO₂ on the truck, compressed and rated for well over 860 psi, until it's offloaded at a stop.",
  },
  fillLine: {
    label: 'Fill line',
    accent: '#4fa8c7',
    blurb: 'Carries the CO₂ gas from the module up into the storage tanks.',
  },
  bulkBin: {
    label: 'Makeup amine',
    accent: PALETTE.bin.shell,
    blurb: 'Spare amine. It gets augered in on a schedule to replace what breaks down or evaporates each cycle.',
  },
  auger: {
    label: 'Auger screw',
    accent: PALETTE.bin.dark,
    blurb: 'A screw that lifts the spare amine from the bin up into the lean reservoir.',
  },
  tegSleeve: {
    label: 'TEG sleeve',
    accent: PALETTE.teg.sleeve,
    blurb: 'Clamps onto the hot exhaust stack and pulls its waste heat into the TEG unit.',
  },
  tegUnit: {
    label: 'Waste-heat recovery unit',
    accent: PALETTE.teg.housing,
    blurb: "The housing the sleeve's heat flows into. It holds the TEG modules, the heat-exchanger fins, and the controller that manages their output.",
  },
  tegModules: {
    label: 'TEG modules',
    accent: '#ff9d5c',
    blurb: 'Thermoelectric modules on the hot side. They turn roughly 5 to 20% of that waste heat directly into electricity.',
  },
  tegFins: {
    label: 'Heat-exchanger fins',
    accent: '#6fc3e0',
    blurb: 'These keep the cold side cool. The temperature gap between the hot and cold sides is what makes the power.',
  },
  tegController: {
    label: 'Controller',
    accent: '#1f6f43',
    blurb: "Manages the TEG's output before it goes into the truck's electrical system.",
  },
  mountingRail: {
    label: 'Mounting rail',
    accent: PALETTE.rail.bar,
    blurb: "The rail and wall brackets that carry the weight of the module and tanks, so it isn't all on the cab's own frame. The original 2D plans showed it, so it's modeled here too.",
  },
};

/** Minimal outline glyphs, one per step topic — stroke-only to match the
 *  scene's own muted, line-driven material language instead of looking like
 *  a bolted-on icon set. */
function StepIcon({ id, color, size = 18 }: { id: IconId; color: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (id) {
    case 'truck':
      return (
        <svg {...common}>
          <path d="M3 16V7a1 1 0 0 1 1-1h8v10H3z" />
          <path d="M12 10h4l3 3v3h-7z" />
          <circle cx="7.5" cy="18" r="1.6" />
          <circle cx="16.5" cy="18" r="1.6" />
        </svg>
      );
    case 'flask':
      return (
        <svg {...common}>
          <path d="M9 3h6M10 3v5l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" />
        </svg>
      );
    case 'cycle':
      return (
        <svg {...common}>
          <path d="M4 12a8 8 0 0 1 14-5.3M20 4v4h-4" />
          <path d="M20 12a8 8 0 0 1-14 5.3M4 20v-4h4" />
        </svg>
      );
    case 'cylinder':
      return (
        <svg {...common}>
          <ellipse cx="12" cy="5.5" rx="6" ry="2.3" />
          <path d="M6 5.5v12.5a6 2.3 0 0 0 12 0V5.5" />
        </svg>
      );
    case 'droplet':
      return (
        <svg {...common}>
          <path d="M12 3s6 7.2 6 11.2a6 6 0 0 1-12 0C6 10.2 12 3 12 3z" />
        </svg>
      );
    case 'bolt':
      return (
        <svg {...common}>
          <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
        </svg>
      );
    case 'flag':
      return (
        <svg {...common}>
          <path d="M5 21V4" />
          <path d="M5 5h12l-2.5 4L17 13H5" />
        </svg>
      );
  }
}

/** Always-visible guide card, top-right — no expand/collapse, no bullets.
 *  Shows the current step's one-line takeaway by default (plus a hint that
 *  the scene itself is clickable, since that wasn't otherwise obvious);
 *  clicking any part in the scene swaps it to that part's own one-line
 *  blurb until the step changes or the viewer dismisses it (click the card,
 *  or click empty space — see Canvas's onPointerMissed). This is the entire
 *  "facts" surface now; the depth that used to live here as
 *  always-expandable bullets instead lives per-part, read on demand instead
 *  of pushed at the viewer by default.
 *
 *  Moved here from bottom-right, and given its own "GUIDE" eyebrow + a
 *  colored left spine (rather than the uniform all-around pill border parts
 *  now get when hovered/selected) — sharing that same pill look made it
 *  read as just another part tooltip instead of the thing narrating the
 *  tour, so the two needed to look different on purpose. */
function FactsCard({
  stepId,
  selectedPart,
  onClear,
  deviceClass,
}: {
  stepId: string;
  selectedPart: string | null;
  onClear: () => void;
  deviceClass: DeviceClass;
}) {
  const step = STEP_FACTS[stepId];
  const part = selectedPart ? PART_FACTS[selectedPart] : null;
  if (!step) return null;

  const accent = onCard(part?.accent ?? step.accent, 3);
  const accentText = onCard(part?.accent ?? step.accent, 4.5);
  const text = part?.blurb ?? step.headline;
  const compact = deviceClass !== 'desktop';

  return (
    <div
      style={{
        position: 'absolute',
        right: 16,
        top: 16,
        display: 'flex',
        justifyContent: 'flex-end',
        width: compact ? 'min(260px, calc(100vw - 72px))' : 'min(340px, calc(100vw - 32px))',
        fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif',
      }}
    >
      <div
        key={selectedPart ?? stepId}
        data-tour="guide"
        onClick={part ? onClear : undefined}
        role={part ? 'button' : undefined}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: compact ? 3 : 5,
          maxWidth: '100%',
          padding: compact ? '7px 12px 8px 10px' : '10px 16px 11px 13px',
          borderRadius: 10,
          borderTop: '1px solid rgba(255,255,255,0.12)',
          borderRight: '1px solid rgba(255,255,255,0.12)',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          borderLeft: `3px solid ${accent}`,
          background: 'rgba(21,23,26,0.86)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
          color: '#fff',
          cursor: part ? 'pointer' : 'default',
          // a one-time ring pulse each time the guide changes to a new stage,
          // so the eye is drawn back to it
          ['--cc-accent' as string]: accent,
          animation: part
            ? 'cc-facts-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both'
            : 'cc-facts-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both, cc-guide-ping 1.3s ease-out 0.3s 1 both',
        }}
      >
        <span
          style={{
            fontSize: compact ? 9.5 : 10.5,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: accentText,
          }}
        >
          Guide
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 8 : 10 }}>
          {part ? (
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: accent, flex: 'none' }} />
          ) : (
            <StepIcon id={step.icon} color={accent} size={compact ? 13 : 15} />
          )}
          <span style={{ fontSize: compact ? 12 : 13, lineHeight: 1.4 }}>
            {part && <strong style={{ color: accentText, fontWeight: 600 }}>{part.label}: </strong>}
            {text}
          </span>
          {part && <span style={{ opacity: 0.55, fontSize: 11, flex: 'none' }}>✕</span>}
        </div>
        {!part && deviceClass !== 'phone' && (
          <span style={{ fontSize: compact ? 10.5 : 11.5, lineHeight: 1.4, color: 'rgba(255,255,255,0.65)' }}>
            Click or tap any part to see what it does.
          </span>
        )}
      </div>
    </div>
  );
}

function navButtonStyle(disabled: boolean, compact: boolean): CSSProperties {
  return {
    padding: compact ? '7px 13px' : '9px 18px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.14)',
    background: disabled ? 'rgba(21,23,26,0.4)' : 'rgba(21,23,26,0.78)',
    opacity: disabled ? 0.45 : 1,
    fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif',
    fontSize: compact ? 13 : 15,
    fontWeight: 600,
    letterSpacing: '0.02em',
    cursor: disabled ? 'default' : 'pointer',
    backdropFilter: 'blur(6px)',
    transition: 'background-color 0.15s ease, opacity 0.15s ease',
    ...TEXT_OUTLINE,
  };
}

/** Next/Back tour navigation — buttons, not scroll (the scroll wheel is
 *  reserved for camera zoom), plus clickable step dots for jumping directly
 *  to a component. Shrinks on phone/tablet (smaller text, tighter gaps, a
 *  lower bottom offset) — at full desktop size this row's own width was
 *  part of why it overlapped the Legend once the viewport got narrow. */
function TourNav({
  steps,
  stepIndex,
  displayedLabel,
  deviceClass,
  onPrev,
  onNext,
  onJump,
}: {
  steps: TourStep[];
  stepIndex: number;
  // the step the camera has actually arrived at (see Scene3D's
  // displayedStepId) — only the label text waits for this; the dots/buttons
  // below stay keyed on the raw, instant `stepIndex` so clicking still
  // feels immediate
  displayedLabel: string;
  deviceClass: DeviceClass;
  onPrev: () => void;
  onNext: () => void;
  onJump: (i: number) => void;
}) {
  const compact = deviceClass !== 'desktop';
  return (
    <div
      data-tour="nav"
      style={{
        position: 'absolute',
        left: '50%',
        bottom: compact ? 14 : 20,
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: compact ? 7 : 10,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif',
          fontSize: compact ? 13 : 17,
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          ...TEXT_OUTLINE,
        }}
      >
        {displayedLabel}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 10 : 16 }}>
        <button onClick={onPrev} disabled={stepIndex === 0} style={navButtonStyle(stepIndex === 0, compact)}>
          ← Back
        </button>
        <div style={{ display: 'flex', gap: compact ? 5 : 7 }}>
          {steps.map((s, i) => (
            <button
              key={s.id}
              onClick={() => onJump(i)}
              aria-label={`Jump to ${s.label}`}
              style={{
                width: compact ? 6 : 7,
                height: compact ? 6 : 7,
                borderRadius: '50%',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                background: i === stepIndex ? '#e2883f' : 'rgba(255,255,255,0.25)',
                transition: 'background-color 0.15s ease',
              }}
            />
          ))}
        </div>
        <button
          onClick={onNext}
          disabled={stepIndex === steps.length - 1}
          style={navButtonStyle(stepIndex === steps.length - 1, compact)}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default function Scene3D() {
  const [stepIndex, setStepIndex] = useState(0);
  // The step label and Guide text used to read directly off `stepIndex`,
  // which updates the instant a Next/Back/jump click fires — but the camera
  // itself is still mid-flight for up to ~1.6s after that (see
  // TourController), so for that whole window the chrome would claim a step
  // the 3D view hadn't caught up to yet. This tracks which step the camera
  // has ACTUALLY arrived at (via TourController's onArrive), and only that
  // drives the label/Guide text; the dots and Back/Next disabled state stay
  // keyed on the raw `stepIndex` below, so clicking still feels instant —
  // only the text that claims "you are here" waits for it to be true.
  const [displayedStepId, setDisplayedStepId] = useState(TOUR_STEPS[0].id);
  const [tutorialRun, setTutorialRun] = useState(0);
  const { deviceClass, isPortrait } = useViewport();
  const explodeRef = useRef(0);
  const truckOpacityRef = useRef(1);
  const cabTintRef = useRef(1);
  const railOpacityRef = useRef(1);
  const tankOpenRef = useRef(0);
  const binOpenRef = useRef(0);
  const tegOpenRef = useRef(0);
  const step = TOUR_STEPS[stepIndex];

  // which part (if any) the viewer has clicked on — see PART_FACTS/FactsCard.
  // Toggling the same part off again, clicking empty space (Canvas's
  // onPointerMissed), or just moving on to another tour step all clear it.
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selectedPart;
  const handleSelectPart = (id: string) => {
    if (selectedRef.current === id) sfx.deselect();
    else sfx.select();
    setSelectedPart((prev) => (prev === id ? null : id));
  };
  const clearSelectedPart = () => {
    if (selectedRef.current) sfx.deselect();
    setSelectedPart(null);
  };

  // sound: arm the first-gesture unlock (browsers, Safari most of all, only
  // allow audio after a tap)
  useEffect(() => installAudioUnlock(), []);

  // sound: a whoosh whose direction follows the move between stages, and a
  // soft chime (or the "glass opening" sound for the tanks) when the camera
  // actually arrives
  const prevStepIndexRef = useRef(stepIndex);
  useEffect(() => {
    if (prevStepIndexRef.current !== stepIndex) {
      sfx.step(stepIndex > prevStepIndexRef.current ? 1 : -1);
      prevStepIndexRef.current = stepIndex;
    }
  }, [stepIndex]);
  const prevDisplayedRef = useRef(displayedStepId);
  useEffect(() => {
    if (prevDisplayedRef.current === displayedStepId) return;
    prevDisplayedRef.current = displayedStepId;
    if (displayedStepId === 'tanks') sfx.open();
    else sfx.arrive();
  }, [displayedStepId]);

  // same clamped step change the Back/Next buttons use, so the keyboard path
  // drives the exact same TourController transition — just another way to
  // call setStepIndex, not a parallel animation path
  const goPrev = () => setStepIndex((i) => Math.max(0, i - 1));
  const goNext = () => setStepIndex((i) => Math.min(TOUR_STEPS.length - 1, i + 1));

  useEffect(() => {
    setSelectedPart(null);
    // The tour moves the camera out from under a stationary cursor (arrow
    // keys, Next/Back), and R3F doesn't re-raycast until the pointer next
    // moves — so without this the previous step's hovered part kept glowing
    // (and the pointer cursor stayed on) after it was no longer under the
    // cursor. Clearing it here lets the glow ease out; the next pointer move
    // hovers whatever is really under the cursor now.
    hoverState.id = null;
    document.body.style.cursor = 'auto';
  }, [stepIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ignore the OS's own key-repeat (holding the key down fires many of
      // these per second) — each one still clamps correctly, so the step
      // counter never actually drifts, but letting repeat events through
      // queues up far more transitions than a human ever intended to
      // trigger, and the camera ends up chasing a target that's constantly
      // moving out from under it for as long as the key stays held. A
      // single press per physical tap keeps navigation feeling deliberate.
      if (e.repeat) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="h-full w-full" style={{ position: 'relative' }}>
      <Canvas
        shadows
        camera={{ position: OVERVIEW_POS, fov: 48, near: 0.4, far: 400 }}
        // clicking empty space (nothing under the ray) clears whatever part
        // is selected — the scene's own equivalent of clicking outside a popover
        onPointerMissed={clearSelectedPart}
      >
        <color attach="background" args={['#dce9f2']} />
        <Rig
          step={step}
          explodeRef={explodeRef}
          truckOpacityRef={truckOpacityRef}
          cabTintRef={cabTintRef}
          railOpacityRef={railOpacityRef}
          tankOpenRef={tankOpenRef}
          binOpenRef={binOpenRef}
          tegOpenRef={tegOpenRef}
          onSelectPart={handleSelectPart}
          onArrive={setDisplayedStepId}
        />
      </Canvas>
      <Legend deviceClass={deviceClass} />
      <FactsCard
        stepId={displayedStepId}
        selectedPart={selectedPart}
        onClear={clearSelectedPart}
        deviceClass={deviceClass}
      />
      <TourNav
        steps={TOUR_STEPS}
        stepIndex={stepIndex}
        displayedLabel={TOUR_STEPS.find((s) => s.id === displayedStepId)?.label ?? step.label}
        deviceClass={deviceClass}
        onPrev={goPrev}
        onNext={goNext}
        onJump={setStepIndex}
      />
      {/* phone + portrait only — see RotateDeviceGate's own docstring for
          why this is a prompt, not an actual orientation lock */}
      <div
        data-tour="controls"
        style={{
          position: 'absolute',
          top: 16,
          left: 64,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <MuteButton />
        <TutorialHelpButton onClick={() => setTutorialRun((r) => r + 1)} />
        <FullscreenControl deviceClass={deviceClass} isPortrait={isPortrait} />
      </div>
      <Tutorial
        compact={deviceClass !== 'desktop'}
        hidden={deviceClass === 'phone' && isPortrait}
        selectedPart={selectedPart}
        stepIndex={stepIndex}
        run={tutorialRun}
      />
      <RotateGate show={deviceClass === 'phone' && isPortrait} />
    </div>
  );
}
