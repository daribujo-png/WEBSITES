/**
 * Image inventory for public/images/byggrv/ (imported from byggrv.no).
 *
 * Every one of the 58 imported files is listed exactly once, either in
 * `photos` (optimised and published in src/content/photos.ts) or in
 * `excluded` (kept out of the site, with the reason).
 *
 * origin:
 *   own                  The client's own work (worksite photos, before/after).
 *   stock-suspect        Looks like a stock photo or stock vector (needs licence check).
 *   third-party-suspect  Another company's photo, render or diagram (needs permission).
 *   illustration         Vector clipart / decorative illustration.
 *   logo                 The client's logo files.
 *
 * Alt text: Norwegian, describes what is visible. No claims beyond the image.
 */

/** @typedef {"own" | "stock-suspect" | "third-party-suspect" | "illustration" | "logo"} Origin */

/**
 * Published photos (origin "own"). Order = order in the generated manifest.
 * @type {{ key: string; file: string; origin: Origin; alt: string; caption: string; note?: string }[]}
 */
export const photos = [
  {
    key: "tilbygg-for",
    file: "for.png",
    origin: "own",
    alt: "Før: Bindingsverket til et tilbygg reises langs fasaden på et grått bolighus, med stillas og trelast på bakken.",
    caption: "Tilbygg under arbeid: bindingsverket er reist.",
  },
  {
    key: "tilbygg-etter",
    file: "etter.png",
    origin: "own",
    alt: "Etter: Det samme tilbygget ferdig, med lys trekledning, terrasse på taket og ny belegningsstein foran.",
    caption: "Det ferdige tilbygget med terrasse på taket.",
  },
  {
    key: "gang-for",
    file: "gang-for.png",
    origin: "own",
    alt: "Før: En gang under ombygging, med nye vegger i bindingsverk, åpne kabelføringer i taket og en kappsag på gulvet.",
    caption: "Gangen under ombygging, med nye vegger i bindingsverk.",
  },
  {
    key: "gang-etter",
    file: "gang-etter.png",
    origin: "own",
    alt: "Etter: Den samme gangen ferdig, med lyse vegger, lyst tregulv, fliser ved inngangen, hvite fyllingsdører og spotlys i taket.",
    caption: "Den ferdige gangen.",
  },
  {
    key: "firemannsbolig",
    file: "firemannsbolig-1030x772-1.jpg",
    origin: "own",
    alt: "Firemannsbolig med lys, liggende trekledning, mørke felt mellom vinduene og balkong, med byggeplass i forgrunnen.",
    caption: "Firemannsbolig, fra et tidligere prosjekt.",
    note: "Vist under «Tidligere prosjekter» på byggrv.no/tjenester/rehabilitering-og-renovering/.",
  },
  {
    key: "nytt-tak",
    file: "div5-1030x579-1.jpg",
    origin: "own",
    alt: "Nytt, mørkt tak med snøfanger på et hus med lys trekledning, med snødekte fjell i bakgrunnen.",
    caption: "Nytt tak, fra et tidligere prosjekt.",
    note: "Vist under «Tidligere prosjekter» på rehabilitering-siden og på takarbeid-siden.",
  },
  {
    key: "minigraver-skifer",
    file: "skifer-773x1030-1.jpg",
    origin: "own",
    alt: "Minigraver med arbeidslysene på, på en hellelagt plass av skifer ved trappen til et hvitt hus.",
    caption: "Gravearbeid ved inngangen til et hus, fra et tidligere prosjekt.",
    note: "Vist under «Tidligere prosjekter» på byggrv.no/tjenester/rehabilitering-og-renovering/.",
  },
  {
    key: "arbeid-over-bergen",
    file: "Uten-navn_2023-02-22-171206_neuf.jpeg",
    origin: "own",
    alt: "Kappsag på arbeidsbukk på et flatt tak høyt over Bergen, med byen og fjorden i bakgrunnen.",
    caption: "Arbeidsplass med utsikt over Bergen.",
    note: "Lå bare i mediebiblioteket. Ser ut som et eget arbeidsbilde, men bør bekreftes av kunden.",
  },
  {
    key: "arbeid-over-bergen-bred",
    file: "1380.jpg",
    origin: "own",
    alt: "Kappsag på arbeidsbukk på et flatt tak høyt over Bergen, med byen og fjorden i bakgrunnen.",
    caption: "Arbeidsplass med utsikt over Bergen.",
    note: "Bredt utsnitt av samme bilde som arbeid-over-bergen. Bør bekreftes av kunden.",
  },
];

/**
 * Logo files. Only the outlined variant (no <text>, no old phone number) is
 * published, as cleaned SVGs in opt/logo/ and as path data in src/content/brand.ts.
 */
export const logo = {
  file: "logo-byggrenovering-vest.svg",
  origin: /** @type {Origin} */ ("logo"),
  alt: "Bygg & Renovering Vest AS",
};

/**
 * Files kept out of the site.
 * @type {{ file: string; origin: Origin; reason: string }[]}
 */
export const excluded = [
  // Stock photos and stock vectors (licence unknown)
  { file: "62b2d48964600ec540889872_shutterstock_1670345596.jpg", origin: "stock-suspect", reason: "Shutterstock-bilde (filnavn). Trenger lisens, og viser ikke kundens arbeid." },
  { file: "Flislegging.jpg", origin: "stock-suspect", reason: "Typisk stockbilde av flislegging. Ukjent opphav, viser ikke kundens arbeid." },
  { file: "Ror-1024x683-1.jpg", origin: "stock-suspect", reason: "Generisk nærbilde av en fordeler for vannbåren varme. Ukjent opphav; bruk bare hvis kunden bekrefter at det er eget." },
  { file: "sl_013020_27540_36.jpg", origin: "stock-suspect", reason: "Stockvektor-bakgrunn med «design / lorem ipsum»." },
  { file: "sl_013020_27540_36-scaled.jpg", origin: "stock-suspect", reason: "Skalert kopi av stockvektor-bakgrunnen." },

  // Other companies' photos, renders and diagrams
  { file: "baderom-medium-img.jpg", origin: "third-party-suspect", reason: "Meglerstilt bad fra en annen nettside (filnavn «medium-img»). Ukjent opphav." },
  { file: "9993d08e-c44c-4946-92ec-f7ccfd9d7319.jpeg", origin: "third-party-suspect", reason: "Pressebilde av taktekkere i Bergen. Trenger tillatelse fra fotografen." },
  { file: "9993d08e-c44c-4946-92ec-f7ccfd9d7319-1.jpeg", origin: "third-party-suspect", reason: "Duplikat av pressebildet av taktekkere." },
  { file: "9993d08e-c44c-4946-92ec-f7ccfd9d7319-2.jpeg", origin: "third-party-suspect", reason: "Duplikat av pressebildet av taktekkere." },
  { file: "301-havsule-1320x694-1.jpg", origin: "third-party-suspect", reason: "Markedsføringsgjengivelse av sjøhus fra en husleverandør." },
  { file: "rorbu21_web-fullskjerm-desktop.jpg", origin: "third-party-suspect", reason: "Markedsføringsgjengivelse av en rorbu fra en husleverandør." },
  { file: "Strengereid_kveld_DSCF8204.jpg", origin: "third-party-suspect", reason: "Profesjonelt arkitekturfoto fra en annen aktør." },
  { file: "Lys_Oppdal_murstein_REN_funkishus_fasade_MID7860-1-1024x576-1.jpeg", origin: "third-party-suspect", reason: "Markedsføringsbilde fra en teglprodusent." },
  { file: "moderne-malt-hus.jpg", origin: "third-party-suspect", reason: "Samme hus som «Moderne hus med dobbelfals rett og fasadeplater», som ser ut som et referansebilde fra en leverandør av tak- og fasadeplater." },
  { file: "Moderne-hus-med-dobbelfals-rett-og-fasadeplater.jpg", origin: "third-party-suspect", reason: "Filnavnet ser ut som en bildetekst fra en leverandør av tak- og fasadeplater." },
  { file: "OveSkarAS_redigert-2.jpg", origin: "third-party-suspect", reason: "Bilde fra et annet firma (Ove Skar AS)." },
  { file: "Statsbyggintern-7.jpg", origin: "third-party-suspect", reason: "Bilde fra Statsbygg." },
  { file: "15224588956_dfe37221cb_o.jpg", origin: "third-party-suspect", reason: "Flickr-bilde fra en byggeplass med Veidekke-merking." },
  { file: "vindu.jpg", origin: "third-party-suspect", reason: "Monteringsillustrasjon med logoen til vindusprodusenten Natre." },
  { file: "TakInfo.jpg", origin: "third-party-suspect", reason: "Teknisk takillustrasjon med produktnavn fra en takleverandør." },
  { file: "TakInfo-1.jpg", origin: "third-party-suspect", reason: "Duplikat av takillustrasjonen." },
  { file: "4e09471aa9e38dc21a261e008fb3c2c7_Accessory-Dwelling-Unit-RPA-e1687896876497.jpeg", origin: "third-party-suspect", reason: "Amerikansk illustrasjon av boenheter («Illustrations by RPA, based on AARP»)." },
  { file: "Skjermbilde-2024-02-19-kl.-15.57.11.png", origin: "third-party-suspect", reason: "Skjermbilde av en amerikansk ADU-illustrasjon med engelsk tekst." },
  { file: "adu.png", origin: "third-party-suspect", reason: "Omfarget utgave av den amerikanske ADU-illustrasjonen. Erstattes av egne 3D-diagrammer." },
  { file: "mod.png", origin: "third-party-suspect", reason: "Omfarget utgave av den amerikanske ADU-illustrasjonen (byggetyper). Erstattes av egne 3D-diagrammer." },

  // Vector clipart and decorative illustrations
  { file: "isometric-professional-carpenters-drilling-wood-construction-building-industry-new-home-construction-interior-lumber-timber-materials-vector-illustration_589019-2627.jpg", origin: "illustration", reason: "Isometrisk stockvektor (Freepik-lignende filnavn). Passer ikke uttrykket og trenger lisens." },
  { file: "isometric-repairs-composition-with-view-living-room-with-character-repairman-installing-isolating-blocks-into-wall-vector-illustration_1284-66827.jpg", origin: "illustration", reason: "Isometrisk stockvektor (Freepik-lignende filnavn). Passer ikke uttrykket og trenger lisens." },
  { file: "94459893-isometric-low-poly-home-room-renovation-icon-vector-illustration-laying-of-laminate-or-parquet-board.jpg", origin: "illustration", reason: "Isometrisk stockvektor. Passer ikke uttrykket og trenger lisens." },
  { file: "house-painter-isometric-design_1284-35880.jpg", origin: "illustration", reason: "Isometrisk stockvektor (Freepik-lignende filnavn). Passer ikke uttrykket og trenger lisens." },
  { file: "plumber-concept-with-career-work-symbols-isometric-vector-illustration_1284-81752.jpg", origin: "illustration", reason: "Isometrisk stockvektor (Freepik-lignende filnavn). Passer ikke uttrykket og trenger lisens." },
  { file: "beer.png", origin: "illustration", reason: "Flat vektorillustrasjon av Bryggen. Ukjent lisens, passer ikke uttrykket." },
  { file: "bergen.png", origin: "illustration", reason: "Flat vektorillustrasjon av Bryggen. Ukjent lisens, passer ikke uttrykket." },
  { file: "bryggen.jpg", origin: "illustration", reason: "Rosa vektorillustrasjon av Bryggen. Ukjent lisens, passer ikke uttrykket." },
  { file: "bryggen.png", origin: "illustration", reason: "Rosa vektorillustrasjon av Bryggen. Ukjent lisens, passer ikke uttrykket." },
  { file: "bryggen-1.png", origin: "illustration", reason: "Duplikat av bryggen.png." },
  { file: "slider-overlay-02-1024x457-1.png", origin: "illustration", reason: "Overlegg fra WordPress-temaet (Enfold). Ikke et bilde." },

  // Duplicates of published photos
  { file: "1380-2.jpg", origin: "own", reason: "Duplikat av 1380.jpg (samme utsnitt, lagret på nytt)." },

  // Logo variants that are not used
  { file: "logo-byggrenovering.svg", origin: "logo", reason: "Har det gamle telefonnummeret «Tlf. 922 23 222». Avhenger også av skrift (<text>)." },
  { file: "logo-byggrenovering3.svg", origin: "logo", reason: "Har det gamle telefonnummeret «Tlf. 922 23 222». Avhenger også av skrift (<text>)." },
  { file: "logo-transp.png", origin: "logo", reason: "Hvit PNG med det gamle telefonnummeret «Tlf. 922 23 222»." },
  { file: "logo-byggrenovering1.svg", origin: "logo", reason: "Tekstbasert variant (<text>), avhenger av skrift. Den konturerte varianten brukes i stedet." },
  { file: "logo-byggrenovering1-1.svg", origin: "logo", reason: "Tekstbasert variant (<text>), avhenger av skrift. Den konturerte varianten brukes i stedet." },
  { file: "logo-byggrenovering2.svg", origin: "logo", reason: "Tekstbasert variant (<text>), avhenger av skrift. Den konturerte varianten brukes i stedet." },
  { file: "logo-byggrenovering2-1.svg", origin: "logo", reason: "Tekstbasert variant (<text>), avhenger av skrift. Den konturerte varianten brukes i stedet." },
  { file: "logo-byggrenovering3-1.svg", origin: "logo", reason: "Tekstbasert variant (<text>), avhenger av skrift. Den konturerte varianten brukes i stedet." },
  { file: "logo-utkast.png", origin: "logo", reason: "Logoutkast med flere forslag. Ikke en ferdig logo." },
  { file: "iko.png", origin: "logo", reason: "Logomerket som PNG. Erstattet av vektorutgaven opt/logo/byggrv-mark.svg." },
  { file: "cropped-iko.png", origin: "logo", reason: "Favicon fra den gamle siden. Siden har eget ikon i src/app/icon.svg." },
];
