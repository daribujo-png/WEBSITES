/** Old address byggrv.no/ny-bolig/ → /tjenester/ny-bolig/ (static redirect page). */
import { LegacyRedirect, legacyMetadata } from "@/components/sections";
import { getService } from "@/content/services";
import { servicePath } from "@/lib/seo";

const TO = servicePath("ny-bolig");

export const metadata = legacyMetadata(TO);

export default function NyBoligRedirect() {
  return <LegacyRedirect to={TO} label={getService("ny-bolig")?.title ?? TO} />;
}
