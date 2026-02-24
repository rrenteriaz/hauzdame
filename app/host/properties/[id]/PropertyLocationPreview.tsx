"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";

interface PropertyLocationPreviewProps {
  latitude: number;
  longitude: number;
  propertyName: string;
}

function isImageModule(x: unknown): x is { src: string } {
  return (
    typeof x === "object" &&
    x !== null &&
    "src" in x &&
    typeof (x as { src?: unknown }).src === "string"
  );
}

export default function PropertyLocationPreview({
  latitude,
  longitude,
  propertyName,
}: PropertyLocationPreviewProps) {
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!mapElRef.current) return;
      if (mapRef.current) return;

      setIsLoading(true);

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
        zoomControl: false, // Deshabilitar controles de zoom en preview
        attributionControl: true,
        dragging: false, // Deshabilitar drag en preview
        touchZoom: false, // Deshabilitar zoom táctil en preview
        doubleClickZoom: false,
        scrollWheelZoom: false,
        boxZoom: false,
        keyboard: false,
      }).setView([latitude, longitude], 16);
      
      // Asegurar que el mapa use el orden correcto [lat, lng]
      // Leaflet espera [lat, lng] en setView y marker

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Agregar marker
      L.marker([latitude, longitude]).addTo(map);

      mapRef.current = map;
      setIsLoading(false);

      // Corregir tamaño después de montar
      setTimeout(() => {
        if (mapRef.current && !cancelled) {
          mapRef.current.invalidateSize();
        }
      }, 0);
    }

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
      leafletRef.current = null;
    };
  }, [latitude, longitude]);

  return (
    <div className="property-map-preview relative w-full rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50 isolate">
      <div ref={mapElRef} className="h-[200px] lg:h-[240px] w-full" />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 z-10">
          <p className="text-xs text-neutral-500">Cargando mapa...</p>
        </div>
      )}
      <a
        href={`https://www.google.com/maps?q=${latitude},${longitude}`}
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-2 right-2 rounded-lg bg-white px-2 py-1 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 transition z-10"
      >
        Abrir en Maps
      </a>
    </div>
  );
}

