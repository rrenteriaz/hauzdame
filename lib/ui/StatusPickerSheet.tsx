"use client";

import BottomSheet from "./BottomSheet";

interface StatusOption {
  value: string;
  label: string;
}

interface StatusPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  options: StatusOption[];
  selectedStatus: string;
  onSelect: (status: string) => void;
  title?: string;
}

export default function StatusPickerSheet({
  isOpen,
  onClose,
  options,
  selectedStatus,
  onSelect,
  title = "Seleccionar estado",
}: StatusPickerSheetProps) {
  const handleSelect = (status: string) => {
    onSelect(status);
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title} maxHeight="80vh">
      <div className="px-6 py-4">
        {options.map((option) => {
          const isSelected = selectedStatus === option.value;
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
    </BottomSheet>
  );
}

