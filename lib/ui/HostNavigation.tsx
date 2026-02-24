"use client";

import { useState } from "react";
import DesktopTopNav from "./DesktopTopNav";
import HostBottomNav from "./HostBottomNav";
import MenuDrawer from "./MenuDrawer";

/**
 * Componente de navegación adaptativa para Host:
 * - Desktop: muestra TopNav en el header (se renderiza en shell.tsx)
 * - Móvil: muestra BottomNav fijo en la parte inferior (se renderiza en layout.tsx)
 */
export function DesktopNav({
  menuUser,
}: {
  menuUser: { email: string; nickname: string | null };
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <DesktopTopNav onMenuClick={() => setIsMenuOpen(true)} isMenuOpen={isMenuOpen} />
      <MenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        user={menuUser}
      />
    </>
  );
}

export function MobileNav() {
  return <HostBottomNav />;
}

