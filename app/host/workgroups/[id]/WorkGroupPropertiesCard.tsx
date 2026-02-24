"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import WorkGroupPropertiesModal from "./WorkGroupPropertiesModal";

interface PropertyItem {
  id: string;
  name: string;
  shortName: string | null;
  address: string | null;
  isActive: boolean;
}

interface WorkGroupPropertiesCardProps {
  workGroupId: string;
  canEdit: boolean;
  assignedProperties: PropertyItem[];
  allProperties: PropertyItem[];
  assignedPropertyIds: string[];
}

export default function WorkGroupPropertiesCard({
  workGroupId,
  canEdit,
  assignedProperties,
  allProperties,
  assignedPropertyIds,
}: WorkGroupPropertiesCardProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const handleSaved = () => {
    setToastVisible(true);
    router.refresh();
    setTimeout(() => setToastVisible(false), 2500);
  };

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
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2 group"
        >
          <h2 className="text-base font-semibold text-neutral-800">
            Propiedades asignadas ({assignedCount})
          </h2>
          <svg
            className={`w-5 h-5 text-neutral-400 transition-transform duration-200 ${
              isCollapsed ? "" : "rotate-180"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {canEdit && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="text-xs underline underline-offset-2 text-neutral-600 hover:text-neutral-800"
          >
            Editar propiedades
          </button>
        )}
      </div>

      {!isCollapsed && (
        <div className="pt-2 space-y-4">
          {assignedCount === 0 ? (
            <p className="text-xs text-neutral-500 text-center py-4">
              No hay propiedades asignadas a este grupo de trabajo. Asigna propiedades desde aquí o desde el detalle de cada propiedad.
            </p>
          ) : (
            <ul className="space-y-2">
              {sortedAssigned.map((property) => (
                <li
                  key={property.id}
                  className={`rounded-xl border border-neutral-200 p-3 ${!property.isActive ? "opacity-60" : ""}`}
                >
                  <Link
                    href={`/host/properties/${property.id}?returnTo=${encodeURIComponent(`/host/workgroups/${workGroupId}`)}`}
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
        </div>
      )}

      <WorkGroupPropertiesModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        workGroupId={workGroupId}
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

