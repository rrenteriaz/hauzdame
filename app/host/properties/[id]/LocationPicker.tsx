"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker, LeafletMouseEvent } from "leaflet";

type LatLngValue = { latitude: number; longitude: number } | null;

interface LocationPickerProps {
  value: LatLngValue;
  onChange: (value: LatLngValue) => void;
  hideUseMyLocationButton?: boolean; // Si true, oculta el botón "Usar ubicación actual"
  onModalOpen?: boolean; // Indica si el modal padre está abierto
  onCollapsibleToggle?: boolean; // Indica si la sección colapsable está abierta
}

function round6(n: number) {
  return Math.round(n * 1_000_000) / 1_000_000;
}

function isImageModule(x: unknown): x is { src: string } {
  return (
    typeof x === "object" &&
    x !== null &&
    "src" in x &&
    typeof (x as { src?: unknown }).src === "string"
  );
}

export default function LocationPicker({ value, onChange, hideUseMyLocationButton = false, onModalOpen, onCollapsibleToggle }: LocationPickerProps) {
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const setMarkerRef = useRef<((lat: number, lng: number, emit: boolean) => void) | null>(null);

  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);

  const initialCenter = useMemo(() => {
    if (value) return { lat: value.latitude, lng: value.longitude };
    // Centro por defecto (CDMX) para UX limpia si no hay ubicación definida.
    return { lat: 19.432608, lng: -99.133209 };
  }, [value]);

  // Inicializar Leaflet map una vez
  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!mapElRef.current) return;
      if (mapRef.current) return;

      const L = await import("leaflet");
      if (cancelled) return;

      leafletRef.current = L;

      // Fix icon paths en bundlers (Next/Webpack)
      const markerIcon2x = (await import("leaflet/dist/images/marker-icon-2x.png")).default;
      const markerIcon = (await import("leaflet/dist/images/marker-icon.png")).default;
      const markerShadow = (await import("leaflet/dist/images/marker-shadow.png")).default;

      const toUrl = (x: unknown): string => {
        if (typeof x === "string") return x;
        if (isImageModule(x)) return x.src;
        return "";
      };

      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: toUrl(markerIcon2x),
        iconUrl: toUrl(markerIcon),
        shadowUrl: toUrl(markerShadow),
      });

      const map = L.map(mapElRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([initialCenter.lat, initialCenter.lng], value ? 16 : 11);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Corregir tamaño del mapa después de montar (importante en modales)
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 0);

      // Click para fijar/mover pin
      map.on("click", (e: LeafletMouseEvent) => {
        const lat = round6(e.latlng.lat);
        const lng = round6(e.latlng.lng);
        setGeoError(null);
        setMarker(lat, lng, true);
      });

      mapRef.current = map;

      // Si ya hay valor, dibujar marker
      if (value) {
        setMarker(value.latitude, value.longitude, false);
      }
    }

    const setMarker = (lat: number, lng: number, emit: boolean) => {
      const L = leafletRef.current;
      if (!L || !mapRef.current) return;

      const map = mapRef.current;

      if (!markerRef.current) {
        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        marker.on("dragend", () => {
          const ll = marker.getLatLng();
          const newLat = round6(ll.lat);
          const newLng = round6(ll.lng);
          setGeoError(null);
          onChange({ latitude: newLat, longitude: newLng });
        });
        markerRef.current = marker;
      } else {
        markerRef.current.setLatLng([lat, lng]);
      }

      // Centrar suavemente al mover por click/geoloc
      map.setView([lat, lng], Math.max(map.getZoom(), 16), { animate: true });
      
      // Corregir tamaño después de setView (importante en modales/collapsibles)
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 0);

      if (emit) {
        setGeoError(null);
        onChange({ latitude: lat, longitude: lng });
      }
    };

    setMarkerRef.current = setMarker;

    init();

    return () => {
      cancelled = true;
      try {
        if (mapRef.current) {
          mapRef.current.remove();
        }
      } catch {
        // noop
      }
      mapRef.current = null;
      markerRef.current = null;
      leafletRef.current = null;
      setMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mantener marker sincronizado si cambia value externamente (abrir modal / reset)
  useEffect(() => {
    const setMarker = setMarkerRef.current;
    if (!setMarker) return;
    if (!value) return;
    setMarker(round6(value.latitude), round6(value.longitude), false);
    
    // Corregir tamaño después de actualizar (importante cuando cambia value en modal)
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 0);
  }, [value]);

  // Corregir tamaño cuando se abre el modal o cuando cambia el estado del collapsible
  useEffect(() => {
    if (onModalOpen && mapRef.current) {
      // Cuando el modal se abre, esperar un poco para que el layout se estabilice
      const timer = setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [onModalOpen]);

  useEffect(() => {
    if (onCollapsibleToggle !== undefined && mapRef.current) {
      // Cuando el collapsible cambia (abre/cierra), corregir tamaño
      const timer = setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [onCollapsibleToggle]);

  const handleUseMyLocation = () => {
    setGeoError(null);
    if (!("geolocation" in navigator)) {
      setGeoError(
        "Tu navegador no permite obtener la ubicación. Coloca el pin manualmente en el mapa."
      );
      return;
    }

    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoBusy(false);
        setGeoError(null);
        const lat = round6(pos.coords.latitude);
        const lng = round6(pos.coords.longitude);
        const setMarker = setMarkerRef.current;
        if (setMarker) setMarker(lat, lng, true);
        else onChange({ latitude: lat, longitude: lng });
      },
      (err) => {
        setGeoBusy(false);
        setGeoError(
          err?.message
            ? `No se pudo obtener tu ubicación (${err.message}). Coloca el pin manualmente en el mapa.`
            : "No se pudo obtener tu ubicación (permiso o navegador). Coloca el pin manualmente en el mapa."
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const handleClear = () => {
    setGeoError(null);
    onChange(null);
    if (markerRef.current) {
      try {
        markerRef.current.remove();
      } catch {
        // noop
      }
      markerRef.current = null;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="text-xs text-neutral-600">
          {!value ? (
            <span>Aún no has definido una ubicación.</span>
          ) : (
            <span>Ubicación guardada.</span>
          )}
        </div>
        {!hideUseMyLocationButton && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={geoBusy}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {geoBusy ? "Obteniendo..." : "Usar ubicación actual"}
            </button>
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition"
              >
                Quitar
              </button>
            )}
          </div>
        )}
        {hideUseMyLocationButton && value && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition"
            >
              Quitar
            </button>
          </div>
        )}
      </div>

      {geoError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs text-amber-900">{geoError}</p>
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50">
        <div ref={mapElRef} className="h-[280px] w-full" />
      </div>

      <p className="text-[11px] text-neutral-500">
        Tip: haz click en el mapa para colocar el pin o arrástralo para ajustar.
      </p>
    </div>
  );
}


