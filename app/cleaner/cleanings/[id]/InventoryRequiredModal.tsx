"use client";

interface InventoryRequiredModalProps {
  isOpen: boolean;
  cleaningId: string;
  onClose: () => void;
  onGoToInventory: () => void; // Callback para expandir y hacer scroll
}

export default function InventoryRequiredModal({
  isOpen,
  cleaningId,
  onClose,
  onGoToInventory,
}: InventoryRequiredModalProps) {
  if (!isOpen) return null;

  const handleGoToInventory = () => {
    onGoToInventory();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 mb-2">
            Falta enviar el inventario
          </h2>
          <p className="text-sm text-neutral-600">
            Debes enviar la revisión del inventario antes de terminar la limpieza.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleGoToInventory}
            className="flex-1 px-4 py-2 rounded-lg bg-black text-base font-medium text-white hover:bg-neutral-800 active:scale-[0.99] transition"
          >
            Ir a inventario
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-neutral-300 text-base font-medium text-neutral-700 hover:bg-neutral-50 transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

