"use client";

interface IconFilterButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Botón tipo icono para filtros (similar al de Reservas)
 * Círculo con ícono + label debajo
 */
export default function IconFilterButton({
  icon,
  label,
  active,
  onClick,
  disabled = false,
  className = "",
}: IconFilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1.5 transition shrink-0 w-20 ${className} ${
        active ? "text-neutral-900" : "text-neutral-700"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      aria-label={`Filtrar por ${label.toLowerCase()}`}
    >
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center border transition ${
          active
            ? "bg-neutral-900 border-neutral-900 text-white"
            : "bg-neutral-100 border-neutral-200 text-neutral-700"
        }`}
      >
        {icon}
      </div>
      <span
        className={`text-xs ${
          active
            ? "text-neutral-900 font-medium"
            : "text-neutral-500"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

