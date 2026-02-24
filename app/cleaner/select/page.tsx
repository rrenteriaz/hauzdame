// app/cleaner/select/page.tsx
/**
 * LEGACY RETIRADO: Este flujo de selección de miembro legacy ya no se usa.
 * MODERNO: Los cleaners ahora usan sesión + TeamMembership para autenticación.
 * 
 * Esta página redirige inmediatamente a /cleaner/onboarding.
 */
import { redirect } from "next/navigation";

export default async function CleanerSelectPage() {
  // Redirigir a onboarding (flujo moderno)
  redirect("/cleaner/onboarding");
}

