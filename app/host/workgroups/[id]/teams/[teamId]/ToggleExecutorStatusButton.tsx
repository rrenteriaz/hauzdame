"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ConfirmModal";
import Toast from "@/components/Toast";
import { toggleExecutorStatusAction } from "../../../actions-executors";

interface ToggleExecutorStatusButtonProps {
  workGroupId: string;
  teamId: string;
  currentStatus: "ACTIVE" | "INACTIVE";
  returnTo: string;
}

export default function ToggleExecutorStatusButton({
  workGroupId,
  teamId,
  currentStatus,
  returnTo,
}: ToggleExecutorStatusButtonProps) {
  const router = useRouter();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const isActive = currentStatus === "ACTIVE";
  const targetStatus = isActive ? "INACTIVE" : "ACTIVE";

  const handleToggle = () => {
    setIsConfirmOpen(true);
  };

  const handleConfirm = () => {
    setIsConfirmOpen(false);

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("workGroupId", workGroupId);
        formData.append("teamId", teamId);
        formData.append("newStatus", targetStatus);
        formData.append("returnTo", returnTo);

        const result = await toggleExecutorStatusAction(formData);

        // Refrescar la página para mostrar el nuevo status y limpiezas actualizadas
        router.refresh();

        // Mostrar toast de éxito con conteo de limpiezas afectadas
        let message = `Equipo ${isActive ? "desactivado" : "activado"} correctamente.`;
        if (result.affectedCleaningsCount > 0) {
          message += ` ${result.affectedCleaningsCount} limpieza${result.affectedCleaningsCount !== 1 ? "s" : ""} futura${result.affectedCleaningsCount !== 1 ? "s" : ""} ${isActive ? "quedaron sin asignar" : "disponibles"}.`;
        }
        setToast({
          message,
          type: "success",
        });
      } catch (err: any) {
        console.error("Error al cambiar el status del executor:", err);
        const errorMessage =
          err?.message || "Error al cambiar el status. Por favor, intenta de nuevo.";
        setToast({
          message: errorMessage,
          type: "error",
        });
      }
    });
  };

  const handleClose = () => {
    setIsConfirmOpen(false);
  };

  const confirmMessage = isActive
    ? `¿Desactivar este equipo ejecutor?\n\nAl desactivar el equipo:\n• Todas las limpiezas FUTURAS quedarán sin asignar\n• Se marcarán con atención requerida (NO_TEAM_EXECUTING)\n• Las limpiezas PASADAS no se modificarán\n\nPodrás reactivar el equipo más tarde si lo necesitas.`
    : `¿Reactivar este equipo ejecutor?\n\nAl reactivar el equipo, volverá a estar disponible para asignaciones futuras. Las limpiezas que quedaron sin asignar no se reasignarán automáticamente.`;

  const confirmTitle = isActive ? "Desactivar equipo ejecutor" : "Reactivar equipo ejecutor";
  const confirmButtonText = isActive ? "Sí, desactivar" : "Sí, reactivar";

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${
          isActive
            ? "border-red-500 bg-red-500 text-white hover:bg-red-600"
            : "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600"
        }`}
      >
        {isPending
          ? "Procesando..."
          : isActive
          ? "Desactivar"
          : "Reactivar"}
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
          variant="warning"
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}

