"use client";

/**
 * "Slik bygger vi" (id="slik-bygger-vi"): the whole section.
 *
 * - Motion allowed + WebGL: a dark sticky stage; scrolling builds the
 *   reference house layer by layer in real Norwegian build order (BuildStage).
 * - prefers-reduced-motion, no WebGL, no JavaScript: a stepped gallery of
 *   renders with the same copy (BuildGallery).
 *
 * The server HTML contains both; CSS shows the right one before hydration
 * (stage only with JS and without reduced motion), so the layout never
 * changes when React takes over. After hydration the unused one is dropped.
 */
import { useCallback, useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import { buildSequenceCopy, referenceHouse } from "@/content";
import { RevealText } from "@/components/ui";
import { useReducedMotion } from "@/lib/hooks";
import { gsapIfLoaded } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { BuildGallery } from "./BuildGallery";
import { BuildStage } from "./BuildStage";

const noop = () => () => {};
function useHydrated() {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

export function BuildSequence() {
  const hydrated = useHydrated();
  const reduced = useReducedMotion();
  // WebGL is probed only when the stage comes near (creating a context during
  // hydration costs main-thread time on phones). No WebGL → gallery.
  const [noWebGL, setNoWebGL] = useState(false);
  const onNoWebGL = useCallback(() => setNoWebGL(true), []);

  // Before hydration CSS decides; afterwards the client knows.
  const stage = !noWebGL && (!hydrated || !reduced);
  const gallery = noWebGL || !hydrated || reduced;
  const cssGate = !hydrated;

  useEffect(() => {
    // Rare: the stage gave way to the gallery, so positions below changed.
    if (noWebGL) gsapIfLoaded()?.ScrollTrigger.refresh(true); // safe: waits for a running scroll to end
  }, [noWebGL]);

  return (
    <section
      id={buildSequenceCopy.id}
      data-tone="night"
      data-header="dark"
      aria-labelledby="slik-bygger-vi-title"
      className="relative"
    >
      <div className="container-page pt-section pb-12 lg:pb-20">
        <div className="grid-page items-end gap-y-6">
          <RevealText
            as="h2"
            id="slik-bygger-vi-title"
            text={buildSequenceCopy.title}
            className="t-display-l col-span-full lg:col-span-7"
          />
          <div
            data-reveal="up"
            style={{ "--reveal-delay": "160ms" } as CSSProperties}
            className="col-span-full md:col-span-6 lg:col-span-4 lg:col-start-9 lg:pb-3"
          >
            <p className="t-lead max-w-measure text-fg">
              {noWebGL || (hydrated && reduced) ? (
                buildSequenceCopy.reducedLede
              ) : hydrated ? (
                buildSequenceCopy.lede
              ) : (
                <>
                  <span className="hidden js:motion-safe:inline">{buildSequenceCopy.lede}</span>
                  <span className="js:motion-safe:hidden">{buildSequenceCopy.reducedLede}</span>
                </>
              )}
            </p>
            <p className="t-caption mt-6 max-w-measure border-t border-line pt-4 text-fg-muted">
              <span className="text-fg">{referenceHouse.title}.</span> {referenceHouse.credit}. {referenceHouse.note}
            </p>
          </div>
        </div>
      </div>
      {stage ? (
        <div className={cn(cssGate && "hidden js:motion-safe:block")}>
          <BuildStage onNoWebGL={onNoWebGL} />
        </div>
      ) : null}
      {gallery ? (
        <div className={cn(cssGate && "js:motion-safe:hidden")}>
          <BuildGallery note={noWebGL ? buildSequenceCopy.webglFallback : null} />
        </div>
      ) : null}
    </section>
  );
}
