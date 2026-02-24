"use client";

interface ConfirmDeleteReportModalProps {
  isOpen: boolean;
  itemName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmDeleteReportModal({
  isOpen,
  itemName,
  onClose,
  onConfirm,
}: ConfirmDeleteReportModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">
            Eliminar reporte
          </h2>
          <p className="text-sm text-neutral-600 mt-1">
            ¿Estás seguro de que quieres eliminar este reporte?
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-sm text-neutral-700">
            El reporte del item <span className="font-medium">&quot;{itemName}&quot;</span> será eliminado permanentemente.
          </p>
          <p className="text-xs text-neutral-500 mt-2">
            Esta acción no se puede deshacer.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

