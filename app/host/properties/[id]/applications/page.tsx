// app/host/properties/[id]/applications/page.tsx
import { requireUser } from "@/lib/auth/requireUser";
import { canManageApplication } from "@/lib/auth/guards";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ApplicationsListClient } from "@/components/properties/ApplicationsListClient";
import Page from "@/lib/ui/Page";
import { safeReturnTo } from "@/lib/navigation/safeReturnTo";

export default async function PropertyApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ returnTo?: string }>;
}) {
  const user = await requireUser();
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const propertyId = resolvedParams.id;

  // Verificar que la propiedad existe y el usuario tiene acceso
  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      tenantId: user.tenantId,
    },
    select: {
      id: true,
      name: true,
      shortName: true,
    },
  });

  if (!property) {
    notFound();
  }

  const canManage = await canManageApplication(user, propertyId);
  if (!canManage) {
    notFound();
  }

  // Obtener aplicaciones PENDING para esta propiedad
  // Filtrar por propertyId (no depender del opening)
  const applications = await (prisma as any).propertyApplication.findMany({
    where: {
      propertyId,
      tenantId: user.tenantId,
      status: "PENDING",
    },
    include: {
      applicantUser: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarMedia: {
            select: {
              id: true,
              publicUrl: true,
            },
          },
        },
      },
      opening: {
        select: {
          id: true,
          status: true,
        },
      },
      chatThread: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Validar returnTo y usar fallback seguro
  // MUST: Fallback siempre a /host/properties (lista), nunca a la misma URL del detalle
  const returnTo = safeReturnTo(
    resolvedSearchParams?.returnTo ? String(resolvedSearchParams.returnTo) : undefined,
    "/host/properties"
  );

  return (
    <Page
      showBack
      backHref={returnTo}
      title="Solicitudes"
      subtitle={`${property.name}${property.shortName ? ` (${property.shortName})` : ""}`}
      variant="compact"
    >
      {applications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
          <p className="text-neutral-600">Aún no hay solicitudes</p>
        </div>
      ) : (
        <ApplicationsListClient
          applications={applications}
          propertyId={propertyId}
        />
      )}
    </Page>
  );
}

