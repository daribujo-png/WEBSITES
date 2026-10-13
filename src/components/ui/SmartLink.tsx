import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { ui } from "@/content/site";
import { cn, isExternalHref, isInternalRoute } from "@/lib/utils";

interface SmartLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
  children: ReactNode;
  /** Add the animated underline (link-draw). */
  underline?: boolean;
}

/**
 * Picks the right element for a href: next/link for internal routes, plain
 * <a> for tel:/mailto:/#hash, and a new tab (+ hidden notice) for external.
 */
export function SmartLink({ href, children, className, underline, ...rest }: SmartLinkProps) {
  const cls = cn(underline && "link-draw", className);
  if (isInternalRoute(href)) {
    return (
      <Link href={href} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  if (isExternalHref(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} {...rest}>
        {children}
        <span className="sr-only"> {ui.newTab}</span>
      </a>
    );
  }
  return (
    <a href={href} className={cls} {...rest}>
      {children}
    </a>
  );
}
