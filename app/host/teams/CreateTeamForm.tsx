"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTeam } from "./actions";

export default function CreateTeamForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleOpen = () => {
    setIsOpen(true);
    setError(null); // Limpiar error al abrir
  };
  const handleClose = () => {
    setIsOpen(false);
    // Resetear formulario
    setName("");
    setNotes("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = formRef.current;
    if (!form) return;

    // Crear FormData desde el formulario
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        setError(null); // Limpiar error previo
        await createTeam(formData);
        handleClose();
        router.refresh();
      } catch (error: any) {
        console.error("Error al crear equipo:", error);
        // Mostrar mensaje de error amigable
        const errorMessage = error?.message || "Error al crear el equipo. Por favor, intenta de nuevo.";
        setError(errorMessage);
      }
    });
  };

  // Cerrar modal con Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // Prevenir scroll del body cuando el modal está abierto
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

  return (
    <>
      {/* Botón para abrir el modal */}
      <button
        type="button"
        onClick={handleOpen}
        className="w-full sm:w-auto sm:min-w-[140px] sm:max-w-xs rounded-lg bg-black px-3 py-2 text-base font-medium text-white hover:bg-neutral-800 active:scale-[0.99] transition"
      >
        Crear equipo
      </button>

      {/* Modal de creación de equipo */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative z-10 w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">
              Nuevo equipo
            </h3>

            <p className="text-xs text-neutral-600 mb-4">
              Crea un nuevo equipo de limpieza. Luego podrás agregar miembros y asignarlo a propiedades.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-800">
                  Nombre del equipo *
                </label>
                <input
                  name="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500"
                  placeholder="Ej. Equipo A, Lichita, Itzel"
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
                  placeholder="Notas adicionales sobre el equipo"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-lg border border-black bg-black px-4 py-2.5 text-base font-medium text-white hover:bg-neutral-800 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Creando..." : "Crear equipo"}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-base font-medium text-neutral-700 hover:bg-neutral-50 transition active:scale-[0.99]"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

