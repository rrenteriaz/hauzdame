// app/host/teams/[id]/page.tsx
// REDIRECT: Esta ruta redirige a /host/workgroups/[id] o a la lista si no existe equivalente
import { redirect } from "next/navigation";
import { requireHostUser } from "@/lib/auth/requireUser";
import prisma from "@/lib/prisma";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireHostUser();
  const resolvedParams = await params;

  // Intentar encontrar un WorkGroup equivalente basado en el Team ID
  // Por ahora, simplemente redirigir a la lista
  // En el futuro, se podría mapear Team -> WorkGroup si existe WorkGroupExecutor
  redirect("/host/workgroups");
}
