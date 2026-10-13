/**
 * Paper curtain that lifts off an image when its frame scrolls into view.
 * The frame carries data-reveal="curtain" (picked up by the global
 * RevealObserver, no hidden state of its own) and class group/frame. The
 * frame itself is never clipped, so IntersectionObserver always sees it.
 * Without JS or with reduced motion there is no curtain.
 */
export function Curtain() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[1] hidden origin-top bg-tone transition-transform duration-(--dur-slower) ease-expo group-data-revealed/frame:scale-y-0 motion-reduce:scale-y-0 js:block"
      style={{ transitionDelay: "var(--reveal-delay, 0ms)" }}
    />
  );
}
