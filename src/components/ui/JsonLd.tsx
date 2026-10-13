import { serializeJsonLd, type JsonLdObject } from "@/lib/jsonld";

/** <script type="application/ld+json"> with "<" escaped. Server component. */
export function JsonLd({ data }: { data: JsonLdObject | JsonLdObject[] }) {
  return (
    <script
      type="application/ld+json"
      // JSON-LD is data, not executable code; serializeJsonLd escapes "<".
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
