"use client";

/**
 * Persistent action bar below lg: call, e-mail and book a conversation are
 * always one tap away. Fixed to the bottom, var(--actionbar-h) tall plus the
 * safe-area inset (globals.css pads <body> for it).
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { company, cta, ui } from "@/content/site";
import { Icon } from "@/components/ui";

const cell =
  "flex h-(--actionbar-h) min-w-0 items-center justify-center gap-2 px-2 t-small font-medium transition-colors duration-(--dur-fast) ease-weight focus-visible:-outline-offset-4";

export function MobileActionBar() {
  const pathname = usePathname() ?? "/";
  const onHome = pathname === "/";
  const onContact = pathname.startsWith("/kontakt");
  const bookHref = onHome ? cta.primaryHrefHome : cta.primaryHref;

  return (
    <nav
      aria-label={ui.actionBarLabel}
      data-tone="chalk"
      data-print-hide=""
      className="fixed inset-x-0 bottom-0 z-(--z-actionbar) border-t border-line-strong pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid grid-cols-[1fr_1fr_1.35fr]">
        <li className="border-r border-line">
          <a href={company.phoneHref} aria-label={ui.callLabel} className={cell}>
            <Icon.Phone size={18} />
            <span aria-hidden="true">{ui.callShort}</span>
          </a>
        </li>
        <li className="border-r border-line">
          <a href={company.emailHref} aria-label={ui.emailLabel} className={cell}>
            <Icon.Mail size={18} />
            <span aria-hidden="true">{ui.emailShort}</span>
          </a>
        </li>
        <li>
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
