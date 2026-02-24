// app/host/cleanings/history/page.tsx
import prisma from "@/lib/prisma";
import { getDefaultTenant } from "@/lib/tenant";
import Link from "next/link";
import FilterButtons from "./FilterButtons";
import Page from "@/lib/ui/Page";
import ListContainer from "@/lib/ui/ListContainer";
import ListRow from "@/lib/ui/ListRow";
import ListThumb from "@/lib/ui/ListThumb";
import { getCoverThumbUrlsBatch } from "@/lib/media/getCoverThumbUrl";
import StopPropagationLink from "@/lib/ui/StopPropagationLink";
import CollapsibleSection from "@/lib/ui/CollapsibleSection";

function formatStatus(status: string) {
  switch (status) {
    case "PENDING":
      return "Pendiente";
    case "IN_PROGRESS":
      return "En progreso";
    case "COMPLETED":
      return "Completada";
    case "CANCELLED":
      return "Cancelada";
    default:
      return status;
  }
}

function formatDateTime(date: Date) {
  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPeriodDates(period: string): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case "this-month": {
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: firstDayThisMonth, end: today };
    }
    case "previous-month": {
      const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: firstDayPrevMonth, end: lastDayPrevMonth };
    }
    case "this-year": {
      const firstDayYear = new Date(now.getFullYear(), 0, 1);
      return { start: firstDayYear, end: today };
    }
    case "last-year": {
      const firstDayLastYear = new Date(now.getFullYear() - 1, 0, 1);
      const lastDayLastYear = new Date(now.getFullYear() - 1, 11, 31);
      return { start: firstDayLastYear, end: lastDayLastYear };
    }
    case "last-365-days": {
      // Últimos 365 días desde hoy
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 365);
      return { start: startDate, end: today };
    }
    default: {
      // Este mes por defecto
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: firstDayThisMonth, end: today };
    }
  }
}

export default async function CleaningHistoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ propertyId?: string; period?: string; status?: string }>;
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

  const params = searchParams ? await searchParams : undefined;
  const selectedPropertyId = params?.propertyId || "";
  const selectedPeriod = params?.period || "this-month";
  // Si hay status en params, usarlo; si no, usar "COMPLETED" como default solo en primera carga
  // Si el valor es "ALL", significa que el usuario seleccionó explícitamente "Todos los estados"
  const selectedStatus = params?.status || "COMPLETED";

  // Obtener propiedades
  const properties = await prisma.property.findMany({
    where: {
      tenantId: tenant.id,
      ...({ isActive: true } as any),
    },
    select: {
      id: true,
      name: true,
      shortName: true,
    },
    orderBy: { name: "asc" },
  });

  // Obtener fechas del período seleccionado
  const { start, end } = getPeriodDates(selectedPeriod);

  // Construir query para limpiezas
  const whereClause: any = {
    tenantId: tenant.id,
    scheduledDate: {
      gte: start,
      lte: end,
    },
  };

  if (selectedPropertyId) {
    whereClause.propertyId = selectedPropertyId;
  }

  // Filtrar por estado
  if (selectedStatus && selectedStatus !== "ALL" && ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(selectedStatus)) {
    // Si hay un estado específico, aplicar el filtro
    whereClause.status = selectedStatus;
  } else if (selectedStatus === "ALL") {
    // Si es "Todos", no aplicar ningún filtro de estado (mostrar todos los estados)
    // No agregamos nada al whereClause para estado
  } else {
    // Por defecto (primera carga sin filtro explícito), mostrar solo completadas y canceladas o pasadas
    whereClause.OR = [
      { scheduledDate: { lt: new Date() } },
      { status: "COMPLETED" },
      { status: "CANCELLED" },
    ];
  }

  // Obtener limpiezas pasadas filtradas
  const pastCleanings = await (prisma as any).cleaning.findMany({
    where: whereClause,
    include: {
      property: {
        select: {
          id: true,
          name: true,
          shortName: true,
          coverAssetGroupId: true,
        },
      },
      assignedMember: {
        include: {
          team: true,
        },
      },
    },
    orderBy: { scheduledDate: "desc" },
    take: 500,
  });

  // Obtener thumbnails en batch para propiedades de las limpiezas pasadas
  const thumbUrls = await getCoverThumbUrlsBatch(
    pastCleanings.map((c: any) => ({ 
      id: c.property.id, 
      coverAssetGroupId: c.property.coverAssetGroupId || null 
    }))
  );


  return (
    <Page
      showBack
      backHref="/host/cleanings"
      title="Historial de limpiezas"
      subtitle="Revisa las limpiezas pasadas filtradas por propiedad y período."
    >

      {/* Filtros */}
      <div>
        <FilterButtons
          properties={properties}
          selectedPropertyId={selectedPropertyId}
          selectedPeriod={selectedPeriod}
          selectedStatus={selectedStatus}
        />
      </div>

      {/* Lista de limpiezas agrupadas por mes */}
      {pastCleanings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center">
          <p className="text-base text-neutral-600">
            No hay limpiezas pasadas para los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-xs text-neutral-500">
            {pastCleanings.length} limpieza{pastCleanings.length !== 1 ? "s" : ""} encontrada{pastCleanings.length !== 1 ? "s" : ""}
          </p>
          
          {/* Agrupar limpiezas por mes */}
          {(() => {
            // Agrupar por año-mes
            const cleaningsByMonth = new Map<string, { cleanings: typeof pastCleanings; label: string }>();
            
            pastCleanings.forEach((c: any) => {
              const date = new Date(c.scheduledDate);
              const year = date.getFullYear();
              const month = date.getMonth() + 1;
              const monthKey = `${year}-${String(month).padStart(2, "0")}`;
              
              const monthLabel = date.toLocaleString("es-MX", {
                month: "long",
                year: "numeric",
              });
              
              if (!cleaningsByMonth.has(monthKey)) {
                cleaningsByMonth.set(monthKey, { cleanings: [], label: monthLabel });
              }
              cleaningsByMonth.get(monthKey)!.cleanings.push(c);
            });
            
            // Ordenar meses de más reciente a más antiguo
            const sortedMonths = Array.from(cleaningsByMonth.entries()).sort((a, b) => {
              // Comparar por año-mes (formato YYYY-MM)
              const [yearA, monthA] = a[0].split("-").map(Number);
              const [yearB, monthB] = b[0].split("-").map(Number);
              
              if (yearA !== yearB) {
                return yearB - yearA; // Año más reciente primero
              }
              return monthB - monthA; // Mes más reciente primero
            });
            
            return sortedMonths.map(([monthKey, { cleanings: monthCleanings, label: monthLabel }], monthIndex) => {
              const isFirstMonth = monthIndex === 0;
              
              return (
                <CollapsibleSection
                  key={monthKey}
                  title={monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
                  count={monthCleanings.length}
                  defaultOpen={isFirstMonth}
                >
                  {/* Lista de limpiezas del mes */}
                  <ListContainer>
                    {monthCleanings.map((c: any, index: number) => {
                      const params = new URLSearchParams();
                      if (selectedPropertyId) params.set("propertyId", selectedPropertyId);
                      if (selectedPeriod) params.set("period", selectedPeriod);
                      if (selectedStatus) params.set("status", selectedStatus);
                      const returnTo = `/host/cleanings/history?${params.toString()}`;
                      const detailsHref = `/host/cleanings/${c.id}?returnTo=${encodeURIComponent(returnTo)}`;
                      const isLast = index === monthCleanings.length - 1;
                      const propertyName = c.property?.shortName || c.property?.name || "Propiedad no disponible";

                      return (
                        <ListRow
                          key={c.id}
                          href={detailsHref}
                          isLast={isLast}
                          ariaLabel={`Ver detalles de limpieza ${propertyName}`}
                        >
                          <ListThumb src={c.property?.id ? (thumbUrls.get(c.property.id) || null) : null} alt={propertyName} />
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base font-medium text-neutral-900 truncate">
                              {c.property?.name || "Propiedad no disponible"}
                            </h3>
                            <div className="flex items-center justify-between gap-2 mt-0.5">
                              <p className="text-xs text-neutral-500 truncate">
                                {formatDateTime(c.scheduledDate)}
                              </p>
                              {(c as any).reservationId && (
                                <StopPropagationLink
                                  href={`/host/reservations/${(c as any).reservationId}`}
                                  className="text-xs text-neutral-900 underline underline-offset-2 hover:text-neutral-700 shrink-0 ml-2"
                                >
                                  Ver reserva
                                </StopPropagationLink>
                              )}
                            </div>
                            <p className="text-xs text-neutral-500 mt-1">
                              Estado: {formatStatus(c.status)}
                              {c.assignedMember && (
                                <span className="text-neutral-600">
                                  {" "}· {c.assignedMember.name} ({c.assignedMember.team.name})
                                </span>
                              )}
                            </p>
                            {c.notes && (
                              <p className="text-xs text-neutral-500 line-clamp-2 mt-1">
                                {c.notes}
                              </p>
                            )}
                          </div>
                        </ListRow>
                      );
                    })}
                  </ListContainer>
                </CollapsibleSection>
              );
            });
          })()}
        </div>
      )}
    </Page>
  );
}

