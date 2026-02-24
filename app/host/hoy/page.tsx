// app/host/hoy/page.tsx
import { getDefaultTenant } from "@/lib/tenant";
import prisma from "@/lib/prisma";
import Page from "@/lib/ui/Page";
import HoyClient from "./HoyClient";
import { getHoyData, getProximasData } from "./data";

export default async function HoyPage({
  searchParams,
}: {
  searchParams?: Promise<{ propertyId?: string; tab?: string }>;
}) {
  const tenant = await getDefaultTenant();

  if (!tenant) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Configura tu cuenta</h1>
        <p className="text-base text-neutral-600">
          No se encontró ningún tenant. Crea uno en Prisma Studio para continuar.
        </p>
      </div>
    );
  }

  const params = searchParams ? await searchParams : {};
  const selectedPropertyId = params?.propertyId || "";
  const activeTab = params?.tab === "proximas" ? "proximas" : "hoy";

  // Obtener todas las propiedades para el filtro
  const [properties, hoyData, proximasData] = await Promise.all([
    prisma.property.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        shortName: true,
      },
      orderBy: { shortName: "asc" },
    }),
    getHoyData(tenant.id, selectedPropertyId || undefined),
    getProximasData(tenant.id, selectedPropertyId || undefined),
  ]);

  return (
    <Page
      title="Actividad"
      subtitle="Tareas y actividades que requieren tu atención"
    >
      <HoyClient
        properties={properties}
        selectedPropertyId={selectedPropertyId}
        activeTab={activeTab}
        hoyData={hoyData}
        proximasData={proximasData}
      />
    </Page>
  );
}

