"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback } from "react";

interface BackChevronProps {
  href?: string;
  className?: string;
  size?: "sm" | "md";
}

/**
 * Componente reutilizable para navegación "Volver" con chevron izquierdo.
 * 
 * Especificaciones:
 * - Chevron izquierdo elegante y minimalista (outline)
 * - Tamaño: 20-24px mobile, 16-20px desktop
 * - Color: muted/secondary por defecto, foreground/primary en hover
 * - Hit-area: p-2 o p-2.5 para área táctil cómoda
 * - Hover sutil: translate-x ligeramente hacia la izquierda
 * - Accesibilidad: aria-label="Volver" + focus-visible ring
 */
export default function BackChevron({
  href,
  className = "",
  size = "md",
}: BackChevronProps) {
  const router = useRouter();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      router.back();
    },
    [router]
  );

  const sizeClasses = size === "sm" ? "w-4 h-4 sm:w-3.5 sm:h-3.5" : "w-5 h-5 sm:w-4 sm:h-4";

  const buttonClasses = `inline-flex items-center justify-center p-2 text-neutral-400 hover:text-neutral-900 transition-all duration-150 ease-in-out hover:-translate-x-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 rounded-md ${className}`;

  const chevronSvg = (
    <svg
      className={sizeClasses}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19l-7-7 7-7"
      />
    </svg>
  );

  // Si hay href, usar botón con router.push para navegación explícita
  const handleLinkClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (href) {
        router.push(href);
      }
    },
    [router, href]
  );

  if (href) {
    return (
      <button
        type="button"
        onClick={handleLinkClick}
        aria-label="Volver"
        className={buttonClasses}
      >
        {chevronSvg}
      </button>
    );
  }

  // Si no hay href, usar botón con router.back()
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Volver"
      className={buttonClasses}
    >
      {chevronSvg}
    </button>
  );
}

