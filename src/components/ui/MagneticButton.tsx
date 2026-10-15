"use client";

/**
 * Primary call-to-action (Lodd, DESIGN.md §4). On a fine pointer
 * (mouse/trackpad) and without reduced motion, the button leans toward the
 * cursor once it is within 24 px (at most 6 px) and its label follows a
 * little further; it settles back in 450 ms. On hover and keyboard focus the
 * fill wipes up from the bottom. Everywhere else it is a plain, fully
 * accessible link or button. Colours are tone-aware (ink on paper, snow on
 * night).
 *
 *   <MagneticButton href="/kontakt/">Book en uforpliktende samtale</MagneticButton>
 *   <MagneticButton href="tel:+4794016610" variant="outline" icon="phone">94 01 66 10</MagneticButton>
 *   <MagneticButton type="submit" icon="arrow">Send forespørsel</MagneticButton>
 */
import Link from "next/link";
import {
  useEffect,
  useRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { cn, isExternalHref, isInternalRoute } from "@/lib/utils";
import { useFinePointer, useReducedMotion } from "@/lib/hooks";
import { ui } from "@/content/site";
import { ArrowRight, ArrowUpRight, Mail, Phone } from "./Icons";

export type ButtonVariant = "solid" | "outline" | "ghost" | "accent";
export type ButtonSize = "sm" | "md" | "lg";
type IconName = "arrow" | "arrow-up-right" | "phone" | "mail";

const base =
  "group/btn relative inline-flex select-none items-center justify-center gap-3 rounded-sm font-sans font-medium max-w-full whitespace-normal text-left sm:whitespace-nowrap transition-[background-color,color,border-color] duration-(--dur-base) ease-weight disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50";

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-10 px-4 t-small",
  md: "min-h-12 px-6 t-body",
  lg: "min-h-14 px-8 t-body",
};

/** The hover fill: a layer behind the label that wipes up from the bottom edge. */
const wipe =
  "isolate overflow-hidden before:pointer-events-none before:absolute before:inset-0 before:-z-[1] before:origin-bottom before:scale-y-0 before:transition-transform before:duration-(--dur-base) before:ease-expo hover:before:scale-y-100 focus-visible:before:scale-y-100 disabled:before:hidden aria-disabled:before:hidden";

const variants: Record<ButtonVariant, string> = {
  /** Ink on paper / snow on night; hover wipes to oak-deep / brass. */
  solid: cn("bg-fg text-tone before:bg-fg-accent", wipe),
  /** Hairline frame; the ink fill wipes up on hover. */
  outline: cn("border border-line-strong text-fg before:bg-fg hover:border-fg hover:text-tone focus-visible:text-tone", wipe),
  /** Text button with the animated underline. */
  ghost: "min-h-11 px-0 text-fg",
  /** Brass fill. The night references band only, at most once per view. */
  accent: cn("bg-brass text-night before:bg-snow", wipe),
};

/** Magnetism: reach (px from the button's edge) and largest offset (px). */
const MAGNET_RANGE = 24;
const MAGNET_MAX = 6;

/** Class string for links/buttons that should look like buttons without the magnet. */
export function buttonClasses({
  variant = "solid",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  // A ghost button is a text link: it keeps the size's height but no side padding.
  const sizeClass = variant === "ghost" ? sizes[size].replace(/\bpx-\d+\b/, "") : sizes[size];
  return cn(base, sizeClass, variants[variant], className);
}

function IconFor({ name }: { name: IconName }) {
  const cls =
    "shrink-0 transition-transform duration-(--dur-slow) ease-expo motion-reduce:transition-none";
  switch (name) {
    case "arrow":
      return <ArrowRight size={18} className={cn(cls, "group-hover/btn:translate-x-1")} />;
    case "arrow-up-right":
      return (
        <ArrowUpRight
          size={18}
          className={cn(cls, "group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5")}
        />
      );
    case "phone":
      return <Phone size={18} className={cls} />;
    case "mail":
      return <Mail size={18} className={cls} />;
  }
}

interface CommonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Built-in icon name or any node. Placed after the label (before for phone/mail). */
  icon?: IconName | ReactNode;
  /** 0–1, how far the button follows the cursor. Default 0.25. */
  strength?: number;
  /** Turn the magnetic effect off (still a styled button). */
  magnetic?: boolean;
  className?: string;
}

type LinkProps = CommonProps & { href: string } & Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    "href" | "children" | "className"
  >;
type BtnProps = CommonProps & { href?: undefined } & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "children" | "className"
  >;

export type MagneticButtonProps = LinkProps | BtnProps;

export function MagneticButton(props: MagneticButtonProps) {
  const {
    children,
    variant = "solid",
    size = "md",
    icon,
    strength = 0.25,
    magnetic = true,
    className,
    ...rest
  } = props;

  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const active = magnetic && fine && !reduced && variant !== "ghost";

  const elRef = useRef<HTMLElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = elRef.current;
    const label = labelRef.current;
    if (!active || !el || !label) return;

    let raf = 0;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let px = -1e5;
    let py = -1e5;
    let inView = false;
    let measure = false;

    const clampMax = (v: number) => Math.max(-MAGNET_MAX, Math.min(MAGNET_MAX, v));

    const loop = () => {
      raf = 0;
      if (measure) {
        measure = false;
        // The rect includes the current offset; take it out to get the resting box.
        const r = el.getBoundingClientRect();
        const cx = r.left - x + r.width / 2;
        const cy = r.top - y + r.height / 2;
        const dx = px - cx;
        const dy = py - cy;
        const outX = Math.max(Math.abs(dx) - r.width / 2, 0);
        const outY = Math.max(Math.abs(dy) - r.height / 2, 0);
        const near = Math.hypot(outX, outY) <= MAGNET_RANGE;
        tx = near ? clampMax(dx * strength) : 0;
        ty = near ? clampMax(dy * strength) : 0;
      }
      x += (tx - x) * 0.16;
      y += (ty - y) * 0.16;
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      label.style.transform = `translate3d(${(x * 0.45).toFixed(2)}px, ${(y * 0.45).toFixed(2)}px, 0)`;
      if (Math.abs(tx - x) > 0.05 || Math.abs(ty - y) > 0.05) raf = requestAnimationFrame(loop);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onMove = (e: PointerEvent) => {
      if (!inView || e.pointerType !== "mouse") return;
      px = e.clientX;
      py = e.clientY;
      measure = true;
      kick();
    };
    const onLeaveWindow = () => {
      px = py = -1e5;
      measure = true;
      kick();
    };

    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (!inView) onLeaveWindow();
    });
    io.observe(el);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeaveWindow);
    return () => {
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeaveWindow);
      cancelAnimationFrame(raf);
      el.style.transform = "";
      label.style.transform = "";
    };
  }, [active, strength]);

  const iconNode =
    typeof icon === "string" ? <IconFor name={icon as IconName} /> : (icon ?? null);
  const leading = icon === "phone" || icon === "mail";

  const inner = (
    <span ref={labelRef} className="inline-flex items-center gap-3 will-change-transform">
      {leading ? iconNode : null}
      <span className={cn(variant === "ghost" && "link-draw")}>{children}</span>
      {!leading ? iconNode : null}
    </span>
  );

  const cls = buttonClasses({ variant, size, className });

  if ("href" in rest && typeof rest.href === "string") {
    const { href, ...anchorRest } = rest as Omit<LinkProps, keyof CommonProps>;
    if (isInternalRoute(href)) {
      return (
        <Link
          href={href}
          ref={elRef as Ref<HTMLAnchorElement>}
          className={cls}
          {...anchorRest}
        >
          {inner}
        </Link>
      );
    }
    const external = isExternalHref(href);
    return (
      <a
        href={href}
        ref={elRef as Ref<HTMLAnchorElement>}
        className={cls}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        {...anchorRest}
      >
        {inner}
        {external ? <span className="sr-only"> {ui.newTab}</span> : null}
      </a>
    );
  }

  const { type = "button", ...buttonRest } = rest as Omit<BtnProps, keyof CommonProps>;
  return (
    <button
      type={type}
      ref={elRef as Ref<HTMLButtonElement>}
      className={cls}
      {...buttonRest}
    >
      {inner}
    </button>
  );
}
