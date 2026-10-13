/**
 * Compact service card (services index, related services): image, title,
 * lede. The whole card is one link (the title link is stretched).
 */
import Link from "next/link";
import type { Service } from "@/content/types";
import { servicePath } from "@/lib/seo";
import { Icon } from "@/components/ui";
import { cn } from "@/lib/utils";
import { MediaFigure, serviceMedia } from "./Media";
import { sectionStrings } from "./strings";

interface ServiceCardProps {
  service: Service;
  headingLevel?: "h2" | "h3";
  sizes?: string;
  className?: string;
}

export function ServiceCard({
  service,
  headingLevel = "h2",
  sizes = "(min-width: 64rem) 30vw, (min-width: 48rem) 45vw, calc(100vw - 2rem)",
  className,
}: ServiceCardProps) {
  const Heading = headingLevel;
  const [media] = serviceMedia(service);
  return (
    <article className={cn("group/card relative flex flex-col", className)}>
      <MediaFigure
        media={media}
        sizes={sizes}
        aspect="4 / 3"
        cursorLabel="Se"
        missingLabel={`bilder av ${service.title.toLowerCase()}`}
        imgClassName="transition-transform duration-(--dur-slower) ease-expo group-hover/card:scale-[1.03] motion-reduce:transition-none"
      />
      <Heading className="t-display-s mt-6">
        <Link
          href={servicePath(service.slug)}
          className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-focus"
        >
          {service.title}
        </Link>
      </Heading>
      <p className="t-body mt-3 text-fg-muted">{service.lede}</p>
      <p aria-hidden="true" className="t-small mt-5 inline-flex items-center gap-2 font-medium">
        <span className="link-draw">{sectionStrings.readMore(service.title)}</span>
        <Icon.ArrowRight size={16} className="transition-transform duration-(--dur-slow) ease-expo group-hover/card:translate-x-1" />
      </p>
    </article>
  );
}
