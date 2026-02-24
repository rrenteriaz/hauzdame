"use client";

import { useState, useEffect, useTransition } from "react";
import BottomSheet from "@/lib/ui/BottomSheet";
import { assignWorkGroupToProperty } from "../actions-workgroups";
import NewWorkGroupModal from "@/app/host/workgroups/NewWorkGroupModal";

interface WorkGroup {
  id: string;
  name: string;
}

interface AssignWorkGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (workGroupId: string, workGroupName: string) => void;
  propertyId: string;
  workGroups: WorkGroup[];
  assignedWorkGroupIds: Set<string>;
  returnTo: string;
}

export default function AssignWorkGroupModal({
  isOpen,
  onClose,
  onSuccess,
  propertyId,
  workGroups: initialWorkGroups,
  assignedWorkGroupIds,
  returnTo,
}: AssignWorkGroupModalProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedWorkGroupId, setSelectedWorkGroupId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [localWorkGroups, setLocalWorkGroups] = useState(initialWorkGroups);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
    } else {
      setMounted(false);
      setSelectedWorkGroupId("");
    }
  }, [isOpen]);

  // Sincronizar localWorkGroups cuando cambian las props
  useEffect(() => {
    setLocalWorkGroups(initialWorkGroups);
  }, [initialWorkGroups]);

  const availableWorkGroups = localWorkGroups
    .filter((wg) => !assignedWorkGroupIds.has(wg.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkGroupId) return;

    setIsSubmitting(true);
    // Capturar posición de scroll antes de la acción
    const scrollY = window.scrollY;
    
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("propertyId", propertyId);
        formData.append("workGroupId", selectedWorkGroupId);
        formData.append("returnTo", returnTo);
        formData.append("skipRedirect", "true"); // Evitar redirect, manejar desde el componente

        const result = await assignWorkGroupToProperty(formData);
        
        if (result?.success) {
          // Obtener el nombre del grupo asignado
          const assignedWorkGroup = localWorkGroups.find((wg) => wg.id === selectedWorkGroupId);
          const workGroupName = assignedWorkGroup?.name || "Grupo de trabajo";
          
          // Cerrar el modal
          onClose();
          
          // Notificar éxito al componente padre para actualizar estado local
          if (onSuccess) {
            onSuccess(selectedWorkGroupId, workGroupName);
          }
          
          // Restaurar posición de scroll si cambió
          requestAnimationFrame(() => {
            if (Math.abs(window.scrollY - scrollY) > 10) {
              window.scrollTo({ top: scrollY, behavior: "instant" });
            }
          });
        }
      } catch (error: any) {
        console.error("Error asignando grupo de trabajo:", error);
        alert(error?.message || "Error al asignar grupo de trabajo");
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  const content = (
    <div className="space-y-4">
      {availableWorkGroups.length > 0 ? (
        <>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Seleccionar grupo de trabajo
              </label>
              <select
                value={selectedWorkGroupId}
                onChange={(e) => setSelectedWorkGroupId(e.target.value)}
                required
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500 bg-white"
              >
                <option value="">Seleccionar grupo de trabajo</option>
                {availableWorkGroups.map((wg) => (
                  <option key={wg.id} value={wg.id}>
                    {wg.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-neutral-100">
              <button
                type="submit"
                disabled={isSubmitting || !selectedWorkGroupId}
                className="flex-1 rounded-lg border border-black bg-black px-4 py-2.5 text-base font-medium text-white hover:bg-neutral-800 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Asignando..." : "Asignar"}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-base font-medium text-neutral-700 hover:bg-neutral-50 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
            </div>
          </form>

          <div className="pt-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-700 underline underline-offset-2"
            >
              Crear nuevo grupo de trabajo
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-center">
            <p className="text-sm text-neutral-500 mb-4">
              No hay grupos de trabajo disponibles para asignar.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-block rounded-lg border border-black bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition active:scale-[0.99]"
            >
              Crear grupo de trabajo
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-base font-medium text-neutral-700 hover:bg-neutral-50 transition active:scale-[0.99]"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {isMobile ? (
        <BottomSheet
          isOpen={isOpen}
          onClose={onClose}
          title="Asignar grupo de trabajo"
          maxHeight="90vh"
        >
          <div className="px-6 pt-8 pb-4 sm:pb-8">{content}</div>
        </BottomSheet>
      ) : mounted ? (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 transition-opacity"
          onClick={onClose}
        >
          <div
            className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-neutral-200">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-semibold text-neutral-900">
                  Asignar grupo de trabajo
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 -mr-2 text-neutral-500 hover:text-neutral-900 transition rounded-full hover:bg-neutral-100"
                  aria-label="Cerrar"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto px-6 pt-6 pb-6">{content}</div>
          </div>
        </div>
      ) : null}

      <NewWorkGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(workGroupId, workGroupName) => {
          // Agregar el nuevo grupo a la lista local
          const newWorkGroup: WorkGroup = { id: workGroupId, name: workGroupName };
          setLocalWorkGroups((prev) => [...prev, newWorkGroup].sort((a, b) => a.name.localeCompare(b.name)));
          // Preseleccionar el nuevo grupo
          setSelectedWorkGroupId(workGroupId);
          // Cerrar el modal de creación
          setShowCreateModal(false);
        }}
        isMobile={isMobile}
      />
    </>
  );
}

