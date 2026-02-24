"use client";

/**
 * Modal reutilizable para crear un nuevo grupo de trabajo.
 * 
 * Usado en:
 * - app/host/workgroups/page.tsx (CreateWorkGroupForm)
 * - app/host/properties/[id]/AssignWorkGroupModal.tsx (crear desde modal de asignación)
 */

import { useState, useEffect, useRef, useTransition } from "react";
import BottomSheet from "@/lib/ui/BottomSheet";
import { createWorkGroup } from "./actions";

interface NewWorkGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (workGroupId: string, workGroupName: string) => void;
  isMobile?: boolean;
}

export default function NewWorkGroupModal({
  isOpen,
  onClose,
  onSuccess,
  isMobile: externalIsMobile,
}: NewWorkGroupModalProps) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(externalIsMobile ?? true);
  const [mounted, setMounted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (externalIsMobile === undefined) {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 640);
      };
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }
  }, [externalIsMobile]);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
    } else {
      setMounted(false);
      setName("");
      setNotes("");
      setError(null);
    }
  }, [isOpen]);

  const handleClose = () => {
    setName("");
    setNotes("");
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = formRef.current;
    if (!form) return;

    const formData = new FormData(form);
    // No incluir returnTo para que la acción retorne el ID en lugar de redirigir
    // formData.append("returnTo", ""); // No necesario, simplemente no lo incluimos

    startTransition(async () => {
      try {
        setError(null);
        const result = await createWorkGroup(formData);
        // Si onSuccess está definido, llamarlo con el ID y nombre
        if (onSuccess && result?.id) {
          onSuccess(result.id, result.name);
        }
        handleClose();
      } catch (error: any) {
        console.error("Error al crear grupo de trabajo:", error);
        const errorMessage = error?.message || "Error al crear el grupo de trabajo. Por favor, intenta de nuevo.";
        setError(errorMessage);
      }
    });
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const content = (
    <div className="space-y-4">
      <p className="text-xs text-neutral-600">
        Crea un nuevo grupo de trabajo. Luego podrás asignarlo a propiedades y conectarlo con equipos ejecutores.
      </p>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-neutral-800">
            Nombre del grupo de trabajo *
          </label>
          <input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500"
            placeholder="Ej. Grupo A, Limpiezas principales"
            autoFocus
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-neutral-800">
            Notas (opcional)
          </label>
          <textarea
            name="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500 resize-none"
            placeholder="Notas adicionales sobre el grupo de trabajo"
          />
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-neutral-100">
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 rounded-lg border border-black bg-black px-4 py-2.5 text-base font-medium text-white hover:bg-neutral-800 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Creando..." : "Crear grupo de trabajo"}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-base font-medium text-neutral-700 hover:bg-neutral-50 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title="Nuevo grupo de trabajo"
        maxHeight="90vh"
      >
        <div className="px-6 pt-8 pb-4 sm:pb-8">{content}</div>
      </BottomSheet>
    );
  }

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 transition-opacity"
      onClick={handleClose}
    >
      <div
        className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">
          Nuevo grupo de trabajo
        </h3>
        {content}
      </div>
    </div>
  );
}

