"use client";

import { useState, useEffect, useRef } from "react";
import DatePicker from "./DatePicker";

interface DateTimePickerProps {
  value: string; // Formato "YYYY-MM-DDTHH:mm" (datetime-local)
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
}

export default function DateTimePicker({
  value,
  onChange,
  className = "",
  required = false,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Parsear el valor inicial
  const [date, setDate] = useState(() => {
    if (value) {
      const [datePart] = value.split("T");
      return datePart || "";
    }
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  });

  const [hours, setHours] = useState(() => {
    if (value) {
      const timePart = value.split("T")[1];
      if (timePart) {
        const [h] = timePart.split(":");
        return h || "09";
      }
    }
    return "09";
  });

  const [minutes, setMinutes] = useState(() => {
    if (value) {
      const timePart = value.split("T")[1];
      if (timePart) {
        const [, m] = timePart.split(":");
        return m || "00";
      }
    }
    return "00";
  });

  // Actualizar cuando cambia el value externo
  useEffect(() => {
    if (value) {
      const [datePart, timePart] = value.split("T");
      if (datePart) setDate(datePart);
      if (timePart) {
        const [h, m] = timePart.split(":");
        if (h) setHours(h);
        if (m) setMinutes(m);
      }
    }
  }, [value]);

  const handleOpen = () => {
    setIsOpen(true);
    // Si no hay valor, inicializar con fecha/hora actual
    if (!value) {
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      setDate(dateStr);
      setHours(String(now.getHours()).padStart(2, "0"));
      setMinutes(String(now.getMinutes()).padStart(2, "0"));
    }
  };

  const handleClose = () => setIsOpen(false);

  const handleConfirm = () => {
    const timeValue = `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
    const dateTimeValue = `${date}T${timeValue}`;
    onChange(dateTimeValue);
    handleClose();
  };

  const handleCancel = () => {
    // Restaurar valores originales
    if (value) {
      const [datePart, timePart] = value.split("T");
      if (datePart) setDate(datePart);
      if (timePart) {
        const [h, m] = timePart.split(":");
        if (h) setHours(h);
        if (m) setMinutes(m);
      }
    }
    handleClose();
  };

  // Generar opciones de horas (00-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, "0")
  );

  // Generar opciones de minutos (00-59)
  const minuteOptions = Array.from({ length: 60 }, (_, i) =>
    i.toString().padStart(2, "0")
  );

  // Formatear el valor para mostrar
  const displayValue = value
    ? (() => {
        const [datePart, timePart] = value.split("T");
        if (!datePart || !timePart) return "";
        const [y, m, d] = datePart.split("-");
        const [h, min] = timePart.split(":");
        const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
        const dateStr = dateObj.toLocaleDateString("es-MX", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
        return `${dateStr} ${h}:${min}`;
      })()
    : "";

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
        placeholder="Selecciona fecha y hora"
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
                Seleccionar fecha y hora
              </h3>
            </div>

            {/* Contenido */}
            <div className="px-4 py-6 space-y-6">
              {/* Selector de fecha */}
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-2 text-center">
                  Fecha
                </label>
                <DatePicker
                  value={date}
                  onChange={(value) => setDate(value)}
                />
              </div>

              {/* Selectores de hora y minuto */}
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-2 text-center">
                  Hora
                </label>
                <div className="flex items-center justify-center gap-4">
                  {/* Selector de horas */}
                  <div className="flex-1">
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

