"use client";

import { useState, useRef, useEffect } from "react";

interface TimePickerProps {
  value: string; // Formato "HH:mm"
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export default function TimePicker({
  value,
  onChange,
  className = "",
  disabled = false,
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState("08");
  const [minutes, setMinutes] = useState("00");
  const modalRef = useRef<HTMLDivElement>(null);

  // Parsear el valor inicial
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(":");
      setHours(h || "08");
      setMinutes(m || "00");
    }
  }, [value]);

  // Cerrar modal al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const handleConfirm = () => {
    const timeValue = `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
    onChange(timeValue);
    setIsOpen(false);
  };

  const handleCancel = () => {
    // Restaurar valores originales
    if (value) {
      const [h, m] = value.split(":");
      setHours(h || "08");
      setMinutes(m || "00");
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    setHours("08");
    setMinutes("00");
    onChange("08:00");
    setIsOpen(false);
  };

  // Generar opciones de horas (00-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, "0")
  );

  // Generar opciones de minutos (00, 15, 30, 45) o todos (00-59)
  const minuteOptions = Array.from({ length: 60 }, (_, i) =>
    i.toString().padStart(2, "0")
  );

  const displayValue = value || "08:00";

  return (
    <>
      {/* Input que muestra el valor y abre el modal */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        className={`flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500 text-left ${
          disabled ? "opacity-50 cursor-not-allowed bg-neutral-100" : "bg-white cursor-pointer"
        } ${className}`}
      >
        {displayValue}
      </button>

      {/* Modal del time picker */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            ref={modalRef}
            className="relative w-full max-w-sm rounded-2xl border border-neutral-200 bg-white shadow-xl"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-neutral-200">
              <h3 className="text-base font-semibold text-neutral-900 text-center">
                Seleccionar hora
              </h3>
            </div>

            {/* Selectores de hora y minuto */}
            <div className="px-4 py-6">
              <div className="flex items-center justify-center gap-4">
                {/* Selector de horas */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-neutral-600 mb-2 text-center">
                    Hora
                  </label>
                  <select
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base font-medium text-neutral-900 bg-white outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500 text-center"
                    size={5}
                    style={{ height: "120px" }}
                  >
                    {hourOptions.map((hour) => (
                      <option key={hour} value={hour}>
                        {hour}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-2xl font-bold text-neutral-400 pt-6">
                  :
                </div>

                {/* Selector de minutos */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-neutral-600 mb-2 text-center">
                    Minuto
                  </label>
                  <select
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base font-medium text-neutral-900 bg-white outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500 text-center"
                    size={5}
                    style={{ height: "120px" }}
                  >
                    {minuteOptions.map((minute) => (
                      <option key={minute} value={minute}>
                        {minute}
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
                onClick={handleClear}
                className="px-4 py-2 text-base font-medium text-neutral-600 hover:text-neutral-900 transition"
              >
                Borrar
              </button>
              <div className="flex items-center gap-2">
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
        </div>
      )}
    </>
  );
}

