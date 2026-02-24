// app/cleaner/select-actions.ts
/**
 * LEGACY RETIRADO: Este server action ya no se usa.
 * MODERNO: Los cleaners ahora usan sesión + TeamMembership para autenticación.
 * 
 * Esta función redirige a /cleaner/onboarding sin setear cookies legacy.
 */
"use server";

import { redirect } from "next/navigation";

export async function selectMember(formData: FormData) {
  // Legacy retirado: redirigir a onboarding (flujo moderno)
  // NO setear cookie legacy hd_cleaner_member_id
  redirect("/cleaner/onboarding");
}

