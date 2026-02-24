"use client";

import { useMemo, useState } from "react";
import EditCleanerProfileModal from "./profile-edit-modal";

type CleanerProfileData =
  | {
      fullName: string | null;
      phone: string | null;
      addressLine1: string | null;
      addressLine2: string | null;
      neighborhood: string | null;
      city: string | null;
      state: string | null;
      postalCode: string | null;
      country: string | null;
      latitude: number | null;
      longitude: number | null;
    }
  | null;

export default function CleanerProfileClient({
  user,
  cleanerProfile,
}: {
  user: { id: string; email: string; nickname: string | null };
  cleanerProfile: CleanerProfileData;
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);

  const addressText = useMemo(() => {
    if (!cleanerProfile) return null;
    const parts = [
      cleanerProfile.addressLine1,
      cleanerProfile.addressLine2 ? `Int. ${cleanerProfile.addressLine2}` : null,
      cleanerProfile.neighborhood,
      cleanerProfile.city,
      cleanerProfile.state,
      cleanerProfile.postalCode,
    ]
      .filter((p) => p && String(p).trim())
      .map((p) => String(p).trim());

    return parts.length ? parts.join(", ") : null;
  }, [cleanerProfile]);

  const locationText = useMemo(() => {
    if (!cleanerProfile?.latitude || !cleanerProfile?.longitude) return null;
    return `${cleanerProfile.latitude.toFixed(6)}, ${cleanerProfile.longitude.toFixed(6)}`;
  }, [cleanerProfile]);

  return (
    <>
      <section className="rounded-2xl border border-neutral-200 bg-white p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-neutral-900">Mi perfil</p>
            <p className="text-xs text-neutral-500 mt-1">
              Esta información se usa para mostrarte en tu equipo y en el marketplace.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="shrink-0 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 active:scale-[0.99] transition"
          >
            Editar
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-neutral-500">Nickname</p>
            <p className="text-base font-medium text-neutral-900 mt-0.5">
              {user.nickname || "—"}
            </p>
          </div>

          <div>
            <p className="text-xs text-neutral-500">Nombre completo</p>
            <p className="text-base font-medium text-neutral-900 mt-0.5">
              {cleanerProfile?.fullName || "—"}
            </p>
          </div>

          <div>
            <p className="text-xs text-neutral-500">Email</p>
            <p className="text-base font-medium text-neutral-900 mt-0.5">
              {user.email}
            </p>
          </div>

          <div>
            <p className="text-xs text-neutral-500">Teléfono</p>
            <p className="text-base font-medium text-neutral-900 mt-0.5">
              {cleanerProfile?.phone || "—"}
            </p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-xs text-neutral-500">Domicilio</p>
            <p className="text-base font-medium text-neutral-900 mt-0.5">
              {addressText || "—"}
            </p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-xs text-neutral-500">Ubicación</p>
            <p className="text-base font-medium text-neutral-900 mt-0.5">
              {locationText ? `Ubicación guardada: ${locationText}` : "—"}
            </p>
          </div>
        </div>
      </section>

      <EditCleanerProfileModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        initial={{
          nickname: user.nickname || "",
          fullName: cleanerProfile?.fullName || "",
          phone: cleanerProfile?.phone || "",
          addressLine1: cleanerProfile?.addressLine1 || "",
          addressLine2: cleanerProfile?.addressLine2 || "",
          neighborhood: cleanerProfile?.neighborhood || "",
          city: cleanerProfile?.city || "",
          state: cleanerProfile?.state || "",
          postalCode: cleanerProfile?.postalCode || "",
          country: cleanerProfile?.country || "MX",
          latitude: cleanerProfile?.latitude ?? null,
          longitude: cleanerProfile?.longitude ?? null,
        }}
      />
    </>
  );
}


