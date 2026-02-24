"use client";

import BackChevron from "./BackChevron";

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  showBack?: boolean;
  backHref?: string;
  rightActions?: React.ReactNode;
  className?: string;
  variant?: "default" | "compact";
}

/**
 * Componente reutilizable para encabezados de página consistentes.
 * 
 * Layout:
 * - Fila 1: [BackChevron opcional + Title] / [rightActions opcional]
 * - Fila 2: subtitle con spacing adecuado
 * - Title con truncate para evitar overflow en móvil
 * - rightActions no empuja el título fuera
 */
export default function PageHeader({
  title,
  subtitle,
  showBack = false,
  backHref,
  rightActions,
  className = "",
  variant = "default",
}: PageHeaderProps) {
  const titleSize = variant === "compact" ? "text-xl" : "text-2xl";
  const subtitleMargin = variant === "compact" ? "mt-1" : "mt-2";
  const spacingClass = variant === "compact" ? "space-y-1" : "space-y-2";

  return (
    <header className={`${spacingClass} ${className}`}>
      {/* Fila 1: Título y acciones */}
      <div className="flex items-start justify-between gap-3">
        {/* Izquierda: BackChevron + Title */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {showBack && (
            <div className="shrink-0 -ml-2">
              <BackChevron href={backHref} />
            </div>
          )}
          <h1 className={`${titleSize} font-semibold tracking-tight text-neutral-900 min-w-0 truncate`}>
            {title}
          </h1>
        </div>

        {/* Derecha: Acciones */}
        {rightActions && (
          <div className="shrink-0">
            {rightActions}
          </div>
        )}
      </div>

      {/* Fila 2: Subtítulo */}
      {subtitle && (
        <div className={subtitleMargin}>
          {typeof subtitle === "string" ? (
            <p className="text-base text-neutral-600 leading-relaxed">
              {subtitle}
            </p>
          ) : (
            <div className="text-base text-neutral-600 leading-relaxed">
              {subtitle}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
