"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import ConfirmModal from "@/components/ConfirmModal";
import { deactivateProperty, deleteProperty } from "../actions";

interface ConfirmModalWrapperProps {
  propertyId: string;
  returnTo: string;
  isConfirmingDelete: boolean;
  isConfirmingDeactivate: boolean;
  propertyName: string;
  isActive: boolean;
}

export default function ConfirmModalWrapper({
  propertyId,
  returnTo,
  isConfirmingDelete,
  isConfirmingDeactivate,
  propertyName,
  isActive,
}: ConfirmModalWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const deactivateFormRef = useRef<HTMLFormElement>(null);
  const deleteFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setIsDeactivateOpen(isConfirmingDeactivate);
    setIsDeleteOpen(isConfirmingDelete);
  }, [isConfirmingDelete, isConfirmingDeactivate]);

  const handleCloseDeactivate = () => {
    setIsDeactivateOpen(false);
    // Detectar si estamos en la página de información adicional por el pathname
    const isAdditionalPage = pathname?.includes('/additional');
    const basePath = isAdditionalPage 
      ? `/host/properties/${propertyId}/additional`
      : `/host/properties/${propertyId}`;
    router.push(`${basePath}?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const handleCloseDelete = () => {
    setIsDeleteOpen(false);
    // Detectar si estamos en la página de información adicional por el pathname
    const isAdditionalPage = pathname?.includes('/additional');
    const basePath = isAdditionalPage 
      ? `/host/properties/${propertyId}/additional`
      : `/host/properties/${propertyId}`;
    router.push(`${basePath}?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const handleConfirmDeactivate = () => {
    deactivateFormRef.current?.requestSubmit();
  };

  const handleConfirmDelete = () => {
    deleteFormRef.current?.requestSubmit();
  };

  return (
    <>
      {/* Formulario oculto para deactivar */}
      <form ref={deactivateFormRef} action={deactivateProperty} className="hidden">
        <input type="hidden" name="propertyId" value={propertyId} />
        <input type="hidden" name="returnTo" value={returnTo} />
      </form>

      {/* Formulario oculto para eliminar */}
      <form ref={deleteFormRef} action={deleteProperty} className="hidden">
        <input type="hidden" name="propertyId" value={propertyId} />
        <input type="hidden" name="returnTo" value={returnTo} />
      </form>

      <ConfirmModal
        isOpen={isDeactivateOpen}
        onClose={handleCloseDeactivate}
        title={`¿Inactivar "${propertyName}"?`}
        message={`¿Estás seguro de que quieres inactivar esta propiedad?\n\nLa propiedad dejará de generar actividades futuras (reservas, limpiezas), pero se conservarán todos los datos históricos. Podrás reactivarla más tarde si lo necesitas.`}
        confirmText="Sí, inactivar"
        confirmAction={handleConfirmDeactivate}
        variant="warning"
      />

      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={handleCloseDelete}
        title={`¿Eliminar "${propertyName}"?`}
        message={`¿Estás seguro de que quieres eliminar esta propiedad?\n\nEsta acción eliminará completamente la propiedad y todos sus datos relacionados:\n• Reservas\n• Limpiezas\n• Cerraduras\n• Códigos de acceso\n• Y más...\n\nEsta acción no se puede deshacer.`}
        confirmText="Sí, eliminar todo"
        confirmAction={handleConfirmDelete}
        variant="danger"
      />
    </>
  );
}

