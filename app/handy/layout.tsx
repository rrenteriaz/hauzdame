// app/handy/layout.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function HandyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  const navItems = [
    { href: "/handy", label: "Hoy", icon: "📅" },
    { href: "/handy/tickets", label: "Tickets", icon: "🎫" },
    { href: "/handy/profile", label: "Perfil", icon: "👤" },
  ];
  
  const isActive = (href: string) => {
    if (href === "/handy") {
      return pathname === "/handy";
    }
    return pathname?.startsWith(href);
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* Contenido principal */}
      <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6 pb-16 sm:pb-6">
        {children}
      </main>
      
      {/* Navegación inferior (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-neutral-200 bg-white sm:hidden z-50">
        <div className="grid grid-cols-3">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-2 px-1 transition-colors ${
                  active
                    ? "text-black"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                <span className="text-xl mb-1">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      
      {/* Navegación superior (desktop/tablet) */}
      <nav className="hidden sm:block border-b border-neutral-200 bg-white sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-center gap-6">
            <Link
              href="/handy"
              className="flex items-center gap-2 shrink-0"
            >
              <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-base font-bold">
                H
              </div>
              <span className="text-base font-semibold tracking-tight">
                Handy
              </span>
            </Link>
            
            <div className="flex items-center gap-4">
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-base transition-colors whitespace-nowrap ${
                      active
                        ? "text-black font-medium"
                        : "text-neutral-600 hover:text-black"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}

