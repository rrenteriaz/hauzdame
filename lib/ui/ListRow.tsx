"use client";

// lib/ui/ListRow.tsx
import { useRouter } from "next/navigation";
import { ReactNode, KeyboardEvent } from "react";

interface ListRowProps {
  href: string;
  children: ReactNode;
  isLast?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * Fila clickeable para listas row.
 * Layout: flex items-center gap-3
 * Padding: py-3 px-3 sm:px-4
 * Separador: border-b (excepto último item)
 * Estados: hover, active, focus-visible
 * 
 * Usa navegación programática para evitar anidación de <a> cuando hay links internos.
 */
export default function ListRow({
  href,
  children,
  isLast = false,
  className = "",
  ariaLabel,
}: ListRowProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Si el click viene de un link interno, no navegar
    const target = e.target as HTMLElement;
    const clickedLink = target.closest("a");
    if (clickedLink) {
      return;
    }
    router.push(href);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Si el foco está en un link interno, no manejar
    const target = e.target as HTMLElement;
    if (target.closest("a")) {
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      router.push(href);
    } else if (e.key === " ") {
      // Prevenir scroll con Space
      e.preventDefault();
      router.push(href);
    }
  };

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        flex items-center gap-3
        py-3 px-3 sm:px-4
        ${!isLast ? "border-b border-neutral-200" : ""}
        hover:bg-neutral-50
        active:opacity-95
        focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-inset
        transition-colors
        cursor-pointer
        ${className}
      `.trim()}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

