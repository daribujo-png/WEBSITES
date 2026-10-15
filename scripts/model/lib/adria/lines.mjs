/**
 * Ink linework of the saltak house ("Tegningen" in the hero timelapse) and the
 * garden elevation as SVG for the home page (public/renders/adria-fasade-hage.svg).
 *
 * Both come from the same model data (faces, openings, roof), so the drawing
 * lands exactly on the 3D house. Segments carry an order (0…1) that sets the
 * drawing sequence: footprint, walls from the ground up, openings, cladding,
 * roof, chimney.
 */
import { V, col } from "../builder.mjs";
import { Q } from "../quality.mjs";
import { BOARD, CHIMNEY, HX, HZ, LV, PERGOLA, R1, R2, ROOF, openings } from "./spec.mjs";
import { FRAMES, faceDefs, openingHoles, columnIntervals } from "./faces.mjs";

const INK = col("#161c1e");
const ORDER = { footprint: [0, 0.08], walls: [0.08, 0.35], openings: [0.35, 0.6], cladding: [0.6, 0.82], roof: [0.82, 0.95], chimney: [0.95, 1] };
const LIFT = -0.012; // drawn just outside the cladding face

/** Collect segments of the saltak elevations: [{ a, b, group, face, t }] (t = 0…1 within the group). */
export function elevationSegments({ boardsEvery = 4, detail = true } = {}) {
  const roof = "saltak";
  const segs = [];
  const add = (a, b, group, face, t = 0) => segs.push({ a, b, group, face, t });
  const defs = faceDefs(roof).filter((d) => ["S", "N", "E", "W"].includes(d.id));
  // footprint on the ground
  const g = LV.claddingBottom;
  const fp = [V(-HX, g, -HZ), V(HX, g, -HZ), V(HX, g, HZ), V(-HX, g, HZ)];
  fp.forEach((p, i) => add(p, fp[(i + 1) % 4], "footprint", null, i / 4));
  for (const def of defs) {
    const F = FRAMES[def.id];
    const P = (a, y) => F.pt(a, y, LIFT);
    // outline: verticals at the face ends, top line
    add(P(def.a0, g), P(def.a0, def.top(def.a0)), "walls", def.id, 0.2);
    add(P(def.a1, g), P(def.a1, def.top(def.a1)), "walls", def.id, 0.2);
    const tops = [def.a0, ...(def.kinks || []), def.a1];
    for (let i = 0; i < tops.length - 1; i++) add(P(tops[i], def.top(tops[i])), P(tops[i + 1], def.top(tops[i + 1])), "walls", def.id, 0.8);
    // loggia holes (frames of the R1/R2 openings)
    for (const h of def.holes) {
      if (h.panel) continue;
      const pts = [P(h.a0, h.b(h.a0)), P(h.a1, h.b(h.a1))];
      add(pts[0], pts[1], "walls", def.id, 0.5);
      add(P(h.a0, h.b(h.a0)), P(h.a0, h.t(h.a0)), "walls", def.id, 0.5);
      add(P(h.a1, h.b(h.a1)), P(h.a1, h.t(h.a1)), "walls", def.id, 0.5);
      const ks = [h.a0, ...(def.kinks || []).filter((k) => k > h.a0 && k < h.a1), h.a1];
      for (let i = 0; i < ks.length - 1; i++) add(P(ks[i], h.t(ks[i])), P(ks[i + 1], h.t(ks[i + 1])), "walls", def.id, 0.7);
    }
    // openings: outline + mullions/transoms
    for (const o of openings(roof).filter((q) => q.face === def.id)) {
      const top = (a) => (o.topAt ? o.topAt(a) : o.y1);
      const ks = [o.a0, ...(o.topAt && o.a0 < 0 && o.a1 > 0 ? [0] : []), o.a1];
      const t = (o.y0 + 0.5) / 8;
      add(P(o.a0, o.y0), P(o.a1, o.y0), "openings", def.id, t);
      add(P(o.a0, o.y0), P(o.a0, top(o.a0)), "openings", def.id, t);
      add(P(o.a1, o.y0), P(o.a1, top(o.a1)), "openings", def.id, t);
      for (let i = 0; i < ks.length - 1; i++) add(P(ks[i], top(ks[i])), P(ks[i + 1], top(ks[i + 1])), "openings", def.id, t);
      if (detail) {
        for (const c of o.cols || []) add(P(c, o.y0), P(c, top(c)), "openings", def.id, t + 0.02);
        for (const r of o.rows || []) if (r > o.y0 + 0.1 && r < Math.min(top(o.a0), top(o.a1))) add(P(o.a0, r), P(o.a1, r), "openings", def.id, t + 0.02);
      }
    }
    // every n-th cladding board joint, clipped by holes and openings
    if (boardsEvery) {
      const holes = [...def.holes, ...openingHoles(def.id, roof)];
      for (let k = Math.ceil(def.a0 / BOARD.pitch); k * BOARD.pitch < def.a1; k++) {
        if (k % boardsEvery) continue;
        const a = k * BOARD.pitch;
        const eps = 0.001;
        for (const iv of columnIntervals(a - eps, a + eps, def.bottom, def.top, holes, -1e6, 1e6)) {
          add(P(a, iv.lo[0]), P(a, iv.hi[0]), "cladding", def.id, (a - def.a0) / (def.a1 - def.a0));
        }
      }
    }
  }
  // roof (saltak): eaves, ridge, verges, gutter lines
  const R = ROOF.saltak;
  const zE = HZ + R.eave;
  const xV = HX + R.verge;
  for (const s of [1, -1]) {
    add(V(-xV, R.outer(zE), s * zE), V(xV, R.outer(zE), s * zE), "roof", s > 0 ? "S" : "N", 0.1);
    for (const x of [-xV, xV]) add(V(x, R.outer(zE), s * zE), V(x, R.ridge + 0.04, 0), "roof", x > 0 ? "E" : "W", 0.5);
    // a few tile courses (every third)
    if (detail) {
      for (let c = 3; c < 14; c += 3) {
        const sl = c * 0.34;
        const y = R.outer(zE) + sl * Math.sin(R.pitch);
        const z = s * (zE - sl * Math.cos(R.pitch));
        add(V(-xV, y, z), V(xV, y, z), "roof", s > 0 ? "S" : "N", 0.3 + c / 30);
      }
    }
  }
  add(V(-xV, R.ridge + 0.04, 0), V(xV, R.ridge + 0.04, 0), "roof", null, 0.9);
  // chimney (outline on two sides)
  const { x, z, r } = CHIMNEY;
  const y0 = R.outer(z);
  for (const [dx, dz] of [[-r, 0], [r, 0], [0, -r], [0, r]]) add(V(x + dx, y0, z + dz), V(x + dx, R.chimneyTop - 0.06, z + dz), "chimney", null, 0.3);
  add(V(x - 0.17, R.chimneyTop - 0.04, z), V(x + 0.17, R.chimneyTop - 0.04, z), "chimney", null, 0.9);
  add(V(x, R.chimneyTop - 0.04, z - 0.17), V(x, R.chimneyTop - 0.04, z + 0.17), "chimney", null, 0.9);
  return segs;
}

/** fx_lines: one LINES primitive with _ORDER per vertex (drawing sequence). */
export function buildFxLines(node) {
  const mb = node.mb("line_ink", "fx_lines");
  const lite = Q().name === "lite";
  const segs = elevationSegments({ boardsEvery: lite ? 0 : 4, detail: !lite });
  for (const s of segs) {
    const [o0, o1] = ORDER[s.group];
    // walls and cladding draw from the ground up: order follows height
    let a = o0 + (o1 - o0) * s.t;
    let b = a;
    if (s.group === "walls" || s.group === "cladding") {
      const span = (o1 - o0) * 0.25;
      a = o0 + (o1 - o0 - span) * s.t + span * Math.min(1, Math.max(0, (Math.min(s.a.y, s.b.y) + 0.1) / 9));
      b = a + span * Math.min(1, Math.abs(s.b.y - s.a.y) / 9);
    } else {
      b = Math.min(o1, a + (o1 - o0) * 0.15);
    }
    mb.seg(s.a, s.b, INK, { _ORDER: [a, b] });
  }
  return segs.length;
}

/* --------------------------------------------------------------------------------------------- */
/* SVG: the garden elevation (seen from the south, orthographic)                                  */
/* --------------------------------------------------------------------------------------------- */

export function gardenElevationSVG() {
  const segs = elevationSegments({ boardsEvery: 4, detail: true }).filter((s) =>
    s.group === "roof" ? Math.min(s.a.z, s.b.z) >= -0.01 : s.face === "S" || s.face === null,
  );
  const S = 56; // px per metre
  const x0 = -8.6;
  const yTop = 10.2;
  const W = Math.round(17.2 * S);
  const H = Math.round((yTop + 0.8) * S);
  const X = (x) => +((x - x0) * S).toFixed(1);
  const Y = (y) => +((yTop - y) * S).toFixed(1);
  const groups = { ground: [], walls: [], openings: [], cladding: [], roof: [], chimney: [], garden: [] };
  for (const s of segs) {
    if (s.group === "footprint") continue;
    groups[s.group].push(`M${X(s.a.x)} ${Y(s.a.y)}L${X(s.b.x)} ${Y(s.b.y)}`);
  }
  // ground line (wider than the house) and the deck edge
  groups.ground.push(`M${X(-8.5)} ${Y(LV.terrain)}L${X(8.5)} ${Y(LV.terrain)}`);
  groups.garden.push(`M${X(-HX)} ${Y(LV.deck)}L${X(HX)} ${Y(LV.deck)}`);
  // pergola: posts and the front beam
  const P = PERGOLA;
  for (const px of P.posts) groups.garden.push(`M${X(px - 0.05)} ${Y(LV.deck)}L${X(px - 0.05)} ${Y(P.beamBottom)}M${X(px + 0.05)} ${Y(LV.deck)}L${X(px + 0.05)} ${Y(P.beamBottom)}`);
  groups.garden.push(`M${X(P.x0 - 0.05)} ${Y(P.beamBottom)}L${X(P.x1 + 0.05)} ${Y(P.beamBottom)}L${X(P.x1 + 0.05)} ${Y(P.beamTop)}L${X(P.x0 - 0.05)} ${Y(P.beamTop)}Z`);
  // glass railings (top line) in the loggias
  for (const [a, b] of [[R2.xCol, R2.x1], [R1.x0, R1.xCol]]) groups.garden.push(`M${X(a)} ${Y(LV.railTop)}L${X(b)} ${Y(LV.railTop)}`);
  const order = { ground: 0, walls: 0.15, openings: 0.4, cladding: 0.6, roof: 0.82, chimney: 0.95, garden: 0.9 };
  const width = { ground: 1.4, walls: 1.3, openings: 1, cladding: 0.5, roof: 1, chimney: 1, garden: 0.8 };
  const paths = Object.entries(groups)
    .filter(([, d]) => d.length)
    .map(([k, d]) => `<path data-order="${order[k]}" data-group="${k}" stroke-width="${width[k]}" d="${d.join("")}"/>`)
    .join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Fasadetegning fra vår 3D-modell av husmodellen Adria, hagesiden.">
  <title>Fasadetegning fra vår 3D-modell av husmodellen Adria, hagesiden</title>
  ${paths}
</svg>
`;
}
