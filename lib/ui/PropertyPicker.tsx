"use client";

import { useState } from "react";
import PropertyPickerSheet from "./PropertyPickerSheet";
import CustomSelect from "./CustomSelect";

interface Property {
  id: string;
  name: string;
  shortName?: string | null;
}

interface PropertyPickerProps {
  properties: Property[];
  selectedPropertyId: string | "";
  onSelect: (propertyId: string | "") => void;
  label?: string;
  className?: string;
  showLabel?: boolean;
}

/**
 * Componente que muestra un selector de propiedad:
 * - En móvil: Botón tipo pill que abre un Bottom Sheet
 * - En desktop: CustomSelect dropdown
 */
export default function PropertyPicker({
  properties,
  selectedPropertyId,
  onSelect,
  label,
  className = "",
  showLabel = false,
}: PropertyPickerProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Encontrar la propiedad seleccionada
  const selectedProperty = selectedPropertyId
    ? properties.find((p) => p.id === selectedPropertyId)
    : null;

  // Preparar opciones para CustomSelect (desktop)
  const options = [
    { value: "", label: "Todas las propiedades" },
    ...properties
      .slice()
      .sort((a, b) => {
        const nameA = (a.shortName || a.name).toLowerCase();
        const nameB = (b.shortName || b.name).toLowerCase();
        return nameA.localeCompare(nameB, "es");
      })
      .map((property) => ({
        value: property.id,
        label: property.shortName || property.name,
      })),
  ];

  const handleSelect = (propertyId: string | "") => {
    onSelect(propertyId);
  };

  return (
    <>
      {/* Móvil: Botón pill que abre Bottom Sheet */}
      <div className={`sm:hidden ${className}`}>
        {showLabel && label && (
          <label className="block text-xs font-medium text-neutral-700 mb-1">
            {label}
          </label>
        )}
        <button
          type="button"
          onClick={() => setIsSheetOpen(true)}
          className="flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg bg-white hover:bg-neutral-50 transition shrink-0 w-full"
        >
          <span className="text-sm font-medium text-neutral-900 flex-1 text-left">
            {selectedProperty ? selectedProperty.shortName || selectedProperty.name : "Todas"}
          </span>
          <svg
            className="w-4 h-4 text-neutral-500 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {/* Desktop: CustomSelect */}
      <div className={`hidden sm:block ${className}`}>
        {showLabel && label && (
          <label className="block text-xs font-medium text-neutral-700 mb-1">
            {label}
          </label>
        )}
        <CustomSelect
          value={selectedPropertyId}
          onChange={handleSelect}
          options={options}
          placeholder="Todas las propiedades"
        />
      </div>

      {/* Bottom Sheet para móvil */}
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

