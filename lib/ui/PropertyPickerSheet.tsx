"use client";

import { useEffect, useRef, useState } from "react";
import BottomSheet from "./BottomSheet";

interface Property {
  id: string;
  name: string;
  shortName?: string | null;
}

interface PropertyPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  selectedPropertyId: string | "";
  onSelect: (propertyId: string | "") => void;
  title?: string;
}

export default function PropertyPickerSheet({
  isOpen,
  onClose,
  properties,
  selectedPropertyId,
  onSelect,
  title = "Seleccionar propiedad",
}: PropertyPickerSheetProps) {
  // Ordenar propiedades alfabéticamente
  const sortedProperties = properties
    .slice()
    .sort((a, b) => {
      const nameA = (a.shortName || a.name).toLowerCase();
      const nameB = (b.shortName || b.name).toLowerCase();
      return nameA.localeCompare(nameB, "es");
    });

  const handleSelect = (propertyId: string | "") => {
    onSelect(propertyId);
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title} maxHeight="80vh">
      <div className="px-6 py-4">
        {/* Opción "Todas las propiedades" */}
        <button
          type="button"
          onClick={() => handleSelect("")}
          className={`w-full px-4 py-3 text-left rounded-lg transition flex items-center justify-between ${
            !selectedPropertyId
              ? "bg-neutral-100 font-medium text-neutral-900"
              : "text-neutral-700 hover:bg-neutral-50"
          }`}
        >
          <span>Todas las propiedades</span>
          {!selectedPropertyId && (
            <svg
              className="w-5 h-5 text-neutral-600 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </button>

        {/* Lista de propiedades */}
        <div className="mt-2 space-y-1">
          {sortedProperties.map((property) => {
            const isSelected = selectedPropertyId === property.id;
            return (
              <button
                key={property.id}
                type="button"
                onClick={() => handleSelect(property.id)}
                className={`w-full px-4 py-3 text-left rounded-lg transition flex items-center justify-between ${
                  isSelected
                    ? "bg-neutral-100 font-medium text-neutral-900"
                    : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                <span>{property.shortName || property.name}</span>
                {isSelected && (
                  <svg
                    className="w-5 h-5 text-neutral-600 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </BottomSheet>
  );
}

