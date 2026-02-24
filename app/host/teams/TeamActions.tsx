"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ConfirmModal";
import { updateTeam, deleteTeam, updateTeamStatus } from "./actions";

interface TeamActionsProps {
  team: {
    id: string;
    name: string;
    notes?: string | null;
    status?: "ACTIVE" | "INACTIVE" | null;
  };
  hasMembers: boolean;
  returnTo: string;
}

export default function TeamActions({
  team,
  hasMembers,
  returnTo,
}: TeamActionsProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editName, setEditName] = useState(team.name);
  const [editNotes, setEditNotes] = useState(team.notes || "");
  const [editError, setEditError] = useState<string | null>(null);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const editFormRef = useRef<HTMLFormElement>(null);
  const deleteFormRef = useRef<HTMLFormElement>(null);
  const statusFormRef = useRef<HTMLFormElement>(null);
  const isInactive = team.status === "INACTIVE";

  const handleEditOpen = () => {
    setEditName(team.name);
    setEditNotes(team.notes || "");
    setEditError(null); // Limpiar error al abrir
    setIsEditOpen(true);
  };

  const handleEditClose = () => {
    setIsEditOpen(false);
    setEditName(team.name);
    setEditNotes(team.notes || "");
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEditError(null); // Limpiar error previo
    
    try {
      const formData = new FormData(editFormRef.current!);
      await updateTeam(formData);
      handleEditClose();
      router.refresh();
    } catch (error: any) {
      console.error("Error al actualizar equipo:", error);
      // Mostrar mensaje de error amigable
      const errorMessage = error?.message || "Error al actualizar el equipo. Por favor, intenta de nuevo.";
      setEditError(errorMessage);
    }
  };

  const handleDeleteOpen = () => {
    setIsDeleteOpen(true);
  };

  const handleDeleteClose = () => {
    setIsDeleteOpen(false);
  };

  const handleDeleteConfirm = () => {
    deleteFormRef.current?.requestSubmit();
  };

  const handleStatusOpen = () => {
    setIsStatusOpen(true);
  };

  const handleStatusClose = () => {
    setIsStatusOpen(false);
  };

  const handleStatusConfirm = () => {
    statusFormRef.current?.requestSubmit();
  };

  useEffect(() => {
    if (isEditOpen || isDeleteOpen || isStatusOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isEditOpen, isDeleteOpen, isStatusOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isEditOpen) handleEditClose();
        if (isDeleteOpen) handleDeleteClose();
        if (isStatusOpen) handleStatusClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isEditOpen, isDeleteOpen, isStatusOpen]);

  return (
    <>
      {/* Formulario oculto para editar */}
      <form ref={editFormRef} action={updateTeam} className="hidden">
        <input type="hidden" name="teamId" value={team.id} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <input type="hidden" name="name" value={editName} />
        <input type="hidden" name="notes" value={editNotes} />
      </form>

      {/* Formulario oculto para eliminar */}
      <form ref={deleteFormRef} action={deleteTeam} className="hidden">
        <input type="hidden" name="teamId" value={team.id} />
        <input type="hidden" name="returnTo" value={returnTo} />
      </form>

      {/* Formulario oculto para cambiar estado */}
      <form ref={statusFormRef} action={updateTeamStatus} className="hidden">
        <input type="hidden" name="teamId" value={team.id} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <input type="hidden" name="status" value={isInactive ? "ACTIVE" : "INACTIVE"} />
      </form>

      {/* Botones de acción */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleEditOpen}
          className="text-xs text-neutral-500 underline underline-offset-2"
        >
          Editar
        </button>
        <span className="text-neutral-300">·</span>
        <button
          type="button"
          onClick={handleStatusOpen}
          className="text-xs text-neutral-500 underline underline-offset-2"
        >
          {isInactive ? "Reactivar" : "Desactivar"}
        </button>
        {!hasMembers && (
          <>
            <span className="text-neutral-300">·</span>
            <button
              type="button"
              onClick={handleDeleteOpen}
              className="text-xs text-red-600 underline underline-offset-2"
            >
              Eliminar
            </button>
          </>
        )}
      </div>

      {/* Modal de edición */}
      {isEditOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={handleEditClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative z-[101] w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">
              Editar equipo
            </h3>

            {editError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-800">{editError}</p>
              </div>
            )}

            <form
              ref={editFormRef}
              action={updateTeam}
              className="space-y-4"
              onSubmit={handleEditSubmit}
            >
              <input type="hidden" name="teamId" value={team.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <input type="hidden" name="name" value={editName} />
              <input type="hidden" name="notes" value={editNotes} />

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-neutral-800">
                    Nombre del equipo *
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500"
                    placeholder="Ej. Equipo A"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-neutral-800">
                    Notas
                  </label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500 resize-none"
                    placeholder="Notas adicionales sobre el equipo"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-lg border border-neutral-300 bg-black px-4 py-2.5 text-base font-medium text-white hover:bg-neutral-800 transition active:scale-[0.99]"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={handleEditClose}
                  className="flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-base font-medium text-neutral-700 hover:bg-neutral-50 transition active:scale-[0.99]"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de eliminación */}
      {isDeleteOpen && (
        <ConfirmModal
          isOpen={isDeleteOpen}
          onClose={handleDeleteClose}
          title="Eliminar equipo"
          message="¿Estás seguro de que quieres eliminar este equipo? Esta acción no se puede deshacer."
          confirmText="Eliminar"
          cancelText="Cancelar"
          confirmAction={handleDeleteConfirm}
          variant="danger"
        />
      )}

      {isStatusOpen && (
        <ConfirmModal
          isOpen={isStatusOpen}
          onClose={handleStatusClose}
          title={isInactive ? "¿Reactivar equipo?" : "¿Desactivar equipo?"}
          message={
            isInactive
              ? `¿Deseas reactivar el equipo "${team.name}"?\n\nAl reactivar, los miembros volverán a ver información futura solo cuando el host asigne propiedades nuevamente.`
              : `Al desactivar, los miembros ya no verán información futura de las propiedades.\n\nConservarán su historial de limpiezas.`
          }
          confirmText={isInactive ? "Sí, reactivar" : "Sí, desactivar"}
          cancelText="Cancelar"
          confirmAction={handleStatusConfirm}
          variant="warning"
        />
      )}
    </>
  );
}

