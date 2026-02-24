"use client";

import { useState } from "react";
import DailyCleaningsViewWithModal from "./DailyCleaningsViewWithModal";
import { Cleaning, Property } from "@prisma/client";

type CleaningWithProperty = Cleaning & {
  property: Property;
  viewsCount?: number;
};

type PropertyListItem = Pick<Property, "id" | "name" | "shortName" | "isActive">;

interface CleaningsViewShellProps {
  cleanings: CleaningWithProperty[];
  properties: PropertyListItem[];
  referenceDate: Date;
  monthDate: Date;
  monthParamForLinks: string;
  dateParamForLinks: string;
  initialView: "day" | "week" | "month";
  MonthlyCleaningsCalendar: React.ReactNode;
  WeeklyCleaningsView: React.ReactNode;
}

/**
 * Shell cliente que maneja el viewMode localmente para cambios instantáneos
 * sin navegación ni refetch del servidor.
 */
export default function CleaningsViewShell({
  cleanings,
  properties,
  referenceDate,
  monthDate,
  monthParamForLinks,
  dateParamForLinks,
  initialView,
  MonthlyCleaningsCalendar,
  WeeklyCleaningsView,
}: CleaningsViewShellProps) {
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">(initialView);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-neutral-800">
          Calendario de limpiezas
        </h2>
        {/* Tabs de vista: Día / Semana / Mes (botones locales, no Links) */}
        <div className="inline-flex rounded-full border border-neutral-200 bg-neutral-50 p-1 text-xs">
          <button
            type="button"
            onClick={() => setViewMode("day")}
            className={`px-3 py-1 rounded-full transition ${
              viewMode === "day"
                ? "bg-black text-white"
                : "text-neutral-700 hover:bg-white"
            }`}
          >
            Día
          </button>
          <button
            type="button"
            onClick={() => setViewMode("week")}
            className={`px-3 py-1 rounded-full transition ${
              viewMode === "week"
                ? "bg-black text-white"
                : "text-neutral-700 hover:bg-white"
            }`}
          >
            Semana
          </button>
          <button
            type="button"
            onClick={() => setViewMode("month")}
            className={`px-3 py-1 rounded-full transition ${
              viewMode === "month"
                ? "bg-black text-white"
                : "text-neutral-700 hover:bg-white"
            }`}
          >
            Mes
          </button>
        </div>
      </div>

      {/* Contenido según vista (renderizado local, sin refetch) */}
      {viewMode === "month" && MonthlyCleaningsCalendar}

      {viewMode === "week" && WeeklyCleaningsView}

      {viewMode === "day" && (
        <DailyCleaningsViewWithModal
          cleanings={cleanings as any}
          properties={properties}
          referenceDate={referenceDate}
          view={viewMode}
          monthParamForLinks={monthParamForLinks}
          dateParamForLinks={dateParamForLinks}
        />
      )}
    </section>
  );
}

