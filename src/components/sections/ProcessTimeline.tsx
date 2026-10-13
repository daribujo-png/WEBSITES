"use client";

/**
 * "Fra tegning til nøkkel" as a semantic <ol> joined by one vertical
 * hairline. As you scroll, an ink line draws down the hairline and each
 * step's node fills when the line reaches it. Order is carried by the list
 * itself and the connecting line, never by numerals.
 * Without JS or with reduced motion the line is simply drawn and every
 * node is filled.
 */
import { useEffect, useRef, type CSSProperties } from "react";
import type { ProcessStep } from "@/content/types";
import { getGsap, EASE } from "@/lib/motion";
import { REDUCED_MOTION_QUERY } from "@/lib/hooks";

interface ProcessTimelineProps {
  steps: readonly ProcessStep[];
  label: string;
}

export function ProcessTimeline({ steps, label }: ProcessTimelineProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const line = lineRef.current;
    if (!list || !line) return;
    const items = Array.from(list.querySelectorAll<HTMLElement>("[data-step]"));

    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
      line.style.transform = "scaleY(1)";
      items.forEach((li) => li.setAttribute("data-active", ""));
      return;
    }

    const { gsap, ScrollTrigger } = getGsap();
    const tween = gsap.fromTo(
      line,
      { scaleY: 0 },
      {
        scaleY: 1,
        ease: EASE.scrub,
        scrollTrigger: { trigger: list, start: "top 65%", end: "bottom 65%", scrub: true },
      },
    );
    const triggers = items.map((li) =>
      ScrollTrigger.create({
        trigger: li,
        start: "top 65%",
        onEnter: () => li.setAttribute("data-active", ""),
        onLeaveBack: () => li.removeAttribute("data-active"),
      }),
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      triggers.forEach((t) => t.kill());
    };
  }, []);

  return (
    <ol ref={listRef} aria-label={label} className="relative mt-16 lg:mt-24">
      {/* Track + drawn progress (decorative). The line runs through the node centres. */}
      <span aria-hidden="true" className="absolute top-3 bottom-3 left-[5px] w-px bg-line" />
      <span
        ref={lineRef}
        aria-hidden="true"
        className="absolute top-3 bottom-3 left-[5px] w-px origin-top bg-fg js:scale-y-0"
      />
      {steps.map((step, i) => (
        <li
          key={step.id}
          data-step=""
          className="group/step relative pb-12 pl-10 last:pb-0 lg:pb-16 lg:pl-0"
        >
          <span
            aria-hidden="true"
            className="absolute top-2.5 left-0 size-[11px] rounded-full border border-fg bg-fg transition-colors duration-(--dur-slow) ease-weight js:bg-tone group-data-active/step:bg-fg lg:top-4"
          />
          <div className="grid-page gap-y-3">
            <h3
              data-reveal="up"
              style={{ "--reveal-delay": `${(i % 2) * 60}ms` } as CSSProperties}
              className="t-display-s col-span-full lg:col-span-5 lg:col-start-2"
            >
              {step.title}
            </h3>
            <p
              data-reveal="up"
              style={{ "--reveal-delay": "120ms" } as CSSProperties}
              className="t-body col-span-full max-w-prose text-fg-muted lg:col-span-5 lg:col-start-8 lg:pt-2"
            >
              {step.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
