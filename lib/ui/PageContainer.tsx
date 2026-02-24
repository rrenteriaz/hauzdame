import { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  size?: "default" | "wide" | "full";
  spacing?: "none" | "default" | "compact";
  as?: "main" | "div";
}

/**
 * Contenedor estándar para páginas que unifica padding, max-width y espaciado.
 * 
 * Características:
 * - Max-width configurable (default/wide/full)
 * - Centrado automático (mx-auto)
 * - Padding adicional opcional (none/default/compact) - por defecto "none" para evitar doble padding con AppShell
 * - Elemento renderizable configurable (main/div)
 * 
 * NOTA: El padding base viene del <main> en AppShell. Use spacing="default" o "compact" solo si necesita padding adicional.
 */
export default function PageContainer({
  children,
  className = "",
  size = "default",
  spacing = "none",
  as: Component = "main",
}: PageContainerProps) {
  // Padding adicional según spacing (none por defecto para evitar doble padding)
  const additionalPadding = 
    spacing === "none" ? "" :
    spacing === "compact" ? "py-3 sm:py-4" :
    "py-4 sm:py-6"; // default
  
  // Max-width según size (ajustado: default usa max-w-6xl para consistencia)
  const maxWidthClass = 
    size === "full" ? "max-w-none" :
    size === "wide" ? "max-w-6xl" :
    "max-w-6xl"; // default
  
  const combinedClassName = `${additionalPadding} ${maxWidthClass} mx-auto w-full ${className}`.trim();

  return (
    <Component className={combinedClassName}>
      {children}
    </Component>
  );
}

