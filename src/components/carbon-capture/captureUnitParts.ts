/**
 * Dimension constants for the carbon-capture 3D scene.
 *
 * Every number below is in real-world inches and traces back to the 2D
 * "Capture Unit Enclosure" artifact. Scene code derives positions from
 * these rather than hard-coding numbers, so the 2D and 3D stay provably
 * consistent with each other.
 *
 * Scale: 1 Three.js scene unit = 1 foot.
 */

export const IN_PER_FT = 1 / 12;
export const toUnits = (inches: number) => inches * IN_PER_FT;

/** Main capture module — "Orthographic elevations" (front/side). */
export const MODULE = {
  width: 16,
  depth: 17,
  bodyHeight: 30,
  chimneyWidth: 2.5,
  chimneyDepth: 2.5,
  chimneyHeight: 4,
} as const;
export const MODULE_HEIGHT = MODULE.bodyHeight + MODULE.chimneyHeight; // 34in, matches the 2D "34in overall"

/** CO2 storage tanks, stacked — "Orthographic elevations" + capacity-validation pass. */
export const TANK = {
  diameter: 10,
  bodyHeight: 14,
  domeHeight: 2,
  count: 2,
  gap: 2,
} as const;
export const TANK_UNIT_HEIGHT = TANK.bodyHeight + TANK.domeHeight; // 16in each
export const TANK_COLUMN_HEIGHT =
  TANK_UNIT_HEIGHT * TANK.count + TANK.gap * (TANK.count - 1); // 34in total, matches MODULE_HEIGHT

/** Assembly = module + tank column, side by side. "Orthographic elevations" width total. */
export const ASSEMBLY_GAP = 2; // between module and tank column
export const ASSEMBLY_WIDTH = MODULE.width + ASSEMBLY_GAP + TANK.diameter; // 28in
export const ASSEMBLY_HEIGHT = MODULE_HEIGHT; // 34in — both halves span the same height

/** Bulk storage bin, frame-rail mounted — "Bulk storage bin" elevations. */
export const BULK_BIN = {
  width: 20,
  depth: 17,
  height: 22,
} as const;

/** Cab-wall mounting panel — "Mounting context" rear-view figure. */
export const PANEL = {
  width: 38,
  height: 42,
  clearanceSide: 5, // left/right, each side
  clearanceTop: 3.5,
  clearanceBottom: 4.5,
} as const;

/**
 * Truck reference proportions.
 *
 * tireRadius / frameHeight / cabRoofHeight / stackHeight come straight from
 * the 2D mounting-context figures (typical Class-8 tractor numbers, not a
 * specific make/model). Width and length figures below are NEW for 3D —
 * the 2D was side-profile-only and never needed them. Sourced the same
 * way as everything else in this project: typical figures, explicitly
 * flagged as assumptions rather than measured specs.
 */
export const TRUCK = {
  tireRadius: 21,
  tireWidth: 10,
  axleTrack: 84, // NEW for 3D — center-to-center of left/right wheels
  frameHeight: 40,
  cabWidth: 96, // NEW for 3D — standard large-sleeper width
  cabLength: 170, // NEW for 3D — hood + sleeper, approximate
  cabRoofHeight: 132,
  gapLength: 48, // NEW for 3D — cab-to-trailer gap
  stackHeight: 168, // top of the pipe: about level with the trailer roof, like a real cab-mounted stack
  stackDiameter: 5,
  trailerWidth: 100, // NEW for 3D
  trailerRoofHeight: 162,
  trailerStubLength: 260, // NEW for 3D — a stub of the trailer nose, not the full 48-53ft box, but long enough to read as an actual cargo bed rather than a truncated block
} as const;

/**
 * How far below the roofline the mounting panel's top edge sits.
 * Not pinned by the 2D (which only showed roofline/catwalk as relative
 * boundaries, not absolute heights) — stated explicitly here so it's an
 * auditable assumption, not a buried magic number.
 */
export const PANEL_TOP_OFFSET_BELOW_ROOF = 6;

/**
 * Internal process layout — chamber bands inside the module body, traced
 * from the 2D cutaways' interior cavity (156-336 of a 150-342 body, in SVG
 * space at 12px/in): headspace+demister at the top, down through de-tox,
 * heating/regen, to the reservoir at the bottom. Heights come off the
 * cutaway's own divider lines, not independently chosen, and sum to
 * MODULE.bodyHeight (30in) exactly.
 */
export const INTERNALS = {
  headspaceHeight: 9, // demister + freeboard duct, up to the chimney neck
  detoxHeight: 8.5, // de-toxification (absorption) chamber
  heatingHeight: 7.5, // heating/regeneration chamber — PCM block + rich amine pool
  reservoirHeight: 4.5, // lean amine reservoir
  bottomClearance: 0.5,
  wallMargin: 0.5, // interior cavity inset from the body shell, each side
} as const;

/** Demister pad, sitting in the headspace band just below the chimney neck. */
export const DEMISTER = {
  height: 2.5,
  offsetBelowBodyTop: 3.5,
} as const;

/** PCM thermal buffer — occupies the exhaust-inlet side of the heating band;
 *  charged by the incoming exhaust gas's own waste heat, so it sits nearest
 *  where that gas enters. */
export const PCM_BLOCK = {
  offsetFromInletEdge: 0.67,
  width: 4.67,
  height: 6.33,
} as const;

/** Rich amine pool, awaiting regeneration — fills the remaining interior
 *  width of the heating band, at its bottom. */
export const RICH_AMINE_POOL = {
  height: 3,
} as const;

export const RETURN_PUMP = {
  diameter: 3,
  height: 3,
} as const;

/** Waste-heat recovery (TEG) sleeve, clamped around a section of the existing
 *  exhaust stack — "Waste-heat recovery unit (TEG)" elevation. */
export const TEG_SLEEVE = {
  outerDiameter: 9,
  length: 14.5,
} as const;

/** Radiator / coolant pump / controller unit, mounted on the cab wall beside
 *  the module, outside the PANEL footprint the clearance check validated.
 *  Depth (8in, X-extent) is NEW for 3D — the 2D pass only drew this in front
 *  elevation, so depth was never pinned; flagged as an assumption, not a
 *  measured spec, same as the truck's own NEW-for-3D numbers above. */
export const TEG_UNIT = {
  width: 12,
  depth: 8,
  height: 10,
} as const;

/** Which side of the truck centerline the module/tanks face, in 3D Z terms.
 *  Matches the 2D rear-view: tanks toward the ladder side, module toward
 *  the stack side. The left/right choice itself is arbitrary — real trucks
 *  mount the stack on either side depending on spec. */
export const MODULE_SIDE_Z = 1; // module center is at +Z
export const TANK_SIDE_Z = -1; // tank column center is at -Z
