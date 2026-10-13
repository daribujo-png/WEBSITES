"use client";

/**
 * Site header. Fixed, var(--header-h) tall.
 *
 * - Tone follows the band underneath: over a dark stage (any element with
 *   data-header="dark", i.e. the hero and "Slik bygger vi") it switches to
 *   snow-on-night; everywhere else it is ink on paper with a hairline.
 * - Desktop (lg+): main nav plus phone and e-mail, always one click away.
 * - Below lg: a "Meny" button opens a full-screen dialog. Phone/e-mail live in
 *   <MobileActionBar> at the bottom of the screen.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { company, nav, ui, contactCopy } from "@/content/site";
import { Icon } from "@/components/ui";
import { useLenis } from "@/components/providers";
import { cn } from "@/lib/utils";
import { underlineOnHover } from "@/components/sections/styles";
import { Logo } from "./Logo";

/** True when `href` is the current page (hash links never count as current). */
function isCurrent(pathname: string, href: string) {
  if (href.includes("#")) return false;
  return pathname === href || pathname === href.replace(/\/$/, "");
}

function useHeaderTone(pathname: string) {
  // The home page opens on the dark hero, so start dark there (no flash).
  const [state, setState] = useState(() => ({ dark: pathname === "/", scrolled: false }));

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) * 16 || 64;
      const probe = headerH / 2;
      let dark = false;
      // Explicit dark stages, plus any large night/slate band in <main>
      // (e.g. the "Slik bygger vi" section from the THREE components).
      const minHeight = window.innerHeight * 0.5;
      document
        .querySelectorAll<HTMLElement>("[data-header='dark'], main [data-tone='night'], main [data-tone='slate']")
        .forEach((el) => {
          if (dark) return;
          const r = el.getBoundingClientRect();
          if (el.dataset.header !== "dark" && r.height < minHeight) return;
          if (r.top <= probe && r.bottom > probe) dark = true;
        });
      const scrolled = window.scrollY > 8;
      setState((prev) => (prev.dark === dark && prev.scrolled === scrolled ? prev : { dark, scrolled }));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [pathname]);

  return state;
}

function Wordmark() {
  return <Logo className="h-[1.6rem] xl:h-8" />;
}

export function Header() {
  const pathname = usePathname() ?? "/";
  const { dark, scrolled } = useHeaderTone(pathname);
  const [open, setOpen] = useState(false);
  const lenis = useLenis();
  const dialogId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => toggleRef.current?.focus());
  }, []);

  // Lock page scroll while the menu is open.
  useEffect(() => {
    if (!open) return;
    lenis?.stop();
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    // The dialog turns visible as its fade starts; retry until the close
    // button can actually take focus (visibility:hidden blocks it).
    let id = 0;
    let tries = 0;
    const focusClose = () => {
      const btn = closeRef.current;
      btn?.focus();
      if (btn && document.activeElement !== btn && tries++ < 30) id = requestAnimationFrame(focusClose);
    };
    id = requestAnimationFrame(focusClose);
    return () => {
      cancelAnimationFrame(id);
      html.style.overflow = prev;
      lenis?.start();
    };
  }, [open, lenis]);

  // Close the menu if the viewport grows to desktop while it is open.
  useEffect(() => {
    if (!open) return;
    const mql = window.matchMedia("(min-width: 64rem)");
    const onChange = () => {
      if (mql.matches) setOpen(false);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [open]);

  const onDialogKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== "Tab" || !dialogRef.current) return;
    const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])",
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const transparent = dark && !scrolled;

  return (
    <>
      <header
        data-tone={dark ? "night" : "paper"}
        data-tone-transparent={transparent ? "" : undefined}
        data-print-hide=""
        className={cn(
          "fixed inset-x-0 top-0 z-(--z-header) h-(--header-h) border-b transition-[background-color,border-color,color] duration-(--dur-base) ease-weight",
          transparent ? "border-transparent" : "border-line",
        )}
      >
        <div className="container-page flex h-full items-center justify-between gap-6">
          <Link href="/" aria-label={ui.homeLabel} className="-mx-1 flex min-h-11 items-center px-1">
            <Wordmark />
          </Link>

          <nav aria-label={ui.mainNavLabel} className="hidden lg:block">
            <ul className="flex items-center gap-7 t-small xl:gap-9">
              {nav.map((item) => {
                const current = isCurrent(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "inline-flex min-h-11 items-center",
                        current ? "underline decoration-1 underline-offset-[0.35em]" : underlineOnHover,
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="hidden items-center gap-6 t-small lg:flex">
            <a
              href={company.phoneHref}
              aria-label={ui.callLabel}
              className="group inline-flex min-h-11 items-center gap-2 whitespace-nowrap"
            >
              <Icon.Phone size={17} />
              <span className={underlineOnHover}>{company.phone}</span>
            </a>
            <a
              href={company.emailHref}
              aria-label={ui.emailLabel}
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 whitespace-nowrap"
            >
              <Icon.Mail size={17} />
              <span className={cn(underlineOnHover, "hidden xl:inline")}>{company.email}</span>
            </a>
          </div>

          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls={dialogId}
            onClick={() => setOpen(true)}
            className="-mr-2 inline-flex min-h-11 items-center gap-2 px-2 t-small font-medium lg:hidden"
          >
            {/* The visible word is the accessible name (WCAG 2.5.3); aria-expanded gives the state. */}
            <span>{ui.menuOpen}</span>
            <Icon.Menu size={22} />
          </button>
        </div>
      </header>

      {/* Mobile menu dialog */}
      <div
        id={dialogId}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ui.mainNavLabel}
        inert={!open}
        onKeyDown={onDialogKeyDown}
        data-tone="paper"
        data-lenis-prevent=""
        className={cn(
          "fixed inset-0 z-(--z-menu) flex flex-col overflow-y-auto transition-[opacity,visibility] duration-(--dur-base) ease-weight lg:hidden",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
      >
        <div className="container-page flex h-(--header-h) shrink-0 items-center justify-between border-b border-line">
          <Link href="/" aria-label={ui.homeLabel} onClick={close} className="-mx-1 flex min-h-11 items-center px-1">
            <Wordmark />
          </Link>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label={ui.menuCloseLabel}
            className="-mr-2 inline-flex min-h-11 items-center gap-2 px-2 t-small font-medium"
          >
            <span aria-hidden="true">{ui.menuClose}</span>
            <Icon.Close size={22} />
          </button>
        </div>

        <nav aria-label={ui.mainNavLabel} className="container-page flex-1 pt-6 pb-10">
          <ul>
            {nav.map((item, i) => {
              const current = isCurrent(pathname, item.href);
              return (
                <li
                  key={item.href}
                  className={cn(
                    "border-b border-line transition-[opacity,transform] duration-(--dur-slow) ease-expo",
                    open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
                  )}
                  style={{ transitionDelay: open ? `${80 + i * 45}ms` : "0ms" }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={current ? "page" : undefined}
                    className="flex min-h-16 items-center justify-between gap-4 py-3 t-display-s"
                  >
                    <span>{item.label}</span>
                    <Icon.ArrowRight size={22} className="shrink-0 text-fg-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>

          <dl className="mt-10 grid gap-6 t-small">
            <div>
              <dt className="text-fg-muted">{contactCopy.phoneLabel}</dt>
              <dd>
                <a href={company.phoneHref} className="inline-flex min-h-11 items-center t-title underline decoration-1 underline-offset-[0.25em]">
                  {company.phone}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-fg-muted">{contactCopy.emailLabel}</dt>
              <dd>
                <a href={company.emailHref} className="inline-flex min-h-11 items-center t-title underline decoration-1 underline-offset-[0.25em]">
                  {company.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-fg-muted">{contactCopy.addressLabel}</dt>
              <dd className="mt-1">{company.addressLine}</dd>
            </div>
          </dl>
        </nav>
      </div>
    </>
  );
}
