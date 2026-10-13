"use client";

/**
 * One IntersectionObserver for every [data-reveal] element on the page, so
 * server components can opt into scroll reveals with plain attributes:
 *
 *   data-reveal="text" | "up" | "fade" | "draw" | "media"
 *   data-reveal-immediate      reveal right after mount (above the fold)
 *   style={{ "--reveal-delay": "120ms" }}
 *
 * The element gets data-revealed="" when it enters the viewport. Hidden
 * states only apply under html.js (see globals.css), so no-JS visitors and
 * reduced-motion visitors always see the content.
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SELECTOR = "[data-reveal]:not([data-revealed])";

export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const reveal = (el: Element) => el.setAttribute("data-revealed", "");

    if (typeof IntersectionObserver === "undefined") {
      document.querySelectorAll(SELECTOR).forEach(reveal);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            reveal(entry.target);
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );

    const scan = (root: ParentNode) => {
      root.querySelectorAll(SELECTOR).forEach((el) => {
        if (el.hasAttribute("data-reveal-immediate")) {
          requestAnimationFrame(() => requestAnimationFrame(() => reveal(el)));
        } else {
          io.observe(el);
        }
      });
    };

    scan(document);

    // Pick up elements added later (lazy sections, client-only components).
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        r.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches(SELECTOR)) {
            if (node.hasAttribute("data-reveal-immediate")) reveal(node);
            else io.observe(node);
          }
          scan(node);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  return null;
}
