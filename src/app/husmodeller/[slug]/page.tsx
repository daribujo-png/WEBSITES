/**
 * /husmodeller/<slug>/: one house model, prerendered for every entry in
 * src/content/house-models.ts. Lead image with the Taktype radios, facts and
 * summary, every image in a gallery with a full view, a link to the 3D build
 * on the home page (no second WebGL context here) and a prefilled
 * "Snakk med oss om …". Supplier images are shown as supplied, credited, with
 * the visible [MANGLER] for the rights agreement.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildMetadata, houseModelPath } from "@/lib/seo";
import { webPageJsonLd } from "@/lib/jsonld";
import { getHouseModel, houseModels, houseModelsCopy, resolveModelImage, roofLabels } from "@/content/house-models";
import { JsonLd, MagneticButton, RevealText, Section } from "@/components/ui";
import {
  CtaBand,
  HouseModelViewer,
  ModelFacts,
  ModelGallery,
  PageHero,
  modelCredit,
  modelMissing,
  viewerImages,
} from "@/components/sections";
import type { GalleryImage } from "@/components/sections/ModelGallery";

export const dynamicParams = false;

export function generateStaticParams() {
  return houseModels.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: PageProps<"/husmodeller/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const model = getHouseModel(slug);
  if (!model) return {};
  return buildMetadata({ title: model.metaTitle, description: model.metaDescription, path: houseModelPath(model.slug) });
}

export default async function HouseModelPage({ params }: PageProps<"/husmodeller/[slug]">) {
  const { slug } = await params;
  const model = getHouseModel(slug);
  if (!model) notFound();

  const gallery: GalleryImage[] = model.images.flatMap((image) => {
    const resolved = resolveModelImage(image);
    return resolved
      ? [{ key: image.key, asset: resolved.asset, large: resolved.large, alt: resolved.alt, caption: resolved.caption }]
      : [];
  });
  const lead = gallery[0];

  return (
    <>
      <JsonLd
        data={webPageJsonLd({
          name: `${model.name}, husmodell fra ${model.supplier.name}`,
          description: model.metaDescription,
          path: houseModelPath(model.slug),
          image: lead ? [...lead.asset.sources.webp].sort((a, b) => b.w - a.w)[0]?.src : undefined,
        })}
      />
      <PageHero
        title={model.name}
        lede={modelCredit(model)}
        crumbs={[
          { name: houseModelsCopy.title, path: "/husmodeller/" },
          { name: model.name, path: houseModelPath(model.slug) },
        ]}
      />

      <Section tone="paper" spacing="none" aria-label={`${houseModelsCopy.roofLegend}: ${model.name}`}>
        <HouseModelViewer
          layout="stack"
          name={`taktype-${model.slug}`}
          legend={houseModelsCopy.roofLegend}
          roofLabels={roofLabels}
          roofTypes={model.roofTypes}
          defaultRoof={model.defaultRoof}
          images={viewerImages(model)}
          credit={modelMissing(model)}
          sizes="(min-width: 90rem) 80rem, calc(100vw - 2rem)"
          priority
          className="max-w-[80rem]"
        />
      </Section>

      <Section tone="paper" labelledBy="fakta-tittel">
        <div className="grid-page gap-y-10">
          <div className="col-span-full lg:col-span-5">
            <RevealText as="h2" id="fakta-tittel" text={`${houseModelsCopy.factsLabel} ${model.name}`} className="t-display-m" />
            <p data-reveal="up" className="t-lead mt-6 max-w-prose text-fg-muted">
              {model.summary}
            </p>
          </div>
          <div className="col-span-full lg:col-span-6 lg:col-start-7 lg:pt-3">
            <ModelFacts model={model} />
          </div>
        </div>
      </Section>

      {gallery.length > 0 ? (
        <Section tone="chalk" labelledBy="bilder-tittel">
          <RevealText as="h2" id="bilder-tittel" text={houseModelsCopy.imagesTitle} className="t-display-m" />
          <ModelGallery
            images={gallery}
            missing={modelMissing(model)}
            labels={{
              open: houseModelsCopy.openImage,
              close: houseModelsCopy.closeImage,
              previous: houseModelsCopy.previousImage,
              next: houseModelsCopy.nextImage,
              dialog: `${houseModelsCopy.imagesTitle}: ${model.name}`,
            }}
            className="mt-12 lg:mt-16"
          />
        </Section>
      ) : null}

      {model.has3d ? (
        <Section tone="paper" spacing="sm" labelledBy="se-bygges">
          <div className="grid-page gap-y-8 border-t border-line pt-12 lg:items-end lg:pt-16">
            <div className="col-span-full lg:col-span-7">
              <RevealText as="h2" id="se-bygges" text={houseModelsCopy.build3dTitle} className="t-display-m" />
              <p data-reveal="up" className="t-lead mt-6 max-w-prose text-fg-muted">
                {houseModelsCopy.build3dBody}
              </p>
            </div>
            <div className="col-span-full lg:col-span-4 lg:col-start-9">
              <MagneticButton href="/#slik-bygger-vi" variant="outline" icon="arrow">
                {houseModelsCopy.build3dLink}
              </MagneticButton>
            </div>
          </div>
        </Section>
      ) : null}

      <CtaBand
        id="snakk-om-modellen"
        title={houseModelsCopy.talkAbout(model.name)}
        projectType="ny-bolig"
        message={houseModelsCopy.prefillMessage(model.name)}
        label={houseModelsCopy.talkAbout(model.name)}
      />
    </>
  );
}
