// app/cleaner/marketplace/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { OwnerCardPublic } from "@/components/marketplace/OwnerCardPublic";

interface Opening {
  id: string;
  zoneLabel: string | null;
  notes: string | null;
  status: string;
  workType: string;
  tenantId: string;
  createdAt: string;
}

export default function CleanerMarketplacePage() {
  const router = useRouter();
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [zoneFilter, setZoneFilter] = useState("");

  const loadOpenings = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (zoneFilter) {
        params.set("zone", zoneFilter);
      }
      const url = `/api/openings?${params.toString()}`;
      console.log("[DEBUG Marketplace] Fetching openings from:", url);
      const res = await fetch(url);
      const data = await res.json();
      console.log("[DEBUG Marketplace] Response status:", res.status);
      console.log("[DEBUG Marketplace] Response data:", data);
      console.log("[DEBUG Marketplace] Openings received:", data.openings?.length || 0);
      if (data.openings && data.openings.length > 0) {
        console.log("[DEBUG Marketplace] First opening:", JSON.stringify(data.openings[0], null, 2));
      }
      setOpenings(data.openings || []);
    } catch (error) {
      console.error("[DEBUG Marketplace] Error cargando openings:", error);
    } finally {
      setLoading(false);
    }
  }, [zoneFilter]);

  useEffect(() => {
    loadOpenings();
  }, [loadOpenings]);

  const handleApply = async (openingId: string) => {
    if (applying) return;

    try {
      setApplying(openingId);
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingId }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Error aplicando");
        return;
      }

      // Navegar al chat del thread creado
      if (data.threadId) {
        router.push(`/cleaner/messages/${data.threadId}`);
      } else {
        // Si no hay threadId, ir al inbox
        router.push("/cleaner/messages");
      }
    } catch (error) {
      console.error("Error aplicando:", error);
      alert("Error al enviar solicitud");
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Marketplace</h1>

      {/* Filtro */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Filtrar por ciudad/zona..."
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
          className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-neutral-500">Cargando...</div>
      ) : openings.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          <p>No hay limpiezas disponibles</p>
          {zoneFilter && (
            <button
              onClick={() => setZoneFilter("")}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              Limpiar filtro
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {openings.map((opening) => (
            <div
              key={opening.id}
              className="bg-white rounded-lg border border-neutral-200 p-4 hover:border-neutral-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="mb-2">
                    <div className="font-semibold text-neutral-900 mb-1">
                      {opening.zoneLabel || "Zona no especificada"}
                    </div>
                    {opening.notes && (
                      <p className="text-sm text-neutral-600">{opening.notes}</p>
                    )}
                  </div>
                  <OwnerCardPublic tenantId={opening.tenantId} compact />
                </div>
                <button
                  onClick={() => handleApply(opening.id)}
                  disabled={applying === opening.id}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shrink-0"
                >
                  {applying === opening.id ? "Aplicando..." : "Solicitar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

