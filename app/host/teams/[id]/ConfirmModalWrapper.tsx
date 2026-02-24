"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ConfirmModal";
import { deleteTeam } from "../actions";

interface ConfirmModalWrapperProps {
  teamId: string;
  teamName: string;
  returnTo: string;
  isConfirmingDelete: boolean;
  hasMembersWithCleanings: boolean;
}

export default function ConfirmModalWrapper({
  teamId,
  teamName,
  returnTo,
  isConfirmingDelete,
  hasMembersWithCleanings,
}: ConfirmModalWrapperProps) {
  const router = useRouter();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setIsDeleteOpen(isConfirmingDelete);
  }, [isConfirmingDelete]);

  const handleCloseDelete = () => {
    setIsDeleteOpen(false);
    router.push(`/host/teams/${teamId}?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const handleConfirmDelete = () => {
    formRef.current?.requestSubmit();
  };

  return (
    <>
      <form ref={formRef} action={deleteTeam} className="hidden">
        <input type="hidden" name="teamId" value={teamId} />
        <input type="hidden" name="returnTo" value={returnTo} />
      </form>

      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={handleCloseDelete}
        title="¿Eliminar equipo?"
        message={
          hasMembersWithCleanings
            ? `No se puede eliminar el equipo "${teamName}" porque tiene miembros con limpiezas asignadas.\n\nPuedes desactivar los miembros individualmente o esperar a que se completen las limpiezas asignadas.`
            : `¿Estás seguro de que quieres eliminar el equipo "${teamName}"?\n\nEsta acción eliminará el equipo y todos sus miembros. Esta acción no se puede deshacer.`
        }
        confirmText={hasMembersWithCleanings ? "Entendido" : "Sí, eliminar"}
        cancelText="Cancelar"
        confirmAction={hasMembersWithCleanings ? handleCloseDelete : handleConfirmDelete}
        variant={hasMembersWithCleanings ? "warning" : "danger"}
      />
    </>
  );
}

