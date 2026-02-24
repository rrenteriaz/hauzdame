"use client";

import BottomSheet from "./BottomSheet";

interface Option {
  value: string;
  label: string;
}

interface OptionPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  options: Option[];
  selectedValue: string | "";
  onSelect: (value: string | "") => void;
  includeAllOption?: {
    value: string;
    label: string;
  };
}

/**
 * Bottom Sheet genérico para seleccionar opciones (reutilizable para cualquier filtro)
 * Basado en PropertyPickerSheet pero genérico
 */
export default function OptionPickerSheet({
  isOpen,
  onClose,
  title,
  options,
  selectedValue,
  onSelect,
  includeAllOption,
}: OptionPickerSheetProps) {
  const handleSelect = (value: string | "") => {
    onSelect(value);
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title} maxHeight="80vh">
      <div className="px-6 py-4">
        {/* Opción "Todas" / "Todos" si se incluye */}
        {includeAllOption && (
          <button
            type="button"
            onClick={() => handleSelect(includeAllOption.value)}
            className={`w-full px-4 py-3 text-left rounded-lg transition flex items-center justify-between ${
              !selectedValue || selectedValue === includeAllOption.value
                ? "bg-neutral-100 font-medium text-neutral-900"
                : "text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            <span>{includeAllOption.label}</span>
            {(!selectedValue || selectedValue === includeAllOption.value) && (
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
        )}

        {/* Lista de opciones */}
        <div className={includeAllOption ? "mt-2 space-y-1" : "space-y-1"}>
          {options.map((option) => {
            const isSelected = selectedValue === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full px-4 py-3 text-left rounded-lg transition flex items-center justify-between ${
                  isSelected
                    ? "bg-neutral-100 font-medium text-neutral-900"
                    : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                <span>{option.label}</span>
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

