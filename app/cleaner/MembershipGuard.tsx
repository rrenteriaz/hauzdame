// app/cleaner/MembershipGuard.tsx
"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Rutas permitidas SIN TeamMembership ACTIVE
 */
const ALLOWED_WITHOUT_MEMBERSHIP = [
  "/cleaner",
  "/cleaner/onboarding",
  "/cleaner/marketplace",
  "/cleaner/profile",
  "/cleaner/logout",
  "/cleaner/select",
];

interface MembershipGuardProps {
  children: React.ReactNode;
  hasActiveMembership: boolean;
}

/**
 * Client-side guard que redirige a onboarding si no hay TeamMembership ACTIVE
 * y el usuario intenta acceder a una ruta "de equipo"
 */
export default function MembershipGuard({
  children,
  hasActiveMembership,
}: MembershipGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Si tiene membership, permitir todo
    if (hasActiveMembership) {
      return;
    }

    // Normalizar pathname (remover query params y trailing slash)
    const normalizedPath = pathname?.split("?")[0].replace(/\/$/, "") || "/cleaner";

    // Verificar si la ruta actual está en la allowlist
    const isAllowed = ALLOWED_WITHOUT_MEMBERSHIP.some(
      (allowed) => normalizedPath === allowed || normalizedPath.startsWith(allowed + "/")
    );

    // Si NO está permitida, redirigir a onboarding
    if (!isAllowed) {
      router.replace("/cleaner/onboarding");
    }
  }, [pathname, hasActiveMembership, router]);

  return <>{children}</>;
}

