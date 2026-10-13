import type { SVGProps } from "react";

/**
 * Thin-stroke line icons (1.25px at 24px), drawn for this site. Decorative by
 * default (aria-hidden); give the parent control an accessible name.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const ArrowRight = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 12h17M14 6l6 6-6 6" />
  </Base>
);

export const ArrowUpRight = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 17 17 7M8 7h9v9" />
  </Base>
);

export const ArrowDown = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3v17M6 14l6 6 6-6" />
  </Base>
);

export const Phone = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 3.5h4l1.6 4.2-2.3 1.5a11 11 0 0 0 6.5 6.5l1.5-2.3 4.2 1.6v4c0 .8-.7 1.5-1.5 1.5A17.5 17.5 0 0 1 3.5 5c0-.8.7-1.5 1.5-1.5Z" />
  </Base>
);

export const Mail = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 5.5h18v13H3zM3.5 6l8.5 7 8.5-7" />
  </Base>
);

export const MapPin = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.25" />
  </Base>
);

export const Plus = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 4v16M4 12h16" />
  </Base>
);

export const Minus = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 12h16" />
  </Base>
);

export const Close = (p: IconProps) => (
  <Base {...p}>
    <path d="m5.5 5.5 13 13M18.5 5.5l-13 13" />
  </Base>
);

export const Menu = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 8h18M3 16h18" />
  </Base>
);

export const Check = (p: IconProps) => (
  <Base {...p}>
    <path d="m4.5 12.5 4.5 4.5 10.5-10.5" />
  </Base>
);

export const Alert = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.75" />
    <path d="M12 7.5v6M12 15.75v.75" />
  </Base>
);

export const ChevronLeft = (p: IconProps) => (
  <Base {...p}>
    <path d="m15 5-7 7 7 7" />
  </Base>
);

export const ChevronRight = (p: IconProps) => (
  <Base {...p}>
    <path d="m9 5 7 7-7 7" />
  </Base>
);

/** Drag handle: two opposing arrows (before/after slider, 3D drag hint). */
export const DragHorizontal = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 7 4 12l5 5M15 7l5 5-5 5" />
  </Base>
);

/** Layers / exploded view. */
export const Layers = (p: IconProps) => (
  <Base {...p}>
    <path d="m12 3.5 8.5 4.5-8.5 4.5L3.5 8z" />
    <path d="m3.5 12 8.5 4.5 8.5-4.5M3.5 16l8.5 4.5 8.5-4.5" />
  </Base>
);

/** Floor plan. */
export const Plan = (p: IconProps) => (
  <Base {...p}>
    <path d="M3.5 3.5h17v17h-17zM3.5 11h7v9.5M10.5 3.5V8M14 11h6.5M14 11v4" />
  </Base>
);

/** Sun (day light). */
export const Sun = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
  </Base>
);

/** Moon (blue hour). */
export const Moon = (p: IconProps) => (
  <Base {...p}>
    <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" />
  </Base>
);

/** Gable mark used in the logo lockup (matches src/app/icon.svg). */
export const GableMark = ({ size = 28, ...rest }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden="true"
    focusable="false"
    {...rest}
  >
    <path d="M4 28V14.5L16 4l12 10.5V28" stroke="currentColor" strokeWidth="1.6" />
    <path d="M10.5 28V18.5h11V28" stroke="currentColor" strokeWidth="1.6" />
    <path d="M4 28h24" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);
