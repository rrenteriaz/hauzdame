"use client";

import { ReactNode } from "react";

/**
 * Enlace al detalle de limpieza que usa <form method="get"> en lugar de <a>.
 *
 * En móviles (especialmente iOS Safari) los enlaces/anclas pueden no registrar
 * el tap correctamente. La navegación por envío de formulario GET es más fiable
 * porque es un comportamiento nativo del navegador que no depende de eventos
 * touch/click en elementos ancla.
 */
export default function CleanerCleaningLink({
  href,
  children,
  className = "",
  ariaLabel,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  try {
    const [path, search] = href.split("?");
    const params = search ? new URLSearchParams(search) : new URLSearchParams();

    return (
      <form method="get" action={path} className="block m-0">
        {Array.from(params.entries()).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
        <button
          type="submit"
          className={`w-full text-left border-0 bg-transparent p-0 cursor-pointer font-inherit appearance-none [&::-webkit-appearance:none] touch-manipulation ${className}`}
          aria-label={ariaLabel}
        >
          {children}
        </button>
      </form>
    );
  } catch {
    return (
      <a href={href} className={className} aria-label={ariaLabel}>
        {children}
      </a>
    );
  }
}
