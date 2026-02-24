"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import InventoryItemPreviewModal from "./InventoryItemPreviewModal";
import CollapsibleSection from "@/lib/ui/CollapsibleSection";

interface InventoryLine {
  id: string;
  area: string;
  expectedQty: number;
  variantKey: string | null;
  variantValue: string | null;
  item: {
    id: string;
    name: string;
    category: string;
  };
  brand?: string | null;
  model?: string | null;
  color?: string | null;
  size?: string | null;
  condition?: string | null;
  priority?: string | null;
  notes?: string | null;
}

interface InventoryPreviewListProps {
  lines: InventoryLine[];
  itemThumbs: Record<string, Array<string | null>>;
}

export default function InventoryPreviewList({
  lines,
  itemThumbs,
}: InventoryPreviewListProps) {
  const [selectedLine, setSelectedLine] = useState<InventoryLine | null>(null);
  const getConditionLabel = (condition: string | null | undefined) => {
    if (!condition) return null;
    switch (condition) {
      case "NEW":
        return "Nuevo";
      case "USED_LT_1Y":
        return "<1 año";
      case "USED_GT_1Y":
        return ">1 año";
      default:
        return condition;
    }
  };

  const getPriorityLabel = (priority: string | null | undefined) => {
    if (!priority) return null;
    switch (priority) {
      case "HIGH":
        return "Alta";
      case "MEDIUM":
        return "Media";
      case "LOW":
        return "Baja";
      default:
        return priority;
    }
  };

  const getVariantLabel = (variantKey: string | null, variantValue: string | null) => {
    if (!variantKey || !variantValue) return null;
    const variantLabels: Record<string, Record<string, string>> = {
      bed_size: {
        twin: "Individual",
        full: "Full",
        queen: "Queen",
        king: "King",
        california_king: "California King",
      },
    };
    const label = variantLabels[variantKey]?.[variantValue] || variantValue;
    return `${variantKey === "bed_size" ? "Tamaño" : variantKey}: ${label}`;
  };

  if (lines.length === 0) {
    return (
      <div className="text-center py-6 text-neutral-500">
        <p className="text-sm">No hay items de inventario registrados</p>
      </div>
    );
  }

  const linesByArea = useMemo(() => {
    const map = new Map<string, InventoryLine[]>();
    for (const line of lines) {
      const area = (line.area || "Sin área").trim();
      if (!map.has(area)) map.set(area, []);
      map.get(area)!.push(line);
    }
    return map;
  }, [lines]);

  const sortedAreas = useMemo(
    () => Array.from(linesByArea.keys()).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" })),
    [linesByArea]
  );

  return (
    <div className="space-y-3">
      {sortedAreas.map((area) => {
        const areaLines = linesByArea.get(area)!;
        return (
          <CollapsibleSection
            key={area}
            title={area}
            count={areaLines.length}
            defaultOpen={sortedAreas.length <= 3}
          >
            <div className="space-y-2 pt-1">
              {areaLines.map((line) => {
        const thumbs = itemThumbs[line.item.id] || [null, null, null];
        const firstThumb = thumbs.find((thumb) => thumb !== null);

        return (
          <div
            key={line.id}
            onClick={() => setSelectedLine(line)}
            className="flex items-center gap-3 p-2 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 transition cursor-pointer"
          >
            {/* Thumbnail */}
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-neutral-200 overflow-hidden flex items-center justify-center">
              {firstThumb ? (
                <Image
                  src={firstThumb}
                  alt={line.item.name}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg
                  className="w-6 h-6 text-neutral-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {line.item.name}
                  </p>
                  {getVariantLabel(line.variantKey, line.variantValue) && (
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {getVariantLabel(line.variantKey, line.variantValue)}
                    </p>
                  )}
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {line.area} · Cantidad: {line.expectedQty}
                  </p>
                </div>
              </div>

              {/* Chips */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {line.condition && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-neutral-200 text-neutral-700">
                    {getConditionLabel(line.condition)}
                  </span>
                )}
                {line.priority && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-neutral-200 text-neutral-700">
                    {getPriorityLabel(line.priority)}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
            </div>
          </CollapsibleSection>
        );
      })}

      {/* Modal de detalle */}
      <InventoryItemPreviewModal
        isOpen={selectedLine !== null}
        line={selectedLine}
        itemThumbs={selectedLine ? (itemThumbs[selectedLine.item.id] || [null, null, null]) : [null, null, null]}
        onClose={() => setSelectedLine(null)}
      />
    </div>
  );
}

