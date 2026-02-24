"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProperty } from "./actions";
import AddressModal, { type AddressModalValue } from "@/lib/ui/AddressModal";

export default function CreatePropertyForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [address, setAddress] = useState("");
  const [icalUrl, setIcalUrl] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => {
    setIsOpen(false);
    // Resetear formulario
    setName("");
    setShortName("");
    setAddress("");
    setIcalUrl("");
  };
  const handleOpenAddressModal = () => setIsAddressModalOpen(true);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = formRef.current;
    if (!form) return;

    // Crear FormData desde el formulario
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        await createProperty(formData);
        handleClose();
        router.refresh();
      } catch (error) {
        console.error("Error al crear propiedad:", error);
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
        Agregar propiedad
      </button>

      {/* Modal de creación de propiedad */}
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
              Agregar propiedad
            </h3>

            <p className="text-xs text-neutral-600 mb-4">
              Registra un alojamiento. Más adelante podrás configurar equipos de limpieza,
              cerraduras y reglas específicas.
            </p>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-800">
                  Nombre de la propiedad *
                </label>
                <input
                  name="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500"
                  placeholder="Ej. Céntrico depa en Oaxaca, vista a la ciudad"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-800">
                  Alias corto *
                </label>
                <input
                  name="shortName"
                  required
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500"
                  placeholder="Ej. Depa01, CasaL, LoftB"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-800">
                  Dirección (opcional)
                </label>
                <button
                  type="button"
                  onClick={handleOpenAddressModal}
                  className={`w-full text-left rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500 hover:bg-neutral-50 transition-colors ${
                    !address ? "text-neutral-400" : "text-neutral-900"
                  }`}
                >
                  {address || "Ej. Centro, Oaxaca de Juárez"}
                </button>
                <input
                  type="hidden"
                  name="address"
                  value={address}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-800">
                  URL iCal de Airbnb (opcional)
                </label>
                <input
                  name="icalUrl"
                  value={icalUrl}
                  onChange={(e) => setIcalUrl(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500"
                  placeholder="https://www.airbnb.mx/calendar/ical/..."
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-lg border border-black bg-black px-4 py-2.5 text-base font-medium text-white hover:bg-neutral-800 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Guardando..." : "Guardar propiedad"}
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

      {/* Modal de dirección */}
      <AddressModal
        open={isAddressModalOpen}
        onOpenChange={setIsAddressModalOpen}
        title="Editar dirección"
        initialCombinedAddress={address}
        onSave={(value: AddressModalValue) => {
          setAddress(value.combinedAddress);
        }}
      />
    </>
  );
}

