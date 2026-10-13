#!/usr/bin/env node
/**
 * Builds public/models/permits.glb: five small diagrams for the building
 * types Bygg RV applies for. Existing house in paper grey, the new part in
 * oak, ground as a model base. Root nodes: permit_pabygg, permit_frittliggende,
 * permit_tilbygg, permit_kjeller, permit_garasje (each centred at the origin).
 * Run: npm run model:build
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SceneNode, V } from "./lib/builder.mjs";
import { writeGLB } from "./lib/gltf.mjs";
import { PERMIT_CAMERAS } from "./lib/cameras.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "public/models");

const MATERIALS = {
  permit_existing: { color: "#d2ccc1", roughness: 0.9 },
  permit_existing_roof: { color: "#a9a398", roughness: 0.85 },
  permit_window: { color: "#5d625f", roughness: 0.4 },
  permit_new: { color: "#b08b5e", roughness: 0.7 },
  permit_new_roof: { color: "#8c6c46", roughness: 0.65 },
  permit_accent: { color: "#c9a86a", roughness: 0.35, metallic: 0.6 },
  permit_ground: { color: "#c4bcae", roughness: 1 },
  permit_ground_section: { color: "#b7ad9c", roughness: 1 },
  permit_opening: { color: "#2b2a27", roughness: 0.8 },
};

const PITCH = Math.tan((38 * Math.PI) / 180);

/** Gabled volume: length along x, width along z, base at y0. */
function gabled(node, mat, roofMat, { x0, x1, z0, z1, y0, eave, part, overhang = 0.25 }) {
  const mb = node.mb(mat, part);
  mb.aabb(V(x0, y0, z0), V(x1, eave, z1), null);
  const zc = (z0 + z1) / 2;
  const hw = (z1 - z0) / 2;
  const ridge = eave + hw * PITCH;
  // gable triangles (part of the walls)
  for (const x of [x0, x1]) {
    mb.face([V(x, eave, z0), V(x, eave, z1), V(x, ridge, zc)], V((x0 + x1) / 2, eave, zc), null);
  }
  // roof slabs
  const rb = node.mb(roofMat, `${part}_tak`);
  const t = 0.18;
  for (const s of [-1, 1]) {
    const ze = zc + s * (hw + overhang);
    const ye = eave - overhang * PITCH;
    const c = [
      V(x0 - overhang, ridge, zc),
      V(x1 + overhang, ridge, zc),
      V(x1 + overhang, ye, ze),
      V(x0 - overhang, ye, ze),
    ];
    rb.hexa([...c.map((p) => V(p.x, p.y - t, p.z)), ...c], null);
  }
  return ridge;
}

function windows(node, part, { x0, x1, z, y0, y1, count, w = 0.9, dir = 1 }) {
  const mb = node.mb("permit_window", part);
  const step = (x1 - x0) / count;
  for (let i = 0; i < count; i++) {
    const cx = x0 + step * (i + 0.5);
    mb.aabb(V(cx - w / 2, y0, z + (dir > 0 ? 0 : -0.04)), V(cx + w / 2, y1, z + (dir > 0 ? 0.04 : 0)), null);
  }
}

function base(node, { x0 = -8, x1 = 8, z0 = -7, z1 = 7, y0 = -0.35, y1 = 0 } = {}) {
  node.mb("permit_ground", "grunn").aabb(V(x0, y0, z0), V(x1, y1, z1), null);
}

function existingHouse(node, { storeys = 2, x0 = -4.5, x1 = 4.5, z0 = -3.5, z1 = 3.5, y0 = 0, part = "eksisterende" } = {}) {
  const eave = y0 + (storeys === 2 ? 5.4 : 2.9);
  const ridge = gabled(node, "permit_existing", "permit_existing_roof", { x0, x1, z0, z1, y0, eave, part });
  windows(node, `${part}_vinduer`, { x0, x1, z: z1, y0: y0 + 0.9, y1: y0 + 2.2, count: 3 });
  if (storeys === 2) windows(node, `${part}_vinduer`, { x0, x1, z: z1, y0: y0 + 3.6, y1: y0 + 4.7, count: 3, w: 0.8 });
  return { eave, ridge };
}

async function main() {
  const roots = [];

  // Påbygg: one-storey house + new storey and roof on top
  {
    const n = new SceneNode("permit_pabygg", { permit: "pabygg", label: "Påbygg" });
    base(n);
    const part = "eksisterende";
    n.mb("permit_existing", part).aabb(V(-4.5, 0, -3.5), V(4.5, 2.9, 3.5), null);
    windows(n, `${part}_vinduer`, { x0: -4.5, x1: 4.5, z: 3.5, y0: 0.9, y1: 2.2, count: 3 });
    n.mb("permit_accent", "ny_skjot").aabb(V(-4.52, 2.9, -3.52), V(4.52, 2.96, 3.52), null);
    gabled(n, "permit_new", "permit_new_roof", { x0: -4.5, x1: 4.5, z0: -3.5, z1: 3.5, y0: 2.96, eave: 5.6, part: "ny" });
    windows(n, "ny_vinduer", { x0: -4.5, x1: 4.5, z: 3.5, y0: 3.7, y1: 4.8, count: 3, w: 0.8 });
    roots.push(n);
  }
  // Frittliggende bygning: house + detached annex
  {
    const n = new SceneNode("permit_frittliggende", { permit: "frittliggende", label: "Frittliggende bygning" });
    base(n, { x0: -9, x1: 9 });
    existingHouse(n, { x0: -7, x1: 1.5, z0: -3.5, z1: 3.5 });
    gabled(n, "permit_new", "permit_new_roof", { x0: 3.6, x1: 7.4, z0: -1.4, z1: 3.0, y0: 0, eave: 2.6, part: "ny" });
    n.mb("permit_opening", "ny_apning").aabb(V(4.6, 0, 3.0), V(6.4, 2.1, 3.04), null);
    roots.push(n);
  }
  // Tilbygg: house + single-storey extension with flat roof
  {
    const n = new SceneNode("permit_tilbygg", { permit: "tilbygg", label: "Tilbygg" });
    base(n, { x0: -9, x1: 9 });
    existingHouse(n, { x0: -6.5, x1: 2.0, z0: -3.5, z1: 3.5 });
    const mb = n.mb("permit_new", "ny");
    mb.aabb(V(2.0, 0, -2.6), V(6.6, 3.0, 3.4), null);
    n.mb("permit_new_roof", "ny_tak").aabb(V(1.9, 3.0, -2.75), V(6.8, 3.22, 3.6), null);
    n.mb("permit_window", "ny_vinduer").aabb(V(2.8, 0.2, 3.4), V(6.0, 2.5, 3.44), null);
    n.mb("permit_accent", "ny_skjot").aabb(V(1.97, 0, -2.62), V(2.03, 3.0, 3.42), null);
    roots.push(n);
  }
  // Kjeller/Underbygg: ground in section, new basement under the house
  {
    const n = new SceneNode("permit_kjeller", { permit: "kjeller", label: "Kjeller/Underbygg" });
    const g = n.mb("permit_ground", "grunn");
    const s = n.mb("permit_ground_section", "grunn_snitt");
    // ground block with the front cut away to show the basement
    g.aabb(V(-8, -3.4, -7), V(8, 0, -3.6), null); // back
    g.aabb(V(-8, -3.4, -3.6), V(-4.7, 0, 7), null); // left
    g.aabb(V(4.7, -3.4, -3.6), V(8, 0, 7), null); // right
    g.aabb(V(-4.7, -3.4, -3.6), V(4.7, -2.95, 7), null); // floor under basement
    s.aabb(V(-4.7, -3.4, 6.6), V(4.7, -2.95, 7), null); // section edge of the ground in front
    existingHouse(n, { x0: -4.5, x1: 4.5, z0: -3.5, z1: 3.5, y0: 0 });
    n.mb("permit_new", "ny").aabb(V(-4.5, -2.95, -3.5), V(4.5, -0.02, 3.5), null);
    n.mb("permit_window", "ny_vinduer").aabb(V(-1.2, -2.2, 3.5), V(1.2, -1.0, 3.54), null);
    n.mb("permit_accent", "ny_skjot").aabb(V(-4.52, -0.06, -3.52), V(4.52, 0.0, 3.52), null);
    roots.push(n);
  }
  // Underbygget garasje: sloping site, garage under the front of the house
  {
    const n = new SceneNode("permit_garasje", { permit: "garasje", label: "Underbygget garasje" });
    const g = n.mb("permit_ground", "grunn");
    g.aabb(V(-8, -3.0, -7), V(8, 0, -1.2), null); // upper plateau (behind)
    g.aabb(V(-8, -3.0, -1.2), V(-3.6, 0, 3.6), null);
    g.aabb(V(3.6, -3.0, -1.2), V(8, 0, 3.6), null);
    g.aabb(V(-8, -3.0, 3.6), V(8, -2.6, 8), null); // lower level (driveway)
    existingHouse(n, { x0: -4.5, x1: 4.5, z0: -3.5, z1: 3.6, y0: 0 });
    n.mb("permit_new", "ny").aabb(V(-3.6, -2.6, -1.2), V(3.6, 0, 3.6), null);
    n.mb("permit_opening", "ny_port").aabb(V(-2.4, -2.6, 3.6), V(2.4, -0.5, 3.66), null);
    n.mb("permit_accent", "ny_skjot").aabb(V(-3.62, -0.05, -1.22), V(3.62, 0.0, 3.62), null);
    roots.push(n);
  }

  await fs.mkdir(OUT, { recursive: true });
  const stats = await writeGLB(roots, MATERIALS, path.join(OUT, "permits.glb"), { sceneName: "Permits" });
  const meta = {
    generator: "scripts/model/build-permits.mjs",
    units: "m",
    nodes: roots.map((r) => r.name),
    materials: { existing: "permit_existing*", new: "permit_new*", accent: "permit_accent", ground: "permit_ground*" },
    lighting: "paper (see house.meta.json lighting.paper)",
    cameras: PERMIT_CAMERAS,
    stats,
  };
  await fs.writeFile(path.join(OUT, "permits.meta.json"), JSON.stringify(meta, null, 2) + "\n");
  console.log(`permits.glb ${(stats.bytes / 1024).toFixed(1)} KB · meshes ${stats.meshes}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
