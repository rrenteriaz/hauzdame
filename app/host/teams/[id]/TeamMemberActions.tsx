"use client";

import { useState, useRef, useEffect, startTransition } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "@/components/ConfirmModal";
import TimePicker from "@/components/TimePicker";
import { toggleTeamMemberStatus, deleteTeamMember, updateTeamMember } from "../actions";

interface TeamMemberActionsProps {
  member: {
    id: string;
    name: string;
    phone?: string | null;
    isActive: boolean;
    workingDays?: string[] | null | undefined;
    workingStartTime?: string | null | undefined;
    workingEndTime?: string | null | undefined;
    scheduleDays?: Array<{
      dayOfWeek: number;
      isWorking: boolean;
      startTime: string | null;
      endTime: string | null;
    }> | null | undefined;
  };
  hasCleanings: boolean;
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

export default function TeamMemberActions({
  member,
  hasCleanings,
  returnTo,
}: TeamMemberActionsProps) {
  const router = useRouter();
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState(member.name);
  const [editPhone, setEditPhone] = useState(member.phone || "");
  // Helper para inicializar schedules desde member.scheduleDays o fallback a workingDays
  const initializeSchedules = (): ScheduleDay[] => {
    // Si tiene scheduleDays, usarlos
    if (member?.scheduleDays && Array.isArray(member.scheduleDays) && member.scheduleDays.length > 0) {
      return DAY_LABELS.map((day) => {
        const scheduleDay = member.scheduleDays!.find((sd) => sd.dayOfWeek === day.dayOfWeek);
        return {
          dayOfWeek: day.dayOfWeek,
          isWorking: scheduleDay?.isWorking || false,
          startTime: scheduleDay?.startTime || "08:00",
          endTime: scheduleDay?.endTime || "18:00",
        };
      });
    }

    // Fallback: usar workingDays antiguo
    const workingDays = member?.workingDays || [];
    const startTime = member?.workingStartTime || "08:00";
    const endTime = member?.workingEndTime || "18:00";
    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

    return DAY_LABELS.map((day) => {
      const dayName = dayNames[day.dayOfWeek];
      const isWorking = workingDays.includes(dayName);
      return {
        dayOfWeek: day.dayOfWeek,
        isWorking,
        startTime: isWorking ? startTime : "08:00",
        endTime: isWorking ? endTime : "18:00",
      };
    });
  };

  const [editSchedules, setEditSchedules] = useState<ScheduleDay[]>(initializeSchedules());
  const deactivateFormRef = useRef<HTMLFormElement>(null);
  const deleteFormRef = useRef<HTMLFormElement>(null);
  const editFormRef = useRef<HTMLFormElement>(null);

  const updateSchedule = (dayOfWeek: number, updates: Partial<ScheduleDay>) => {
    setEditSchedules((prev) =>
      prev.map((s) => (s.dayOfWeek === dayOfWeek ? { ...s, ...updates } : s))
    );
  };

  const handleDeactivateConfirm = () => {
    deactivateFormRef.current?.requestSubmit();
  };

  const handleDeleteConfirm = () => {
    deleteFormRef.current?.requestSubmit();
  };

  const handleDeactivateClose = () => {
    setIsDeactivateOpen(false);
  };

  const handleDeleteClose = () => {
    setIsDeleteOpen(false);
  };

  const handleEditOpen = () => {
    setEditName(member?.name || "");
    setEditPhone(member?.phone || "");
    setEditSchedules(initializeSchedules());
    setIsEditOpen(true);
  };

  const handleEditClose = () => {
    setIsEditOpen(false);
    setEditName(member?.name || "");
    setEditPhone(member?.phone || "");
    setEditSchedules(initializeSchedules());
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const form = editFormRef.current;
    if (!form) return;

    // Crear FormData desde el formulario
    const formData = new FormData(form);

    // Agregar campos de schedule al FormData
    editSchedules.forEach((schedule) => {
      formData.append(`schedule_${schedule.dayOfWeek}_isWorking`, String(schedule.isWorking));
      formData.append(`schedule_${schedule.dayOfWeek}_startTime`, schedule.startTime);
      formData.append(`schedule_${schedule.dayOfWeek}_endTime`, schedule.endTime);
    });

    // Cerrar el modal primero (antes de la Server Action)
    setIsEditOpen(false);
    
    try {
      // Llamar a la Server Action sin redirect (skipRedirect = true)
      await updateTeamMember(formData, true);
      // Redirigir manualmente desde el cliente
      startTransition(() => {
        router.push(returnTo);
        router.refresh();
      });
    } catch (error) {
      console.error("Error al actualizar miembro:", error);
      // En caso de error, volver a abrir el modal
      setIsEditOpen(true);
    }
  };

  useEffect(() => {
    if (isEditOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isEditOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isEditOpen) {
        handleEditClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isEditOpen]);

  return (
    <>
      {/* Formulario oculto para desactivar/activar */}
      <form ref={deactivateFormRef} action={toggleTeamMemberStatus} className="hidden">
        <input type="hidden" name="memberId" value={member.id} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <input type="hidden" name="isActive" value={String(!member.isActive)} />
      </form>

      {/* Formulario oculto para eliminar */}
      <form ref={deleteFormRef} action={deleteTeamMember} className="hidden">
        <input type="hidden" name="memberId" value={member.id} />
        <input type="hidden" name="returnTo" value={returnTo} />
      </form>


      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleEditOpen}
          className="text-xs text-neutral-500 underline underline-offset-2"
        >
          Editar
        </button>
        <span className="text-neutral-300">·</span>
        {member.isActive ? (
          <>
            {hasCleanings ? (
              <button
                type="button"
                onClick={() => setIsDeactivateOpen(true)}
                className="text-xs text-neutral-500 underline underline-offset-2"
              >
                Desactivar
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsDeactivateOpen(true)}
                  className="text-xs text-neutral-500 underline underline-offset-2"
                >
                  Desactivar
                </button>
                <span className="text-neutral-300">·</span>
                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(true)}
                  className="text-xs text-red-600 underline underline-offset-2"
                >
                  Eliminar
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setIsDeactivateOpen(true)}
              className="text-xs text-neutral-500 underline underline-offset-2"
            >
              Activar
            </button>
            {!hasCleanings && (
              <>
                <span className="text-neutral-300">·</span>
                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(true)}
                  className="text-xs text-red-600 underline underline-offset-2"
                >
                  Eliminar
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* Modal de confirmación para desactivar/activar */}
      <ConfirmModal
        isOpen={isDeactivateOpen}
        onClose={handleDeactivateClose}
        title={member.isActive ? "¿Desactivar miembro?" : "¿Activar miembro?"}
        message={
          member.isActive
            ? `¿Estás seguro de que quieres desactivar a "${member.name}"?\n\nEl miembro seguirá apareciendo en el historial de limpiezas asignadas, pero no estará disponible para nuevas asignaciones.`
            : `¿Estás seguro de que quieres activar a "${member.name}"?\n\nEl miembro estará disponible para nuevas asignaciones.`
        }
        confirmText={member.isActive ? "Sí, desactivar" : "Sí, activar"}
        cancelText="Cancelar"
        confirmAction={handleDeactivateConfirm}
        variant="warning"
      />

      {/* Modal de confirmación para eliminar */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={handleDeleteClose}
        title="¿Eliminar miembro?"
        message={`¿Estás seguro de que quieres eliminar a "${member.name}"?\n\nEsta acción no se puede deshacer. El miembro será eliminado permanentemente.`}
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        confirmAction={handleDeleteConfirm}
        variant="danger"
      />

      {/* Modal de edición */}
      {isEditOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleEditClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative z-10 w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">
              Editar miembro
            </h3>

            <form
              ref={editFormRef}
              onSubmit={handleEditSubmit}
              className="space-y-4"
            >
              <input type="hidden" name="memberId" value={member.id} />
              <input type="hidden" name="returnTo" value={returnTo} />

              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-800">
                  Nombre *
                </label>
                <input
                  name="name"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
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
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
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
                    const schedule = editSchedules.find((s) => s.dayOfWeek === day.dayOfWeek);
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

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-lg border border-black bg-black px-4 py-2.5 text-base font-medium text-white hover:bg-neutral-800 transition active:scale-[0.99]"
                >
                  Guardar cambios
                </button>
                <button
                  type="button"
                  onClick={handleEditClose}
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

