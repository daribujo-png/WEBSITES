import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Container } from "./Container";
import { RevealText } from "./RevealText";
import { TextWithMissing } from "./Missing";

export type Tone = "paper" | "chalk" | "paper-deep" | "night" | "slate";
type Spacing = "default" | "sm" | "top" | "bottom" | "none";

const spacingClass: Record<Spacing, string> = {
  default: "py-section",
  sm: "py-section-sm",
  top: "pt-section",
  bottom: "pb-section",
  none: "",
};

interface SectionProps extends Omit<ComponentPropsWithoutRef<"section">, "children"> {
  /** Sets background + text colours and the tone-aware tokens (text-fg, border-line …). */
  tone?: Tone;
  spacing?: Spacing;
  /** Wrap children in <Container>. Default true. */
  contained?: boolean;
  containerSize?: "page" | "wide" | "full";
  containerClassName?: string;
  /** id of the heading that names this section (aria-labelledby). */
  labelledBy?: string;
  as?: "section" | "div" | "article" | "aside";
  children?: ReactNode;
}

/**
 * Page band. Light tones are the default; only the hero and "Slik bygger vi"
 * use night/slate. Example:
 *   <Section id="referanser" tone="chalk" labelledBy="referanser-title">…</Section>
 */
export function Section({
  tone = "paper",
  spacing = "default",
  contained = true,
  containerSize = "page",
  containerClassName,
  labelledBy,
  as: Tag = "section",
  className,
  children,
  ...rest
}: SectionProps) {
  return (
    <Tag
      data-tone={tone}
      aria-labelledby={labelledBy}
      className={cn("relative", spacingClass[spacing], className)}
      {...rest}
    >
      {contained ? (
        <Container size={containerSize} className={containerClassName}>
          {children}
        </Container>
      ) : (
        children
      )}
    </Tag>
  );
}

interface SectionHeaderProps {
  /** id for the heading (pair with <Section labelledBy>). */
  id: string;
  title: string;
  lede?: string;
  as?: "h1" | "h2" | "h3";
  /** "split": title left, lede bottom-right on desktop. "stack": lede under title. "center": both centred. */
  layout?: "split" | "stack" | "center";
  /** Display size of the title. */
  size?: "xl" | "l" | "m";
  immediate?: boolean;
  className?: string;
}

const titleSize = { xl: "t-display-xl", l: "t-display-l", m: "t-display-m" } as const;

/**
 * Monograph-style section opening: very large display title and a short lede.
 * No eyebrow label, no index number.
 */
export function SectionHeader({
  id,
  title,
  lede,
  as = "h2",
  layout = "split",
  size = "l",
  immediate,
  className,
}: SectionHeaderProps) {
  if (layout === "center") {
    return (
      <header className={cn("flex flex-col items-center gap-6 text-center lg:gap-8", className)}>
        <RevealText as={as} id={id} text={title} immediate={immediate} className={cn(titleSize[size], "max-w-[14ch]")} />
        {lede ? (
          <p
            data-reveal="up"
            style={{ "--reveal-delay": "180ms" } as CSSProperties}
            className="t-lead max-w-[32rem] text-fg-muted"
          >
            <TextWithMissing text={lede} />
          </p>
        ) : null}
      </header>
    );
  }
  return (
    <header
      className={cn(
        "grid-page gap-y-6 lg:gap-y-8",
        layout === "split" ? "items-end" : "",
        className,
      )}
    >
      <RevealText
        as={as}
        id={id}
        text={title}
        immediate={immediate}
        className={cn(
          titleSize[size],
          "col-span-full",
          layout === "split" && lede ? "lg:col-span-7" : "lg:col-span-10",
        )}
      />
      {lede ? (
        <p
          data-reveal="up"
          style={{ "--reveal-delay": "180ms" } as CSSProperties}
          className={cn(
            "t-lead col-span-full max-w-measure text-fg-muted md:col-span-6",
            layout === "split" ? "lg:col-span-4 lg:col-start-9 lg:pb-3" : "lg:col-span-6",
          )}
        >
          <TextWithMissing text={lede} />
        </p>
      ) : null}
    </header>
  );
}
