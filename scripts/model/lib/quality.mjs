/**
 * Quality profiles for the house model.
 *
 * The same procedural code builds both variants. `high` is the full model
 * (desktop): it reproduces the original geometry exactly, minus triangles that
 * can never be seen (inside other opaque volumes or under the ground). `lite`
 * (phones, old laptops) keeps every layer, name and coordinate but builds the
 * expensive parts with fewer, larger pieces: tree crowns with fewer clumps,
 * coarser terrain, rocks and trunks with fewer facets, fewer loose stones.
 *
 * Builders read the active profile with `Q()`; build-house.mjs switches it
 * with `setQuality()` between the two passes.
 */

const PROFILES = {
  high: {
    name: "high",
    terrainCells: 100,
    /** meshoptimizer pass over the terrain grid: keep `ratio` of the triangles within `error` metres */
    terrainSimplify: null,
    hillSegments: 180,
    rocks: { outcropDetail: 2, boulderDetail: 1 },
    trunk: { segment: 0.6, maple: [10, 10, 8, 6], birch: [7, 5] },
    /** templates: 0 = eleven unique birches; n = n template trees drawn with GPU instancing */
    birch: { count: 230, size: [0.22, 0.4], templates: 4 },
    maple: {
      main: { count: 430, size: [0.55, 1.0], detail: 1 },
      fringe: { count: 320, size: [0.24, 0.45], detail: 0 },
      coreDetail: 1,
    },
    shrub: { perLobe: 34, size: [0.08, 0.15], coreDetail: 1 },
    blastRock: { pile: 70, loose: 28, planar: false },
    tubeRadial: 5,
    lamp: { sphere: [12, 8], disc: 20, shade: 18 },
    /** Drop crown triangles nobody can see (buried in the core or a neighbour, or occluded from every side). */
    cullHidden: true,
    /**
     * Box faces left out because something else covers them in every build state
     * (per kind, see walls.mjs). High: only faces that lie against another part.
     */
    coveredFaces: {
      stud: { top: true, bottom: true },
      under: { back: true },
      over: { back: true },
      batten: { back: true },
      trim: { back: true },
    },
  },
  lite: {
    name: "lite",
    terrainCells: 60,
    terrainSimplify: { ratio: 0.4, error: 0.05 },
    hillSegments: 72,
    rocks: { outcropDetail: 1, boulderDetail: 0 },
    trunk: { segment: 2.5, maple: [10, 9, 6, 4], birch: [5, 3] },
    birch: { count: 70, size: [0.34, 0.6], templates: 2 },
    maple: {
      main: { count: 210, size: [0.8, 1.35], detail: 0 },
      fringe: { count: 110, size: [0.34, 0.6], detail: 0 },
      coreDetail: 0,
    },
    shrub: { perLobe: 7, size: [0.15, 0.27], coreDetail: 0 },
    blastRock: { pile: 34, loose: 12, planar: true },
    tubeRadial: 3,
    lamp: { sphere: [8, 5], disc: 12, shade: 10 },
    cullHidden: true,
    /** Lite also drops the faces only a cut-away could show: board bottoms and the hidden sides of under-boards. */
    coveredFaces: {
      stud: { top: true, bottom: true },
      under: { back: true, bottom: true, start: true, end: true },
      over: { back: true, bottom: true },
      batten: { back: true, bottom: true },
      trim: { back: true },
    },
  },
};

let current = PROFILES.high;

export function setQuality(name) {
  if (!PROFILES[name]) throw new Error(`Unknown model quality: ${name}`);
  current = PROFILES[name];
}

/** The active quality profile. */
export function Q() {
  return current;
}

export const QUALITIES = Object.keys(PROFILES);
