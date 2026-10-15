/**
 * Quality profiles for the Adria model.
 *
 * The same procedural code builds both variants. `high` (desktop) has board
 * relief on the cladding, tile courses with individual tiles, a dense lawn
 * grid and the full planting. `lite` (phones, tablets, weak GPUs) keeps every
 * layer, node name and coordinate but drops relief, merges details and builds
 * the garden with fewer, larger pieces (40 % of the plant instances, 8 trees).
 *
 * Builders read the active profile with `Q()`; build-house.mjs switches it
 * with `setQuality()` between the two passes.
 */

const PROFILES = {
  high: {
    name: "high",
    /** board side faces (shadow gaps) on the cladding */
    boardRelief: true,
    /** individual tiles in each saltak course (else plain course steps) */
    tiles: true,
    /** standing seams as raised ribs on the pulttak (else none) */
    seams: true,
    lawnCell: 1.0,
    lawnFar: 4.0,
    backdropSegments: 220,
    tubeRadial: 10,
    /** fraction of plant instances kept */
    plants: 1,
    trees: { cardsBirch: 420, cardsBroad: 520, cardsSpruce: 360, templates: 3 },
    hedgeCards: 2.2, // cards per metre
    deckBoards: true,
    leafAtlas: 1024,
    interiorDetail: true,
  },
  lite: {
    name: "lite",
    boardRelief: false,
    tiles: false,
    seams: false,
    lawnCell: 2.0,
    lawnFar: 8.0,
    backdropSegments: 90,
    tubeRadial: 6,
    plants: 0.4,
    trees: { cardsBirch: 170, cardsBroad: 210, cardsSpruce: 150, templates: 2 },
    hedgeCards: 0.9,
    deckBoards: false,
    leafAtlas: 512,
    interiorDetail: false,
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
