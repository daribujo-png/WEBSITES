"use client";

/**
 * "Snakk med oss om …" link that preselects the project type in the contact
 * form. It is a real link to /kontakt/?prosjekt=<slug> (works without JS and
 * from every page). When the contact form is already on the current page
 * (home), it scrolls to the form instead and fills in the select.
 */
import type { MouseEvent } from "react";
import { MagneticButton, type ButtonSize, type ButtonVariant } from "@/components/ui";
import { scrollToTarget } from "@/components/providers";
import { CONTACT_FORM_ID, PREFILL_EVENT, PREFILL_PARAM, type PrefillDetail } from "./prefill";

interface PrefillLinkProps {
  /** Value from projectTypeOptions (a service slug or "annet"). */
  value: string;
  children: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: "arrow" | "phone" | "mail";
  className?: string;
}

export function prefillHref(value: string) {
  return `/kontakt/?${PREFILL_PARAM}=${encodeURIComponent(value)}`;
}

export function PrefillLink({ value, children, variant = "outline", size = "md", icon = "arrow", className }: PrefillLinkProps) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const form = document.getElementById(CONTACT_FORM_ID);
    if (!form) return;
    e.preventDefault();
    window.dispatchEvent(new CustomEvent<PrefillDetail>(PREFILL_EVENT, { detail: { prosjekttype: value } }));
    // After the click has finished bubbling: Lenis resets any running scroll
    // animation when an internal link is clicked (stopInertiaOnNavigate).
    // Scroll to the form itself (on phones it sits well below the section
    // heading), clear of the fixed header.
    requestAnimationFrame(() => {
      const header = document.querySelector("header")?.getBoundingClientRect().height ?? 0;
      scrollToTarget(form, { offset: -(header + 16) });
    });
  };

  return (
    <MagneticButton href={prefillHref(value)} variant={variant} size={size} icon={icon} className={className} onClick={onClick}>
      {children}
    </MagneticButton>
  );
}
