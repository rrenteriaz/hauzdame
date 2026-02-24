// app/host/teams/[id]/page.tsx
// REDIRECT: Esta ruta redirige a /host/workgroups/[id] o a la lista si no existe equivalente
import { redirect } from "next/navigation";
import { getDefaultTenant } from "@/lib/tenant";
import prisma from "@/lib/prisma";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const tenant = await getDefaultTenant();
  const resolvedParams = await params;
  
  if (!tenant) {
    redirect("/host/workgroups");
  }

  // Intentar encontrar un WorkGroup equivalente basado en el Team ID
  // Por ahora, simplemente redirigir a la lista
  // En el futuro, se podría mapear Team -> WorkGroup si existe WorkGroupExecutor
  redirect("/host/workgroups");
}
