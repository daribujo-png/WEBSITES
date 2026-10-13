import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ContainerSize = "page" | "wide" | "full";

const sizeClass: Record<ContainerSize, string> = {
  /** 1440px frame with fluid side gutters (16px on phones). */
  page: "container-page",
  /** 1792px frame for full-bleed media rows. */
  wide: "container-wide",
  /** Edge to edge, gutters only. */
  full: "w-full px-gutter",
};

type ContainerProps<T extends ElementType> = {
  as?: T;
  size?: ContainerSize;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

/** Horizontal frame: max width + side gutters. Use inside <Section>. */
export function Container<T extends ElementType = "div">({
  as,
  size = "page",
  className,
  children,
  ...rest
}: ContainerProps<T>) {
  // Narrowed to one tag so React Three Fiber's JSX elements (global JSX
  // augmentation) don't collapse the union of intrinsic props to `never`.
  const Tag = (as ?? "div") as "div";
  return (
    <Tag className={cn(sizeClass[size], className)} {...(rest as ComponentPropsWithoutRef<"div">)}>
      {children}
    </Tag>
  );
}
