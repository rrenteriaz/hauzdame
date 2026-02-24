"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ConfirmModal";
import { cancelCleaning } from "./actions";

interface CancelCleaningModalProps {
  cleaningId: string;
  propertyName: string;
  scheduledDate: Date;
  isOpen: boolean;
  onClose: () => void;
  returnTo: string;
}

export default function CancelCleaningModal({
  cleaningId,
  propertyName,
  scheduledDate,
  isOpen,
  onClose,
  returnTo,
}: CancelCleaningModalProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const handleConfirm = () => {
    formRef.current?.requestSubmit();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {/* Formulario oculto para cancelar */}
      <form ref={formRef} action={cancelCleaning} className="hidden">
        <input type="hidden" name="cleaningId" value={cleaningId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        {(() => {
          try {
            const url = returnTo.includes("?") ? new URL(returnTo, "http://localhost") : null;
            const params = url ? new URLSearchParams(url.search) : new URLSearchParams(returnTo.split("?")[1] || "");
            return (
              <>
                <input type="hidden" name="view" value={params.get("view") || ""} />
                <input type="hidden" name="date" value={params.get("date") || ""} />
                <input type="hidden" name="month" value={params.get("month") || ""} />
              </>
            );
          } catch {
            return null;
          }
        })()}
      </form>

      <ConfirmModal
        isOpen={isOpen}
        onClose={onClose}
        title="¿Cancelar limpieza?"
        message={`¿Estás seguro de que quieres cancelar esta limpieza?\n\nPropiedad: ${propertyName}\nFecha: ${formatDate(scheduledDate)}\n\nEsta acción marcará la limpieza como cancelada. Esta acción no se puede deshacer.`}
        confirmText="Sí, cancelar"
        cancelText="No, mantener"
        confirmAction={handleConfirm}
        variant="warning"
      />
    </>
  );
}

