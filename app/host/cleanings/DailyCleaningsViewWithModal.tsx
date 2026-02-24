"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getCleaningUi, getPropertyColor } from "@/lib/cleaning-ui";
import { startCleaning, completeCleaning } from "./actions";
import CancelCleaningModal from "./CancelCleaningModal";

type Cleaning = {
  id: string;
  propertyId: string;
  scheduledDate: Date;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  notes: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  needsAttention?: boolean;
  attentionReason?: string | null;
  property: {
    id: string;
    name: string;
    shortName: string | null;
  };
};

type Property = {
  id: string;
  name: string;
};

interface DailyCleaningsViewWithModalProps {
  cleanings: Cleaning[];
  properties: Property[];
  referenceDate: Date;
  view: string;
  monthParamForLinks: string;
  dateParamForLinks: string;
}

function formatDuration(startedAt: Date | null, completedAt: Date | null): string | null {
  if (!startedAt) return null;
  
  const end = completedAt || new Date();
  const diffMs = end.getTime() - startedAt.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export default function DailyCleaningsViewWithModal({
  cleanings,
  properties,
  referenceDate,
  view,
  monthParamForLinks,
  dateParamForLinks,
}: DailyCleaningsViewWithModalProps) {
  const dayKey = `${referenceDate.getFullYear()}-${referenceDate.getMonth()}-${referenceDate.getDate()}`;

  const dayCleanings = cleanings
    .filter((c) => {
      const d = c.scheduledDate;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      return key === dayKey;
    })
    // Ordenar: las que requieren atención primero
    .sort((a, b) => {
      const aNeedsAttention = (a as any).needsAttention ? 1 : 0;
      const bNeedsAttention = (b as any).needsAttention ? 1 : 0;
      if (aNeedsAttention !== bNeedsAttention) {
        return bNeedsAttention - aNeedsAttention; // Las que requieren atención primero
      }
      // Si ambas tienen o no tienen atención, ordenar por hora
      return a.scheduledDate.getTime() - b.scheduledDate.getTime();
    });

  const dayLabel = referenceDate.toLocaleString("es-MX", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });

  const isToday = referenceDate.toDateString() === new Date().toDateString();

  // FASE 4: Crear mapa de colores por propiedad (usar id como clave, propertyId ahora apunta directamente a Property.id)
  const colorToHex: Record<string, string> = {
    "bg-emerald-500": "#10b981",
    "bg-sky-500": "#0ea5e9",
    "bg-amber-500": "#f59e0b",
    "bg-fuchsia-500": "#d946ef",
    "bg-rose-500": "#f43f5e",
    "bg-slate-500": "#64748b",
  };

  const propertyColorMap = new Map<string, string>();
  const propertyColorHexMap = new Map<string, string>();
  properties.forEach((p, index) => {
    const color = getPropertyColor(index);
    // FASE 4: property.id ahora es el nuevo PK directamente
    if (p.id) {
      propertyColorMap.set(p.id, color);
      propertyColorHexMap.set(p.id, colorToHex[color] || "#64748b");
    }
  });

  // Estado para el modal de cancelación
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedCleaning, setSelectedCleaning] = useState<Cleaning | null>(null);

  const handleCancelClick = (cleaning: Cleaning) => {
    setSelectedCleaning(cleaning);
    setCancelModalOpen(true);
  };

  const handleCloseModal = () => {
    setCancelModalOpen(false);
    setSelectedCleaning(null);
  };

  const buildReturnTo = () => {
    const baseParams = new URLSearchParams();
    baseParams.set("view", view);
    if (dateParamForLinks) baseParams.set("date", dateParamForLinks);
    if (monthParamForLinks) baseParams.set("month", monthParamForLinks);
    return `/host/cleanings?${baseParams.toString()}`;
  };

  const returnTo = buildReturnTo();

  return (
    <>
      {selectedCleaning && (
        <CancelCleaningModal
          cleaningId={selectedCleaning.id}
          propertyName={selectedCleaning.property.shortName || selectedCleaning.property.name}
          scheduledDate={selectedCleaning.scheduledDate}
          isOpen={cancelModalOpen}
          onClose={handleCloseModal}
          returnTo={returnTo}
        />
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-600">
            {isToday ? "Hoy · " : ""}{dayLabel}
          </p>
          <p className="text-xs text-neutral-500">
            Vista diaria{isToday ? " (hoy)" : ""}
          </p>
        </div>

        {dayCleanings.length === 0 ? (
          <p className="text-base text-neutral-500">
            {isToday ? "Hoy no hay limpiezas programadas." : "No hay limpiezas programadas para este día."}
          </p>
        ) : (
          <ul className="space-y-3">
            {dayCleanings.map((c) => {
              // FASE 4: propertyId ahora apunta directamente a Property.id
              const propertyIdForColor = c.propertyId;
              const color = propertyColorMap.get(propertyIdForColor) ?? "bg-neutral-400";
              const colorHex = propertyColorHexMap.get(propertyIdForColor) ?? "#64748b";
              const ui = getCleaningUi(c.status, color);
              const canAct = c.status === "PENDING" || c.status === "IN_PROGRESS";
              const detailsHref = `/host/cleanings/${c.id}?returnTo=${encodeURIComponent(returnTo)}`;

              return (
                <li
                  key={c.id}
                  className={`rounded-2xl border border-neutral-200 bg-white p-3 flex flex-col gap-1 ${ui.rowClass}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={detailsHref}
                      className="min-w-0 flex-1 block rounded-lg -m-1 p-1 hover:bg-neutral-50 active:bg-neutral-100 transition"
                      aria-label={`Ver detalles de limpieza ${c.property.shortName || c.property.name}`}
                    >
                      <p className={`text-base font-semibold text-black flex items-center gap-1.5 ${ui.titleClass || ""}`}>
                        <span 
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: colorHex }}
                        />
                        {c.property.shortName || c.property.name}
                        {(c as any).needsAttention && (
                          <span className="ml-2 text-amber-600" title="Requiere atención">
                            ⚠️
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-neutral-600 mt-1">
                        {c.scheduledDate.toLocaleTimeString("es-MX", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {ui.statusText && ` · ${ui.statusText}`}
                        {c.startedAt && (() => {
                          const duration = formatDuration(c.startedAt, c.completedAt ?? null);
                          return duration ? ` · ${duration}` : " · En progreso...";
                        })()}
                      </p>
                      {c.notes && (
                        <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                          {c.notes}
                        </p>
                      )}
                    </Link>
                  </div>

                  {/* Acciones */}
                  <div className="mt-2">
                    {c.status === "PENDING" && (
                      <div className="flex items-center gap-3">
                        <form action={startCleaning} className="flex-1">
                          <input type="hidden" name="cleaningId" value={c.id} />
                          <input type="hidden" name="view" value={view} />
                          <input type="hidden" name="date" value={dateParamForLinks} />
                          <input type="hidden" name="month" value={monthParamForLinks} />
                          <button
                            type="submit"
                            className="w-full rounded-lg bg-black px-3 py-2 text-base font-medium text-white hover:bg-neutral-800 active:scale-[0.99] transition"
                          >
                            ▶ Iniciar Limpieza
                          </button>
                        </form>

                        <button
                          type="button"
                          onClick={() => handleCancelClick(c)}
                          className="text-xs text-neutral-500 underline underline-offset-2"
                        >
                          ⨯ Cancelar
                        </button>
                      </div>
                    )}

                    {c.status === "IN_PROGRESS" && (
                      <div className="flex items-center gap-3">
                        <form action={completeCleaning} className="flex-1">
                          <input type="hidden" name="cleaningId" value={c.id} />
                          <input type="hidden" name="view" value={view} />
                          <input type="hidden" name="date" value={dateParamForLinks} />
                          <input type="hidden" name="month" value={monthParamForLinks} />
                          <button
                            type="submit"
                            className="w-full rounded-lg bg-black px-3 py-2 text-base font-medium text-white hover:bg-neutral-800 active:scale-[0.99] transition"
                          >
                            ✔ Completar
                          </button>
                        </form>

                        <button
                          type="button"
                          onClick={() => handleCancelClick(c)}
                          className="text-xs text-neutral-500 underline underline-offset-2"
                        >
                          ⨯ Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

