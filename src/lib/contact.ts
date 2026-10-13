/**
 * Contact form logic (framework-free, used by src/components/forms/**).
 *
 * Submission: if NEXT_PUBLIC_FORM_ENDPOINT is set (e.g. a Formspree URL that
 * forwards to post@byggrv.no) we POST JSON there. Otherwise we fall back to a
 * prefilled mailto: link and tell the visitor so (contactForm.mailtoNotice).
 */
import { company } from "@/content/site";
import { contactForm, type ContactFieldName } from "@/content/form";
import { projectTypeOptions } from "@/content/services";

export type ContactValues = Record<ContactFieldName, string>;
export type ContactErrors = Partial<Record<ContactFieldName, string>>;

export const CONTACT_FIELDS: ContactFieldName[] = [
  "navn",
  "telefon",
  "epost",
  "prosjekttype",
  "adresse",
  "melding",
];

export const emptyContactValues: ContactValues = {
  navn: "",
  telefon: "",
  epost: "",
  prosjekttype: "",
  adresse: "",
  melding: "",
};

/** Public form endpoint (inlined at build time). Empty string = mailto fallback. */
export const FORM_ENDPOINT = process.env.NEXT_PUBLIC_FORM_ENDPOINT ?? "";
export const hasFormEndpoint = FORM_ENDPOINT.trim().length > 0;

const MIN_MESSAGE_LENGTH = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Norwegian numbers: 8 digits, optionally prefixed +47 / 0047; spaces, dots, dashes allowed. */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s.\-()]/g, "").replace(/^(\+47|0047)/, "");
}

export function isValidPhone(raw: string): boolean {
  const digits = normalizePhone(raw);
  // Allow foreign numbers with + and 7–15 digits as well.
  return /^\d{8}$/.test(digits) || /^\+\d{7,15}$/.test(raw.replace(/[\s.\-()]/g, ""));
}

export function validateField(name: ContactFieldName, rawValue: string): string | undefined {
  const value = rawValue.trim();
  const e = contactForm.errors;
  switch (name) {
    case "navn":
      return value ? undefined : e.navn.empty;
    case "telefon":
      if (!value) return e.telefon.empty;
      return isValidPhone(value) ? undefined : e.telefon.invalid;
    case "epost":
      if (!value) return e.epost.empty;
      return EMAIL_RE.test(value) ? undefined : e.epost.invalid;
    case "prosjekttype":
      return projectTypeOptions.some((o) => o.value === value) ? undefined : e.prosjekttype.empty;
    case "adresse":
      return undefined;
    case "melding":
      if (!value) return e.melding.empty;
      return value.length >= MIN_MESSAGE_LENGTH ? undefined : e.melding.tooShort;
  }
}

/** Validate every field. Returns only fields with errors (in field order). */
export function validateContact(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {};
  for (const name of CONTACT_FIELDS) {
    const msg = validateField(name, values[name] ?? "");
    if (msg) errors[name] = msg;
  }
  return errors;
}

export function projectTypeLabel(value: string): string {
  return projectTypeOptions.find((o) => o.value === value)?.label ?? value;
}

/** Plain-text body used for both the mailto fallback and the JSON payload. */
export function contactMessageText(values: ContactValues): string {
  const f = contactForm.fields;
  return [
    `${f.navn.label}: ${values.navn.trim()}`,
    `${f.telefon.label}: ${values.telefon.trim()}`,
    `${f.epost.label}: ${values.epost.trim()}`,
    `Prosjekttype: ${projectTypeLabel(values.prosjekttype)}`,
    `${f.adresse.label}: ${values.adresse.trim() || "-"}`,
    "",
    values.melding.trim(),
  ].join("\n");
}

export function buildMailtoHref(values: ContactValues): string {
  const subject = contactForm.mailto.subject(projectTypeLabel(values.prosjekttype));
  return `mailto:${company.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    contactMessageText(values),
  )}`;
}

export type SubmitResult =
  | { status: "sent" }
  | { status: "mailto"; href: string }
  | { status: "error"; error: string };

/**
 * Submit the form. With an endpoint: POST JSON (Formspree-compatible:
 * `_replyto`, `_subject`). Without: open the prefilled mailto link.
 */
export async function submitContact(values: ContactValues): Promise<SubmitResult> {
  if (!hasFormEndpoint) {
    const href = buildMailtoHref(values);
    if (typeof window !== "undefined") window.location.href = href;
    return { status: "mailto", href };
  }
  try {
    const res = await fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        navn: values.navn.trim(),
        telefon: values.telefon.trim(),
        epost: values.epost.trim(),
        prosjekttype: projectTypeLabel(values.prosjekttype),
        adresse: values.adresse.trim(),
        melding: values.melding.trim(),
        _replyto: values.epost.trim(),
        _subject: contactForm.mailto.subject(projectTypeLabel(values.prosjekttype)),
      }),
    });
    if (!res.ok) return { status: "error", error: `HTTP ${res.status}` };
    return { status: "sent" };
  } catch (err) {
    return { status: "error", error: err instanceof Error ? err.message : "network" };
  }
}
