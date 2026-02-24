// app/host/properties/[id]/inventory/ConfirmAddPhotosModal.tsx
"use client";

interface ConfirmAddPhotosModalProps {
  isOpen: boolean;
  itemName?: string;
  onAddPhotos: () => void;
  onSkip: () => void;
}

export default function ConfirmAddPhotosModal({
  isOpen,
  itemName,
  onAddPhotos,
  onSkip,
}: ConfirmAddPhotosModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onSkip();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">
            ¿Agregar fotos?
          </h2>
        </div>

        <div className="px-6 py-5">
          <p className="text-base text-neutral-700">
            {itemName
              ? `¿Quieres agregar fotos a "${itemName}" ahora o después?`
              : "¿Quieres agregar fotos ahora o después?"}
          </p>
          <p className="text-sm text-neutral-500 mt-2">
            Puedes agregar hasta 3 fotos para ayudar a identificar este ítem.
          </p>
        </div>

        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-end gap-3 rounded-b-lg">
          <button
            type="button"
            onClick={onSkip}
            className="px-4 py-2 text-base font-medium text-neutral-700 hover:text-neutral-900 transition"
          >
            Después
          </button>
          <button
            type="button"
            onClick={onAddPhotos}
            className="px-4 py-2 rounded-lg bg-black text-base font-medium text-white hover:bg-neutral-800 active:scale-[0.99] transition"
          >
            Agregar fotos
          </button>
        </div>
      </div>
    </div>
  );
}

