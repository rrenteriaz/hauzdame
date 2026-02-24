"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import ConfirmModal from "@/components/ConfirmModal";
import { updateWorkGroup, deleteWorkGroup } from "./actions";

interface WorkGroupActionsProps {
  workGroup: {
    id: string;
    name: string;
  };
  hasProperties: boolean;
  hasExecutors: boolean;
  returnTo: string;
}

export default function WorkGroupActions({
  workGroup,
  hasProperties,
  hasExecutors,
  returnTo,
}: WorkGroupActionsProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editName, setEditName] = useState(workGroup.name);
  const [editError, setEditError] = useState<string | null>(null);
  const editFormRef = useRef<HTMLFormElement>(null);
  const deleteFormRef = useRef<HTMLFormElement>(null);

  const handleEditOpen = () => {
    setEditName(workGroup.name);
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleEditClose = () => {
    setIsEditOpen(false);
    setEditName(workGroup.name);
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEditError(null);
    
    try {
      const formData = new FormData(editFormRef.current!);
      await updateWorkGroup(formData);
      handleEditClose();
      router.refresh();
    } catch (error: any) {
      console.error("Error al actualizar grupo de trabajo:", error);
      const errorMessage = error?.message || "Error al actualizar el grupo de trabajo. Por favor, intenta de nuevo.";
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

  useEffect(() => {
    if (isEditOpen || isDeleteOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isEditOpen, isDeleteOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isEditOpen) handleEditClose();
        if (isDeleteOpen) handleDeleteClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isEditOpen, isDeleteOpen]);

  const canDelete = !hasProperties && !hasExecutors;

  return (
    <>
      <form ref={editFormRef} action={updateWorkGroup} className="hidden">
        <input type="hidden" name="workGroupId" value={workGroup.id} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <input type="hidden" name="name" value={editName} />
      </form>

      <form ref={deleteFormRef} action={deleteWorkGroup} className="hidden">
        <input type="hidden" name="workGroupId" value={workGroup.id} />
        <input type="hidden" name="returnTo" value={returnTo} />
      </form>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleEditOpen}
          className="text-xs text-neutral-500 underline underline-offset-2"
        >
          Editar
        </button>
        {canDelete && (
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

      {isEditOpen && typeof window !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          onClick={handleEditClose}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          <div
            className="relative z-[10000] w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">
              Editar grupo de trabajo
            </h3>

            {editError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-800">{editError}</p>
              </div>
            )}

            <form
              ref={editFormRef}
              action={updateWorkGroup}
              className="space-y-4"
              onSubmit={handleEditSubmit}
            >
              <input type="hidden" name="workGroupId" value={workGroup.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <input type="hidden" name="name" value={editName} />

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-neutral-800">
                    Nombre del grupo de trabajo *
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500"
                    placeholder="Ej. Grupo A"
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
        </div>,
        document.body
      )}

      {isDeleteOpen && (
        <ConfirmModal
          isOpen={isDeleteOpen}
          onClose={handleDeleteClose}
          title="Eliminar grupo de trabajo"
          message="¿Estás seguro de que quieres eliminar este grupo de trabajo? Esta acción no se puede deshacer."
          confirmText="Eliminar"
          cancelText="Cancelar"
          confirmAction={handleDeleteConfirm}
          variant="danger"
        />
      )}
    </>
  );
}

