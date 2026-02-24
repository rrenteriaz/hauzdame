// app/host/workgroups/[id]/teams/[teamId]/history/page.tsx
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getDefaultTenant } from "@/lib/tenant";
import { getCurrentUser } from "@/lib/auth/session";
import Page from "@/lib/ui/Page";
import { getTeamDisplayNameForHost } from "@/lib/host/teamDisplayName";
import { getCoverThumbUrlsBatch } from "@/lib/media/getCoverThumbUrl";
import { formatCleaningStatus } from "@/lib/cleaning-ui";
import ListContainer from "@/lib/ui/ListContainer";
import ListRow from "@/lib/ui/ListRow";
import ListThumb from "@/lib/ui/ListThumb";
import CollapsibleSection from "@/lib/ui/CollapsibleSection";
import TeamCleaningHistoryFilters from "./TeamCleaningHistoryFilters";
// Usar formato nativo de JavaScript en lugar de date-fns

function getPeriodDates(period: string): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  today.setHours(23, 59, 59, 999); // Fin del día

  switch (period) {
    case "this-month": {
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      firstDayThisMonth.setHours(0, 0, 0, 0);
      return { start: firstDayThisMonth, end: today };
    }
    case "previous-month": {
      const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      firstDayPrevMonth.setHours(0, 0, 0, 0);
      const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      lastDayPrevMonth.setHours(23, 59, 59, 999);
      return { start: firstDayPrevMonth, end: lastDayPrevMonth };
    }
    case "this-year": {
      const firstDayYear = new Date(now.getFullYear(), 0, 1);
      firstDayYear.setHours(0, 0, 0, 0);
      return { start: firstDayYear, end: today };
    }
    case "last-year": {
      const firstDayLastYear = new Date(now.getFullYear() - 1, 0, 1);
      firstDayLastYear.setHours(0, 0, 0, 0);
      const lastDayLastYear = new Date(now.getFullYear() - 1, 11, 31);
      lastDayLastYear.setHours(23, 59, 59, 999);
      return { start: firstDayLastYear, end: lastDayLastYear };
    }
    case "last-365-days": {
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 365);
      startDate.setHours(0, 0, 0, 0);
      return { start: startDate, end: today };
    }
    default: {
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      firstDayThisMonth.setHours(0, 0, 0, 0);
      return { start: firstDayThisMonth, end: today };
    }
  }
}

export default async function TeamCleaningHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; teamId: string }>;
  searchParams?: Promise<{ propertyId?: string; period?: string; status?: string; returnTo?: string }>;
}) {
  const tenant = await getDefaultTenant();
  if (!tenant) notFound();

  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const currentUser = await getCurrentUser();

  const workGroupId = resolvedParams.id;
  const teamId = resolvedParams.teamId;
  // Siempre regresar a la página de detalle del equipo, no al returnTo original
  // Construir la URL explícitamente para asegurar que siempre apunte a la página correcta
  const teamDetailPageUrl = `/host/workgroups/${workGroupId}/teams/${teamId}`;
  const returnTo = teamDetailPageUrl;

  // Verificar que el WorkGroup existe y pertenece al tenant
  const workGroup = await prisma.hostWorkGroup.findFirst({
    where: {
      id: workGroupId,
      tenantId: tenant.id,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!workGroup) notFound();

  // Verificar que el executor existe
  const executor = await prisma.workGroupExecutor.findFirst({
    where: {
      hostTenantId: tenant.id,
      workGroupId,
      teamId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!executor) notFound();

  // Obtener información del team
  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
    },
    select: {
      id: true,
      name: true,
      tenantId: true,
    },
  });

  if (!team) notFound();

  // Obtener líder efectivo del team (incluir id para membershipIds)
  const allMemberships = await prisma.teamMembership.findMany({
    where: {
      teamId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      teamId: true,
      role: true,
      createdAt: true,
      User: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: [{ role: "desc" }, { createdAt: "asc" }],
  });

  const explicitLeader = allMemberships.find((m) => m.role === "TEAM_LEADER");
  const effectiveLeader = explicitLeader || allMemberships[0] || null;
  const leaderUser = effectiveLeader?.User || null;

  const displayName = getTeamDisplayNameForHost({
    teamName: team.name,
    leaderUser,
  });

  // Reusar allMemberships para obtener membershipIds (optimización)
  const membershipIds = allMemberships.map((m) => m.id);

  // Obtener propiedades asignadas al WorkGroup
  const workGroupProperties = await prisma.hostWorkGroupProperty.findMany({
    where: {
      tenantId: tenant.id,
      workGroupId,
    },
    select: {
      propertyId: true,
    },
  });

  const propertyIds = workGroupProperties.map((p) => p.propertyId);

  if (propertyIds.length === 0) {
    return (
      <Page
        showBack
        backHref={returnTo}
        title="Historial de limpiezas"
        subtitle={displayName}
        variant="compact"
      >
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
          <p className="text-base text-neutral-600">
            Este grupo de trabajo no tiene propiedades asignadas aún.
          </p>
        </div>
      </Page>
    );
  }

  // Obtener propiedades para el filtro
  const properties = await prisma.property.findMany({
    where: {
      id: { in: propertyIds },
      tenantId: tenant.id,
    },
    select: {
      id: true,
      name: true,
      shortName: true,
    },
    orderBy: { name: "asc" },
  });

  // Parámetros de filtro
  const selectedPropertyId = resolvedSearchParams?.propertyId || "";
  const selectedPeriod = resolvedSearchParams?.period || "this-month";
  const selectedStatus = resolvedSearchParams?.status || "ALL";

  // Calcular fechas del período
  const { start: periodStart, end: periodEnd } = getPeriodDates(selectedPeriod);

  // Construir query de limpiezas pasadas
  const where: any = {
    tenantId: tenant.id,
    propertyId: { in: propertyIds },
    scheduledDate: {
      gte: periodStart,
      lte: periodEnd,
    },
    // Filtrar por team: OR assignedMembershipId in membershipIds OR teamId = teamId
    // TODO: A futuro, priorizar teamId para index-friendly, pero mantener OR por ahora
    OR: [
      ...(membershipIds.length > 0 ? [{ assignedMembershipId: { in: membershipIds } }] : []),
      { teamId },
    ],
  };

  if (selectedPropertyId) {
    where.propertyId = selectedPropertyId;
  }

  if (selectedStatus && selectedStatus !== "ALL") {
    where.status = selectedStatus;
  }

  // Obtener limpiezas pasadas
  const pastCleanings = await (prisma as any).cleaning.findMany({
    where,
    include: {
      property: {
        select: {
          id: true,
          name: true,
          shortName: true,
          coverAssetGroupId: true,
        },
      },
      TeamMembership: {
        include: {
          User: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: { scheduledDate: "desc" },
    take: 500, // Límite razonable para historial
  });

  // Obtener thumbnails
  const propertyIdsForThumbs: string[] = Array.from(new Set(pastCleanings.map((c: any) => String(c.property.id))));
  const thumbUrls = await getCoverThumbUrlsBatch(
    propertyIdsForThumbs.map((id) => {
      const cleaning = pastCleanings.find((c: any) => String(c.property.id) === id);
      return {
        id,
        coverAssetGroupId: cleaning?.property?.coverAssetGroupId || null,
      };
    })
  );

  // Agrupar limpiezas por mes
  const cleaningsByMonth = new Map<string, { cleanings: typeof pastCleanings; monthDate: Date }>();

  pastCleanings.forEach((cleaning: any) => {
    const date = new Date(cleaning.scheduledDate);
    const monthKey = date.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
    });

    if (!cleaningsByMonth.has(monthKey)) {
      const monthDate = new Date(date.getFullYear(), date.getMonth(), 1);
      cleaningsByMonth.set(monthKey, { cleanings: [], monthDate });
    }
    cleaningsByMonth.get(monthKey)!.cleanings.push(cleaning);
  });

  // Convertir a array y ordenar por fecha del mes (más reciente primero)
  const monthGroups = Array.from(cleaningsByMonth.entries())
    .map(([monthKey, { cleanings, monthDate }]) => ({
      monthKey,
      cleanings,
      monthDate,
    }))
    .sort((a, b) => b.monthDate.getTime() - a.monthDate.getTime());

  // Función para formatear el mes en español con capitalización
  const formatMonthTitle = (monthKey: string): string => {
    return monthKey.charAt(0).toUpperCase() + monthKey.slice(1);
  };

  return (
    <Page
      showBack
      backHref={returnTo}
      title="Historial de limpiezas"
      subtitle={displayName}
      variant="compact"
    >
      <div className="space-y-6">
        {/* Filtros */}
        <section className="sm:rounded-2xl sm:border sm:border-neutral-200 sm:bg-white sm:p-4 sm:space-y-3">
          <TeamCleaningHistoryFilters
            properties={properties}
            selectedPropertyId={selectedPropertyId}
            selectedPeriod={selectedPeriod}
            selectedStatus={selectedStatus}
            workGroupId={workGroupId}
            teamId={teamId}
            returnTo={returnTo}
          />
        </section>

        {/* Lista de limpiezas agrupadas por mes */}
        <section>
          {pastCleanings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
              <p className="text-base text-neutral-600">
                No se encontraron limpiezas con los filtros seleccionados.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {monthGroups.map(({ monthKey, cleanings }, groupIndex) => {
                const isFirstMonth = groupIndex === 0;
                return (
                  <CollapsibleSection
                    key={monthKey}
                    title={formatMonthTitle(monthKey)}
                    count={cleanings.length}
                    defaultOpen={isFirstMonth}
                  >
                    <ListContainer>
                      {cleanings.map((cleaning: any, index: number) => {
                        const thumbUrl = thumbUrls.get(cleaning.property.id) || null;
                        const statusText = formatCleaningStatus(cleaning.status);
                        const scheduledDate = new Date(cleaning.scheduledDate);
                        const dateStr = scheduledDate.toLocaleDateString("es-MX", {
                          weekday: "long",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                        return (
                          <ListRow
                            key={cleaning.id}
                            href={`/host/cleanings/${cleaning.id}?returnTo=${encodeURIComponent(
                              `/host/workgroups/${workGroupId}/teams/${teamId}/history?returnTo=${encodeURIComponent(returnTo)}`
                            )}`}
                            isLast={index === cleanings.length - 1}
                          >
                            <ListThumb
                              src={thumbUrl}
                              alt={cleaning.property.name || ""}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-neutral-900 truncate">
                                {cleaning.property.shortName || cleaning.property.name}
                              </p>
                              <p className="text-xs text-neutral-500 mt-0.5">{dateStr}</p>
                              {cleaning.attentionReason && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 mt-1 inline-block">
                                  ¡Atención!
                                </span>
                              )}
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              cleaning.status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-800"
                                : cleaning.status === "CANCELLED"
                                ? "bg-red-100 text-red-800"
                                : "bg-neutral-100 text-neutral-600"
                            }`}>
                              {statusText}
                            </span>
                          </ListRow>
                        );
                      })}
                    </ListContainer>
                  </CollapsibleSection>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </Page>
  );
}

