"use client";

/**
 * Hotspots of the active build step: real <button>s (disclosure pattern)
 * positioned over the canvas by the canvas itself (projected 3D points), with
 * a short explanation that opens on click/Enter and closes on Esc, outside
 * click or the close button. Hidden while the build moves between steps.
 */
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { buildSequenceCopy } from "@/content";
import type { BuildStep } from "@/content/types";
import { Icon } from "@/components/ui";
import { useIsDesktop } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { StageStore } from "./lib/stageStore";

interface Props {
  store: StageStore;
  step: BuildStep;
  active: number;
  ready: boolean;
}

export function StageHotspots(props: Props) {
  // Keyed by step: switching step resets the open popover.
  return <HotspotLayer key={props.step.id} {...props} />;
}

function HotspotLayer({ store, step, ready }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const [place, setPlace] = useState<{ left: boolean; up: boolean }>({ left: false, up: false });
  const wraps = useRef(new Map<string, HTMLDivElement>());
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const desktop = useIsDesktop();
  const copy = buildSequenceCopy.hotspots;

  useLayoutEffect(() => {
    if (!ready) return;
    const map = store.hotspots;
    map.clear();
    for (const h of step.hotspots) {
      const el = wraps.current.get(h.id);
      if (el) map.set(h.id, { id: h.id, step: step.id, el });
    }
    store.invalidate();
    return () => map.clear();
  }, [store, step, ready]);

  useEffect(() => {
    if (!open) return;
    const close = (focus: boolean) => {
      const btn = buttons.current.get(open);
      setOpen(null);
      if (focus) btn?.focus();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close(true);
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      const wrap = wraps.current.get(open);
      const card = document.getElementById(popoverId(step.id, open));
      if (wrap?.contains(t) || card?.contains(t)) return;
      close(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, step.id]);

  if (!ready) return null;

  const toggle = (id: string) => {
    if (open === id) {
      setOpen(null);
      return;
    }
    const wrap = wraps.current.get(id);
    const stage = wrap?.closest("[data-stage]");
    if (wrap && stage) {
      const r = wrap.getBoundingClientRect();
      const s = stage.getBoundingClientRect();
      setPlace({ left: r.left - s.left > s.width * 0.62, up: r.top - s.top > s.height * 0.52 });
    }
    setOpen(id);
  };

  return (
    <div role="group" aria-label={copy.groupLabel} className="pointer-events-none absolute inset-0 z-[5]" data-no-drag="">
      {step.hotspots.map((h) => {
        const isOpen = open === h.id;
        const id = popoverId(step.id, h.id);
        const card = (
          <div
            id={id}
            className={cn(
              "pointer-events-auto border border-line-strong bg-slate p-4 pr-12 text-fg",
              desktop
                ? cn("absolute w-[17.5rem]", place.left ? "right-6" : "left-6", place.up ? "bottom-2" : "top-[-0.75rem]")
                : "absolute inset-x-gutter top-[calc(var(--header-h)+4.25rem)]",
            )}
          >
            <p className="t-small font-medium">{h.label}</p>
            <p className="t-small mt-1.5 text-fg-muted">{h.text}</p>
            <button
              type="button"
              onClick={() => {
                setOpen(null);
                buttons.current.get(h.id)?.focus();
              }}
              aria-label={copy.close}
              className="absolute top-1 right-1 inline-flex size-10 items-center justify-center text-fg-muted hover:text-fg"
            >
              <Icon.Close size={18} />
            </button>
          </div>
        );
        return (
          <Fragment key={h.id}>
            <div
              ref={(el) => {
                if (el) wraps.current.set(h.id, el);
                else wraps.current.delete(h.id);
              }}
              data-visible="false"
              className="absolute top-0 left-0 transition-[opacity,visibility] duration-(--dur-base) ease-weight data-[visible=false]:invisible data-[visible=false]:opacity-0"
            >
              <button
                ref={(el) => {
                  if (el) buttons.current.set(h.id, el);
                  else buttons.current.delete(h.id);
                }}
                type="button"
                aria-expanded={isOpen}
                aria-controls={isOpen ? id : undefined}
                aria-label={copy.open(h.label)}
                onClick={() => toggle(h.id)}
                className="group pointer-events-auto absolute top-0 left-0 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute size-6 rounded-full border border-snow/85 bg-night/35 transition-transform duration-(--dur-base) ease-expo group-hover:scale-125 group-focus-visible:scale-125",
                    isOpen && "scale-125 border-brass",
                  )}
                />
                <span aria-hidden="true" className="relative size-2 rounded-full bg-brass" />
              </button>
              <span
                aria-hidden="true"
                className={cn(
                  "t-caption pointer-events-none absolute top-0 left-5 hidden -translate-y-1/2 whitespace-nowrap bg-night/75 px-2 py-0.5 text-fg lg:block",
                  isOpen && "lg:hidden",
                )}
              >
                {h.label}
              </span>
              {isOpen && desktop ? card : null}
            </div>
            {isOpen && !desktop ? card : null}
          </Fragment>
        );
      })}
    </div>
  );
}

function popoverId(step: string, id: string) {
  return `bygg-punkt-${step}-${id}`;
}
