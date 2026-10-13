"use client";

/**
 * Slow, scroll-scrubbed drift for an image or block (GSAP ScrollTrigger).
 * The child moves `amount` percent of its own height across the viewport.
 * Off for reduced motion and on touch-only devices (it costs a scroll trigger
 * per image on phones for little gain); the element is simply static then.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { withGsap, EASE } from "@/lib/motion";
import { FINE_POINTER_QUERY, REDUCED_MOTION_QUERY } from "@/lib/hooks";
import { cn } from "@/lib/utils";

interface ParallaxProps {
  children: ReactNode;
  /** Percent of the element's height to travel (each way). */
  amount?: number;
  className?: string;
}

export function Parallax({ children, amount = 8, className }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia(REDUCED_MOTION_QUERY).matches || !window.matchMedia(FINE_POINTER_QUERY).matches) return;
    return withGsap(({ gsap }) => {
      const tween = gsap.fromTo(
        el,
        { yPercent: amount },
        {
          yPercent: -amount,
          ease: EASE.scrub,
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
        },
      );
      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
        gsap.set(el, { clearProps: "transform" });
      };
    });
  }, [amount]);

  return (
    <div ref={ref} className={cn("will-change-transform", className)}>
      {children}
    </div>
  );
}
