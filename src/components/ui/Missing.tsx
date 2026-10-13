import type { CSSProperties } from "react";
import { cn, splitMissing } from "@/lib/utils";

/** Visible placeholder for a fact the client has not given us: [MANGLER: label] */
export function Missing({ label, className }: { label: string; className?: string }) {
  return <span className={cn("missing", className)}>[MANGLER: {label}]</span>;
}

/**
 * Renders a content string, turning every "[MANGLER: …]" token into a
 * visible <Missing> placeholder. Use for any copy from src/content.
 */
export function TextWithMissing({ text }: { text: string }) {
  const parts = splitMissing(text);
  if (parts.length === 1 && parts[0].type === "text") return <>{text}</>;
  return (
    <>
      {parts.map((p, i) =>
        p.type === "text" ? <span key={i}>{p.value}</span> : <Missing key={i} label={p.label} />,
      )}
    </>
  );
}

/**
 * Block placeholder where a client photo should go. Keeps the layout's aspect
 * ratio so the page does not jump when the real image arrives.
 */
export function MissingImage({
  label,
  aspect = "4 / 3",
  className,
}: {
  label: string;
  aspect?: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`Bilde mangler: ${label}`}
      style={{ aspectRatio: aspect } as CSSProperties}
      className={cn(
        "relative flex items-end overflow-hidden border border-dashed border-line-strong bg-paper-deep p-4 text-fg-muted",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full text-line"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <line x1="0" y1="100" x2="100" y2="0" stroke="currentColor" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="t-caption relative">
        <Missing label={label} />
      </span>
    </div>
  );
}
