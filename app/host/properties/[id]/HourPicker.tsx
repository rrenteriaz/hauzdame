"use client";

import { useState, useEffect, useRef } from "react";

interface HourPickerProps {
  value: string; // Formato "HH:mm" (ej. "14:00")
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
}

export default function HourPicker({
  value,
  onChange,
  className = "",
  required = false,
}: HourPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Parsear el valor inicial
  const [selectedHour, setSelectedHour] = useState(() => {
    if (value) {
      const [h] = value.split(":");
      return h || "14";
    }
    return "14";
  });

  // Actualizar cuando cambia el value externo
  useEffect(() => {
    if (value) {
      const [h] = value.split(":");
      if (h) setSelectedHour(h);
    }
  }, [value]);

  const handleOpen = () => {
    setIsOpen(true);
    // Si no hay valor, inicializar con hora actual redondeada
    if (!value) {
      const now = new Date();
      const hour = String(now.getHours()).padStart(2, "0");
      setSelectedHour(hour);
    }
  };

  const handleClose = () => setIsOpen(false);

  const handleConfirm = () => {
    const hourValue = `${selectedHour.padStart(2, "0")}:00`;
    onChange(hourValue);
    handleClose();
  };

  const handleCancel = () => {
    // Restaurar valor original
    if (value) {
      const [h] = value.split(":");
      if (h) setSelectedHour(h);
    }
    handleClose();
  };

  // Generar opciones de horas (00-23) en formato HH:00
  const hourOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, "0");
    return { value: hour, label: `${hour}:00` };
  });

  // Formatear el valor para mostrar
  const displayValue = value || "";

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
      <input
        type="text"
        value={displayValue}
        onClick={handleOpen}
        readOnly
        required={required}
        className={`w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500 cursor-pointer bg-white ${className}`}
        placeholder="Selecciona hora"
      />

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal */}
          <div
            ref={modalRef}
            className="relative z-10 w-full max-w-sm rounded-2xl border border-neutral-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-neutral-200">
              <h3 className="text-base font-semibold text-neutral-900 text-center">
                Seleccionar hora
              </h3>
            </div>

            {/* Contenido */}
            <div className="px-4 py-6">
              {/* Selector de horas */}
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-2 text-center">
                  Hora
                </label>
                <div className="flex justify-center">
                  <select
                    value={selectedHour}
                    onChange={(e) => setSelectedHour(e.target.value)}
                    className="w-full max-w-[150px] rounded-lg border border-neutral-300 px-2 py-2.5 text-2xl font-medium text-neutral-900 bg-white outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500 text-center"
                    size={7}
                    style={{ height: "200px" }}
                  >
                    {hourOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="px-4 py-3 border-t border-neutral-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-base font-medium text-neutral-600 hover:text-neutral-900 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-4 py-2 text-base font-medium text-white bg-black rounded-lg hover:bg-neutral-800 transition active:scale-[0.98]"
              >
                Establecer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

