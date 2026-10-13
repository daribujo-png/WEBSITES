"use client";

/**
 * Contact form: navn, telefon, e-post, prosjekttype, adresse/tomt, melding.
 *
 * - Fields are uncontrolled (the DOM holds the values); errors live in state.
 * - A field is checked when you leave it (once it has content), re-checked
 *   while you type if it shows an error, and everything is checked on submit.
 *   Errors are linked with aria-describedby + aria-invalid, and a summary
 *   with links to each field takes focus when the submit finds errors.
 * - With NEXT_PUBLIC_FORM_ENDPOINT set, the form POSTs JSON there. Without it,
 *   it opens a prefilled e-mail to post@byggrv.no and says so up front.
 * - The project type can be preselected with /kontakt/?prosjekt=<slug>, or by
 *   a <PrefillLink> on the same page (custom event).
 */
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { contactForm, type ContactFieldName } from "@/content/form";
import { company } from "@/content/site";
import {
  CONTACT_FIELDS,
  buildMailtoHref,
  hasFormEndpoint,
  submitContact,
  validateContact,
  validateField,
  type ContactErrors,
  type ContactValues,
} from "@/lib/contact";
import { MagneticButton, Missing } from "@/components/ui";
import { Alert, Check, ChevronRight } from "@/components/ui/Icons";
import { cn } from "@/lib/utils";
import { CONTACT_FORM_ID, PREFILL_EVENT, PREFILL_PARAM, type PrefillDetail } from "./prefill";

type Status = "idle" | "submitting" | "sent" | "mailto" | "error";

const fieldId = (name: ContactFieldName) => `kf-${name}`;
const errorId = (name: ContactFieldName) => `kf-${name}-feil`;
const hintId = (name: ContactFieldName) => `kf-${name}-hjelp`;

const isProjectType = (value: string | null): value is string =>
  !!value && contactForm.projectTypeOptions.some((o) => o.value === value);

const controlClass =
  "block w-full rounded-xs border border-line-strong bg-chalk px-4 t-body text-fg transition-colors duration-(--dur-fast) ease-weight placeholder:text-fg-muted hover:border-fg focus-visible:border-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus aria-invalid:border-danger";

interface FieldShellProps {
  name: ContactFieldName;
  error?: string;
  className?: string;
  children: ReactNode;
}

function FieldShell({ name, error, className, children }: FieldShellProps) {
  const copy = contactForm.fields[name];
  return (
    <div className={cn("flex flex-col", className)}>
      <label htmlFor={fieldId(name)} className="t-small font-medium">
        {copy.label}
        {!copy.required ? <span className="font-normal text-fg-muted"> ({contactForm.optional})</span> : null}
      </label>
      <div className="mt-2">{children}</div>
      {/* Hint under the control, so the controls of a two-column row line up. */}
      {"hint" in copy && copy.hint ? (
        <p id={hintId(name)} className="t-caption mt-2 text-fg-muted">
          {copy.hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId(name)} className="t-small mt-2 flex items-start gap-2 text-danger">
          <Alert size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

function describedBy(name: ContactFieldName, error?: string) {
  const ids: string[] = [];
  if ("hint" in contactForm.fields[name] && contactForm.fields[name].hint) ids.push(hintId(name));
  if (error) ids.push(errorId(name));
  return ids.length ? ids.join(" ") : undefined;
}

export function ContactForm({ className, headingLevel = "h3" }: { className?: string; headingLevel?: "h2" | "h3" }) {
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [summaryCount, setSummaryCount] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [mailtoHref, setMailtoHref] = useState("");
  const [live, setLive] = useState("");
  const Heading = headingLevel;

  // Preselect the project type from ?prosjekt=<slug> and from <PrefillLink>.
  useEffect(() => {
    const fromQuery = new URLSearchParams(window.location.search).get(PREFILL_PARAM);
    if (isProjectType(fromQuery) && selectRef.current) selectRef.current.value = fromQuery;

    const onPrefill = (e: Event) => {
      const value = (e as CustomEvent<PrefillDetail>).detail?.prosjekttype ?? null;
      const select = selectRef.current;
      if (!select || !isProjectType(value)) return;
      select.value = value;
      setErrors((prev) => ({ ...prev, prosjekttype: undefined }));
      select.focus({ preventScroll: true });
    };
    window.addEventListener(PREFILL_EVENT, onPrefill);
    return () => window.removeEventListener(PREFILL_EVENT, onPrefill);
  }, []);

  // Move focus to the error summary after a submit with errors.
  useEffect(() => {
    if (attempt > 0) summaryRef.current?.focus();
  }, [attempt]);

  // Move focus to the confirmation when the message is sent.
  useEffect(() => {
    if (status === "sent") successRef.current?.focus();
  }, [status]);

  const readValues = (): ContactValues => {
    const data = new FormData(formRef.current ?? undefined);
    return Object.fromEntries(CONTACT_FIELDS.map((n) => [n, String(data.get(n) ?? "")])) as ContactValues;
  };

  const check = (name: ContactFieldName, value: string) => {
    const message = validateField(name, value);
    setErrors((prev) => (prev[name] === message ? prev : { ...prev, [name]: message }));
  };

  // Check a field when you leave it, once it has content (or after a submit),
  // so tabbing through an empty form does not flood it with errors.
  const onBlur = (name: ContactFieldName, value: string) => {
    if (value.trim() || attempt > 0 || errors[name]) check(name, value);
  };

  const onInput = (name: ContactFieldName, value: string) => {
    if (errors[name]) check(name, value);
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "submitting") return;
    const form = e.currentTarget;

    // Spam trap: bots fill every field. Pretend all went well.
    if (String(new FormData(form).get("_gotcha") ?? "").trim()) {
      setStatus("sent");
      return;
    }

    const values = readValues();
    const found = validateContact(values);
    setErrors(found);
    const count = Object.keys(found).length;
    if (count > 0) {
      setSummaryCount(count);
      setAttempt((a) => a + 1);
      setLive(contactForm.errorSummary(count));
      return;
    }
    setSummaryCount(0);
    setStatus("submitting");
    setLive(contactForm.submitting);

    const result = await submitContact(values);
    if (result.status === "sent") {
      form.reset();
      setLive(contactForm.success.title);
      setStatus("sent");
    } else if (result.status === "mailto") {
      setMailtoHref(result.href);
      setLive(contactForm.mailto.title);
      setStatus("mailto");
    } else {
      setMailtoHref(buildMailtoHref(values));
      setLive(contactForm.failure.title);
      setStatus("error");
    }
  };

  const reset = () => {
    setErrors({});
    setAttempt(0);
    setSummaryCount(0);
    setStatus("idle");
    setLive("");
  };

  const liveRegion = (
    <p aria-live="polite" className="sr-only">
      {live}
    </p>
  );

  if (status === "sent") {
    return (
      <div className={cn("border-t border-fg pt-8", className)}>
        {liveRegion}
        <Check size={32} className="text-fg-accent" />
        <Heading ref={successRef} tabIndex={-1} className="t-display-s mt-6 outline-none">
          {contactForm.success.title}
        </Heading>
        <p className="t-body mt-4 max-w-prose text-fg-muted">{contactForm.success.body}</p>
        <div className="mt-8">
          <MagneticButton variant="outline" onClick={reset}>
            {contactForm.success.again}
          </MagneticButton>
        </div>
      </div>
    );
  }

  const fieldError = (name: ContactFieldName) => errors[name];
  const common = (name: ContactFieldName) => ({
    id: fieldId(name),
    name,
    "aria-invalid": fieldError(name) ? (true as const) : undefined,
    "aria-describedby": describedBy(name, fieldError(name)),
    "aria-required": contactForm.fields[name].required || undefined,
    autoComplete: contactForm.fields[name].autoComplete,
    onBlur: (ev: { currentTarget: { value: string } }) => onBlur(name, ev.currentTarget.value),
    onInput: (ev: { currentTarget: { value: string } }) => onInput(name, ev.currentTarget.value),
  });

  const visibleErrors = CONTACT_FIELDS.filter((n) => errors[n]);

  return (
    <form
      id={CONTACT_FORM_ID}
      ref={formRef}
      noValidate
      onSubmit={onSubmit}
      aria-labelledby="kontaktskjema-tittel"
      aria-busy={status === "submitting" || undefined}
      className={cn("relative", className)}
    >
      {liveRegion}
      <Heading id="kontaktskjema-tittel" className="t-display-s">
        {contactForm.title}
      </Heading>
      <p className="t-body mt-3 max-w-prose text-fg-muted">{contactForm.intro}</p>
      <p className="t-small mt-2 text-fg-muted">{contactForm.requiredNote}</p>

      {summaryCount > 0 && visibleErrors.length > 0 ? (
        <div
          ref={summaryRef}
          tabIndex={-1}
          aria-labelledby="kontaktskjema-feil"
          className="mt-8 border border-danger p-5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <p id="kontaktskjema-feil" className="t-small flex items-center gap-2 font-medium text-danger">
            <Alert size={18} className="shrink-0" />
            {contactForm.errorSummary(visibleErrors.length)}
          </p>
          <ul className="t-small mt-3 grid gap-1">
            {visibleErrors.map((n) => (
              <li key={n}>
                <a
                  href={`#${fieldId(n)}`}
                  onClick={(ev) => {
                    ev.preventDefault();
                    document.getElementById(fieldId(n))?.focus();
                  }}
                  className="inline-flex min-h-8 items-center underline decoration-1 underline-offset-[0.25em] hover:decoration-2"
                >
                  {contactForm.fields[n].label}: {errors[n]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-7 md:grid-cols-2">
        <FieldShell name="navn" error={fieldError("navn")}>
          <input type="text" className={cn(controlClass, "min-h-12")} {...common("navn")} />
        </FieldShell>
        <FieldShell name="telefon" error={fieldError("telefon")}>
          <input type="tel" inputMode="tel" className={cn(controlClass, "min-h-12")} {...common("telefon")} />
        </FieldShell>
        <FieldShell name="epost" error={fieldError("epost")}>
          <input
            type="email"
            inputMode="email"
            spellCheck={false}
            autoCapitalize="off"
            className={cn(controlClass, "min-h-12")}
            {...common("epost")}
          />
        </FieldShell>
        <FieldShell name="prosjekttype" error={fieldError("prosjekttype")}>
          <div className="relative">
            <select
              ref={selectRef}
              defaultValue=""
              className={cn(controlClass, "min-h-12 appearance-none pr-12")}
              {...common("prosjekttype")}
            >
              <option value="">{contactForm.fields.prosjekttype.placeholder}</option>
              {contactForm.projectTypeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronRight
              size={18}
              className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 rotate-90 text-fg-muted"
            />
          </div>
        </FieldShell>
        <FieldShell name="adresse" error={fieldError("adresse")} className="md:col-span-2">
          <input type="text" className={cn(controlClass, "min-h-12")} {...common("adresse")} />
        </FieldShell>
        <FieldShell name="melding" error={fieldError("melding")} className="md:col-span-2">
          <textarea rows={6} className={cn(controlClass, "min-h-40 resize-y py-3")} {...common("melding")} />
        </FieldShell>
      </div>

      {/* Spam trap, hidden from people and assistive tech. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Ikke fyll ut dette feltet
          <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="mt-10 flex flex-col gap-5 border-t border-line pt-8 md:flex-row md:items-start md:justify-between">
        <div className="t-small max-w-[28rem] text-fg-muted">
          {!hasFormEndpoint ? (
            <p>
              {contactForm.mailtoNotice} <Missing label={company.missing.formEndpoint} />
            </p>
          ) : null}
          <p className={cn(!hasFormEndpoint && "mt-2")}>
            {contactForm.privacyNote}{" "}
            <Link
              href={contactForm.privacyLink.href}
              className="underline decoration-1 underline-offset-[0.25em] hover:decoration-2"
            >
              {contactForm.privacyLink.label}
            </Link>
          </p>
        </div>
        <MagneticButton type="submit" icon="arrow" size="lg" disabled={status === "submitting"} className="shrink-0">
          {status === "submitting" ? contactForm.submitting : contactForm.submit}
        </MagneticButton>
      </div>

      {status === "mailto" ? (
        <div role="status" className="mt-8 border-l border-fg pl-5">
          <p className="t-title">{contactForm.mailto.title}</p>
          <p className="t-body mt-2 text-fg-muted">{contactForm.mailto.body}</p>
          <p className="mt-4">
            <a
              href={mailtoHref}
              className="t-small inline-flex min-h-11 items-center underline decoration-1 underline-offset-[0.25em] hover:decoration-2"
            >
              {contactForm.mailto.reopen}
            </a>
          </p>
          <p className="t-small mt-2 text-fg-muted">{contactForm.mailto.noClient}</p>
        </div>
      ) : null}

      {status === "error" ? (
        <div role="alert" className="mt-8 border-l border-danger pl-5">
          <p className="t-title flex items-center gap-2 text-danger">
            <Alert size={20} className="shrink-0" />
            {contactForm.failure.title}
          </p>
          <p className="t-body mt-2 text-fg-muted">{contactForm.failure.body}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <MagneticButton type="submit" variant="outline" size="sm">
              {contactForm.failure.retry}
            </MagneticButton>
            <a
              href={mailtoHref}
              className="t-small inline-flex min-h-11 items-center underline decoration-1 underline-offset-[0.25em] hover:decoration-2"
            >
              {contactForm.failure.email}
            </a>
          </div>
        </div>
      ) : null}
    </form>
  );
}
