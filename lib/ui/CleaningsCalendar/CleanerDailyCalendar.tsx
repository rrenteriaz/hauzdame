// lib/ui/CleaningsCalendar/CleanerDailyCalendar.tsx
"use client";

import { acceptCleaning } from "@/app/cleaner/actions";
import { formatCleaningStatus } from "@/lib/cleaning-ui";
import ListContainer from "@/lib/ui/ListContainer";
import ListRow from "@/lib/ui/ListRow";
import ListThumb from "@/lib/ui/ListThumb";

type CleaningForCalendar = {
  id: string;
  scheduledDate: Date;
  property: {
    id: string;
    name: string;
    shortName?: string | null;
    coverAssetGroupId?: string | null;
  };
  status: string;
  notes?: string | null;
};

interface CleanerDailyCalendarProps {
  myCleanings: CleaningForCalendar[];
  memberCleanings?: CleaningForCalendar[];
  lostCleanings?: CleaningForCalendar[];
  availableCleanings: CleaningForCalendar[];
  referenceDate: Date;
  basePath: string; // ej: "/cleaner"
  currentMemberId: string;
  returnTo: string;
  myThumbUrls: Map<string, string | null>;
  availableThumbUrls: Map<string, string | null>;
}

export default function CleanerDailyCalendar({
  myCleanings,
  memberCleanings = [],
  lostCleanings = [],
  availableCleanings,
  referenceDate,
  basePath,
  currentMemberId,
  returnTo,
  myThumbUrls,
  availableThumbUrls,
}: CleanerDailyCalendarProps) {
  const dayLabel = referenceDate.toLocaleString("es-MX", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });

  const isToday =
    referenceDate.toDateString() === new Date().toDateString();

  // Filtrar limpiezas para el día específico
  const dayKey = `${referenceDate.getFullYear()}-${referenceDate.getMonth()}-${referenceDate.getDate()}`;
  
  const dayMyCleanings = myCleanings.filter((c) => {
    const d = c.scheduledDate;
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    return key === dayKey;
  });

  const dayAvailableCleanings = availableCleanings.filter((c) => {
    const d = c.scheduledDate;
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    return key === dayKey;
  });

  const dayMemberCleanings = memberCleanings.filter((c) => {
    const d = c.scheduledDate;
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    return key === dayKey;
  });

  const dayLostCleanings = lostCleanings.filter((c) => {
    const d = c.scheduledDate;
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    return key === dayKey;
  });

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-3 sm:p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-600">
          {isToday ? "Hoy · " : ""}{dayLabel}
        </p>
        <p className="text-xs text-neutral-500">
          Vista diaria{isToday ? " (hoy)" : ""}
        </p>
      </div>

      {/* Sección "Mías hoy" */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-800">
          Mías {isToday ? "hoy" : ""} ({dayMyCleanings.length})
        </h3>
        {dayMyCleanings.length === 0 ? (
          <p className="text-base text-neutral-500">
            {isToday ? "No tienes limpiezas hoy." : "No tienes limpiezas en este día."}
          </p>
        ) : (
          <ListContainer>
            {dayMyCleanings.map((cleaning, index) => {
              const isLast = index === dayMyCleanings.length - 1;
              const propertyName = cleaning.property.shortName || cleaning.property.name;
              const detailsHref = `${basePath}/cleanings/${cleaning.id}?memberId=${encodeURIComponent(currentMemberId)}&returnTo=${encodeURIComponent(returnTo)}`;

              return (
                <ListRow
                  key={cleaning.id}
                  href={detailsHref}
                  isLast={isLast}
                  ariaLabel={`Ver detalles de limpieza ${propertyName}`}
                >
                  <ListThumb src={myThumbUrls.get(cleaning.property.id) || null} alt={propertyName} />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-base font-medium text-neutral-900 truncate">
                      {propertyName}
                    </h4>
                    <p className="text-xs text-neutral-500 truncate mt-0.5">
                      {cleaning.scheduledDate.toLocaleTimeString("es-MX", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" · "}
                      {formatCleaningStatus(cleaning.status)}
                    </p>
                    {cleaning.notes && (
                      <p className="text-xs text-neutral-500 line-clamp-1 mt-1">
                        {cleaning.notes}
                      </p>
                    )}
                  </div>
                </ListRow>
              );
            })}
          </ListContainer>
        )}
      </div>

      {/* Sección "Disponibles hoy" */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-neutral-800">
          Disponibles {isToday ? "hoy" : ""} ({dayAvailableCleanings.length})
        </h3>
        {dayAvailableCleanings.length === 0 ? (
          <p className="text-base text-neutral-500">
            {isToday ? "No hay limpiezas disponibles hoy." : "No hay limpiezas disponibles en este día."}
          </p>
        ) : (
          <ListContainer>
            {dayAvailableCleanings.map((cleaning, index) => {
              const isLast = index === dayAvailableCleanings.length - 1;
              const propertyName = cleaning.property.shortName || cleaning.property.name;

              return (
                <div
                  key={cleaning.id}
                  className={`relative ${!isLast ? "border-b border-neutral-200" : ""}`}
                >
                  <div
                    className={`
                      flex items-center gap-3
                      py-3 px-3 sm:px-4 pr-24
                      hover:bg-neutral-50
                      transition-colors
                    `.trim()}
                  >
                    <ListThumb src={availableThumbUrls.get(cleaning.property.id) || null} alt={propertyName} />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base font-medium text-neutral-900 truncate">
                        {propertyName}
                      </h4>
                      <p className="text-xs text-neutral-500 truncate mt-0.5">
                        {cleaning.scheduledDate.toLocaleTimeString("es-MX", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {cleaning.notes && (
                        <p className="text-xs text-neutral-500 line-clamp-2 mt-1">
                          {cleaning.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                    <form action={acceptCleaning}>
                      <input type="hidden" name="cleaningId" value={cleaning.id} />
                      <input type="hidden" name="memberId" value={currentMemberId} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <button
                        type="submit"
                        className="rounded-lg bg-black px-4 py-2 text-base font-medium text-white hover:bg-neutral-800 active:scale-[0.99] transition"
                      >
                        Aceptar
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </ListContainer>
        )}
      </div>

      {/* Sección "Perdidas" (pasadas sin asignar) */}
      {dayLostCleanings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-800">
            Perdidas {isToday ? "hoy" : ""} ({dayLostCleanings.length})
          </h3>
          <p className="text-xs text-neutral-500">
            Estas limpiezas ya pasaron y no fueron asignadas. Se muestran solo como referencia.
          </p>
          <ListContainer>
            {dayLostCleanings.map((cleaning, index) => {
              const isLast = index === dayLostCleanings.length - 1;
              const propertyName = cleaning.property.shortName || cleaning.property.name;
              const detailsHref = `${basePath}/cleanings/${cleaning.id}?memberId=${encodeURIComponent(
                currentMemberId
              )}&returnTo=${encodeURIComponent(returnTo)}`;

              return (
                <ListRow
                  key={cleaning.id}
                  href={detailsHref}
                  isLast={isLast}
                  ariaLabel={`Ver detalles de limpieza ${propertyName}`}
                >
                  <ListThumb src={availableThumbUrls.get(cleaning.property.id) || null} alt={propertyName} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <h4 className="text-base font-medium text-neutral-500 truncate line-through">
                        {propertyName}
                      </h4>
                      <span className="shrink-0 text-[10px] font-semibold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full">
                        PERDIDA
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 truncate mt-0.5">
                      {cleaning.scheduledDate.toLocaleTimeString("es-MX", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" · "}
                      {formatCleaningStatus(cleaning.status)}
                    </p>
                    {cleaning.notes && (
                      <p className="text-xs text-neutral-500 line-clamp-1 mt-1">
                        {cleaning.notes}
                      </p>
                    )}
                  </div>
                </ListRow>
              );
            })}
          </ListContainer>
        </div>
      )}

      {/* Sección "Equipo" (solo TL) */}
      {dayMemberCleanings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-neutral-800">
            Del equipo {isToday ? "hoy" : ""} ({dayMemberCleanings.length})
          </h3>
          <ListContainer>
            {dayMemberCleanings.map((cleaning, index) => {
              const isLast = index === dayMemberCleanings.length - 1;
              const propertyName = cleaning.property.shortName || cleaning.property.name;
              const detailsHref = `${basePath}/cleanings/${cleaning.id}?memberId=${encodeURIComponent(currentMemberId)}&returnTo=${encodeURIComponent(returnTo)}`;

              return (
                <ListRow
                  key={cleaning.id}
                  href={detailsHref}
                  isLast={isLast}
                  ariaLabel={`Ver detalles de limpieza ${propertyName}`}
                >
                  <ListThumb src={myThumbUrls.get(cleaning.property.id) || null} alt={propertyName} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <h4 className="text-base font-medium text-neutral-900 truncate">
                        {propertyName}
                      </h4>
                      <span className="shrink-0 text-[10px] font-semibold text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded-full">
                        EQUIPO
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 truncate mt-0.5">
                      {cleaning.scheduledDate.toLocaleTimeString("es-MX", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" · "}
                      {formatCleaningStatus(cleaning.status)}
                    </p>
                    {cleaning.notes && (
                      <p className="text-xs text-neutral-500 line-clamp-1 mt-1">
                        {cleaning.notes}
                      </p>
                    )}
                  </div>
                </ListRow>
              );
            })}
          </ListContainer>
        </div>
      )}
    </div>
  );
}
