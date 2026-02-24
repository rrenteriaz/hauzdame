"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TeamPropertiesModal from "./TeamPropertiesModal";

interface PropertyItem {
  id: string;
  name: string;
  shortName: string | null;
  address: string | null;
  isActive: boolean;
}

interface TeamPropertiesCardProps {
  teamId: string;
  teamStatus: "ACTIVE" | "INACTIVE";
  canEdit: boolean;
  assignedProperties: PropertyItem[];
  allProperties: PropertyItem[];
  assignedPropertyIds: string[];
}

export default function TeamPropertiesCard({
  teamId,
  teamStatus,
  canEdit,
  assignedProperties,
  allProperties,
  assignedPropertyIds,
}: TeamPropertiesCardProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const isInactive = teamStatus === "INACTIVE";

  const handleSaved = () => {
    setToastVisible(true);
    router.refresh();
    setTimeout(() => setToastVisible(false), 2500);
  };

  const canEditProperties = canEdit && !isInactive;

  const assignedCount = assignedProperties.length;
  const sortedAssigned = useMemo(() => {
    return [...assignedProperties].sort((a, b) => {
      const nameA = (a.shortName || a.name || "").toLowerCase();
      const nameB = (b.shortName || b.name || "").toLowerCase();
      return nameA.localeCompare(nameB, "es");
    });
  }, [assignedProperties]);

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-neutral-800">
          Propiedades asignadas ({assignedCount})
        </h2>
        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              disabled={!canEditProperties}
              title={isInactive ? "Activa el equipo para modificar propiedades" : undefined}
              className={`text-xs underline underline-offset-2 ${
                canEditProperties ? "text-neutral-600 hover:text-neutral-800" : "text-neutral-300 cursor-not-allowed"
              }`}
            >
              Editar propiedades
            </button>
            {isInactive && (
              <span className="text-xs text-neutral-500">Equipo inactivo</span>
            )}
          </div>
        )}
      </div>

      {assignedCount === 0 ? (
        <p className="text-xs text-neutral-500 text-center py-4">
          No hay propiedades asignadas a este equipo. Asigna propiedades desde el detalle de cada propiedad.
        </p>
      ) : (
        <ul className="space-y-2">
          {sortedAssigned.map((property) => (
            <li
              key={property.id}
              className={`rounded-xl border border-neutral-200 p-3 ${!property.isActive ? "opacity-60" : ""}`}
            >
              <Link
                href={`/host/properties/${property.id}?returnTo=${encodeURIComponent(`/host/teams/${teamId}`)}`}
                className="block"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-base font-medium text-neutral-900">
                        {property.shortName || property.name}
                      </p>
                      {!property.isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          Inactiva
                        </span>
                      )}
                    </div>
                    {property.name !== property.shortName && property.shortName && (
                      <p className="text-xs text-neutral-600 mt-0.5">
                        {property.name}
                      </p>
                    )}
                    {property.address && (
                      <p className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1.5">
                        <span>📍</span>
                        <span className="truncate">{property.address}</span>
                      </p>
                    )}
                  </div>
                  <svg
                    className="w-4 h-4 text-neutral-400 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <TeamPropertiesModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        teamId={teamId}
        properties={allProperties}
        assignedPropertyIds={assignedPropertyIds}
        onSaved={handleSaved}
      />

      {toastVisible && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] rounded-full bg-neutral-900 px-4 py-2 text-sm text-white shadow-lg">
          Propiedades actualizadas
        </div>
      )}
    </section>
  );
}

