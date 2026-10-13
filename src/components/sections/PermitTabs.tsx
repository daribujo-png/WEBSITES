"use client";

/**
 * The five building types we apply for, as an accessible tab set
 * (WAI-ARIA tabs, automatic activation, arrow keys / Home / End).
 * Only the selected panel mounts its <PermitDiagram>, so there is never more
 * than one 3D canvas in this section. All titles and texts stay in the DOM.
 */
import { useId, useRef, useState, type KeyboardEvent } from "react";
import type { PermitType } from "@/content/types";
import { PermitDiagram } from "@/components/three";
import { cn } from "@/lib/utils";

interface PermitTabsProps {
  types: readonly PermitType[];
  label: string;
  note: string;
  dragHint: string;
}

export function PermitTabs({ types, label, note, dragHint }: PermitTabsProps) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (index: number, focus = false) => {
    const next = (index + types.length) % types.length;
    setActive(next);
    if (focus) tabRefs.current[next]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys: Record<string, number> = {
      ArrowDown: index + 1,
      ArrowRight: index + 1,
      ArrowUp: index - 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: types.length - 1,
    };
    if (e.key in keys) {
      e.preventDefault();
      select(keys[e.key], true);
    }
  };

  const current = types[active];

  return (
    <div className="grid-page mt-16 gap-y-8 lg:mt-24 lg:grid-rows-[auto_1fr] lg:gap-y-10">
      <div
        role="tablist"
        aria-label={label}
        className="col-span-full flex flex-wrap gap-2 lg:col-span-4 lg:row-start-1 lg:flex-col lg:gap-0 lg:border-t lg:border-line"
      >
        {types.map((type, i) => {
          const selected = i === active;
          return (
            <button
              key={type.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              id={`${baseId}-tab-${type.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${type.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(i)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "group/tab relative flex min-h-11 items-center rounded-sm border px-4 text-left t-small transition-colors duration-(--dur-base) ease-weight",
                "lg:min-h-0 lg:rounded-none lg:border-0 lg:border-b lg:border-line lg:px-0 lg:py-4 lg:font-display lg:text-[clamp(1.625rem,1rem+0.85vw,2rem)] lg:leading-[1.1] lg:font-[350] lg:tracking-[-0.015em]",
                selected
                  ? "border-fg bg-fg text-tone lg:bg-transparent lg:text-fg"
                  : "border-line-strong text-fg hover:border-fg lg:text-fg-muted lg:hover:text-fg",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "hidden h-px shrink-0 bg-fg transition-[width,margin] duration-(--dur-slow) ease-expo lg:block",
                  selected ? "mr-4 w-10" : "mr-0 w-0 group-hover/tab:mr-3 group-hover/tab:w-4",
                )}
              />
              {type.title}
            </button>
          );
        })}
      </div>

      {/* The diagram of the selected type. Its description is in the panel text (sr-only). */}
      <figure className="group/permit col-span-full lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1">
        <div className="relative bg-paper-deep lg:max-w-[43rem]">
          <PermitDiagram key={current.id} type={current.id} />
        </div>
        <figcaption className="t-caption mt-3 flex flex-wrap justify-between gap-x-6 gap-y-1 text-fg-muted lg:max-w-[43rem]">
          <span>{note}</span>
          {/* Only once the live 3D diagram is ready (desktop, mouse, WebGL, motion allowed). */}
          <span aria-hidden="true" className="hidden lg:group-has-[[data-ready]]/permit:inline">
            {dragHint}
          </span>
        </figcaption>
      </figure>

      {/* Panels: the explanation sits right under the tabs on desktop, so what changed is in view. */}
      <div className="col-span-full lg:col-span-4 lg:row-start-2">
        {types.map((type, i) => {
          const selected = i === active;
          return (
            <div
              key={type.id}
              id={`${baseId}-panel-${type.id}`}
              role="tabpanel"
              aria-labelledby={`${baseId}-tab-${type.id}`}
              hidden={!selected}
              tabIndex={0}
              className="focus-visible:outline-offset-8"
            >
              <h3 className="t-title">{type.title}</h3>
              <p className="t-body mt-3 max-w-prose text-fg-muted">{type.body}</p>
              <p className="sr-only">{type.diagramAlt}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
