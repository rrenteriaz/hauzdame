// app/host/dashboard/page.tsx
import { redirect } from "next/navigation";

export default async function HostDashboardPage() {
  // Redirigir a /host/hoy (fusión de Panel dentro de Hoy)
  redirect("/host/hoy");
}
