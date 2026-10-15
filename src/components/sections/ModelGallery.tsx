"use client";

/**
 * "Bilder" on a house-model page: every image in a two-column grid, each with
 * its caption. A click (or Enter/Space) opens a native modal <dialog> with the
 * largest version (2560/3840 from the 4K source when one exists). The modal
 * dialog makes the rest of the page inert, Esc closes it, focus returns to the
 * image that opened it, and the arrow keys step through the images.
 */
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { RenderAsset } from "@/lib/images";
import { Icon, Picture, TextWithMissing } from "@/components/ui";
import { useLenis } from "@/components/providers";
import { cn } from "@/lib/utils";

export interface GalleryImage {
  key: string;
  asset: RenderAsset;
  /** Bigger version for the full view, or null to reuse `asset`. */
  large: RenderAsset | null;
  alt: string;
  caption: string;
}

interface ModelGalleryProps {
  images: readonly GalleryImage[];
  /** Visible [MANGLER] line under every caption. */
  missing: string;
  labels: { open: string; close: string; previous: string; next: string; dialog: string };
  className?: string;
}

export function ModelGallery({ images, missing, labels, className }: ModelGalleryProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  const lenis = useLenis();

  const open = (i: number, opener: HTMLButtonElement) => {
    openerRef.current = opener;
    setIndex(i);
  };
  const close = useCallback(() => dialogRef.current?.close(), []);

  // Show the dialog once it has content; stop smooth scrolling while it is open.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (index === null || !dialog) return;
    if (!dialog.open) {
      dialog.showModal();
      closeRef.current?.focus();
    }
    lenis?.stop();
    return () => {
      lenis?.start();
    };
  }, [index, lenis]);

  const onClose = () => {
    setIndex(null);
    openerRef.current?.focus();
  };

  const step = (delta: number) =>
    setIndex((i) => (i === null ? i : (i + delta + images.length) % images.length));

  const onKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      step(-1);
    }
  };

  const current = index === null ? null : images[index];

  return (
    <>
      <ul className={cn("grid-page gap-y-12", className)}>
        {images.map((img, i) => (
          <li key={img.key} className="col-span-full md:col-span-4 lg:col-span-6">
            <figure>
              <button
                type="button"
                onClick={(e) => open(i, e.currentTarget)}
                aria-haspopup="dialog"
                aria-label={`${labels.open}: ${img.alt}`}
                data-cursor-label={labels.open}
                className="group/img relative block aspect-video w-full cursor-zoom-in overflow-hidden bg-paper-deep"
              >
                <Picture
                  asset={img.asset}
                  alt=""
                  sizes="(min-width: 90rem) 40rem, (min-width: 64rem) 46vw, (min-width: 48rem) 45vw, calc(100vw - 2rem)"
                  fill
                  imgClassName="transition-transform duration-(--dur-slower) ease-expo group-hover/img:scale-[1.02] motion-reduce:transition-none"
                />
              </button>
              <figcaption className="t-caption mt-3 text-fg-muted">
                <span className="text-fg">{img.caption}</span> <TextWithMissing text={missing} />
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        onClose={onClose}
        onKeyDown={onKeyDown}
        onClick={(e) => {
          // A click on the backdrop (the dialog element itself) closes it.
          if (e.target === e.currentTarget) close();
        }}
        aria-label={labels.dialog}
        data-lenis-prevent=""
        data-tone="night"
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-night/95 p-0 text-snow backdrop:bg-night/80"
      >
        {current ? (
          <div className="flex h-full flex-col">
            <div className="container-page flex min-h-(--header-h) items-center justify-end gap-2">
              {images.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    aria-label={labels.previous}
                    className="inline-flex size-11 items-center justify-center"
                  >
                    <Icon.ArrowRight size={20} className="rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    aria-label={labels.next}
                    className="inline-flex size-11 items-center justify-center"
                  >
                    <Icon.ArrowRight size={20} />
                  </button>
                </>
              ) : null}
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                className="ml-2 inline-flex min-h-11 items-center gap-2 px-2 t-small font-medium"
              >
                {labels.close}
                <Icon.Close size={20} />
              </button>
            </div>
            <figure className="container-page flex min-h-0 flex-1 flex-col pb-6">
              <div className="relative min-h-0 flex-1" onClick={close}>
                <Picture
                  key={current.key}
                  asset={current.large ?? current.asset}
                  alt={current.alt}
                  sizes="100vw"
                  fill
                  imgClassName="object-contain!"
                />
              </div>
              <figcaption className="t-caption mt-4 text-fg-muted">
                <span className="text-fg">{current.caption}</span> <TextWithMissing text={missing} />
              </figcaption>
            </figure>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
