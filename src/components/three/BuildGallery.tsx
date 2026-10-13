/**
 * "Slik bygger vi" as a stepped gallery of renders with the same copy as the
 * 3D stage. Used for reduced motion, without WebGL, and as the server-rendered
 * HTML (so the full story is in the page without JavaScript).
 */
import { buildSequenceCopy, buildSteps, tradeById } from "@/content";
import { getRender } from "@/content/renders";
import { Picture } from "@/components/ui";

export function BuildGallery({ note }: { note?: string | null }) {
  return (
    <div className="container-page pb-section">
      {note ? (
        <p role="status" className="t-small mb-10 max-w-prose border-l border-line-strong pl-4 text-fg-muted">
          {note}
        </p>
      ) : null}
      <ol aria-label={buildSequenceCopy.rail.label} className="border-t border-line">
        {buildSteps.map((step, i) => {
          const asset = getRender(`step-${step.id}`);
          const flip = i % 2 === 1;
          return (
            <li key={step.id} id={`bygg-${step.id}`} className="grid-page items-center gap-y-7 border-b border-line py-10 lg:py-16">
              {asset ? (
                <div
                  className={
                    flip
                      ? "relative col-span-full overflow-hidden bg-slate md:col-span-5 lg:col-span-7 lg:col-start-6 lg:row-start-1"
                      : "relative col-span-full overflow-hidden bg-slate md:col-span-5 lg:col-span-7"
                  }
                  style={{ aspectRatio: `${asset.width} / ${asset.height}` }}
                >
                  <Picture
                    asset={asset}
                    alt={step.renderAlt}
                    sizes="(min-width: 90rem) 48rem, (min-width: 64rem) 55vw, (min-width: 48rem) 60vw, calc(100vw - 2rem)"
                    fill
                  />
                </div>
              ) : null}
              <div
                className={
                  flip
                    ? "col-span-full md:col-span-3 lg:col-span-4 lg:col-start-1 lg:row-start-1"
                    : "col-span-full md:col-span-3 lg:col-span-4 lg:col-start-9"
                }
              >
                <h3 className="t-display-s">{step.title}</h3>
                <p className="t-body mt-4 max-w-prose text-fg-muted">{step.body}</p>
                <p className="t-small mt-5">
                  <span className="text-fg-muted">{buildSequenceCopy.tradesLabel}: </span>
                  {step.trades.map((id) => tradeById[id].name).join(", ")}
                </p>
                {step.hotspots.length ? (
                  <dl className="mt-6 space-y-3 border-t border-line pt-5">
                    {step.hotspots.map((h) => (
                      <div key={h.id}>
                        <dt className="t-small text-fg">{h.label}</dt>
                        <dd className="t-small text-fg-muted">{h.text}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
