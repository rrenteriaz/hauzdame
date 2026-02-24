"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import BottomSheet from "@/lib/ui/BottomSheet";
import AddressModal from "@/lib/ui/AddressModal";
import { updateCleanerProfile } from "./actions";

type InitialProfile = {
  nickname: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
};

export default function EditCleanerProfileModal({
  isOpen,
  onClose,
  initial,
}: {
  isOpen: boolean;
  onClose: () => void;
  initial: InitialProfile;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [nickname, setNickname] = useState(initial.nickname);
  const [fullName, setFullName] = useState(initial.fullName);
  const [phone, setPhone] = useState(initial.phone);

  const [addressLine1, setAddressLine1] = useState(initial.addressLine1);
  const [addressLine2, setAddressLine2] = useState(initial.addressLine2);
  const [neighborhood, setNeighborhood] = useState(initial.neighborhood);
  const [city, setCity] = useState(initial.city);
  const [state, setState] = useState(initial.state);
  const [postalCode, setPostalCode] = useState(initial.postalCode);
  const [country, setCountry] = useState(initial.country || "MX");

  const [latitude, setLatitude] = useState<number | null>(initial.latitude);
  const [longitude, setLongitude] = useState<number | null>(initial.longitude);

  const [isAddressOpen, setIsAddressOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Reset state when opening
  useEffect(() => {
    if (!isOpen) return;
    setNickname(initial.nickname);
    setFullName(initial.fullName);
    setPhone(initial.phone);
    setAddressLine1(initial.addressLine1);
    setAddressLine2(initial.addressLine2);
    setNeighborhood(initial.neighborhood);
    setCity(initial.city);
    setState(initial.state);
    setPostalCode(initial.postalCode);
    setCountry(initial.country || "MX");
    setLatitude(initial.latitude);
    setLongitude(initial.longitude);
    setError(null);
    setSuccess(null);
    setGeoError(null);
  }, [isOpen, initial]);

  // Drawer desktop lifecycle
  useEffect(() => {
    if (isMobile) return;
    if (isOpen) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
    } else {
      setAnimateIn(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setMounted(false), 300);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isOpen, isMobile]);

  // Escape to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        await updateCleanerProfile({
          nickname: nickname.trim() || null,
          fullName: fullName.trim(),
          phone: phone.trim() || null,
          addressLine1: addressLine1.trim() || null,
          addressLine2: addressLine2.trim() || null,
          neighborhood: neighborhood.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          postalCode: postalCode.trim() || null,
          country: country.trim() || "MX",
          latitude,
          longitude,
        });

        setSuccess("Guardado");
        router.refresh(); // refrescar SSR para que menú y perfil reflejen cambios
        onClose();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "No se pudo guardar el perfil";
        setError(msg);
      }
    });
  };

  const handleUseMyLocation = async () => {
    setGeoError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Geolocalización no disponible en este dispositivo.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
      },
      (err) => {
        setGeoError(err.message || "No se pudo obtener tu ubicación.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const addressSummary = (() => {
    const street = addressLine1.trim();
    const interior = addressLine2.trim();
    const combinedStreet = interior ? `${street} Int. ${interior}` : street;
    const parts = [combinedStreet, neighborhood, city, state, postalCode]
      .map((p) => p.trim())
      .filter(Boolean);
    return parts.length ? parts.join(", ") : "";
  })();

  const formContent = (
    <div className="px-6 pt-8 pb-4 sm:pb-8 space-y-4">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-neutral-800">Nickname</label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500"
          placeholder="Ej. Itzel"
        />
        <p className="text-xs text-neutral-500">
          Se mostrará en el menú y en tu equipo (si existe).
        </p>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-neutral-800">Nombre completo *</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500"
          placeholder="Tu nombre completo"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-neutral-800">Teléfono</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500"
          placeholder="Ej. +52 951 000 0000"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-neutral-800">Domicilio</label>
        <button
          type="button"
          onClick={() => setIsAddressOpen(true)}
          className={`w-full text-left rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500 hover:bg-neutral-50 transition-colors ${
            !addressSummary ? "text-neutral-400" : "text-neutral-900"
          }`}
        >
          {addressSummary || "Agregar domicilio"}
        </button>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-neutral-900">Ubicación</p>
            <p className="text-xs text-neutral-500 mt-0.5">
              MVP: guarda lat/lng (sin mapa por ahora).
            </p>
          </div>
          <button
            type="button"
            onClick={handleUseMyLocation}
            className="shrink-0 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 active:scale-[0.99] transition"
          >
            Usar mi ubicación
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-700">Lat</label>
            <input
              type="number"
              step="any"
              value={latitude ?? ""}
              onChange={(e) => setLatitude(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500"
              placeholder="Ej. 17.061..."
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-700">Lng</label>
            <input
              type="number"
              step="any"
              value={longitude ?? ""}
              onChange={(e) => setLongitude(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-500"
              placeholder="Ej. -96.726..."
            />
          </div>
        </div>

        {geoError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {geoError}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {success}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-neutral-100">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="flex-1 rounded-lg border border-black bg-black px-4 py-2.5 text-base font-medium text-white hover:bg-neutral-800 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Guardando..." : "Guardar"}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-base font-medium text-neutral-700 hover:bg-neutral-50 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
      </div>

      <AddressModal
        open={isAddressOpen}
        onOpenChange={setIsAddressOpen}
        title="Domicilio"
        initialValue={{
          addressLine1,
          addressLine2,
          neighborhood,
          city,
          state,
          postalCode,
          country,
        }}
        onSave={(value) => {
          setAddressLine1(value.addressLine1);
          setAddressLine2(value.addressLine2);
          setNeighborhood(value.neighborhood);
          setCity(value.city);
          setState(value.state);
          setPostalCode(value.postalCode);
          setCountry(value.country);
        }}
        mode="auto"
      />
    </div>
  );

  // Móvil: BottomSheet
  if (isMobile) {
    return (
      <BottomSheet isOpen={isOpen} onClose={onClose} title="Editar perfil" maxHeight="90vh">
        {formContent}
      </BottomSheet>
    );
  }

  // Desktop: Drawer
  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        style={{ opacity: animateIn ? 1 : 0, transitionDuration: "300ms" }}
      />

      <div
        className="relative w-[460px] max-w-full h-full bg-white shadow-2xl transform transition-transform ease-out rounded-tl-2xl rounded-bl-2xl"
        style={{
          transform: animateIn ? "translateX(0)" : "translateX(100%)",
          transitionDuration: "300ms",
          willChange: "transform",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="text-xl font-semibold text-neutral-900">Editar perfil</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 text-neutral-500 hover:text-neutral-900 transition rounded-full hover:bg-neutral-100"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto h-[calc(100%-73px)]">{formContent}</div>
      </div>
    </div>
  );
}


