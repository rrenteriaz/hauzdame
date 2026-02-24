// app/host/layout-client.tsx
"use client";

import { AppShell } from "@/lib/ui/shell";
import { MobileNav } from "@/lib/ui/HostNavigation";
import { usePathname } from "next/navigation";
import { OfflineInit } from "@/components/offline/OfflineInit";
import LogoutSyncListener from "@/lib/auth/LogoutSyncListener";

export default function HostLayoutClient({
  children,
  menuUser,
}: {
  children: React.ReactNode;
  menuUser: { email: string; nickname: string | null };
}) {
  const pathname = usePathname();
  // Ocultar bottom nav solo en thread pages (no en inbox /host/messages)
  const isThreadPage = pathname?.match(/^\/host\/messages\/[^/]+$/);

  return (
    <>
      <LogoutSyncListener />
      <OfflineInit />
      <AppShell menuUser={menuUser}>{children}</AppShell>
      {/* Mobile BottomNav - oculto en thread pages (el chat tiene su propio header) */}
      {!isThreadPage && <MobileNav />}
    </>
  );
}

