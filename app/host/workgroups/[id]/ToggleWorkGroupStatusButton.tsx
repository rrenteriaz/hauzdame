"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ConfirmModal";
import { toggleWorkGroupStatus } from "../actions";

interface ToggleWorkGroupStatusButtonProps {
  workGroupId: string;
  currentStatus: "ACTIVE" | "INACTIVE";
  canEdit: boolean;
}

export default function ToggleWorkGroupStatusButton({
  workGroupId,
  currentStatus,
  canEdit,
}: ToggleWorkGroupStatusButtonProps) {
  const router = useRouter();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isActive = currentStatus === "ACTIVE";
  const targetStatus = isActive ? "INACTIVE" : "ACTIVE";

  const handleToggle = () => {
    setIsConfirmOpen(true);
    setError(null);
  };

  const handleConfirm = () => {
    setIsConfirmOpen(false);
    setError(null);

    startTransition(async () => {
      try {
        await toggleWorkGroupStatus(workGroupId, targetStatus);
        // Refrescar la página para mostrar el nuevo status
        router.refresh();
        // Mostrar feedback de éxito (simple alert como fallback, ya que no hay sistema de toast)
        // El refresh mostrará el nuevo estado visualmente
      } catch (err: any) {
        console.error("Error al cambiar el status del grupo de trabajo:", err);
        const errorMessage = err?.message || "Error al cambiar el status. Por favor, intenta de nuevo.";
        setError(errorMessage);
        // Mostrar error también en alert para mayor visibilidad
        alert(errorMessage);
      }
    });
  };

  const handleClose = () => {
    setIsConfirmOpen(false);
    setError(null);
  };

  if (!canEdit) {
    return null;
  }

  const confirmMessage = isActive
    ? "¿Inactivar este grupo de trabajo? Los Cleaners dejarán de ver sus propiedades."
    : "¿Reactivar este grupo de trabajo? Volverá a aportar visibilidad de propiedades.";

  const confirmTitle = isActive ? "Inactivar grupo de trabajo" : "Reactivar grupo de trabajo";
  const confirmButtonText = isActive ? "Inactivar" : "Reactivar";

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className="text-xs text-neutral-500 underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isActive ? "Inactivar" : "Reactivar"}
      </button>

      {isConfirmOpen && (
        <ConfirmModal
          isOpen={isConfirmOpen}
          onClose={handleClose}
          title={confirmTitle}
          message={confirmMessage}
          confirmText={confirmButtonText}
          cancelText="Cancelar"
          confirmAction={handleConfirm}
          variant={isActive ? "warning" : "warning"}
        />
      )}

    </>
  );
}

