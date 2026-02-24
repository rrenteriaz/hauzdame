"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { BED_SIZE_VARIANT, type VariantOption } from "@/lib/inventory-suggestions";

interface CreateCustomItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; variantKey: string | null; variantLabel: string | null }) => void;
  category: string;
}

export default function CreateCustomItemModal({
  isOpen,
  onClose,
  onSave,
  category,
}: CreateCustomItemModalProps) {
  const [itemName, setItemName] = useState("");
  const [hasVariant, setHasVariant] = useState(false);
  const [selectedVariantKey, setSelectedVariantKey] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Variantes disponibles (por ahora solo bed_size, pero se puede extender)
  const availableVariants = [
    {
      key: "bed_size",
      label: "Tamaño de cama",
      options: BED_SIZE_VARIANT.variantOptions,
    },
  ];

  // Resetear formulario cuando se abre
  useEffect(() => {
    if (isOpen) {
      setItemName("");
      setHasVariant(false);
      setSelectedVariantKey("");
      setError(null);
      // Focus en el input de nombre
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setItemName("");
    setHasVariant(false);
    setSelectedVariantKey("");
    setError(null);
    onClose();
  }, [onClose]);

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

  // Cerrar modal con Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, handleClose]);

  const handleSave = () => {
    // Validaciones
    if (!itemName.trim()) {
      setError("El nombre del ítem es obligatorio");
      return;
    }

    if (itemName.trim().length > 120) {
      setError("El nombre del ítem no puede tener más de 120 caracteres");
      return;
    }

    if (hasVariant && !selectedVariantKey) {
      setError("Debes seleccionar un tipo de variante");
      return;
    }

    // Guardar
    const selectedVariant = availableVariants.find((v) => v.key === selectedVariantKey);
    onSave({
      name: itemName.trim(),
      variantKey: hasVariant && selectedVariantKey ? selectedVariantKey : null,
      variantLabel: hasVariant && selectedVariant ? selectedVariant.label : null,
    });

    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-xs rounded-2xl border border-neutral-200 bg-white shadow-xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">
            Crear ítem personalizado
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Contenido */}
        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          {/* Mensaje de error */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Nombre del ítem */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Nombre del ítem *
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={itemName}
              onChange={(e) => {
                setItemName(e.target.value);
                setError(null);
              }}
              placeholder="Ej: Sofá cama, Mesa plegable..."
              required
              maxLength={120}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-300"
            />
          </div>

          {/* Checkbox para variantes */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasVariant}
                onChange={(e) => {
                  setHasVariant(e.target.checked);
                  if (!e.target.checked) {
                    setSelectedVariantKey("");
                  }
                  setError(null);
                }}
                className="w-4 h-4 text-neutral-900 border-neutral-300 rounded focus:ring-2 focus:ring-neutral-300"
              />
              <span className="text-sm font-medium text-neutral-700">
                Este ítem tiene variantes
              </span>
            </label>
          </div>

          {/* Selector de tipo de variante */}
          {hasVariant && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Tipo de variante *
              </label>
              <select
                value={selectedVariantKey}
                onChange={(e) => {
                  setSelectedVariantKey(e.target.value);
                  setError(null);
                }}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-300 bg-white"
              >
                <option value="">Selecciona un tipo...</option>
                {availableVariants.map((variant) => (
                  <option key={variant.key} value={variant.key}>
                    {variant.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-neutral-200 px-4 py-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-lg border border-neutral-300 bg-white text-base font-medium text-neutral-700 hover:bg-neutral-50 transition active:scale-[0.99]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-base font-medium hover:bg-neutral-800 transition active:scale-[0.99]"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

