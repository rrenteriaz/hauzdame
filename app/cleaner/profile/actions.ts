"use server";

import prisma from "@/lib/prisma";
import { requireCleanerUser } from "@/lib/auth/requireUser";
import { revalidatePath } from "next/cache";

export type UpdateCleanerProfileInput = {
  nickname?: string | null;
  fullName: string;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export async function updateCleanerProfile(input: UpdateCleanerProfileInput) {
  const user = await requireCleanerUser();

  const fullName = (input.fullName ?? "").toString().trim();
  if (!fullName) {
    throw new Error("El nombre completo es requerido.");
  }

  const nicknameRaw = input.nickname?.toString().trim() ?? "";
  const nickname = nicknameRaw ? nicknameRaw : null;

  const phoneRaw = input.phone?.toString().trim() ?? "";
  const phone = phoneRaw ? phoneRaw : null;

  const addressLine1 = input.addressLine1?.toString().trim() || null;
  const addressLine2 = input.addressLine2?.toString().trim() || null;
  const neighborhood = input.neighborhood?.toString().trim() || null;
  const city = input.city?.toString().trim() || null;
  const state = input.state?.toString().trim() || null;
  const postalCode = input.postalCode?.toString().trim() || null;
  const country = input.country?.toString().trim() || "MX";

  const latitude =
    typeof input.latitude === "number" && Number.isFinite(input.latitude)
      ? input.latitude
      : input.latitude === null
      ? null
      : null;
  const longitude =
    typeof input.longitude === "number" && Number.isFinite(input.longitude)
      ? input.longitude
      : input.longitude === null
      ? null
      : null;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { name: nickname },
    });

    await tx.cleanerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        fullName,
        phone,
        addressLine1,
        addressLine2,
        neighborhood,
        city,
        state,
        postalCode,
        country,
        latitude,
        longitude,
      },
      update: {
        fullName,
        phone,
        addressLine1,
        addressLine2,
        neighborhood,
        city,
        state,
        postalCode,
        country,
        latitude,
        longitude,
      },
    });
  });

  revalidatePath("/cleaner/profile");
  revalidatePath("/cleaner");

  return { ok: true as const };
}


