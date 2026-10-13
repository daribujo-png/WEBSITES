"use client";
/**
 * Desktop hover/focus preview for the home service index. The rows and the
 * preview images are rendered on the server; this only flips `data-on` on the
 * preview that matches the row under the pointer or keyboard focus.
 */
import { useRef, type ReactNode, type SyntheticEvent } from "react";

export function ServiceIndexHover({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const show = (e: SyntheticEvent) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>("[data-row]");
    const root = ref.current;
    if (!row || !root) return;
    const key = row.dataset.row;
    root.querySelectorAll<HTMLElement>("[data-preview]").forEach((el) => {
      el.toggleAttribute("data-on", el.dataset.preview === key);
    });
  };
  return (
    <div ref={ref} className={className} onPointerOver={show} onFocus={show}>
      {children}
    </div>
  );
}
