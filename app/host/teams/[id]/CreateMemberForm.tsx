"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import TimePicker from "@/components/TimePicker";
import { createTeamMember } from "../actions";

interface CreateMemberFormProps {
  teamId: string;
  returnTo: string;
}

const DAY_LABELS = [
  { dayOfWeek: 1, label: "Lunes" },
  { dayOfWeek: 2, label: "Martes" },
  { dayOfWeek: 3, label: "Miércoles" },
  { dayOfWeek: 4, label: "Jueves" },
  { dayOfWeek: 5, label: "Viernes" },
  { dayOfWeek: 6, label: "Sábado" },
  { dayOfWeek: 0, label: "Domingo" },
];

interface ScheduleDay {
  dayOfWeek: number;
  isWorking: boolean;
  startTime: string;
  endTime: string;
}

export default function CreateMemberForm({ teamId, returnTo }: CreateMemberFormProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Inicializar schedules: Lunes a Sábado 09:00-18:00, Domingo no laborable
  const [schedules, setSchedules] = useState<ScheduleDay[]>(() => {
    return DAY_LABELS.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      isWorking: day.dayOfWeek >= 1 && day.dayOfWeek <= 6, // Lun-Sáb trabajan, Dom no
      startTime: "09:00",
      endTime: "18:00",
    }));
  });

  const updateSchedule = (dayOfWeek: number, updates: Partial<ScheduleDay>) => {
    setSchedules((prev) =>
      prev.map((s) =>
        s.dayOfWeek === dayOfWeek ? { ...s, ...updates } : s
      )
    );
  };

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    // Resetear formulario
    setName("");
    setPhone("");
    setSchedules(
      DAY_LABELS.map((day) => ({
        dayOfWeek: day.dayOfWeek,
        isWorking: day.dayOfWeek >= 1 && day.dayOfWeek <= 6, // Lun-Sáb trabajan, Dom no
        startTime: "09:00",
        endTime: "18:00",
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = formRef.current;
    if (!form) return;

    // Crear FormData
    const formData = new FormData(form);

    // Siempre agregar schedules (con valores por defecto o modificados por el usuario)
    schedules.forEach((schedule) => {
      formData.append(`schedule_${schedule.dayOfWeek}_isWorking`, String(schedule.isWorking));
      formData.append(`schedule_${schedule.dayOfWeek}_startTime`, schedule.startTime);
      formData.append(`schedule_${schedule.dayOfWeek}_endTime`, schedule.endTime);
    });

    try {
      await createTeamMember(formData);
      handleClose();
      router.push(returnTo);
      router.refresh();
    } catch (error) {
      console.error("Error al crear miembro:", error);
    }
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
        Agregar miembro
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 rounded-t-2xl">
              <h3 className="text-lg font-semibold text-neutral-900">
                Agregar miembro
              </h3>
            </div>

            {/* Formulario */}
            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className="p-6 space-y-4"
            >
              <input type="hidden" name="teamId" value={teamId} />
              <input type="hidden" name="returnTo" value={returnTo} />

              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-800">
                  Nombre *
                </label>
                <input
                  name="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500"
                  placeholder="Nombre del miembro"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-800">
                  Teléfono
                </label>
                <input
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500"
                  placeholder="Opcional"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <label className="block text-xs font-medium text-neutral-800 mb-2">
                  Horarios de trabajo
                </label>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {DAY_LABELS.map((day) => {
                    const schedule = schedules.find((s) => s.dayOfWeek === day.dayOfWeek);
                    if (!schedule) return null;

                    return (
                      <div
                        key={day.dayOfWeek}
                        className="flex items-center gap-2 p-2 rounded-lg border border-neutral-200 bg-neutral-50"
                      >
                        <label className="flex items-center gap-2 min-w-[80px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={schedule.isWorking}
                            onChange={(e) =>
                              updateSchedule(day.dayOfWeek, { isWorking: e.target.checked })
                            }
                            className="rounded border-neutral-300 text-black focus:ring-black/5"
                          />
                          <span className="text-xs font-medium text-neutral-700">
                            {day.label}
                          </span>
                        </label>

                        {schedule.isWorking && (
                          <>
                            <TimePicker
                              value={schedule.startTime}
                              onChange={(value) =>
                                updateSchedule(day.dayOfWeek, { startTime: value })
                              }
                              className="flex-1"
                            />
                            <span className="text-xs text-neutral-500">-</span>
                            <TimePicker
                              value={schedule.endTime}
                              onChange={(value) =>
                                updateSchedule(day.dayOfWeek, { endTime: value })
                              }
                              className="flex-1"
                            />
                          </>
                        )}

                        {!schedule.isWorking && (
                          <span className="text-xs text-neutral-400 italic flex-1">
                            No trabaja
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Botones */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-lg border border-black bg-black px-4 py-2.5 text-base font-medium text-white hover:bg-neutral-800 transition active:scale-[0.99]"
                >
                  Aceptar
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

