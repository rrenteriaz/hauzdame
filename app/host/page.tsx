// app/host/page.tsx
import { redirect } from "next/navigation";

/**
 * Página raíz de /host
 * Redirige a /host/hoy (página principal del host)
 */
export default async function HostPage() {
  redirect("/host/hoy");
}

