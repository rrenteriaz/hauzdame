// app/host/layout.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import HostLayoutClient from "./layout-client";

/**
 * Server Component wrapper para Host layout
 * Valida que el usuario sea HOST antes de renderizar
 */
export default async function HostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Roles permitidos en /host
  const allowedHostRoles = ["OWNER", "ADMIN", "MANAGER", "AUXILIAR"];

  if (user.role === "CLEANER") {
    redirect("/cleaner");
  }

  if (!allowedHostRoles.includes(user.role)) {
    redirect("/cleaner");
  }

  return (
    <HostLayoutClient
      menuUser={{
        email: user.email,
        nickname: user.name ?? null,
      }}
    >
      {children}
    </HostLayoutClient>
  );
}
