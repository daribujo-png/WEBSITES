/**
 * Every render the site uses: camera, model state, lighting, output sizes
 * and Norwegian alt text. Keys are referenced from src/content (services'
 * renderKey + "-a"/"-b", before/after pairs, permit diagrams, build steps).
 */
import { CAMERAS } from "../model/lib/cameras.mjs";

const cam = (position, target, fov = 30) => ({ position, target, fov });

/** Output presets: widths per format and render (supersampled) size. */
export const SIZES = {
  hero: { w: 2400, h: 1350, avif: [960, 1600, 2400], webp: [1280, 2400], ss: 1.25 },
  heroPortrait: { w: 1080, h: 1350, avif: [540, 1080], webp: [1080], ss: 1.5 },
  wide: { w: 1600, h: 900, avif: [640, 1024, 1600], webp: [1024], ss: 1.25 },
  card: { w: 1500, h: 1000, avif: [600, 1000, 1500], webp: [1000], ss: 1.25 },
  diagram: { w: 1200, h: 900, avif: [480, 900, 1200], webp: [900], ss: 1.5 },
  og: { w: 1200, h: 630, jpg: true, ss: 1.5 },
};

/** Section cut through the house that keeps the north half (looks into the rooms from the garden). */
const SECTION = [{ normal: [0, 0, -1], constant: 1.35, layers: null }];
/** Horizontal plan cut, 1. etasje. */
const PLAN1 = (y = 1.77) => [{ normal: [0, -1, 0], constant: y }];
const PLAN2 = (y = 4.75) => [{ normal: [0, -1, 0], constant: y }];
const houseLayers = [
  "tomt",
  "grunnarbeid",
  "fundament",
  "bindingsverk",
  "isolasjon",
  "tak",
  "vinduer",
  "kledning",
  "installasjoner",
  "interior",
  "nokkelferdig",
];
const allButSite = houseLayers.filter((l) => l !== "tomt" && l !== "grunnarbeid");

const DOLLHOUSE = {
  lighting: "paper",
  env: false,
  interior: 1,
  interiorScale: 2.5,
  clip: [
    { normal: [0.309, 0, -0.951], constant: -1.66 },
    { normal: [0, -1, 0], constant: 5.64 },
  ],
  camera: cam([2.75, 8.3, 2.7], [4.1, 3.9, -1.75], 22),
  extraLights: [{ position: [4.07, 5.3, -1.6], intensity: 3, distance: 4 }],
  hideNodes: ["nokkelferdig_beplantning", "nokkelferdig_heller"],
};

export function buildShots(content) {
  const S = CAMERAS.steps;
  const shots = [];
  const add = (key, size, alt, state) => shots.push({ key, size, alt, ...state });

  /* ---- hero ---- */
  add("hero-bluehour", "hero", content.heroAlt, {
    lighting: "bluehour",
    camera: CAMERAS.hero,
  });
  add("hero-bluehour-portrait", "heroPortrait", content.heroAlt, {
    lighting: "bluehour",
    camera: CAMERAS.heroMobile,
  });
  add("hero-day", "hero", "3D-gjengivelse av det arkitekttegnede trehuset i dagslys, med stående trekledning, mørkt metalltak og hage mellom to store lønnetrær.", {
    lighting: "day",
    camera: CAMERAS.hero,
  });
  add("og-image", "og", content.heroAlt, {
    lighting: "bluehour",
    camera: CAMERAS.og,
  });

  /* ---- build sequence ---- */
  add("poster-build", "wide", "3D-modell av huset under bygging: bindingsverket står på grunnmuren, mellom to store lønnetrær.", {
    lighting: "stage",
    step: "bindingsverk",
    camera: CAMERAS.stage,
  });
  for (const step of content.buildSteps) {
    const st = { lighting: "stage", step: step.id, camera: S[step.id] };
    if (step.id === "installasjoner") Object.assign(st, { xray: { keep: ["installasjoner"] }, bloom: [0.55, 0.45, 0.6] });
    if (step.id === "interior") Object.assign(st, { clip: SECTION, interior: 1, interiorScale: 4 });
    if (step.id === "nokkelferdig") Object.assign(st, { lighting: "bluehour" });
    add(`step-${step.id}`, "wide", step.renderAlt, st);
  }

  /* ---- services (two views each) ---- */
  const svc = (slug, a, b) => {
    add(`svc-${slug}-a`, "card", a.alt, a.state);
    add(`svc-${slug}-b`, "card", b.alt, b.state);
  };
  svc(
    "ny-bolig",
    {
      alt: "Det ferdige huset i dagslys, sett fra hagen mellom de to lønnetrærne.",
      state: { lighting: "day", camera: cam([3.5, 1.7, 21], [-0.4, 4.1, 0.6], 36) },
    },
    {
      alt: "Råbygg: grunnmur og bindingsverk reist på tomten, før tak og kledning.",
      state: { lighting: "day", step: "bindingsverk", camera: cam([-13.5, 4.6, 13.5], [0, 2.8, 0.5], 34) },
    },
  );
  svc(
    "oppussing-og-renovering",
    {
      alt: "Snitt gjennom første etasje med nytt kjøkken, tregulv og nye overflater.",
      state: { lighting: "paper", env: false, clip: PLAN1(), camera: cam([-8.5, 13, 9.5], [-1.4, 0.6, 0.4], 30), hideNodes: ["nokkelferdig_beplantning", "nokkelferdig_heller", "fundament_drenering"] },
    },
    {
      alt: "Kjøkken og spisestue mot hagen, med varmt lys innendørs og store vinduer.",
      state: { lighting: "bluehour", camera: cam([-3.7, 1.65, 10.8], [-2.3, 1.8, 3.5], 40) },
    },
  );
  svc(
    "pabygg-og-tilbygg",
    {
      alt: "Diagram: huset i lys grått med et nytt tilbygg på siden, markert i eik.",
      state: { lighting: "paper", env: false, clay: {}, extras: "tilbygg", camera: cam([-6, 9, 22], [1.5, 3.2, 1.0], 32), hideNodes: ["nokkelferdig_beplantning", "nokkelferdig_heller"] },
    },
    {
      alt: "Diagram: huset i lys grått med en ny etasje på toppen, markert i eik.",
      state: { lighting: "paper", env: false, clay: {}, extras: "pabygg", camera: cam([-17, 9, 17], [0, 5.2, 0.5], 32), hideNodes: ["nokkelferdig_beplantning", "nokkelferdig_heller"] },
    },
  );
  svc(
    "ombygging",
    {
      alt: "Plantegning av første etasje sett ovenfra, med kjøkken, stue, trapp og bad.",
      state: { lighting: "paper", env: false, clip: PLAN1(), camera: cam([0.3, 20, 3.0], [-0.2, 0, 0.7], 30), hideNodes: ["nokkelferdig_beplantning", "nokkelferdig_heller", "fundament_drenering", "nokkelferdig_terrasse"] },
    },
    {
      alt: "Innvendige vegger i bindingsverk under ombygging, sett inn i første etasje.",
      state: {
        lighting: "paper",
        env: false,
        step: "interior",
        hideLayers: ["kledning", "installasjoner"],
        hideNodes: ["interior_vegger", "interior_himling", "interior_kjokken", "interior_trapp", "interior_bad", "interior_wc", "interior_rekkverk"],
        clip: PLAN1(2.55),
        camera: cam([-9, 9.5, 9.5], [-0.5, 0.8, 0.2], 32),
      },
    },
  );
  svc(
    "rehabilitering-og-renovering",
    {
      alt: "Fasade der deler av kledningen er tatt av, så vindsperren under synes.",
      state: { lighting: "day", clip: [{ normal: [-1, 0, 0], constant: -0.6, layers: ["kledning"] }], camera: cam([-5.5, 2.6, 15.5], [0.6, 3.3, 1.2], 36) },
    },
    {
      alt: "Vegg åpnet lag for lag: kledning, lekter, vindsperre og trefiberisolasjon mellom stenderne.",
      state: {
        lighting: "day",
        clip: [
          { normal: [1, 0, 0], constant: 3.0, layers: ["kledning"], nodes: "kledning_(bord|lister|vindski)" },
          { normal: [1, 0, 0], constant: 3.5, layers: ["kledning"], nodes: "kledning_lekter" },
          { normal: [1, 0, 0], constant: 4.0, layers: ["isolasjon", "vinduer"], nodes: "vindsperre|vinduer_tetting" },
          { normal: [1, 0, 0], constant: 4.42, layers: ["isolasjon"], nodes: "trefiber" },
        ],
        camera: cam([-8.2, 2.2, 8.6], [-3.4, 1.8, 3.8], 34),
        hideLayers: ["interior", "nokkelferdig"],
      },
    },
  );
  svc(
    "takarbeid",
    {
      alt: "Takstoler på plass over andre etasje, før taket tekkes.",
      state: { lighting: "day", step: "tak", hideNodes: ["tak_undertak", "tak_tekking"], camera: cam([-14, 10, 13], [0, 6, 0.5], 32) },
    },
    {
      alt: "Nærbilde av mørkt, falset metalltak med snøfanger, mot mønet.",
      state: { lighting: "day", camera: cam([-7.4, 8.9, 6.2], [1.5, 7.3, 2.0], 34) },
    },
  );
  svc(
    "dorer-og-vinduer",
    {
      alt: "Store vinduer mot hagen, nærbilde av karm og lister.",
      state: { lighting: "day", camera: cam([-4.6, 1.75, 10.2], [-2.0, 1.85, 4.0], 38) },
    },
    {
      alt: "Vindusåpninger i bindingsverket før vinduene settes inn.",
      state: { lighting: "day", step: "bindingsverk", camera: cam([-5.2, 2.3, 11.5], [-2.0, 2.2, 4.0], 38) },
    },
  );
  svc(
    "oppussing-av-bad",
    {
      alt: "Badet sett ovenfra i snitt, med membran, sluk og fliser.",
      state: {
        lighting: "paper",
        env: false,
        clip: [
          ...PLAN2(),
          { normal: [-0.951, 0, -0.309], constant: 3.4, nodes: "interior_bad_flis_gulv" },
        ],
        camera: cam([3.3, 9.2, 1.1], [4.04, 3.45, -1.55], 34),
      },
    },
    {
      alt: "Ferdig bad med dusj, servant og varmt lys.",
      state: { ...DOLLHOUSE },
    },
  );
  svc(
    "vvs",
    {
      alt: "Røntgenvisning av huset med rør og avløp som lysende linjer.",
      state: { lighting: "stage", step: "installasjoner", xray: { keep: ["installasjoner"] }, hideNodes: ["installasjoner_el"], camera: cam([-12, 8, 14], [0.5, 3.2, -0.5], 32), bloom: [0.55, 0.45, 0.6] },
    },
    {
      alt: "Rørføringer i vegg og bjelkelag ved badet.",
      state: {
        lighting: "stage",
        step: "installasjoner",
        xray: { keep: ["installasjoner"] },
        hideNodes: ["installasjoner_el"],
        camera: cam([-6, 10, 12], [2.5, 3.0, -1.2], 30),
        bloom: [0.3, 0.4, 0.75],
      },
    },
  );
  svc(
    "maling",
    {
      alt: "Stående trekledning, ubehandlet.",
      state: { lighting: "day", claddingRaw: true, camera: cam([6.4, 1.9, 9.6], [3.6, 2.4, 3.2], 34) },
    },
    {
      alt: "Den samme fasaden ferdig behandlet.",
      state: { lighting: "day", camera: cam([6.4, 1.9, 9.6], [3.6, 2.4, 3.2], 34) },
    },
  );

  /* ---- before / after (illustrations) ---- */
  const baCam = cam([-11.5, 4.2, 15.5], [0, 3.6, 0.5], 34);
  add("ba-1-for", "card", "Illustrasjon: råbygg med bindingsverk på grunnmuren.", { lighting: "day", step: "bindingsverk", camera: baCam });
  add("ba-1-etter", "card", "Illustrasjon: det samme huset ferdig, med tak, vinduer og kledning.", { lighting: "day", camera: baCam });
  const ba2 = cam([12, 3.0, -3.5], [4.2, 3.4, 0.6], 38);
  add("ba-2-for", "card", "Illustrasjon: gavlvegg med ubehandlet trekledning.", { lighting: "day", claddingRaw: true, camera: ba2 });
  add("ba-2-etter", "card", "Illustrasjon: den samme gavlveggen ferdig behandlet.", { lighting: "day", camera: ba2 });
  add("ba-3-for", "card", "Illustrasjon: et slitt bad med gamle fliser og utstyr.", {
    ...DOLLHOUSE,
    materialColors: [
      { name: "tile_wall", color: "#cdbf98", roughness: 0.25 },
      { name: "tile_floor", color: "#8a7458", roughness: 0.5 },
      { name: "furniture_wood", color: "#9a8a6c" },
      { name: "sanitary", color: "#e6dcc3" },
    ],
    hideNodes: [...DOLLHOUSE.hideNodes, "interior_bad_glassvegg", "interior_bad_membran"],
  });
  add("ba-3-etter", "card", "Illustrasjon: det samme badet etter oppussing.", { ...DOLLHOUSE });

  /* ---- permits ---- */
  for (const p of content.permits) {
    const low = p.id === "kjeller" || p.id === "garasje";
    const c = low ? cam([-18.5, 8.5, 25.5], [0, 0.2, 0.8], 30) : cam([-20.5, 12.5, 24.5], [0, 1.6, 0.5], 30);
    add(`permit-${p.id}`, "diagram", p.diagramAlt, { lighting: "paper", permit: p.id, camera: c, shadowTarget: [0, 0, 0], shadowExtent: 12 });
  }

  void allButSite;
  return shots;
}
