/**
 * Contact form copy: labels, hints, errors and every state.
 * Validation + submission logic lives in src/lib/contact.ts.
 */
import { projectTypeOptions } from "./services";

export type ContactFieldName = "navn" | "telefon" | "epost" | "prosjekttype" | "adresse" | "melding";

export interface FieldCopy {
  label: string;
  /** Short helper text shown under the label (linked with aria-describedby). */
  hint?: string;
  placeholder?: string;
  autoComplete: string;
  required: boolean;
}

export const contactForm = {
  title: "Fortell oss om prosjektet",
  intro: "Skriv noen linjer om hva du vil bygge eller pusse opp, så tar vi kontakt for en uforpliktende samtale.",
  optional: "valgfritt",
  requiredNote: "Alle felt må fylles ut, unntatt de som er merket valgfritt.",
  fields: {
    navn: {
      label: "Navn",
      autoComplete: "name",
      required: true,
    },
    telefon: {
      label: "Telefon",
      hint: "Så vi kan ringe deg tilbake.",
      autoComplete: "tel",
      required: true,
    },
    epost: {
      label: "E-post",
      autoComplete: "email",
      required: true,
    },
    prosjekttype: {
      label: "Hva gjelder det?",
      placeholder: "Velg type prosjekt",
      autoComplete: "off",
      required: true,
    },
    adresse: {
      label: "Adresse eller tomt",
      hint: "Hjelper oss å forberede befaringen.",
      autoComplete: "street-address",
      required: false,
    },
    melding: {
      label: "Fortell kort om prosjektet",
      hint: "Hva vil du gjøre, og når ønsker du å starte?",
      autoComplete: "off",
      required: true,
    },
  } satisfies Record<ContactFieldName, FieldCopy>,
  projectTypeOptions,
  errors: {
    navn: { empty: "Skriv inn navnet ditt." },
    telefon: {
      empty: "Skriv inn telefonnummeret ditt.",
      invalid: "Telefonnummeret ser ikke riktig ut. Bruk åtte sifre, for eksempel 912 34 567.",
    },
    epost: {
      empty: "Skriv inn e-postadressen din.",
      invalid: "E-postadressen mangler noe. Sjekk at den har med @ og et domene, for eksempel navn@epost.no.",
    },
    prosjekttype: { empty: "Velg hva prosjektet gjelder." },
    adresse: {},
    melding: {
      empty: "Skriv noen ord om prosjektet.",
      tooShort: "Skriv litt mer, gjerne et par setninger om hva du ønsker.",
    },
  },
  /** Shown above the form when submit finds errors. Focus moves here. */
  errorSummary: (count: number) =>
    count === 1 ? "Ett felt må rettes før du sender." : `${count} felt må rettes før du sender.`,
  submit: "Send forespørsel",
  submitting: "Sender …",
  /** Shown next to the button when no form endpoint is configured. */
  mailtoNotice: "Når du sender, åpnes e-postprogrammet ditt med meldingen ferdig utfylt.",
  privacyNote: "Vi bruker opplysningene bare til å svare på henvendelsen din.",
  privacyLink: { label: "Les personvernerklæringen", href: "/personvern/" },
  success: {
    title: "Takk, vi har fått meldingen din.",
    body: "Vi tar kontakt for en uforpliktende samtale. Haster det, ring oss på 94\u00a001\u00a066\u00a010.",
    again: "Send en ny melding",
  },
  failure: {
    title: "Meldingen ble ikke sendt.",
    body: "Noe gikk galt underveis, kanskje med nettforbindelsen. Prøv igjen, eller send oss en e-post på post@byggrv.no.",
    retry: "Prøv igjen",
    email: "Skriv e-post i stedet",
  },
  mailto: {
    title: "Fullfør i e-postprogrammet ditt",
    body: "Vi åpnet en ferdig utfylt e-post til post@byggrv.no. Trykk send der for å sende forespørselen.",
    reopen: "Åpne e-posten på nytt",
    noClient: "Skjer det ingenting? Send en e-post til post@byggrv.no eller ring 94\u00a001\u00a066\u00a010.",
    subject: (type: string) => `Forespørsel fra byggrv.no: ${type}`,
  },
} as const;
