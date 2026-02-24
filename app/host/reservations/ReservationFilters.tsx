"use client";

import { useRouter, useSearchParams } from "next/navigation";
import PropertyPicker from "@/lib/ui/PropertyPicker";
import MobileReservationFilters from "./MobileReservationFilters";

export default function ReservationFilters({
  properties,
  currentPropertyId,
  currentStatus,
  currentDateBucket,
}: {
  properties: Array<{ id: string; name: string; shortName: string | null }>;
  currentPropertyId?: string;
  currentStatus?: string;
  currentDateBucket?: "PAST" | "CURRENT_FUTURE" | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePropertyChange = (propertyId: string | "") => {
    const params = new URLSearchParams(searchParams.toString());
    if (propertyId) {
      params.set("propertyId", propertyId);
    } else {
      params.delete("propertyId");
    }
    // Mantener el status y dateBucket actual
    if (currentStatus && currentStatus !== "CONFIRMED") {
      params.set("status", currentStatus);
    }
    if (currentDateBucket) {
      params.set("dateBucket", currentDateBucket);
    }
    router.push(`/host/reservations${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    // Mantener propertyId y dateBucket actual
    if (currentPropertyId) {
      params.set("propertyId", currentPropertyId);
    }
    if (currentDateBucket) {
      params.set("dateBucket", currentDateBucket);
    }
    if (value && value !== "all") {
      params.set(key, value);
    } else if (value === "all") {
      // Si es "all", establecer el parámetro como "all" para mostrar todas
      params.set(key, "all");
    } else {
      params.delete(key);
    }
    router.push(`/host/reservations${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <>
      {/* Móvil: 4 botones circulares */}
      <div className="sm:hidden">
        <MobileReservationFilters
          properties={properties}
          currentPropertyId={currentPropertyId}
          currentStatus={currentStatus}
          currentDateBucket={currentDateBucket}
        />
      </div>

      {/* Desktop: Dropdowns */}
      <div className="hidden sm:flex flex-col sm:flex-row gap-3">
        {/* Filtro por propiedad */}
        <div className="flex-1">
          <PropertyPicker
            properties={properties}
            selectedPropertyId={currentPropertyId || ""}
            onSelect={handlePropertyChange}
            label="Propiedad"
            showLabel={true}
          />
        </div>

        {/* Filtro por status */}
        <div className="flex-1">
          <label className="block text-xs font-medium text-neutral-700 mb-1">
            Estado
          </label>
          <select
            value={currentStatus === "all" ? "all" : (currentStatus || "CONFIRMED")}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500 bg-white min-h-[42px]"
          >
            <option value="CONFIRMED">Confirmada</option>
            <option value="CANCELLED">Cancelada</option>
            <option value="all">Todos los estados</option>
          </select>
        </div>
      </div>
    </>
  );
}

