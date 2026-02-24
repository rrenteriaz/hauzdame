"use client";

import { useRouter, useSearchParams } from "next/navigation";
import PropertyPicker from "@/lib/ui/PropertyPicker";

interface Property {
  id: string;
  name: string;
  shortName?: string | null;
}

interface HistoryFiltersProps {
  properties: Property[];
  selectedPropertyId?: string;
  selectedPeriod?: string;
  memberId?: string;
}

export default function HistoryFilters({
  properties,
  selectedPropertyId,
  selectedPeriod = "last_7_days",
  memberId,
}: HistoryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePropertyChange = (propertyId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (memberId) params.set("memberId", memberId);
    if (propertyId) {
      params.set("propertyId", propertyId);
    } else {
      params.delete("propertyId");
    }
    // Mantener el período actual
    if (selectedPeriod && selectedPeriod !== "last_7_days") {
      params.set("period", selectedPeriod);
    }
    router.push(`/cleaner/history?${params.toString()}`);
  };

  const handlePeriodChange = (period: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (memberId) params.set("memberId", memberId);
    // Mantener la propiedad actual
    if (selectedPropertyId) {
      params.set("propertyId", selectedPropertyId);
    }
    if (period !== "last_7_days") {
      params.set("period", period);
    } else {
      params.delete("period");
    }
    router.push(`/cleaner/history?${params.toString()}`);
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Filtro por Propiedad */}
      <div>
        <PropertyPicker
          properties={properties}
          selectedPropertyId={selectedPropertyId || ""}
          onSelect={(propertyId) => handlePropertyChange(propertyId || null)}
          label="Propiedad"
          showLabel={true}
        />
      </div>

      {/* Filtro por Período */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Período
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handlePeriodChange("last_7_days")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              selectedPeriod === "last_7_days"
                ? "bg-black text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            Últimos 7 días
          </button>
          <button
            type="button"
            onClick={() => handlePeriodChange("last_month")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              selectedPeriod === "last_month"
                ? "bg-black text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            Último Mes
          </button>
          <button
            type="button"
            onClick={() => handlePeriodChange("previous_month")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              selectedPeriod === "previous_month"
                ? "bg-black text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            Mes Anterior
          </button>
          <button
            type="button"
            onClick={() => handlePeriodChange("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              selectedPeriod === "all"
                ? "bg-black text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            Todas
          </button>
        </div>
      </div>
    </div>
  );
}

