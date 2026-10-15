"use client";

/**
 * Segmented control: a native radio group (fieldset + legend + one radio per
 * option) drawn as one framed bar with an ink thumb that glides to the chosen
 * option (Lodd, 450 ms ease-glide). Arrow keys, Tab and screen readers get the
 * native radio behaviour for free. Every option is at least 44 px tall.
 *
 *   <Segmented
 *     name="taktype" legend="Taktype" value={roof} onChange={setRoof}
 *     options={[{ value: "saltak", label: "Saltak", icon: <RoofGlyph roof="saltak" /> }, …]}
 *   />
 *
 * Used by the house-model viewer (home and /husmodeller/<slug>/); the hero's
 * roof switcher can use it too.
 */
import { useId, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Small decorative glyph before the label (aria-hidden by the caller). */
  icon?: ReactNode;
  disabled?: boolean;
}

interface SegmentedProps<T extends string> {
  /** Radio group name (unique on the page). */
  name: string;
  legend: string;
  /** Show the legend above the bar (default) or keep it for screen readers only. */
  legendVisible?: boolean;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function Segmented<T extends string>({
  name,
  legend,
  legendVisible = true,
  options,
  value,
  onChange,
  className,
}: SegmentedProps<T>) {
  const id = useId();
  const n = Math.max(options.length, 1);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className={legendVisible ? "t-small mb-3 text-fg-muted" : "sr-only"}>{legend}</legend>
      <div
        className="relative grid border border-line-strong"
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` } as CSSProperties}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 bg-fg transition-transform duration-(--dur-base) ease-glide"
          style={{ width: `${100 / n}%`, transform: `translate3d(${index * 100}%, 0, 0)` }}
        />
        {options.map((o) => {
          const checked = o.value === value;
          const inputId = `${id}-${o.value}`;
          return (
            <label
              key={o.value}
              htmlFor={inputId}
              className={cn(
                "relative flex min-h-11 items-center justify-center gap-2 px-2 text-center t-small font-medium transition-colors duration-(--dur-base) ease-glide sm:px-3",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus",
                checked ? "text-tone" : "text-fg hover:bg-line/40",
                o.disabled && "cursor-not-allowed opacity-50",
              )}
            >
              <input
                id={inputId}
                type="radio"
                name={name}
                value={o.value}
                checked={checked}
                disabled={o.disabled}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              {o.icon ? <span aria-hidden="true" className="shrink-0">{o.icon}</span> : null}
              <span className="min-w-0">{o.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
