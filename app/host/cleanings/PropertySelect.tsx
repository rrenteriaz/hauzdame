"use client";

import { useState, useEffect, useRef, useMemo } from "react";

interface Property {
  id: string;
  name: string;
  shortName?: string | null;
}

interface PropertySelectProps {
  value: string; // propertyId
  onChange: (propertyId: string) => void;
  properties: Property[];
  className?: string;
  required?: boolean;
}

export default function PropertySelect({
  value,
  onChange,
  properties,
  className = "",
  required = false,
}: PropertySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Ordenar propiedades alfabéticamente por shortName o name (memoizado)
  const sortedProperties = useMemo(() => {
    return [...properties].sort((a, b) => {
      const nameA = (a.shortName || a.name || "").toLowerCase();
      const nameB = (b.shortName || b.name || "").toLowerCase();
      return nameA.localeCompare(nameB, "es");
    });
  }, [properties]);

  const selectedProperty = sortedProperties.find((p) => p.id === value);
  const displayText = selectedProperty
    ? selectedProperty.shortName || selectedProperty.name
    : "Selecciona una propiedad";

  const handleOpen = () => {
    if (properties.length > 0) {
      setIsOpen(true);
    }
  };

  const handleClose = () => setIsOpen(false);

  const handleSelect = (propertyId: string) => {
    onChange(propertyId);
    handleClose();
  };

  // Cerrar modal con Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <input
        type="text"
        value={displayText}
        onClick={handleOpen}
        readOnly
        required={required}
        className={`w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500 cursor-pointer bg-white ${className}`}
        placeholder="Selecciona una propiedad"
      />

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal */}
          <div
            ref={modalRef}
            className="relative z-10 w-full max-w-xs rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl max-h-[60vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-4 text-center">
              Seleccionar propiedad
            </h3>

            <div className="flex-1 overflow-y-auto space-y-1">
              {sortedProperties.length === 0 ? (
                <p className="text-base text-neutral-500 text-center py-4">
                  No hay propiedades disponibles
                </p>
              ) : (
                sortedProperties.map((property) => {
                  const isSelected = property.id === value;
                  return (
                    <button
                      key={property.id}
                      type="button"
                      onClick={() => handleSelect(property.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-base transition ${
                        isSelected
                          ? "bg-black text-white font-medium"
                          : "text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100"
                      }`}
                    >
                      {property.shortName || property.name}
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex justify-center items-center gap-2 pt-4 border-t border-neutral-100 mt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base font-medium text-neutral-700 hover:bg-neutral-50 transition active:scale-[0.99]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

