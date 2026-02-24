"use client";

/**
 * Botón wrapper para abrir el nuevo wizard de inventario
 * Compatible con la API de AddInventoryItemModal (solo creación, no edición)
 */

import { useState } from "react";
import AddInventoryItemWizard from "./AddInventoryItemWizard";

interface AddInventoryItemButtonProps {
  propertyId: string;
  lineId?: string; // Si se proporciona, el componente está en modo edición (no soportado en wizard nuevo)
  onClose?: () => void; // Callback opcional para cuando se cierra
}

export default function AddInventoryItemButton({
  propertyId,
  lineId,
  onClose,
}: AddInventoryItemButtonProps) {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Si está en modo edición, no mostrar nada (el wizard nuevo solo soporta creación)
  // TODO: En el futuro, crear un componente de edición separado si es necesario
  if (lineId) {
    return null;
  }

  const handleOpen = () => {
    setIsWizardOpen(true);
  };

  const handleClose = () => {
    setIsWizardOpen(false);
    onClose?.();
  };

  return (
    <>
      {/* Botón para abrir el wizard */}
      <button
        type="button"
        onClick={handleOpen}
        className="px-4 py-2 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition text-sm sm:text-base"
      >
        + Agregar ítem
      </button>

      {/* Wizard */}
      <AddInventoryItemWizard
        propertyId={propertyId}
        isOpen={isWizardOpen}
        onClose={handleClose}
        onSuccess={() => {
          // El wizard maneja el toast internamente
        }}
      />
    </>
  );
}

