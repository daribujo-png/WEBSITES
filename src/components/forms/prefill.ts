/** Shared ids and the event used to preselect the project type in the contact form. */
export const CONTACT_FORM_ID = "kontaktskjema";
/** Section on the home page that holds the form (sectionIds.contact). */
export const CONTACT_SECTION_ID = "kontakt";
export const PREFILL_EVENT = "byggrv:prefill-contact";
/** Query parameter read by the form on load: /kontakt/?prosjekt=ny-bolig */
export const PREFILL_PARAM = "prosjekt";
/** Optional start of the message: /kontakt/?prosjekt=ny-bolig&melding=… (only fills an empty field). */
export const PREFILL_MESSAGE_PARAM = "melding";
/** Longest prefilled message we accept from a link. */
export const PREFILL_MESSAGE_MAX = 300;

export interface PrefillDetail {
  prosjekttype: string;
  melding?: string;
}
