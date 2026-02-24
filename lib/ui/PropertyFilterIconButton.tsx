"use client";

import { useState } from "react";
import PropertyPickerSheet from "./PropertyPickerSheet";

interface Property {
  id: string;
  name: string;
  shortName?: string | null;
}

interface PropertyFilterIconButtonProps {
  properties: Property[];
  selectedPropertyId: string | "";
  onSelect: (propertyId: string | "") => void;
  className?: string;
}

/**
 * Botón tipo icono para filtrar por propiedad (similar al de Reservas)
 * Muestra un círculo con ícono de casa y label "Propiedad" debajo
 */
export default function PropertyFilterIconButton({
  properties,
  selectedPropertyId,
  onSelect,
  className = "",
}: PropertyFilterIconButtonProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const isActive = !!selectedPropertyId;

  const handleSelect = (propertyId: string | "") => {
    onSelect(propertyId);
    setIsSheetOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsSheetOpen(true)}
        className={`flex flex-col items-center gap-1.5 transition ${className} ${
          isActive ? "text-neutral-900" : "text-neutral-700"
        }`}
        aria-label="Filtrar por propiedad"
      >
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center border transition ${
            isActive
              ? "bg-neutral-900 border-neutral-900 text-white"
              : "bg-neutral-100 border-neutral-200 text-neutral-700"
          }`}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
            />
          </svg>
        </div>
        <span
          className={`text-xs ${
            isActive
              ? "text-neutral-900 font-medium"
              : "text-neutral-500"
          }`}
        >
          Propiedad
        </span>
      </button>

      {/* Bottom Sheet para seleccionar propiedad */}
      <PropertyPickerSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        properties={properties}
        selectedPropertyId={selectedPropertyId}
        onSelect={handleSelect}
      />
    </>
  );
}

