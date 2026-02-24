// app/cleaner/history/page.tsx
import { getCurrentUser } from "@/lib/auth/session";
import { resolveCleanerContext } from "@/lib/cleaner/resolveCleanerContext";
import { getAccessibleTeamsForUser } from "@/lib/cleaner/getAccessibleTeamsForUser";
import { redirect } from "next/navigation";
import { formatCleaningStatus } from "@/lib/cleaning-ui";
import Page from "@/lib/ui/Page";
import ListContainer from "@/lib/ui/ListContainer";
import ListRow from "@/lib/ui/ListRow";
import ListThumb from "@/lib/ui/ListThumb";
import { getCoverThumbUrlsBatch } from "@/lib/media/getCoverThumbUrl";
import prisma from "@/lib/prisma";
import HistoryFilters from "./HistoryFilters";

export default async function CleanerHistoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ memberId?: string; propertyId?: string; period?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const memberIdParam = params?.memberId;
  const propertyIdFilter = params?.propertyId;
  const periodFilter = params?.period || "last_7_days";

  let user;
  let context;
  try {
    user = await getCurrentUser();
    if (!user || user.role !== "CLEANER") {
      redirect("/login");
      return;
    }
    context = await resolveCleanerContext();
  } catch {
    context = null;
  }

  if (!user) {
    redirect("/login");
    return;
  }

  if (context?.mode === "membership") {
    const myMembershipIds = context.memberships.map((m) => m.id);
    const removedMemberships = await prisma.teamMembership.findMany({
      where: { userId: user.id, status: "REMOVED" },
      select: {
        id: true,
        teamId: true,
        Team: { select: { tenantId: true } },
      },
    });
    const removedMembershipIds = removedMemberships.map((m) => m.id);
    const removedTenantIds = removedMemberships
      .map((m) => m.Team?.tenantId)
      .filter((id): id is string => !!id);
    if (myMembershipIds.length === 0 && removedMembershipIds.length === 0) {
      redirect("/cleaner");
      return;
    }

    const { allTeamIds, tenantIds } = await getAccessibleTeamsForUser(user.id);
    if (allTeamIds.length === 0 || tenantIds.length === 0) {
      if (removedMembershipIds.length > 0) {
        // Sin teams activos pero con histórico personal, continuar con filtros mínimos
      } else {
      redirect("/cleaner");
      return;
      }
    }

    const propertyTeams = await (prisma as any).propertyTeam.findMany({
      where: {
        tenantId: { in: tenantIds },
        teamId: { in: allTeamIds },
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            shortName: true,
            isActive: true,
          },
        },
      },
    });

    const allowedPropertyIds = propertyTeams
      .filter((pt: any) => pt.property?.isActive !== false)
      .map((pt: any) => pt.propertyId);

    const whereClauses: any[] = [];
    if (allowedPropertyIds.length > 0 && myMembershipIds.length > 0) {
      whereClauses.push({
        tenantId: { in: tenantIds },
        propertyId: { in: allowedPropertyIds },
        assignedMembershipId: { in: myMembershipIds },
      });
    }
    if (removedMembershipIds.length > 0) {
      whereClauses.push({
        tenantId: { in: removedTenantIds },
        assignedMembershipId: { in: removedMembershipIds },
      });
    }

    const allCompletedCleanings =
      whereClauses.length > 0
        ? await (prisma as any).cleaning.findMany({
            where: {
              status: "COMPLETED",
              OR: whereClauses,
            },
            include: {
              property: {
                select: {
                  id: true,
                  name: true,
                  shortName: true,
                  coverAssetGroupId: true,
                },
              },
            },
          })
        : [];

    const propertiesFromCleanings = Array.from(
      new Map(
        allCompletedCleanings.map((c: any) => [c.property.id, c.property])
      ).values()
    );

    const teamProperties = propertyTeams
      .filter((pt: any) => pt.property?.isActive !== false)
      .map((pt: any) => pt.property)
      .filter((p: any) => p !== null);

    const allPropertiesMap = new Map<string, any>();
    teamProperties.forEach((p: any) => allPropertiesMap.set(p.id, p));
    propertiesFromCleanings.forEach((p: any) => {
      if (!allPropertiesMap.has(p.id)) {
        allPropertiesMap.set(p.id, p);
      }
    });
    const availableProperties = Array.from(allPropertiesMap.values());

    let filteredCleanings = allCompletedCleanings;

    if (propertyIdFilter) {
      filteredCleanings = filteredCleanings.filter(
        (c: any) => c.propertyId === propertyIdFilter
      );
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (periodFilter === "last_7_days") {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filteredCleanings = filteredCleanings.filter((c: any) => {
        const completedDate = c.completedAt || c.scheduledDate;
        return completedDate >= sevenDaysAgo;
      });
    } else if (periodFilter === "last_month") {
      const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      filteredCleanings = filteredCleanings.filter((c: any) => {
        const completedDate = c.completedAt || c.scheduledDate;
        return completedDate >= firstDayOfCurrentMonth;
      });
    } else if (periodFilter === "previous_month") {
      const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      filteredCleanings = filteredCleanings.filter((c: any) => {
        const completedDate = c.completedAt || c.scheduledDate;
        return completedDate >= firstDayOfPreviousMonth && completedDate < firstDayOfCurrentMonth;
      });
    }

    filteredCleanings.sort((a: any, b: any) => {
      const dateA = a.completedAt || a.scheduledDate;
      const dateB = b.completedAt || b.scheduledDate;
      return dateB.getTime() - dateA.getTime();
    });

    const completedCleanings = filteredCleanings;

    const thumbUrls = completedCleanings.length > 0
      ? await getCoverThumbUrlsBatch(
          completedCleanings.map((c: any) => ({
            id: c.property.id,
            coverAssetGroupId: c.property.coverAssetGroupId || null,
          }))
        )
      : new Map<string, string | null>();

    const buildReturnTo = () => {
      const urlParams = new URLSearchParams();
      if (memberIdParam) urlParams.set("memberId", memberIdParam);
      if (propertyIdFilter) urlParams.set("propertyId", propertyIdFilter);
      if (periodFilter && periodFilter !== "last_7_days") urlParams.set("period", periodFilter);
      return `/cleaner/history${urlParams.toString() ? `?${urlParams.toString()}` : ""}`;
    };

    return (
      <Page title="Historial" containerClassName="pt-6">
        <HistoryFilters
          properties={availableProperties}
          selectedPropertyId={propertyIdFilter}
          selectedPeriod={periodFilter}
          memberId={memberIdParam}
        />

        {completedCleanings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-4 text-center text-base text-neutral-600">
            No hay limpiezas completadas en los filtros seleccionados.
          </div>
        ) : (
          <ListContainer>
            {completedCleanings.map((cleaning: any, index: number) => {
              const isLast = index === completedCleanings.length - 1;
              const propertyName = cleaning.property.shortName || cleaning.property.name;
              const returnTo = buildReturnTo();
              const detailsHref = `/cleaner/cleanings/${cleaning.id}?memberId=${encodeURIComponent(memberIdParam || "")}&returnTo=${encodeURIComponent(returnTo)}`;
              
              return (
                <ListRow
                  key={cleaning.id}
                  href={detailsHref}
                  isLast={isLast}
                  ariaLabel={`Ver detalles de limpieza ${propertyName}`}
                >
                  <ListThumb src={thumbUrls.get(cleaning.property.id) || null} alt={propertyName} />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-medium text-neutral-900 truncate">
                      {propertyName}
                    </h3>
                    <p className="text-xs text-neutral-500 truncate mt-0.5">
                      {cleaning.completedAt?.toLocaleString("es-MX", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }) || cleaning.scheduledDate.toLocaleString("es-MX", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Estado: {formatCleaningStatus(cleaning.status)}
                    </p>
                  </div>
                </ListRow>
              );
            })}
          </ListContainer>
        )}
      </Page>
    );
  }

  // LEGACY RETIRADO: Ya no se usa getCurrentMember ni TeamMember legacy
  // El guard del layout maneja el caso de sin TeamMembership ACTIVE
  // Esta página solo maneja mode === "membership" (el código arriba en línea 45+)
  
  // Si llegamos aquí sin contexto, redirigir
  // (el guard del layout debería haber manejado esto, pero por seguridad)
  // LEGACY RETIRADO: Ya no existe modo legacy, siempre es "membership"
  if (!context) {
    redirect("/cleaner/onboarding");
    return;
  }
  
  // El código de membership ya está arriba (línea 45+) y maneja todo el flujo
  // Este código legacy ya no es necesario
}

