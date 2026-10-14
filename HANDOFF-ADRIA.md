# Overlevering: byggrv.no med Adria-hero (til en ny Claude-økt)

**Repo:** `daribujo-png/WEBSITES`, branch **`claude/byggrv-redesign-e1scwk`**
**Live (Vercel, siste deploy fra brukeren):** https://byggrv-o0fdax0s0-bujooo-bygg.vercel.app
**Forhåndsvisning (claude.ai, privat):** https://claude.ai/artifact/8f8y3iBejfYwfi14aEDcVa
**Tidligere overlevering (beslutninger, design, deploy):** `HANDOFF.md`, `DESIGN.md`, `README.md`, `docs/byggrv-prompt.md`

## Slik fortsetter du (lim inn i en ny Claude Code-økt på denne branchen)

> Les `HANDOFF-ADRIA.md`, `HANDOFF.md`, `DESIGN.md`, `docs/byggrv-prompt.md` og `git log -15`. Kjør så den lagrede workflowen `byggrv-adria-hero` (i `.claude/workflows/byggrv-adria-hero.js`). Hvis workflows ikke er tilgjengelig, gjør de samme stegene selv: designretning → 3D-modell av Adria → hero → forside → QA → kritikk → polering. Følg alle kundens instrukser under, ordrett. Commit og push til `claude/byggrv-redesign-e1scwk` underveis.
>
> Kjør `npm install` først. For 4K-bildene, kjør `python3 scripts/upscale/upscale-4k.py` (oppsett står øverst i filen). Ellers kan du bruke 1920-bildene i `content-import/adria/orig/`.

## Kundens instrukser (ordrett, i rekkefølge)

1. «det jeg vil er at du lager designet i hero seksjonen om hvordan huset bygges og det må være en mye bedre nettside referansene må være i et kult oppsett på homepagen og ikke ha sprenging osv markedsført på siden øverst bare ha d i tjenester.. først og fremst må d være markedsført d beste av d beste og d e nybygg og tilbygg og påbygg og tak prosjekter osv og siden må se "alive" ut det må være helt sykt. bruk skillsene og alt og evt finn nye skills til hvordan du bygger premium nettsider med det jeg ønsker. det må ikke se A.I ut»
2. Valg av hero: **«Begge deler»**.
   - Ved åpning bygger huset seg selv som en kort timelapse (6–8 s).
   - Deretter scroller man gjennom byggetrinnene inne i en låst hero.
   - Den gamle «Slik bygger vi»-seksjonen slås sammen med hero-en.
3. «bruk dette huset for å bygge en helt insane hero seksjon samt legge med tak og uten tak og ta og bruk det etter det realistiske bilde og se tegningene under !!! lag noe sykt basert på tidligere instrukser og.»
4. «men bygg huset i bildet med hagen og alt! samtidig som du bruker det realistiske bildet»
5. «det må se helt insane ut, det må knuse hele nettside markedet av hvordan sider blir lagd»
6. Kunden sendte de originale bildene og ba om dem i 4K JPG/PNG. De ligger i `content-import/adria/orig/` (1920×1080) og `content-import/adria/4k/` (3840×2160, AI-oppskalert med EDSR).
7. «her er nettsiden for hvor de var: https://boligpartner.no/ferdighus/moderne/adria»
8. «finn mye du kan bruke herfra for modeller osv for og legge innpå på bygg rv siden for alt som har med hus de bygger og prøv å vis frem osv.. jeg sa det må være den sykeste siden i norge for bygg anlegg nisjen i hele norge»

## Materiale i repoet

| Fil | Hva |
|---|---|
| `content-import/adria/orig/adria-saltak-hage.jpg` | Saltak, hagesiden (1920×1080) |
| `content-import/adria/orig/adria-flatt-tak-hage.jpg` | Flatt tak, **samme kameravinkel** som saltak-bildet |
| `content-import/adria/orig/adria-pulttak-innkjorsel.jpg` | Pulttak, inngangs- og innkjørselssiden, med carport |
| `content-import/adria/orig/adria-flatt-tak-naer.jpg` | Flatt tak, hagesiden, nærmere vinkel |
| `content-import/adria/4k/*` | Samme bilder i 3840×2160 (når oppskaleringen er ferdig) |
| `content-import/adria/tegninger/*` | Fasadetegninger: langside, gavl (pulttak a/b) og inngang |
| `.claude/workflows/byggrv-adria-hero.js` | Den komplette workflowen med hele briefen |
| `scripts/perf-harness/` | Måleverktøy for 3D-ytelse, med baseline-tall fra commit `eb24e0b` |
| `scripts/upscale/upscale-4k.py` | 4K-oppskalering |

## Fakta om husmodellen (kilde: boligpartner.no)

- Adria fra Boligpartner, ca. 159 m² BRA-i, 4 soverom og 2 bad.
- Energimerking B, flat tomt.
- Tegnet med tre taktyper: flatt tak, pulttak og saltak. Passer godt på smale tomter.
- Ikke bruk Boligpartners markedsføringspåstander (som «VG testvinner») eller priser.

## Beslutninger som ligger fast

- **Stil:** «Lys papir», nordisk luksus. Tokens står i `DESIGN.md`.
- **Ikke AI-preg:**
  - Ingen 01/02/03-nummerering, som kunden hater.
  - Ingen merkelapp over hver overskrift og ingen mono-versaler.
  - Ingen gradienter eller emoji.
  - Ingen oppdiktede tall eller sitater.
- **Posisjonering:**
  - Nybygg, tilbygg, påbygg og tak markedsføres først.
  - Sprenging, grunnarbeid, VVS, maling og lignende bare under Tjenester.
- **Taktyper i hero-en:** «Saltak / Flatt tak / Pulttak», med 3D-overganger. Det ekte bildet tones inn i takt der kameraet matcher bildet; saltak- og flatt tak-bildet deler kamera.
- **Husmodeller:** en datadrevet seksjon og egne sider: `src/content/house-models.ts`, `/husmodeller/` og `/husmodeller/[slug]/`. Adria er første modell. Flere modeller fra boligpartner.no legges til når nettverket slipper til `boligpartner.no` og deres bilde-CDN. Ikke dikt opp modeller.
- **Ytelse:**
  - Én felles WebGL-kontekst.
  - Full eller lett GLB etter hvor sterk enheten er.
  - Statiske skygger og tidlig, korrekt oppvarming av shadere.
  - Første visning (LCP) er et stillbilde, under 2,5 s.

## Mangler / må bekreftes av Bygg RV

- [ ] **Skriftlig avtale med Boligpartner** om å vise husmodellen Adria, bildene og fakta på byggrv.no, og eventuelt flere modeller. Krediter som «Husmodell Adria fra Boligpartner».
- [ ] Org.nr, stiftelsesår, sentralgodkjenning, mesterbrev, garantivilkår og lenker til sosiale medier (se README).
- [ ] Skjematjeneste: sett `NEXT_PUBLIC_FORM_ENDPOINT` i Vercel.
- [ ] For å hente flere husmodeller: tillat `boligpartner.no`, `www.boligpartner.no` og bilde-CDN-en deres i Network access. Kjør deretter en ny økt som henter modellene.
