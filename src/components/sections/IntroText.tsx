/**
 * Heading for the first screen (hero h1, page h1): words rise from a
 * hairline mask with a CSS-only animation that starts at first paint, so the
 * largest text on the page is never waiting for JavaScript. Screen readers
 * get the plain text once. Use <RevealText> from @/components/ui below the fold.
 */
import type { CSSProperties, ElementType } from "react";
import "./intro.css";

interface IntroTextProps {
  as?: "h1" | "h2" | "p";
  text: string;
  id?: string;
  className?: string;
  /** Delay before the first word, ms. */
  delay?: number;
  /** Delay between words, ms. */
  stagger?: number;
}

export function IntroText({ as = "h1", text, id, className, delay = 0, stagger = 70 }: IntroTextProps) {
  const Tag: ElementType = as;
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <Tag
      id={id}
      className={className}
      style={{ "--intro-delay": `${delay}ms`, "--intro-stagger": `${stagger}ms` } as CSSProperties}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, i) => (
          <span key={i}>
            <span className="intro-line">
              <span className="intro-word" style={{ "--i": i } as CSSProperties}>
                {word}
              </span>
            </span>
            {i < words.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    </Tag>
  );
}

/** Style + class for a block that fades up on first paint (CSS only). */
export function introUp(delay: number): { className: string; style: CSSProperties } {
  return { className: "intro-up", style: { "--intro-delay": `${delay}ms` } as CSSProperties };
}
