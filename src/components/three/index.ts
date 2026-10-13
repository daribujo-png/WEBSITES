/**
 * 3D components (THREE agent). Client components; every canvas is a lazy
 * chunk (next/dynamic, ssr: false) that loads only when needed, and each one
 * has a static render fallback that is also the server-rendered HTML.
 *
 *   <HeroHouse className?>   hero stage: poster (LCP) + live canvas on desktop
 *   <BuildSequence />        the whole "Slik bygger vi" section (id="slik-bygger-vi")
 *   <PermitDiagram type>     one permit diagram (pabygg | frittliggende | tilbygg | kjeller | garasje)
 */
export { HeroHouse } from "./HeroHouse";
export { BuildSequence } from "./BuildSequence";
export { PermitDiagram } from "./PermitDiagram";
