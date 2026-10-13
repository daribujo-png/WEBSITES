/**
 * Personvernerklæring (draft). Must be approved by the client before launch.
 * Paragraph strings may contain [MANGLER: …] tokens; render with <TextWithMissing>.
 */
export const privacy = {
  title: "Personvern",
  lede: "Slik behandler vi opplysningene du sender oss. Nettstedet har ingen sporing og ingen analyseverktøy.",
  sections: [
    {
      id: "ansvarlig",
      title: "Hvem er ansvarlig",
      body: [
        "Bygg og Renovering Vest AS, Breisteinvegen 206, 5111 Breistein, er behandlingsansvarlig for opplysningene du sender oss. Org.nr. [MANGLER: org.nr.]",
        "Spørsmål om personvern sender du til post@byggrv.no. [MANGLER: kontaktperson for personvern]",
      ],
    },
    {
      id: "hva",
      title: "Hva vi samler inn",
      body: [
        "Når du bruker kontaktskjemaet, får vi navnet ditt, telefonnummer, e-postadresse, hva prosjektet gjelder, adresse eller tomt hvis du oppgir det, og meldingen din. Ringer du eller sender e-post, får vi de opplysningene du selv gir oss.",
      ],
    },
    {
      id: "hvorfor",
      title: "Hvorfor vi bruker opplysningene",
      body: [
        "Vi bruker opplysningene bare til å svare på henvendelsen, gi deg et tilbud og gjennomføre et eventuelt oppdrag.",
        "Grunnlaget for behandlingen er at du ber oss ta kontakt før en mulig avtale, jf. personvernforordningen artikkel 6 nr. 1 bokstav b.",
      ],
    },
    {
      id: "lagring",
      title: "Hvor lenge vi lagrer",
      body: [
        "Vi lagrer henvendelsen så lenge det trengs for å svare deg og følge opp et eventuelt oppdrag. [MANGLER: lagringstid for henvendelser]",
      ],
    },
    {
      id: "tilgang",
      title: "Hvem som får tilgang",
      body: [
        "Skjemaet sendes gjennom en ekstern skjematjeneste som behandler opplysningene på våre vegne. [MANGLER: navn på skjematjeneste og databehandleravtale]",
        "Åpner skjemaet e-postprogrammet ditt i stedet, sendes meldingen som en vanlig e-post fra deg til oss.",
      ],
    },
    {
      id: "sporing",
      title: "Informasjonskapsler og sporing",
      body: [
        "Nettstedet bruker ingen informasjonskapsler for sporing eller analyse. Skrifter, bilder og 3D-modell lastes fra vår egen server.",
        "Lenken til kartet åpner Google Maps i en ny fane. Der gjelder Googles egne personvernregler.",
      ],
    },
    {
      id: "rettigheter",
      title: "Dine rettigheter",
      body: [
        "Du kan be om innsyn i, retting av og sletting av opplysningene vi har om deg, og du kan protestere mot behandlingen. Send en e-post til post@byggrv.no.",
        "Mener du at vi behandler opplysningene dine i strid med reglene, kan du klage til Datatilsynet.",
      ],
    },
  ],
  updated: "Sist oppdatert: [MANGLER: godkjenning av personvernerklæringen]",
} as const;
