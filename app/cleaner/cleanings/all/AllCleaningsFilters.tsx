"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface AllCleaningsFiltersProps {
  monthParam: string;
  propertyId?: string;
  status?: string;
  scope: "upcoming" | "all" | "history";
  availableProperties: Array<{
    id: string;
    name: string;
    shortName?: string | null;
  }>;
  memberId?: string;
}

export default function AllCleaningsFilters({
  monthParam,
  propertyId,
  status,
  scope,
  availableProperties,
  memberId,
}: AllCleaningsFiltersProps) {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState(monthParam);
  const [selectedProperty, setSelectedProperty] = useState(propertyId || "");
  const [selectedStatus, setSelectedStatus] = useState(status || "");
  const [selectedScope, setSelectedScope] = useState(scope);

  useEffect(() => {
    setSelectedMonth(monthParam);
    setSelectedProperty(propertyId || "");
    setSelectedStatus(status || "");
  }, [monthParam, propertyId, status, scope]);

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = e.target.value;
    setSelectedMonth(newMonth);
    updateUrl(selectedScope, newMonth, selectedProperty, selectedStatus);
  };

  const handlePropertyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProperty = e.target.value;
    setSelectedProperty(newProperty);
    updateUrl(selectedScope, selectedMonth, newProperty, selectedStatus);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setSelectedStatus(newStatus);
    updateUrl(selectedScope, selectedMonth, selectedProperty, newStatus);
  };

  const updateUrl = (nextScope: string, month: string, property: string, status: string) => {
    const params = new URLSearchParams();
    if (memberId) params.set("memberId", memberId);
    params.set("scope", nextScope);
    params.set("month", month);
    if (property) {
      params.set("propertyId", property);
    }
    if (status) {
      params.set("status", status);
    }
    router.push(`/cleaner/cleanings/all?${params.toString()}`);
  };

  // Generar opciones de mes (últimos 12 meses + próximos 3)
  const today = new Date();
  const monthOptions: Array<{ value: string; label: string }> = [];
  
  for (let i = -12; i <= 3; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("es-MX", {
      month: "long",
      year: "numeric",
    });
    monthOptions.push({
      value,
      label: label.charAt(0).toUpperCase() + label.slice(1),
    });
  }

  const statusOptions =
    selectedScope === "history"
      ? [
          { value: "", label: "Completadas" },
          { value: "COMPLETED", label: "Completada" },
          { value: "CANCELLED", label: "Cancelada" },
        ]
      : [
          { value: "", label: "Todos los estados" },
          { value: "PENDING", label: "Pendiente" },
          { value: "IN_PROGRESS", label: "En progreso" },
          { value: "COMPLETED", label: "Completada" },
          { value: "CANCELLED", label: "Cancelada" },
        ];

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {[
          { value: "upcoming", label: "Próximas" },
          { value: "all", label: "Todas" },
          { value: "history", label: "Historial" },
        ].map((option) => {
          const isSelected = selectedScope === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setSelectedScope(option.value as typeof selectedScope);
                updateUrl(option.value, selectedMonth, selectedProperty, selectedStatus);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                isSelected
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Filtro por mes */}
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1.5">
            Mes
          </label>
          <select
            value={selectedMonth}
            onChange={handleMonthChange}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por propiedad */}
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1.5">
            Propiedad
          </label>
          <select
            value={selectedProperty}
            onChange={handlePropertyChange}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          >
            <option value="">Todas las propiedades</option>
            {availableProperties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.shortName || property.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por estado */}
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1.5">
            Estado
          </label>
          <select
            value={selectedStatus}
            onChange={handleStatusChange}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

