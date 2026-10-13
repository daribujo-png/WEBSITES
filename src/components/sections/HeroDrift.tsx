"use client";

/**
 * The hero stage sinks slowly and the house settles back as you scroll
 * away, so the dark stage feels heavy rather than pinned. Scroll-scrubbed,
 * transform only, off for reduced motion.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { withGsap, EASE } from "@/lib/motion";
import { REDUCED_MOTION_QUERY } from "@/lib/hooks";

export function HeroDrift({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const stage = el?.closest("section");
    if (!el || !stage || window.matchMedia(REDUCED_MOTION_QUERY).matches) return;
    return withGsap(({ gsap }) => {
      const tween = gsap.to(el, {
        yPercent: 12,
        scale: 1.04,
        ease: EASE.scrub,
        scrollTrigger: { trigger: stage, start: "top top", end: "bottom top", scrub: true },
      });
      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
        gsap.set(el, { clearProps: "transform" });
      };
    });
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
