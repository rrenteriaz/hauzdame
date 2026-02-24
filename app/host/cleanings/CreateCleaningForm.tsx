"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCleaning } from "./actions";
import Link from "next/link";
import PropertySelect from "./PropertySelect";
import DateTimePicker from "./DateTimePicker";

interface Property {
  id: string;
  name: string;
  shortName?: string | null;
}

interface CreateCleaningFormProps {
  properties: Property[];
}

export default function CreateCleaningForm({ properties }: CreateCleaningFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [propertyId, setPropertyId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const hasProperties = properties.length > 0;

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => {
    setIsOpen(false);
    // Resetear formulario
    setPropertyId("");
    setScheduledAt("");
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = formRef.current;
    if (!form) return;

    // Crear FormData desde el formulario
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        await createCleaning(formData);
        handleClose();
        router.refresh();
      } catch (error) {
        console.error("Error al crear limpieza:", error);
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
        disabled={!hasProperties}
        className="w-full sm:w-auto sm:min-w-[140px] sm:max-w-xs rounded-lg bg-black px-3 py-2 text-base font-medium text-white hover:bg-neutral-800 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Agregar limpieza
      </button>

      {/* Modal de creación de limpieza */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative z-10 w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">
              Agregar limpieza
            </h3>

            <p className="text-xs text-neutral-600 mb-4">
              Crea una limpieza ligada a una propiedad y fecha específica.
              Más adelante podrás asignarla a un cleaner.
            </p>

            {!hasProperties ? (
              <div className="space-y-3">
                <p className="text-xs text-amber-600">
                  Primero necesitas crear al menos una propiedad en{" "}
                  <Link
                    href="/host/properties"
                    className="font-medium underline underline-offset-2"
                  >
                    Propiedades
                  </Link>
                  .
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-base font-medium text-neutral-700 hover:bg-neutral-50 transition active:scale-[0.99]"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-neutral-800">
                    Propiedad *
                  </label>
                  <PropertySelect
                    value={propertyId}
                    onChange={(id) => setPropertyId(id)}
                    properties={properties}
                    required
                  />
                  {/* Hidden input para el formulario */}
                  <input type="hidden" name="propertyId" value={propertyId} />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-neutral-800">
                    Fecha y hora *
                  </label>
                  <DateTimePicker
                    value={scheduledAt}
                    onChange={(value) => setScheduledAt(value)}
                    required
                  />
                  {/* Hidden input para el formulario */}
                  <input type="hidden" name="scheduledAt" value={scheduledAt} />
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
                    placeholder="Ej. Limpieza profunda, revisar refrigerador, cambiar sábanas..."
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 rounded-lg border border-black bg-black px-4 py-2.5 text-base font-medium text-white hover:bg-neutral-800 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending ? "Guardando..." : "Guardar limpieza"}
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
            )}
          </div>
        </div>
      )}
    </>
  );
}

