import type { CSSProperties, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type TextTag = "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";

interface RevealTextProps {
  as?: TextTag;
  /** A string wraps naturally; an array forces one line per item. */
  text: string | readonly string[];
  id?: string;
  className?: string;
  /** Reveal right after mount instead of on scroll (use above the fold). */
  immediate?: boolean;
  /** Delay before the first word, ms. */
  delay?: number;
  /** Delay between words, ms. */
  stagger?: number;
}

/**
 * Heading/text that rises word by word from a hairline mask when it scrolls
 * into view. Server component: animation is CSS + the global RevealObserver.
 * Screen readers get the plain text once (sr-only); the animated copy is
 * aria-hidden. Without JS or with reduced motion the text is simply shown.
 */
export function RevealText({
  as = "h2",
  text,
  id,
  className,
  immediate,
  delay = 0,
  stagger = 55,
}: RevealTextProps) {
  const Tag: ElementType = as;
  const lines = typeof text === "string" ? [text] : [...text];
  const forced = typeof text !== "string";
  let i = 0;

  return (
    <Tag
      id={id}
      className={className}
      data-reveal="text"
      data-reveal-immediate={immediate ? "" : undefined}
      style={
        {
          "--reveal-delay": `${delay}ms`,
          "--reveal-stagger": `${stagger}ms`,
        } as CSSProperties
      }
    >
      <span className="sr-only">{lines.join(" ")}</span>
      <span aria-hidden="true">
        {lines.map((line, li) => {
          const words = line.split(/\s+/).filter(Boolean);
          const content = words.map((word, wi) => {
            const idx = i++;
            return (
              <span key={`${li}-${wi}`}>
                <span className="reveal-line">
                  <span className="reveal-word" style={{ "--i": idx } as CSSProperties}>
                    {word}
                  </span>
                </span>
                {wi < words.length - 1 ? " " : null}
              </span>
            );
          });
          return forced ? (
            <span key={li} className="block">
              {content}
            </span>
          ) : (
            <span key={li}>{content}</span>
          );
        })}
      </span>
    </Tag>
  );
}

type RevealVariant = "up" | "fade" | "media";

interface RevealProps {
  as?: ElementType;
  variant?: RevealVariant;
  delay?: number;
  immediate?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  id?: string;
}

/**
 * Block reveal on scroll: "up" (fade + rise), "fade", or "media" (a curtain
 * lifts off an image). Server component; see RevealObserver.
 */
export function Reveal({
  as = "div",
  variant = "up",
  delay = 0,
  immediate,
  className,
  style,
  children,
  id,
}: RevealProps) {
  // Narrowed to one tag (see Container): R3F's JSX augmentation would make the union `never`.
  const Tag = as as "div";
  return (
    <Tag
      id={id}
      className={cn(className)}
      data-reveal={variant}
      data-reveal-immediate={immediate ? "" : undefined}
      style={{ "--reveal-delay": `${delay}ms`, ...style } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
