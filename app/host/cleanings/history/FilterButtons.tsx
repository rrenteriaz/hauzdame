"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import IconFilterButton from "@/lib/ui/IconFilterButton";
import PropertyPickerSheet from "@/lib/ui/PropertyPickerSheet";
import OptionPickerSheet from "@/lib/ui/OptionPickerSheet";

interface FilterButtonsProps {
  properties: Array<{ id: string; name: string; shortName?: string | null }>;
  selectedPropertyId: string;
  selectedPeriod: string;
  selectedStatus: string;
}

const PERIOD_OPTIONS = [
  { value: "this-month", label: "Este mes" },
  { value: "previous-month", label: "Mes anterior" },
  { value: "this-year", label: "Este año" },
  { value: "last-year", label: "Año anterior" },
  { value: "last-365-days", label: "Último año" },
] as const;

const STATUS_OPTIONS = [
  { value: "ALL", label: "Todos los estados" },
  { value: "PENDING", label: "Pendiente" },
  { value: "IN_PROGRESS", label: "En progreso" },
  { value: "COMPLETED", label: "Completada" },
  { value: "CANCELLED", label: "Cancelada" },
] as const;

export default function FilterButtons({
  properties,
  selectedPropertyId,
  selectedPeriod,
  selectedStatus,
}: FilterButtonsProps) {
  const router = useRouter();
  const [isPropertySheetOpen, setIsPropertySheetOpen] = useState(false);
  const [isPeriodSheetOpen, setIsPeriodSheetOpen] = useState(false);
  const [isStatusSheetOpen, setIsStatusSheetOpen] = useState(false);

  const buildUrl = (propertyId?: string, period?: string, status?: string) => {
    const params = new URLSearchParams();
    if (propertyId !== undefined) {
      if (propertyId) params.set("propertyId", propertyId);
    } else if (selectedPropertyId) {
      params.set("propertyId", selectedPropertyId);
    }
    
    if (period !== undefined) {
      if (period) params.set("period", period);
    } else if (selectedPeriod) {
      params.set("period", selectedPeriod);
    }
    
    if (status !== undefined) {
      // Si status es "ALL", pasar "ALL" explícitamente en la URL
      if (status === "ALL") {
        params.set("status", "ALL");
      } else if (status) {
        params.set("status", status);
      } else {
        params.delete("status");
      }
    } else if (selectedStatus) {
      params.set("status", selectedStatus);
    }
    
    return `/host/cleanings/history?${params.toString()}`;
  };

  const handlePropertySelect = (propertyId: string | "") => {
    router.push(buildUrl(propertyId, undefined, undefined));
  };

  const handlePeriodSelect = (period: string | "") => {
    // El período siempre debe tener un valor (no hay opción "Todas")
    router.push(buildUrl(undefined, period || selectedPeriod || "this-month", undefined));
  };

  const handleStatusSelect = (status: string | "") => {
    router.push(buildUrl(undefined, undefined, status));
  };

  return (
    <>
      {/* Móvil: Iconos en línea */}
      <div className="sm:hidden">
        <div className="flex items-center gap-6 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Filtro Propiedad */}
          <IconFilterButton
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                />
              </svg>
            }
            label="Propiedad"
            active={!!selectedPropertyId}
            onClick={() => setIsPropertySheetOpen(true)}
          />

          {/* Filtro Período */}
          <IconFilterButton
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            label="Período"
            active={selectedPeriod !== "this-month"}
            onClick={() => setIsPeriodSheetOpen(true)}
          />

          {/* Filtro Estado */}
          <IconFilterButton
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            label="Estado"
            active={!!selectedStatus && selectedStatus !== "ALL"}
            onClick={() => setIsStatusSheetOpen(true)}
          />
        </div>
      </div>

      {/* Desktop: Dropdowns originales */}
      <div className="hidden sm:grid grid-cols-3 gap-3">
        {/* Botón selector de Propiedad */}
        <button
          type="button"
          onClick={() => setIsPropertySheetOpen(true)}
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-base flex items-center justify-between hover:border-neutral-400 hover:bg-neutral-50 transition"
        >
          <span className="text-neutral-900">Propiedad</span>
          <span className="text-neutral-400 ml-2 shrink-0">▼</span>
        </button>

        {/* Botón selector de Período */}
        <button
          type="button"
          onClick={() => setIsPeriodSheetOpen(true)}
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-base flex items-center justify-between hover:border-neutral-400 hover:bg-neutral-50 transition"
        >
          <span className="text-neutral-900">Período</span>
          <span className="text-neutral-400 ml-2 shrink-0">▼</span>
        </button>

        {/* Botón selector de Estado */}
        <button
          type="button"
          onClick={() => setIsStatusSheetOpen(true)}
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-base flex items-center justify-between hover:border-neutral-400 hover:bg-neutral-50 transition"
        >
          <span className="text-neutral-900">Estado</span>
          <span className="text-neutral-400 ml-2 shrink-0">▼</span>
        </button>
      </div>

      {/* Bottom Sheets para móvil y desktop */}
      {/* Selector de Propiedad */}
      <PropertyPickerSheet
        isOpen={isPropertySheetOpen}
        onClose={() => setIsPropertySheetOpen(false)}
        properties={properties}
        selectedPropertyId={selectedPropertyId || ""}
        onSelect={handlePropertySelect}
        title="Filtrar por propiedad"
      />

      {/* Selector de Período */}
      <OptionPickerSheet
        isOpen={isPeriodSheetOpen}
        onClose={() => setIsPeriodSheetOpen(false)}
        title="Filtrar por período"
        options={PERIOD_OPTIONS.map((p) => ({ value: p.value, label: p.label }))}
        selectedValue={selectedPeriod}
        onSelect={handlePeriodSelect}
        includeAllOption={undefined} // No hay opción "Todas" para período
      />

      {/* Selector de Estado */}
      <OptionPickerSheet
        isOpen={isStatusSheetOpen}
        onClose={() => setIsStatusSheetOpen(false)}
        title="Filtrar por estado"
        options={STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
        selectedValue={selectedStatus === "ALL" || !selectedStatus ? "ALL" : selectedStatus}
        onSelect={handleStatusSelect}
        includeAllOption={undefined} // Ya tenemos "Todos los estados" en STATUS_OPTIONS
      />
    </>
  );
}

