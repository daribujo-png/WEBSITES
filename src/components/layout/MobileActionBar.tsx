"use client";

/**
 * Persistent action bar below lg: call, e-mail and book a conversation are
 * always one tap away. Fixed to the bottom, var(--actionbar-h) tall plus the
 * safe-area inset (globals.css pads <body> for it).
 * On the home page the "Book samtale" cell steps aside while the hero's own
 * booking button is on screen, so the two never sit on top of each other.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { company, cta, ui } from "@/content/site";
import { Icon } from "@/components/ui";

const cell =
  "flex h-(--actionbar-h) min-w-0 items-center justify-center gap-2 px-2 t-small font-medium transition-colors duration-(--dur-fast) ease-weight focus-visible:-outline-offset-4";

/** True while the home hero's booking button ([data-hero-cta]) is in view. */
function useHeroCtaVisible(enabled: boolean): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = enabled ? document.querySelector("[data-hero-cta]") : null;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.5 });
    io.observe(el);
    return () => {
      io.disconnect();
      setVisible(false);
    };
  }, [enabled]);
  return enabled && visible;
}

export function MobileActionBar() {
  const pathname = usePathname() ?? "/";
  const onHome = pathname === "/";
  const onContact = pathname.startsWith("/kontakt");
  const bookHref = onHome ? cta.primaryHrefHome : cta.primaryHref;
  const heroCtaVisible = useHeroCtaVisible(onHome);

  return (
    <nav
      aria-label={ui.actionBarLabel}
      data-tone="chalk"
      data-print-hide=""
      className="fixed inset-x-0 bottom-0 z-(--z-actionbar) border-t border-line-strong pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className={heroCtaVisible ? "grid grid-cols-2" : "grid grid-cols-[1fr_1fr_1.35fr]"}>
        <li className="border-r border-line">
          <a href={company.phoneHref} aria-label={ui.callLabel} className={cell}>
            <Icon.Phone size={18} />
            <span aria-hidden="true">{ui.callShort}</span>
          </a>
        </li>
        <li className={heroCtaVisible ? undefined : "border-r border-line"}>
          <a href={company.emailHref} aria-label={ui.emailLabel} className={cell}>
            <Icon.Mail size={18} />
            <span aria-hidden="true">{ui.emailShort}</span>
          </a>
        </li>
        <li hidden={heroCtaVisible}>
          {onHome ? (
            <a href={bookHref} className={`${cell} bg-ink text-chalk focus-visible:outline-chalk`}>
              {ui.bookShort}
            </a>
          ) : (
            <Link
              href={bookHref}
              aria-current={onContact ? "page" : undefined}
              className={`${cell} bg-ink text-chalk focus-visible:outline-chalk`}
            >
              {ui.bookShort}
            </Link>
          )}
        </li>
      </ul>
    </nav>
  );
}
