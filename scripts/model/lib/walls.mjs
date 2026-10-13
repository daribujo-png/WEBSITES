/**
 * Outer walls: timber frame, insulation, windbreak, battens, cladding,
 * windows/doors and inner lining — all derived from the same wall list so
 * openings line up through every layer.
 */
import { V, col, rng, rectMinusOpenings, subtractIntervals } from "./builder.mjs";
import {
  CLAD_OUT,
  CLADDING_RAW,
  HW,
  NICHE,
  OPENINGS,
  RAFTER_VD,
  SKIN,
  STUD_D,
  STUD_W,
  T,
  W,
  WINGS,
  Y,
  rafterTop,
  rake,
} from "./house-spec.mjs";

const r = rng(42);

/** All six outer walls. */
export function wallList() {
  const list = [];
  for (const wid of ["A", "B"]) {
    const wing = WINGS[wid];
    for (const s of [1, -1]) {
      const side = s > 0 ? "S" : "N";
      list.push({ id: `${wid}${side}`, wing, type: "eave", s, openings: OPENINGS[wid][side] });
    }
    list.push({ id: `${wid}G`, wing, type: "gable", s: 0, openings: OPENINGS[wid].G });
  }
  return list;
}

/**
 * A box in a wall's coordinates: axis a (u for eave walls, v for gables),
 * depth d (outward from the frame face, frame = [-STUD_D, 0]) and y.
 * yTop may be a function of the axis coordinate (sloped gable tops).
 * For eave walls, `mitre` clamps the start of the box to the mitred joint.
 */
export function wallBox(mb, wall, a0, a1, d0, d1, y0, y1, color, { mitre = false, yTop, yBot } = {}) {
  const { wing } = wall;
  const pt = (a, d, y) => {
    if (wall.type === "eave") {
      const v = wall.s * (HW + d);
      return W(wing, a, v, y);
    }
    return W(wing, wing.L + d, a, y);
  };
  const aStart = (d) => {
    if (wall.type === "eave" && mitre) return Math.max(a0, T * wall.s * (HW + d));
    return a0;
  };
  const top = (a) => (yTop ? yTop(a) : y1);
  const bot = (a) => (yBot ? yBot(a) : y0);
  const s0 = aStart(d0);
  const s1 = aStart(d1);
  if (a1 - Math.max(s0, s1) < 1e-4 && a1 - Math.min(s0, s1) < 1e-4) return;
  const c = [
    pt(s0, d0, bot(s0)),
    pt(a1, d0, bot(a1)),
    pt(a1, d1, bot(a1)),
    pt(s1, d1, bot(s1)),
    pt(s0, d0, top(s0)),
    pt(a1, d0, top(a1)),
    pt(a1, d1, top(a1)),
    pt(s1, d1, top(s1)),
  ];
  mb.hexa(c, color);
}

/** Axis extent of a wall at depth d (frame members use d inside the frame). */
export function wallAxis(wall, d, { outer = false } = {}) {
  const { wing } = wall;
  if (wall.type === "eave") {
    const start = T * wall.s * (HW + d);
    const end = outer ? wing.L + d : wing.L - STUD_D;
    return [start, end];
  }
  const half = HW + (outer ? d : 0);
  return [-half, half];
}

/** Height zones of the frame for a wall. */
function frameZones(wall) {
  if (wall.type === "eave") {
    return [
      { y0: Y.slab, y1: Y.top1, floor: 1 },
      { y0: Y.sill2, y1: Y.eave, floor: 2 },
    ];
  }
  return [
    { y0: Y.slab, y1: Y.top1, floor: 1 },
    { y0: Y.sill2, y1: null, floor: 2, sloped: true },
  ];
}

const woodTone = (base, spread = 0.07) => {
  const c = col(base);
  const k = 1 + (r() - 0.5) * 2 * spread;
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h + (r() - 0.5) * 0.015, hsl.s * (1 + (r() - 0.5) * 0.2), Math.min(1, hsl.l * k));
  return c;
};

/* ---------------------------------------------------------------------------------------------- */
/* Frame                                                                                          */
/* ---------------------------------------------------------------------------------------------- */

export function buildFrame(layer) {
  const mbStuds = layer.mb("frame_wood", "bindingsverk_vegger");
  const studColor = () => woodTone("#d6be92", 0.06);
  for (const wall of wallList()) {
    for (const zone of frameZones(wall)) {
      const [a0, a1] = wallAxis(wall, -STUD_D / 2);
      const isEave = wall.type === "eave";
      // gable: studs span the whole width
      const ga0 = isEave ? a0 : -HW;
      const ga1 = isEave ? a1 : HW;
      const topAt = zone.sloped ? (a) => rake(Math.abs(a)) : () => zone.y1;
      const d0 = -STUD_D;
      const d1 = 0;
      const box = (b0, b1, y0, y1, opts = {}) => wallBox(mbStuds, wall, b0, b1, d0, d1, y0, y1, studColor(), opts);
      // plates
      box(ga0, ga1, zone.y0, zone.y0 + STUD_W, { mitre: isEave });
      if (zone.sloped) {
        // rake plates following the roof, split at the apex
        box(ga0, 0, 0, 0, { yBot: (a) => topAt(a) - STUD_W, yTop: topAt });
        box(0, ga1, 0, 0, { yBot: (a) => topAt(a) - STUD_W, yTop: topAt });
      } else {
        box(ga0, ga1, zone.y1 - STUD_W, zone.y1, { mitre: isEave });
        if (isEave) box(ga0, ga1, zone.y1 - 2 * STUD_W, zone.y1 - STUD_W, { mitre: isEave });
      }
      const studTop = (a) => topAt(a) - (zone.sloped || !isEave ? STUD_W : 2 * STUD_W);
      const yb = zone.y0 + STUD_W;
      const ops = wall.openings.filter((o) => o.y0 < (zone.sloped ? 99 : zone.y1) && o.y1 > zone.y0);
      // regular studs
      const start = isEave ? a0 + STUD_W / 2 + (wall.s > 0 ? 0 : 0.0) : ga0 + STUD_W / 2;
      const positions = [];
      for (let p = start; p < ga1 - STUD_W / 2; p += 0.6) positions.push(p);
      positions.push(ga1 - STUD_W / 2);
      if (isEave) {
        // mitre corner: extra stud close to the joint on the inner face
        positions.push(Math.max(T * wall.s * (HW - STUD_D), T * wall.s * HW) + STUD_W / 2 + 0.002);
      }
      for (const p of positions) {
        const blocked = ops.find((o) => p > o.a0 - 0.12 && p < o.a1 + 0.12);
        if (blocked) {
          // cripples below sill / above header inside the opening span
          if (p > blocked.a0 + 0.03 && p < blocked.a1 - 0.03) {
            if (blocked.y0 - STUD_W - yb > 0.05) box(p - STUD_W / 2, p + STUD_W / 2, yb, blocked.y0 - STUD_W);
            const hTop = blocked.y1 + 0.198;
            const topHere = Math.min(studTop(p - STUD_W / 2), studTop(p + STUD_W / 2));
            if (topHere - hTop > 0.05)
              box(p - STUD_W / 2, p + STUD_W / 2, hTop, 0, { yTop: (a) => studTop(a), mitre: isEave });
          }
          continue;
        }
        box(p - STUD_W / 2, p + STUD_W / 2, yb, 0, { yTop: studTop, mitre: isEave });
      }
      // opening framing
      for (const o of ops) {
        const oy0 = Math.max(o.y0, yb);
        const headerTop = o.y1 + 0.198;
        // king + jack studs each side
        box(o.a0 - 2 * STUD_W, o.a0 - STUD_W, yb, 0, { yTop: studTop });
        box(o.a0 - STUD_W, o.a0, yb, o.y1);
        box(o.a1 + STUD_W, o.a1 + 2 * STUD_W, yb, 0, { yTop: studTop });
        box(o.a1, o.a1 + STUD_W, yb, o.y1);
        // header
        box(o.a0 - STUD_W, o.a1 + STUD_W, o.y1, headerTop);
        // sill
        if (o.y0 > yb + 0.1) box(o.a0, o.a1, oy0 - STUD_W, oy0);
      }
    }
    // rim joist between floors
    if (wall.type === "eave") {
      const [a0, a1] = wallAxis(wall, -0.024);
      wallBox(mbStuds, wall, a0, a1 + STUD_D - 0.048, -0.048, 0, Y.top1, Y.joistTop, studColor(), { mitre: true });
    } else {
      wallBox(mbStuds, wall, -HW, HW, -0.048, 0, Y.top1, Y.joistTop, studColor());
    }
  }
}

/* ---------------------------------------------------------------------------------------------- */
/* Panels: insulation, windbreak, inner lining                                                    */
/* ---------------------------------------------------------------------------------------------- */

/** Vertical extent of the wall surface (for panels) at depth d. */
function panelZones(wall, kind) {
  const isEave = wall.type === "eave";
  if (kind === "insulation") {
    return isEave
      ? [
          { y0: Y.slab + STUD_W, y1: Y.top1 - 2 * STUD_W },
          { y0: Y.sill2 + STUD_W, y1: Y.eave - 2 * STUD_W },
        ]
      : [
          { y0: Y.slab + STUD_W, y1: Y.top1 - STUD_W },
          { y0: Y.sill2 + STUD_W, sloped: (a) => rake(Math.abs(a)) - STUD_W },
        ];
  }
  if (kind === "windbreak-low") {
    return [{ y0: Y.slab - 0.02, y1: Y.sill2 }];
  }
  if (kind === "windbreak") {
    return isEave ? [{ y0: Y.slab - 0.02, y1: Y.eave + 0.02 }] : [{ y0: Y.slab - 0.02, sloped: (a) => rake(Math.abs(a)) + 0.04 }];
  }
  // lining (inside, per floor)
  return isEave
    ? [
        { y0: Y.ff1, y1: Y.top1 - 0.02, floor: 1 },
        { y0: Y.ff2, y1: rafterTop(HW - STUD_D) - RAFTER_VD, floor: 2 },
      ]
    : [
        { y0: Y.ff1, y1: Y.top1 - 0.02, floor: 1 },
        { y0: Y.ff2, sloped: (a) => Math.min(Y.collar, rafterTop(Math.abs(a)) - RAFTER_VD - 0.012), floor: 2 },
      ];
}

/**
 * Fill a wall surface between depths d0..d1 with panels, minus openings.
 * `filter(wall, zone)` can skip zones (partial coverage).
 */
export function wallPanels(mb, d0, d1, kind, color, { filter, openingPad = 0, splitAt = [] } = {}) {
  for (const wall of wallList()) {
    const isEave = wall.type === "eave";
    for (const zone of panelZones(wall, kind)) {
      if (filter && !filter(wall, zone)) continue;
      let [a0, a1] = isEave ? wallAxis(wall, d1, { outer: d0 >= 0 }) : [-(HW + Math.max(0, d0)), HW + Math.max(0, d0)];
      if (isEave && d1 <= 0) a1 = wall.wing.L - STUD_D;
      if (!isEave && d1 <= 0) [a0, a1] = [-(HW - STUD_D), HW - STUD_D];
      const yTop = zone.sloped ? 30 : zone.y1;
      const ops = wall.openings.map((o) => ({ u0: o.a0 - openingPad, u1: o.a1 + openingPad, y0: o.y0 - openingPad, y1: o.y1 + openingPad }));
      let rects = rectMinusOpenings(a0, a1, zone.y0, yTop, ops);
      // split at apex and given axis positions so sloped tops stay planar
      const cuts = zone.sloped ? [0, ...splitAt] : splitAt;
      for (const c of cuts) {
        rects = rects.flatMap((rc) => (rc.u0 < c && rc.u1 > c ? [{ ...rc, u1: c }, { ...rc, u0: c }] : [rc]));
      }
      for (const rc of rects) {
        const touchesTop = zone.sloped && rc.y1 >= yTop - 1e-6;
        wallBox(mb, wall, rc.u0, rc.u1, d0, d1, rc.y0, rc.y1, color, {
          mitre: isEave && Math.abs(rc.u0 - a0) < 1e-6,
          yTop: touchesTop ? (a) => zone.sloped(a) : undefined,
        });
      }
    }
  }
}

/* ---------------------------------------------------------------------------------------------- */
/* Cladding                                                                                       */
/* ---------------------------------------------------------------------------------------------- */

const UNDER_W = 0.148;
const PITCH_B = 0.198;
const OVER_W = 0.073;

export function buildCladding(layer) {
  const mb = layer.mb("cladding_wood", "kledning_bord");
  const mbTrim = layer.mb("cladding_wood", "kledning_lister");
  const mbFlash = layer.mb("window_frame", "kledning_beslag");
  const mbBatten = layer.mb("frame_wood", "kledning_lekter");
  const tone = () => woodTone(CLADDING_RAW, 0.08);
  const yBottom = 0.33;
  for (const wall of wallList()) {
    const isEave = wall.type === "eave";
    const ops = wall.openings;
    const topFn = isEave ? () => rafterTop(HW + CLAD_OUT) : (a) => rafterTop(Math.abs(a)) - 0.004;
    const [a0, a1] = isEave ? wallAxis(wall, SKIN.under[0], { outer: true }) : [-(HW + CLAD_OUT), HW + CLAD_OUT];
    const end = isEave ? wall.wing.L + CLAD_OUT : a1;
    // battens (horizontal, krysslekting) — visible only in cut-aways
    for (let y = 0.5; y < (isEave ? Y.eave : 8.6); y += 0.6) {
      const [b0, b1] = isEave ? [a0, end] : [-(HW + SKIN.battens[1]), HW + SKIN.battens[1]];
      const segs = subtractIntervals(
        b0,
        b1,
        ops.filter((o) => y > o.y0 - 0.05 && y < o.y1 + 0.05).map((o) => [o.a0 - 0.02, o.a1 + 0.02]),
      );
      for (const [s0, s1] of segs) {
        if (!isEave) {
          // keep battens below the rake
          const maxA = Math.min(HW + SKIN.battens[1], HW - (y + 0.09 - Y.eave - RAFTER_VD) / Math.tan((40 * Math.PI) / 180));
          const c0 = Math.max(s0, -maxA);
          const c1 = Math.min(s1, maxA);
          if (c1 - c0 < 0.05) continue;
          wallBox(mbBatten, wall, c0, c1, SKIN.battens[0], SKIN.battens[1], y, y + 0.036, col("#cdb184"));
        } else {
          wallBox(mbBatten, wall, s0, s1, SKIN.battens[0], SKIN.battens[1], y, y + 0.036, col("#cdb184"), {
            mitre: Math.abs(s0 - a0) < 1e-6,
          });
        }
      }
    }
    // boards
    const boardPositions = [];
    for (let p = a0 + UNDER_W / 2; p < end - UNDER_W / 2 + 0.05; p += PITCH_B) boardPositions.push(p);
    const piece = (b0, b1, d0, d1) => {
      const cuts = ops.filter((o) => b1 > o.a0 - 0.002 && b0 < o.a1 + 0.002).map((o) => [o.y0 - (o.y0 > 0.6 ? 0 : 0.2), o.y1]);
      const yTopMax = isEave ? topFn() : Math.max(topFn(b0), topFn(b1));
      for (const [y0, y1] of subtractIntervals(yBottom, yTopMax + 0.01, cuts)) {
        const reachesTop = y1 >= yTopMax;
        wallBox(mb, wall, Math.max(b0, isEave ? -99 : a0), Math.min(b1, end), d0, d1, y0, y1, tone(), {
          mitre: isEave,
          yTop: reachesTop ? topFn : undefined,
        });
      }
    };
    for (const p of boardPositions) {
      piece(p - UNDER_W / 2, p + UNDER_W / 2, SKIN.under[0], SKIN.under[1]);
      const q = p + PITCH_B / 2;
      if (q + OVER_W / 2 < end) piece(q - OVER_W / 2, q + OVER_W / 2, SKIN.over[0], SKIN.over[1]);
    }
    // trims around openings
    const tw = 0.11;
    for (const o of ops) {
      if (o.kind === "niche") continue;
      const d0 = SKIN.trim[0];
      const d1 = SKIN.trim[1];
      const trimTone = tone();
      wallBox(mbTrim, wall, o.a0 - tw, o.a0, d0, d1, o.y0 - (o.y0 > 0.6 ? tw : 0.1), o.y1 + tw, trimTone);
      wallBox(mbTrim, wall, o.a1, o.a1 + tw, d0, d1, o.y0 - (o.y0 > 0.6 ? tw : 0.1), o.y1 + tw, trimTone);
      wallBox(mbTrim, wall, o.a0 - tw, o.a1 + tw, d0, d1, o.y1, o.y1 + tw, trimTone);
      if (o.y0 > 0.6) wallBox(mbTrim, wall, o.a0, o.a1, d0, d1, o.y0 - tw, o.y0, trimTone);
      // drip flashing above
      wallBox(mbFlash, wall, o.a0 - tw - 0.02, o.a1 + tw + 0.02, d0, d1 + 0.04, o.y1 + tw, o.y1 + tw + 0.014, null);
    }
    // corner boards
    const cw = 0.13;
    if (isEave) {
      const L = wall.wing.L;
      // gable corner
      wallBox(mbTrim, wall, L + CLAD_OUT - cw, L + CLAD_OUT + 0.022, SKIN.trim[0], SKIN.trim[1], yBottom, topFn(), tone());
      // mitre corner
      const m = T * wall.s * (HW + SKIN.trim[1]);
      wallBox(mbTrim, wall, m, m + cw, SKIN.trim[0], SKIN.trim[1], yBottom, topFn(), tone(), { mitre: true });
    } else {
      for (const sgn of [1, -1]) {
        const e = HW + CLAD_OUT + 0.022;
        const b0 = sgn > 0 ? e - cw - 0.022 : -e;
        const b1 = sgn > 0 ? e : -e + cw + 0.022;
        wallBox(mbTrim, wall, b0, b1, SKIN.trim[0], SKIN.trim[1], yBottom, rafterTop(HW + CLAD_OUT) - 0.01, tone());
      }
    }
  }
  buildNiche(layer);
}

/* ---------------------------------------------------------------------------------------------- */
/* Curved dark entry                                                                              */
/* ---------------------------------------------------------------------------------------------- */

export function nicheArc(steps = 40) {
  const wing = WINGS[NICHE.wing];
  const uc = (NICHE.u0 + NICHE.u1) / 2;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const phi = (Math.PI * i) / steps;
    pts.push({ phi, u: uc + NICHE.radius * Math.cos(phi), v: -HW + NICHE.radius * Math.sin(phi) });
  }
  return { wing, uc, pts };
}

function buildNiche(layer) {
  const { wing, uc } = nicheArc();
  const mbSlat = layer.mb("entry_dark", "kledning_inngang");
  const mbFloor = layer.mb("concrete", "kledning_inngang_gulv");
  const R = NICHE.radius;
  const phiDoor = Math.acos(NICHE.doorHalf / R);
  // vertical slats along the arc (skip the door chord)
  const n = 34;
  for (let i = 0; i <= n; i++) {
    const phi = (Math.PI * i) / n;
    if (phi > phiDoor + 0.02 && phi < Math.PI - phiDoor - 0.02) continue;
    const cu = uc + R * Math.cos(phi);
    const cv = -HW + R * Math.sin(phi);
    // slat oriented tangent to the arc
    const tu = -Math.sin(phi);
    const tv = Math.cos(phi);
    const nu = Math.cos(phi);
    const nv = Math.sin(phi);
    const hw = 0.028;
    const dep = 0.035;
    const corners2 = [
      [cu - tu * hw, cv - tv * hw],
      [cu + tu * hw, cv + tv * hw],
      [cu + tu * hw + nu * dep, cv + tv * hw + nv * dep],
      [cu - tu * hw + nu * dep, cv - tv * hw + nv * dep],
    ];
    const bot = corners2.map(([u, v]) => W(wing, u, v, NICHE.y0 - 0.05));
    const top = corners2.map(([u, v]) => W(wing, u, v, NICHE.y1));
    mbSlat.hexa([...bot, ...top], null);
    // backing behind slats
  }
  // backing surface (continuous dark arc behind slats)
  const steps = 36;
  for (let i = 0; i < steps; i++) {
    const p0 = (Math.PI * i) / steps;
    const p1 = (Math.PI * (i + 1)) / steps;
    if (p1 > phiDoor && p0 < Math.PI - phiDoor) continue;
    const a = (phi, rr) => [uc + rr * Math.cos(phi), -HW + rr * Math.sin(phi)];
    const q = [a(p0, R + 0.035), a(p1, R + 0.035), a(p1, R + 0.06), a(p0, R + 0.06)];
    mbSlat.hexa([...q.map(([u, v]) => W(wing, u, v, NICHE.y0 - 0.05)), ...q.map(([u, v]) => W(wing, u, v, NICHE.y1))], null);
  }
  // ceiling and floor (half discs from the arc to the cladding face)
  const ring = [];
  for (let i = 0; i <= 24; i++) {
    const phi = (Math.PI * i) / 24;
    ring.push(W(wing, uc + (R + 0.06) * Math.cos(phi), -HW + (R + 0.06) * Math.sin(phi), 0));
  }
  ring.push(W(wing, NICHE.u0 - 0.06, -(HW + CLAD_OUT + 0.02), 0));
  ring.push(W(wing, NICHE.u1 + 0.06, -(HW + CLAD_OUT + 0.02), 0));
  const poly = [ring[ring.length - 1], ...ring.slice(0, 25), ring[ring.length - 2]].map((p) => ({ x: p.x, z: p.z }));
  mbSlat.slab(poly, [], NICHE.y1, NICHE.y1 + 0.06, null);
  mbFloor.slab(poly, [], NICHE.y0 - 0.12, NICHE.y0 - 0.02, null);
  // header band above the opening on the cladding plane
  const wall = { wing, type: "eave", s: -1 };
  wallBox(mbSlat, wall, NICHE.u0 - 0.06, NICHE.u1 + 0.06, -0.02, CLAD_OUT + 0.02, NICHE.y1, NICHE.y1 + 0.08, null);
  // reveals at the opening edges
  wallBox(mbSlat, wall, NICHE.u0 - 0.06, NICHE.u0, -0.02, CLAD_OUT + 0.02, NICHE.y0 - 0.05, NICHE.y1, null);
  wallBox(mbSlat, wall, NICHE.u1, NICHE.u1 + 0.06, -0.02, CLAD_OUT + 0.02, NICHE.y0 - 0.05, NICHE.y1, null);
}

/** Arc studs for the niche (frame layer). */
export function buildNicheFrame(layer) {
  const { wing, uc } = nicheArc();
  const mb = layer.mb("frame_wood", "bindingsverk_vegger");
  const R = NICHE.radius + 0.06;
  for (let i = 0; i <= 8; i++) {
    const phi = (Math.PI * i) / 8;
    const p = W(wing, uc + (R + 0.1) * Math.cos(phi), -HW + (R + 0.1) * Math.sin(phi), 0);
    mb.aabb(V(p.x - 0.024, Y.slab, p.z - 0.024), V(p.x + 0.024, NICHE.y1 + 0.2, p.z + 0.024), col("#d6be92"));
  }
}

/* ---------------------------------------------------------------------------------------------- */
/* Windows and doors                                                                              */
/* ---------------------------------------------------------------------------------------------- */

export function buildOpenings(layer) {
  const mbFrame = layer.mb("window_frame", "vinduer_karm");
  const mbGlass = layer.mb("glass", "vinduer_glass");
  const mbTape = layer.mb("seal_tape", "vinduer_tetting");
  const mbDoor = layer.mb("door_wood", "vinduer_inngangsdor");
  const mbBrass = layer.mb("brass", "vinduer_beslag");
  for (const wall of wallList()) {
    for (const o of wall.openings) {
      if (o.kind === "niche") continue;
      const fw = 0.075;
      const fd0 = -0.12;
      const fd1 = 0.03;
      const yb = o.y0;
      // outer frame (karm)
      wallBox(mbFrame, wall, o.a0, o.a0 + fw, fd0, fd1, yb, o.y1, null);
      wallBox(mbFrame, wall, o.a1 - fw, o.a1, fd0, fd1, yb, o.y1, null);
      wallBox(mbFrame, wall, o.a0, o.a1, fd0, fd1, o.y1 - fw, o.y1, null);
      wallBox(mbFrame, wall, o.a0, o.a1, fd0, fd1, yb, yb + (o.kind === "door" ? 0.05 : fw), null);
      // mullions
      for (const m of o.mullions || []) wallBox(mbFrame, wall, m - fw / 2, m + fw / 2, fd0, fd1, yb, o.y1, null);
      // sash for opening windows / door
      const panes = [];
      const edges = [o.a0 + fw, ...(o.mullions || []).flatMap((m) => [m - fw / 2, m + fw / 2]), o.a1 - fw];
      for (let i = 0; i < edges.length; i += 2) panes.push([edges[i], edges[i + 1]]);
      for (const [p0, p1] of panes) {
        let gy0 = yb + (o.kind === "door" ? 0.05 : fw);
        let gy1 = o.y1 - fw;
        let g0 = p0;
        let g1 = p1;
        if (o.kind === "window" || o.kind === "door") {
          const sw = 0.055;
          const bottomRail = o.kind === "door" ? 0.16 : sw;
          wallBox(mbFrame, wall, g0, g0 + sw, -0.09, 0.01, gy0, gy1, null);
          wallBox(mbFrame, wall, g1 - sw, g1, -0.09, 0.01, gy0, gy1, null);
          wallBox(mbFrame, wall, g0, g1, -0.09, 0.01, gy1 - sw, gy1, null);
          wallBox(mbFrame, wall, g0, g1, -0.09, 0.01, gy0, gy0 + bottomRail, null);
          g0 += sw;
          g1 -= sw;
          gy0 += bottomRail;
          gy1 -= sw;
        }
        wallBox(mbGlass, wall, g0, g1, -0.045, -0.033, gy0, gy1, null);
      }
      // outer sill (vannbrett)
      if (o.kind !== "door") wallBox(mbFrame, wall, o.a0 - 0.03, o.a1 + 0.03, 0.0, 0.17, o.y0 - 0.025, o.y0 - 0.005, null);
      // seal tape on the windbreak around the frame
      const tw = 0.07;
      const td0 = SKIN.windbreak[1];
      const td1 = td0 + 0.004;
      wallBox(mbTape, wall, o.a0 - tw, o.a0, td0, td1, o.y0 - (o.kind === "door" ? 0 : tw), o.y1 + tw, null);
      wallBox(mbTape, wall, o.a1, o.a1 + tw, td0, td1, o.y0 - (o.kind === "door" ? 0 : tw), o.y1 + tw, null);
      wallBox(mbTape, wall, o.a0, o.a1, td0, td1, o.y1, o.y1 + tw, null);
      if (o.kind !== "door") wallBox(mbTape, wall, o.a0, o.a1, td0, td1, o.y0 - tw, o.y0, null);
    }
  }
  // entry door at the back of the niche (flat, on the chord)
  const { wing, uc } = nicheArc();
  const R = NICHE.radius;
  const dv = -HW + Math.sqrt(R * R - NICHE.doorHalf * NICHE.doorHalf);
  const u0 = uc - NICHE.doorHalf;
  const u1 = uc + NICHE.doorHalf;
  const box = (mb, a0, a1, v0, v1, y0, y1) =>
    mb.hexa(
      [
        W(wing, a0, v0, y0),
        W(wing, a1, v0, y0),
        W(wing, a1, v1, y0),
        W(wing, a0, v1, y0),
        W(wing, a0, v0, y1),
        W(wing, a1, v0, y1),
        W(wing, a1, v1, y1),
        W(wing, a0, v1, y1),
      ],
      null,
    );
  box(mbFrame, u0 - 0.06, u1 + 0.06, dv - 0.02, dv + 0.1, NICHE.y0 - 0.02, NICHE.y1);
  // door leaf with vertical grooves (boards)
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = u0 + 0.02 + ((u1 - u0 - 0.04) * i) / n;
    const b = u0 + 0.02 + ((u1 - u0 - 0.04) * (i + 1)) / n - 0.006;
    box(mbDoor, a, b, dv - 0.035, dv + 0.02, NICHE.y0, NICHE.y1 - 0.4);
  }
  // fanlight above the door
  box(mbGlass, u0 + 0.02, u1 - 0.02, dv + 0.0, dv + 0.012, NICHE.y1 - 0.38, NICHE.y1 - 0.04);
  box(mbFrame, u0, u1, dv - 0.04, dv + 0.05, NICHE.y1 - 0.4, NICHE.y1 - 0.38);
  // handle (vertical brass bar)
  box(mbBrass, u1 - 0.16, u1 - 0.13, dv - 0.08, dv - 0.05, 1.0, 1.9);
  return { doorCentre: W(wing, uc, dv - 0.05, 1.5) };
}
