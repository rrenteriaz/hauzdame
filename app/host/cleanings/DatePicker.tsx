"use client";

import { useState, useEffect, useRef } from "react";

interface DatePickerProps {
  value: string; // Formato "YYYY-MM-DD"
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

function getDaysInMonth(year: number, month: number): number {
  if (month === 1 && isLeapYear(year)) {
    return 29;
  }
  return DAYS_IN_MONTH[month];
}

export default function DatePicker({
  value,
  onChange,
  className = "",
  required = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Parsear el valor inicial
  const [year, setYear] = useState(() => {
    if (value) {
      const [y] = value.split("-");
      return y ? Number(y) : new Date().getFullYear();
    }
    return new Date().getFullYear();
  });

  const [month, setMonth] = useState(() => {
    if (value) {
      const [, m] = value.split("-");
      return m ? Number(m) - 1 : new Date().getMonth();
    }
    return new Date().getMonth();
  });

  const [day, setDay] = useState(() => {
    if (value) {
      const [, , d] = value.split("-");
      return d ? Number(d) : new Date().getDate();
    }
    return new Date().getDate();
  });

  // Actualizar cuando cambia el value externo
  useEffect(() => {
    if (value) {
      const [y, m, d] = value.split("-");
      if (y) setYear(Number(y));
      if (m) setMonth(Number(m) - 1);
      if (d) setDay(Number(d));
    }
  }, [value]);

  // Ajustar el día si es inválido para el mes/año seleccionado
  useEffect(() => {
    const maxDays = getDaysInMonth(year, month);
    if (day > maxDays) {
      setDay(maxDays);
    }
  }, [year, month, day]);

  const handleOpen = () => {
    setIsOpen(true);
    // Si no hay valor, inicializar con fecha actual
    if (!value) {
      const now = new Date();
      setYear(now.getFullYear());
      setMonth(now.getMonth());
      setDay(now.getDate());
    }
  };

  const handleClose = () => setIsOpen(false);

  const handleConfirm = () => {
    const monthStr = String(month + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    const dateValue = `${year}-${monthStr}-${dayStr}`;
    onChange(dateValue);
    handleClose();
  };

  const handleCancel = () => {
    // Restaurar valores originales
    if (value) {
      const [y, m, d] = value.split("-");
      if (y) setYear(Number(y));
      if (m) setMonth(Number(m) - 1);
      if (d) setDay(Number(d));
    }
    handleClose();
  };

  // Generar opciones de años (solo años futuros, desde el año actual)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear + i);

  // Generar opciones de días según el mes/año seleccionado
  const maxDays = getDaysInMonth(year, month);
  const dayOptions = Array.from({ length: maxDays }, (_, i) => i + 1);

  // Formatear el valor para mostrar
  const displayValue = value
    ? (() => {
        const [y, m, d] = value.split("-");
        if (!y || !m || !d) return "";
        const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
        return dateObj.toLocaleDateString("es-MX", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
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
        placeholder="Selecciona una fecha"
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
                Seleccionar fecha
              </h3>
            </div>

            {/* Contenido */}
            <div className="px-4 py-6 space-y-4">
              <div className="flex items-center justify-center gap-3">
                {/* Selector de día */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-neutral-600 mb-2 text-center">
                    Día
                  </label>
                  <select
                    value={day}
                    onChange={(e) => setDay(Number(e.target.value))}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base font-medium text-neutral-900 bg-white outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500 text-center"
                    size={5}
                    style={{ height: "120px" }}
                  >
                    {dayOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selector de mes */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-neutral-600 mb-2 text-center">
                    Mes
                  </label>
                  <select
                    value={month}
                    onChange={(e) => {
                      const newMonth = Number(e.target.value);
                      setMonth(newMonth);
                      // Ajustar día si es necesario
                      const maxDays = getDaysInMonth(year, newMonth);
                      if (day > maxDays) {
                        setDay(maxDays);
                      }
                    }}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base font-medium text-neutral-900 bg-white outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500 text-center"
                    size={5}
                    style={{ height: "120px" }}
                  >
                    {MONTHS.map((monthName, index) => (
                      <option key={index} value={index}>
                        {monthName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selector de año */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-neutral-600 mb-2 text-center">
                    Año
                  </label>
                  <select
                    value={year}
                    onChange={(e) => {
                      const newYear = Number(e.target.value);
                      setYear(newYear);
                      // Ajustar día si es necesario (año bisiesto)
                      const maxDays = getDaysInMonth(newYear, month);
                      if (day > maxDays) {
                        setDay(maxDays);
                      }
                    }}
                    className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base font-medium text-neutral-900 bg-white outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500 text-center"
                    size={5}
                    style={{ height: "120px" }}
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fecha larga seleccionada */}
              <div className="pt-4 border-t border-neutral-100">
                <p className="text-base font-medium text-neutral-900 text-center">
                  {(() => {
                    try {
                      const dateObj = new Date(year, month, day);
                      return dateObj.toLocaleDateString("es-MX", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      });
                    } catch {
                      return "Fecha inválida";
                    }
                  })()}
                </p>
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

