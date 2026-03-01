"use client";

// lib/ui/ListRow.tsx
import { ReactNode } from "react";
import CleanerCleaningLink from "./CleanerCleaningLink";

interface ListRowProps {
  href: string;
  children: ReactNode;
  isLast?: boolean;
  className?: string;
  ariaLabel?: string;
}

const rowBaseClass = `
  flex items-center gap-3
  py-3 px-3 sm:px-4 min-h-[44px]
  hover:bg-neutral-50
  active:opacity-95
  focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-inset
  transition-colors
  cursor-pointer
  touch-manipulation
  text-inherit
`;

/**
 * Fila clickeable para listas row.
 * Para enlaces a /cleaner/cleanings/[id] usa form GET (más fiable en móviles).
 * Para el resto usa <a> nativo.
 */
export default function ListRow({
  href,
  children,
  isLast = false,
  className = "",
  ariaLabel,
}: ListRowProps) {
  const fullClass = `${rowBaseClass} ${!isLast ? "border-b border-neutral-200" : ""} ${className}`.trim();

  if (href.match(/^\/cleaner\/cleanings\/[^/]+(\?|$)/)) {
    return (
      <CleanerCleaningLink href={href} className={fullClass} ariaLabel={ariaLabel}>
        {children}
      </CleanerCleaningLink>
    );
  }

  return (
    <a href={href} className={`block no-underline ${fullClass}`} aria-label={ariaLabel}>
      {children}
    </a>
  );
}

