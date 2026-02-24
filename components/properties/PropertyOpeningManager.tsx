// components/properties/PropertyOpeningManager.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface PropertyOpeningManagerProps {
  propertyId: string;
  returnTo?: string;
  initialOpening?: Opening | null;
}

interface Opening {
  id: string;
  status: string;
  zoneLabel: string | null;
  notes: string | null;
}

export function PropertyOpeningManager({
  propertyId,
  returnTo,
  initialOpening = null,
}: PropertyOpeningManagerProps) {
  const [opening, setOpening] = useState<Opening | null>(initialOpening || null);
  const [loading, setLoading] = useState(false); // Ya no carga inicialmente si hay initialOpening
  const [saving, setSaving] = useState(false);
  const [zoneLabel, setZoneLabel] = useState(initialOpening?.zoneLabel || "");
  const [notes, setNotes] = useState(initialOpening?.notes || "");
  const [showForm, setShowForm] = useState(false);

  // Solo cargar si no hay initialOpening
  useEffect(() => {
    if (!initialOpening) {
      loadOpening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  const loadOpening = async () => {
    try {
      const res = await fetch(`/api/openings?propertyId=${propertyId}`);
      const data = await res.json();
      const activeOpening = data.openings?.find(
        (o: Opening) => o.status === "ACTIVE" || o.status === "PAUSED"
      );
      setOpening(activeOpening || null);
      if (activeOpening) {
        setZoneLabel(activeOpening.zoneLabel || "");
        setNotes(activeOpening.notes || "");
      }
    } catch (error) {
      console.error("Error cargando opening:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!zoneLabel.trim()) {
      alert("La zona/ciudad es requerida");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/openings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          workType: "CLEANING",
          zoneLabel: zoneLabel.trim(),
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Error creando anuncio");
        return;
      }

      setOpening(data.opening);
      setShowForm(false);
      loadOpening();
    } catch (error) {
      console.error("Error creando opening:", error);
      alert("Error al crear anuncio");
    } finally {
      setSaving(false);
    }
  };

  const handlePause = async () => {
    if (!opening) return;

    try {
      setSaving(true);
      const res = await fetch("/api/openings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openingId: opening.id,
          status: "PAUSED",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Error pausando anuncio");
        return;
      }

      loadOpening();
    } catch (error) {
      console.error("Error pausando opening:", error);
      alert("Error al pausar anuncio");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    if (!opening) return;

    if (!confirm("¿Estás seguro de cerrar este anuncio? No se podrá reactivar.")) {
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/openings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openingId: opening.id,
          status: "CLOSED",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Error cerrando anuncio");
        return;
      }

      setOpening(null);
      setZoneLabel("");
      setNotes("");
      loadOpening();
    } catch (error) {
      console.error("Error cerrando opening:", error);
      alert("Error al cerrar anuncio");
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!opening) return;

    try {
      setSaving(true);
      const res = await fetch("/api/openings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openingId: opening.id,
          status: "ACTIVE",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Error activando anuncio");
        return;
      }

      loadOpening();
    } catch (error) {
      console.error("Error activando opening:", error);
      alert("Error al activar anuncio");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="text-sm text-neutral-500">Cargando publicaciones...</div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-neutral-800">Busco Cleaner</h2>
        {opening && (
          <Link
            href={`/host/properties/${propertyId}/applications?returnTo=${encodeURIComponent(returnTo || `/host/properties/${propertyId}`)}`}
            className="text-sm text-blue-600 hover:underline"
          >
            Ver solicitudes
          </Link>
        )}
      </div>

      {opening ? (
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  opening.status === "ACTIVE"
                    ? "bg-green-100 text-green-800"
                    : opening.status === "PAUSED"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-neutral-100 text-neutral-800"
                }`}
              >
                {opening.status === "ACTIVE"
                  ? "Activa"
                  : opening.status === "PAUSED"
                  ? "Pausada"
                  : "Cerrada"}
              </span>
            </div>
            {opening.zoneLabel && (
              <p className="text-sm text-neutral-600">
                <span className="font-medium">Zona:</span> {opening.zoneLabel}
              </p>
            )}
            {opening.notes && (
              <p className="text-sm text-neutral-600 mt-1">{opening.notes}</p>
            )}
          </div>

          <div className="flex gap-2">
            {opening.status === "ACTIVE" && (
              <>
                <button
                  onClick={handlePause}
                  disabled={saving}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 text-sm"
                >
                  Pausar
                </button>
                <button
                  onClick={handleClose}
                  disabled={saving}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
                >
                  Cerrar
                </button>
              </>
            )}
            {opening.status === "PAUSED" && (
              <>
                <button
                  onClick={handleActivate}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                >
                  Activar
                </button>
                <button
                  onClick={handleClose}
                  disabled={saving}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
                >
                  Cerrar
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Publicar anuncio
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Zona/Ciudad <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={zoneLabel}
                  onChange={(e) => setZoneLabel(e.target.value)}
                  placeholder="Ej: Centro, Querétaro"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Solo zona aproximada, sin dirección exacta
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Notas (opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Información adicional para cleaners..."
                  rows={3}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={saving || !zoneLabel.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                >
                  {saving ? "Creando..." : "Crear"}
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setZoneLabel("");
                    setNotes("");
                  }}
                  disabled={saving}
                  className="px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 disabled:opacity-50 text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

