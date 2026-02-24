// app/cleaner/page.tsx
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
// import { getEligibleMembersForCleaning } from "@/lib/cleaning-eligibility"; // Removido: optimización de rendimiento (evitar N+1 queries)
import { getCurrentUser } from "@/lib/auth/session";
import { resolveCleanerContext } from "@/lib/cleaner/resolveCleanerContext";
import { getCleanerCleanings } from "@/lib/cleaner/getCleanerCleanings";
import { getAccessibleTeamsForUser } from "@/lib/cleaner/getAccessibleTeamsForUser";
import { getCleanerCleaningsCounts, getCleanerCleaningsList, getCleanerScope } from "@/lib/cleaner/cleanings/query";
import { devTrace } from "@/lib/dev/traceRenders";
import { getAvailabilityStartDate } from "@/lib/cleaner/availabilityWindow";
import Page from "@/lib/ui/Page";
import { getCoverThumbUrlsBatch } from "@/lib/media/getCoverThumbUrl";
import CleanerMonthlyCalendar from "@/lib/ui/CleaningsCalendar/CleanerMonthlyCalendar";
import CleanerDailyCalendar from "@/lib/ui/CleaningsCalendar/CleanerDailyCalendar";
import SummaryCards from "./SummaryCards";
import MyCleaningsSection from "./MyCleaningsSection";
import AvailableCleaningsSection from "./AvailableCleaningsSection";
import NoMembershipPage from "./NoMembershipPage";

export default async function CleanerPage({
  searchParams,
}: {
  searchParams?: Promise<{ memberId?: string; myFilter?: string; view?: string; date?: string; month?: string }>;
}) {
  // Resolver contexto del cleaner (membership o legacy)
  // OPTIMIZACIÓN: Resolver una sola vez y reutilizar en getCleanerCleanings
  let context;
  let user;
  try {
    user = await getCurrentUser();
    if (!user || user.role !== "CLEANER") {
      redirect("/login");
      return;
    }
    context = await resolveCleanerContext(user);
  } catch (error: any) {
    // No hay membership ni legacy - mostrar estructura de página con estado vacío
    if (!user) {
      redirect("/login");
      return;
    }
    const displayName = user.name ?? "Cleaner";
    return (
      <Page
        title={
          <span className="flex items-center gap-2">
            <span>Hoy para:</span>
            <span className="text-neutral-600 font-normal">{displayName}</span>
          </span>
        }
        containerClassName="pt-6"
      >
        {/* Mensaje de bienvenida integrado */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 mb-6">
          <h2 className="text-xl font-bold text-neutral-800 mb-3">
            ¡Bienvenido a Hausdame!
          </h2>
          <p className="text-neutral-700 mb-3">
            Para empezar a ver y aceptar limpiezas, necesitas unirte a un equipo de trabajo.
            Un Host debe enviarte una invitación para que puedas acceder a las limpiezas disponibles.
          </p>
          <p className="text-neutral-600 text-sm">
            Cuando aceptes una invitación, las limpiezas se mostrarán en tu calendario.
            Mientras tanto, puedes explorar la plataforma y familiarizarte con el flujo de trabajo.
          </p>
        </div>

        {/* Calendario vacío */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-200">
            <h2 className="text-base font-semibold text-neutral-800">Calendario</h2>
            <div className="flex items-center gap-2">
              <Link
                href="/cleaner?view=month"
                className="px-3 py-2 text-base font-medium transition text-black border-b-2 border-black"
              >
                Mes
              </Link>
              <Link
                href="/cleaner?view=day"
                className="px-3 py-2 text-base font-medium transition text-neutral-600 hover:text-black"
              >
                Día
              </Link>
            </div>
          </div>
          <CleanerMonthlyCalendar
            monthDate={new Date(new Date().getFullYear(), new Date().getMonth(), 1)}
            myCleanings={[]}
            memberCleanings={[]}
            lostCleanings={[]}
            availableCleanings={[]}
            buildMonthHref={(date) => `/cleaner?view=month&month=${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`}
            buildDayHref={(date) => `/cleaner?view=day&date=${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`}
          />
        </section>

        {/* Tarjetas de resumen con 0 */}
        <SummaryCards
          myCount={0}
          availableCount={0}
          upcomingCount={0}
          memberId={undefined}
          returnTo="/cleaner"
        />

        {/* Secciones vacías */}
        <MyCleaningsSection
          myCleanings={[]}
          myThumbUrls={{}}
          currentMemberId=""
          myFilter="pending"
          memberIdParam={undefined}
          returnTo="/cleaner"
        />

        <AvailableCleaningsSection
          availableCount={0}
          eligibleCleanings={[]}
          availableThumbUrls={{}}
          currentMemberId=""
          returnTo="/cleaner"
        />
      </Page>
    );
  }

  // PASO 1: Definir variables canónicas desde contexto
  // LEGACY RETIRADO: Ya no existe modo legacy, siempre usar memberships
  // Si no hay membership, el guard del layout debería haber redirigido
  // Pero por seguridad, verificar explícitamente
  if (!context.hasMembership) {
    // El guard debería haber redirigido, pero si llegamos aquí, mostrar estado vacío
    return (
      <Page
        title={
          <span className="flex items-center gap-2">
            <span>Hoy para:</span>
            <span className="text-neutral-600 font-normal">{user.name ?? "Cleaner"}</span>
          </span>
        }
        containerClassName="pt-6"
      >
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 mb-6">
          <h2 className="text-xl font-bold text-neutral-800 mb-3">
            ¡Bienvenido a Hausdame!
          </h2>
          <p className="text-neutral-700 mb-3">
            Para empezar a ver y aceptar limpiezas, necesitas unirte a un equipo de trabajo.
            Un Host debe enviarte una invitación para que puedas acceder a las limpiezas disponibles.
          </p>
          <p className="text-neutral-600 text-sm">
            Cuando aceptes una invitación, las limpiezas se mostrarán en tu calendario.
            Mientras tanto, puedes explorar la plataforma y familiarizarte con el flujo de trabajo.
          </p>
        </div>
      </Page>
    );
  }
  
  const teamIds = context.memberships.map((m) => m.teamId);

  const primaryTeamId = teamIds[0] ?? null;

  // Si no hay teams, mostrar estructura de página con estado vacío
  if (teamIds.length === 0) {
    if (!user) {
      redirect("/login");
      return;
    }
    const displayName = user.name ?? "Cleaner";
    const params = searchParams ? await searchParams : undefined;
    const memberIdParam = params?.memberId;
    const dateParam = params?.date;
    const monthParam = params?.month;
    const rawView = params?.view;
    const view: "day" | "month" = rawView === "day" || rawView === "month" ? rawView : "month";
    
    // Parsing de fechas
    const today = new Date();
    let referenceDate = today;
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const [yStr, mStr, dStr] = dateParam.split("-");
      const y = Number(yStr);
      const m = Number(mStr) - 1;
      const d = Number(dStr);
      const candidate = new Date(y, m, d);
      if (!Number.isNaN(candidate.getTime())) {
        referenceDate = candidate;
      }
    }
    let monthDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [yearStr, monthStr] = monthParam.split("-");
      const year = Number(yearStr);
      const monthNum = Number(monthStr);
      const monthIndex = monthNum - 1;
      if (!Number.isNaN(year) && !Number.isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
        monthDate = new Date(year, monthIndex, 1);
      }
    }

    // Funciones auxiliares
    const formatDateParam = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const formatMonthParam = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    
    const buildViewHref = (newView: "day" | "month") => {
      const urlParams = new URLSearchParams();
      if (memberIdParam) urlParams.set("memberId", memberIdParam);
      urlParams.set("view", newView);
      if (newView === "day" && dateParam) {
        urlParams.set("date", dateParam);
      }
      if (newView === "month" && monthParam) {
        urlParams.set("month", monthParam);
      }
      return `/cleaner?${urlParams.toString()}`;
    };

    const buildReturnTo = () => {
      const urlParams = new URLSearchParams();
      if (memberIdParam) urlParams.set("memberId", memberIdParam);
      if (view) urlParams.set("view", view);
      if (dateParam) urlParams.set("date", dateParam);
      if (monthParam) urlParams.set("month", monthParam);
      return `/cleaner?${urlParams.toString()}`;
    };

    const buildMonthHref = (date: Date) => {
      const urlParams = new URLSearchParams();
      if (memberIdParam) urlParams.set("memberId", memberIdParam);
      urlParams.set("view", "month");
      urlParams.set("month", formatMonthParam(date));
      return `/cleaner?${urlParams.toString()}`;
    };

    const buildDayHref = (date: Date) => {
      const urlParams = new URLSearchParams();
      if (memberIdParam) urlParams.set("memberId", memberIdParam);
      urlParams.set("view", "day");
      urlParams.set("date", formatDateParam(date));
      urlParams.set("month", formatMonthParam(monthDate));
      return `/cleaner?${urlParams.toString()}`;
    };

    const myFilter = params?.myFilter || "pending";
    const emptyThumbUrlsMap = new Map<string, string | null>();
    const emptyThumbUrlsRecord: Record<string, string | null> = {};

    return (
      <Page
        title={
          <span className="flex items-center gap-2">
            <span>Hoy para:</span>
            <span className="text-neutral-600 font-normal">{displayName}</span>
          </span>
        }
        containerClassName="pt-6"
      >
        {/* Mensaje de bienvenida integrado */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 mb-6">
          <h2 className="text-xl font-bold text-neutral-800 mb-3">
            ¡Bienvenido a Hausdame!
          </h2>
          <p className="text-neutral-700 mb-3">
            Para empezar a ver y aceptar limpiezas, necesitas unirte a un equipo de trabajo.
            Un Host debe enviarte una invitación para que puedas acceder a las limpiezas disponibles.
          </p>
          <p className="text-neutral-600 text-sm">
            Cuando aceptes una invitación, las limpiezas se mostrarán en tu calendario.
            Mientras tanto, puedes explorar la plataforma y familiarizarte con el flujo de trabajo.
          </p>
        </div>

        {/* Calendario vacío */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-200">
            <h2 className="text-base font-semibold text-neutral-800">Calendario</h2>
            <div className="flex items-center gap-2">
              <Link
                href={buildViewHref("month")}
                className={`px-3 py-2 text-base font-medium transition ${
                  view === "month" ? "text-black border-b-2 border-black" : "text-neutral-600 hover:text-black"
                }`}
              >
                Mes
              </Link>
              <Link
                href={buildViewHref("day")}
                className={`px-3 py-2 text-base font-medium transition ${
                  view === "day" ? "text-black border-b-2 border-black" : "text-neutral-600 hover:text-black"
                }`}
              >
                Día
              </Link>
            </div>
          </div>
          {view === "month" ? (
            <CleanerMonthlyCalendar
              monthDate={monthDate}
              myCleanings={[]}
              memberCleanings={[]}
              lostCleanings={[]}
              availableCleanings={[]}
              buildMonthHref={buildMonthHref}
              buildDayHref={buildDayHref}
            />
          ) : (
            <CleanerDailyCalendar
              referenceDate={referenceDate}
              basePath="/cleaner"
              currentMemberId=""
              myCleanings={[]}
              memberCleanings={[]}
              lostCleanings={[]}
              availableCleanings={[]}
              myThumbUrls={emptyThumbUrlsMap}
              availableThumbUrls={emptyThumbUrlsMap}
              returnTo={buildReturnTo()}
            />
          )}
        </section>

        {/* Tarjetas de resumen con 0 */}
        <SummaryCards
          myCount={0}
          availableCount={0}
          upcomingCount={0}
          memberId={memberIdParam}
          returnTo={buildReturnTo()}
        />

        {/* Secciones vacías */}
        <MyCleaningsSection
          myCleanings={[]}
          myThumbUrls={emptyThumbUrlsRecord}
          currentMemberId=""
          myFilter={myFilter}
          memberIdParam={memberIdParam}
          returnTo={buildReturnTo()}
        />

        <AvailableCleaningsSection
          availableCount={0}
          eligibleCleanings={[]}
          availableThumbUrls={emptyThumbUrlsRecord}
          currentMemberId=""
          returnTo={buildReturnTo()}
        />
      </Page>
    );
  }

  if (!user) {
    redirect("/login");
    return;
  }

  // Obtener nombres de teams para el título
  const teams = primaryTeamId
    ? await (prisma as any).team.findMany({
        where: { id: { in: teamIds } },
        select: { id: true, name: true },
      })
    : [];

  // LEGACY RETIRADO: Ya no existe modo legacy
  const displayName = user.name ?? "Cleaner";
  const teamLabel =
    teams.length === 0
      ? ""
      : teams.length === 1
      ? teams[0].name
      : `${teams[0].name} +${teams.length - 1}`;

  // LEGACY RETIRADO: Ya no se usa TeamMember legacy
  // Obtener memberId para compatibilidad con código existente (solo si existe TeamMember asociado)
  // Nota: En membership mode, currentMemberId puede ser null, pero los componentes pueden necesitarlo
  // Por ahora, usamos "" como fallback si es null para evitar errores de tipo
  let currentMemberId: string = "";
  if (primaryTeamId) {
    // Intentar obtener el primer TeamMember del primer team para compatibilidad
    const firstTeamMember = await (prisma as any).teamMember.findFirst({
      where: {
        userId: user.id,
        teamId: primaryTeamId,
        isActive: true,
      },
    });
    if (firstTeamMember) {
      currentMemberId = firstTeamMember.id;
    }
  }

  const params = searchParams ? await searchParams : undefined;
  const memberIdParam = params?.memberId;

  // Parsing de fechas para el calendario (similar a host/cleanings)
  const today = new Date();
  let referenceDate = today;

  const dateParam = params?.date;
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    const [yStr, mStr, dStr] = dateParam.split("-");
    const y = Number(yStr);
    const m = Number(mStr) - 1;
    const d = Number(dStr);
    const candidate = new Date(y, m, d);
    if (!Number.isNaN(candidate.getTime())) {
      referenceDate = candidate;
    }
  }

  // Fecha de referencia para el calendario mensual
  let monthDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);

  const monthParam = params?.month;
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [yearStr, monthStr] = monthParam.split("-");
    const year = Number(yearStr);
    const monthNum = Number(monthStr);
    const monthIndex = monthNum - 1; // 0-11
    if (!Number.isNaN(year) && !Number.isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
      monthDate = new Date(year, monthIndex, 1);
    }
  }

  // Vista activa: day | month (por defecto month)
  const rawView = params?.view;
  const view: "day" | "month" =
    rawView === "day" || rawView === "month" ? rawView : "month";
  devTrace("/cleaner render", { view, dateParam, monthParam });

  // PASO 2: OPTIMIZACIÓN - Eliminada query duplicada a PropertyTeam
  // getCleanerCleanings ya obtiene las propiedades necesarias, no necesitamos duplicar aquí

  // Calcular rango de fechas para el calendario (debe estar antes de las queries)
  let dateRangeStart: Date;
  let dateRangeEnd: Date;

  if (view === "day") {
    // Para vista día, solo traer ese día
    dateRangeStart = new Date(referenceDate);
    dateRangeStart.setHours(0, 0, 0, 0);
    dateRangeEnd = new Date(referenceDate);
    dateRangeEnd.setHours(23, 59, 59, 999);
  } else {
    // Para vista mes, traer el mes visible +/- 7 días de padding
    dateRangeStart = new Date(monthDate);
    dateRangeStart.setDate(dateRangeStart.getDate() - 7);
    dateRangeStart.setHours(0, 0, 0, 0);
    dateRangeEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    dateRangeEnd.setDate(dateRangeEnd.getDate() + 7);
    dateRangeEnd.setHours(23, 59, 59, 999);
  }

  // PASO 3: Optimización - Una sola query para todas las limpiezas necesarias
  // OPTIMIZACIÓN: En lugar de hacer 2 queries separadas (una para calendario, otra para listas),
  // hacer una sola query con un rango amplio que cubra ambos casos
  // Usar un rango más amplio para cubrir calendario + listas (últimos 30 días + próximos 90 días)
  const extendedRangeStart = new Date(dateRangeStart);
  extendedRangeStart.setDate(extendedRangeStart.getDate() - 30); // 30 días hacia atrás para listas
  
  const extendedRangeEnd = new Date(dateRangeEnd);
  extendedRangeEnd.setDate(extendedRangeEnd.getDate() + 90); // 90 días hacia adelante para listas

  // Datos resultantes (se llenan por modo)
  let eligibleCleaningsForCalendar: any[] = [];
  let eligibleCleanings: any[] = [];
  let lostCleaningsForCalendar: any[] = [];
  let myCleaningsForCalendar: any[] = [];
  let myCleanings: any[] = [];
  let memberCleaningsForCalendar: any[] = [];
  let memberCleanings: any[] = [];

  // Limpiezas próximas (próximos 7 días)
  const now = new Date();
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(now.getDate() + 7);
  sevenDaysLater.setHours(23, 59, 59, 999);
  const availabilityStart = getAvailabilityStartDate(now);

  // Obtener contadores usando query layer canónico
  const counts = await getCleanerCleaningsCounts(context);
  const upcomingCount = counts.upcoming7dCount;
  const availableCount = counts.availableCount;
  const myCount = counts.assignedToMeCount;

  // Obtener scope canónico
  const cleanerScope = await getCleanerScope(context);

  if (cleanerScope.propertyIds.length === 0 || cleanerScope.tenantIds.length === 0) {
    // No hay propiedades accesibles - mostrar estructura de página con estado vacío
    const displayName = user.name ?? "Cleaner";
    const teamLabel = teams.length === 0
      ? ""
      : teams.length === 1
      ? teams[0].name
      : `${teams[0].name} +${teams.length - 1}`;
    
    // Funciones auxiliares simplificadas para este caso
    const formatDateParam = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const formatMonthParam = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    
    const buildViewHref = (newView: "day" | "month") => {
      const urlParams = new URLSearchParams();
      if (memberIdParam) urlParams.set("memberId", memberIdParam);
      urlParams.set("view", newView);
      if (newView === "day" && dateParam) {
        urlParams.set("date", dateParam);
      }
      if (newView === "month" && monthParam) {
        urlParams.set("month", monthParam);
      }
      return `/cleaner?${urlParams.toString()}`;
    };

    const buildReturnTo = () => {
      const urlParams = new URLSearchParams();
      if (memberIdParam) urlParams.set("memberId", memberIdParam);
      if (view) urlParams.set("view", view);
      if (dateParam) urlParams.set("date", dateParam);
      if (monthParam) urlParams.set("month", monthParam);
      return `/cleaner?${urlParams.toString()}`;
    };

    const buildMonthHref = (date: Date) => {
      const urlParams = new URLSearchParams();
      if (memberIdParam) urlParams.set("memberId", memberIdParam);
      urlParams.set("view", "month");
      urlParams.set("month", formatMonthParam(date));
      return `/cleaner?${urlParams.toString()}`;
    };

    const buildDayHref = (date: Date) => {
      const urlParams = new URLSearchParams();
      if (memberIdParam) urlParams.set("memberId", memberIdParam);
      urlParams.set("view", "day");
      urlParams.set("date", formatDateParam(date));
      urlParams.set("month", formatMonthParam(monthDate));
      return `/cleaner?${urlParams.toString()}`;
    };

    const myFilter = params?.myFilter || "pending";
    const emptyThumbUrlsMap = new Map<string, string | null>();
    const emptyThumbUrlsRecord: Record<string, string | null> = {};
    
    return (
      <Page
        title={
          <span className="flex items-center gap-2">
            <span>Hoy para:</span>
            <span className="text-neutral-600 font-normal">
              {displayName}
              {teamLabel ? ` · ${teamLabel}` : ""}
            </span>
          </span>
        }
        containerClassName="pt-6"
      >
        {/* Mensaje de bienvenida integrado */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 mb-6">
          <h2 className="text-xl font-bold text-neutral-800 mb-3">
            ¡Bienvenido a Hausdame!
          </h2>
          <p className="text-neutral-700 mb-3">
            Para empezar a ver y aceptar limpiezas, necesitas unirte a un equipo de trabajo.
            Un Host debe enviarte una invitación para que puedas acceder a las limpiezas disponibles.
          </p>
          <p className="text-neutral-600 text-sm">
            Cuando aceptes una invitación, las limpiezas se mostrarán en tu calendario.
            Mientras tanto, puedes explorar la plataforma y familiarizarte con el flujo de trabajo.
          </p>
        </div>

        {/* Calendario vacío */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-200">
            <h2 className="text-base font-semibold text-neutral-800">Calendario</h2>
            <div className="flex items-center gap-2">
              <Link
                href={buildViewHref("month")}
                className={`px-3 py-2 text-base font-medium transition ${
                  view === "month" ? "text-black border-b-2 border-black" : "text-neutral-600 hover:text-black"
                }`}
              >
                Mes
              </Link>
              <Link
                href={buildViewHref("day")}
                className={`px-3 py-2 text-base font-medium transition ${
                  view === "day" ? "text-black border-b-2 border-black" : "text-neutral-600 hover:text-black"
                }`}
              >
                Día
              </Link>
            </div>
          </div>
          {view === "month" ? (
            <CleanerMonthlyCalendar
              monthDate={monthDate}
              myCleanings={[]}
              memberCleanings={[]}
              lostCleanings={[]}
              availableCleanings={[]}
              buildMonthHref={buildMonthHref}
              buildDayHref={buildDayHref}
            />
          ) : (
            <CleanerDailyCalendar
              referenceDate={referenceDate}
              basePath="/cleaner"
              currentMemberId={currentMemberId}
              myCleanings={[]}
              memberCleanings={[]}
              lostCleanings={[]}
              availableCleanings={[]}
              myThumbUrls={emptyThumbUrlsMap}
              availableThumbUrls={emptyThumbUrlsMap}
              returnTo={buildReturnTo()}
            />
          )}
        </section>

        {/* Tarjetas de resumen con 0 */}
        <SummaryCards
          myCount={0}
          availableCount={0}
          upcomingCount={0}
          memberId={memberIdParam}
          returnTo={buildReturnTo()}
        />

        {/* Secciones vacías */}
        <MyCleaningsSection
          myCleanings={[]}
          myThumbUrls={emptyThumbUrlsRecord}
          currentMemberId={currentMemberId}
          myFilter={myFilter}
          memberIdParam={memberIdParam}
          returnTo={buildReturnTo()}
        />

        <AvailableCleaningsSection
          availableCount={0}
          eligibleCleanings={[]}
          availableThumbUrls={emptyThumbUrlsRecord}
          currentMemberId={currentMemberId}
          returnTo={buildReturnTo()}
        />
      </Page>
    );
  }

  // Obtener listas usando query layer canónico (rango extendido para calendario + listas)
  const [assignedResult, availableResult] = await Promise.all([
    // Mis limpiezas asignadas
    getCleanerCleaningsList(
      {
        scope: "assigned",
        scheduledDateFrom: extendedRangeStart,
        scheduledDateTo: extendedRangeEnd,
        includeCompleted: false, // Solo PENDING e IN_PROGRESS para listas
      },
      context
    ),
    // Disponibles
    getCleanerCleaningsList(
      {
        scope: "available",
        scheduledDateFrom: extendedRangeStart,
        scheduledDateTo: extendedRangeEnd,
      },
      context
    ),
  ]);

  myCleanings = assignedResult.cleanings;
  eligibleCleanings = availableResult.cleanings;
  
  // El query layer ya filtra por availabilityStart cuando scope="available"
  // Pero necesitamos separar para el calendario (lostCleaningsForCalendar)
  const eligibleFuture = eligibleCleanings.filter((c: any) => new Date(c.scheduledDate) >= availabilityStart);
  const eligibleLost = eligibleCleanings.filter((c: any) => new Date(c.scheduledDate) < availabilityStart);
  eligibleCleanings = eligibleFuture; // Para listas, solo futuras

  // Para memberCleanings (limpiezas del equipo asignadas a otros), necesitamos una query adicional
  // LEGACY RETIRADO: Ya no existe modo legacy, siempre usar memberships
  if (context.mode === "membership") {
    const { activeTeamIds } = await getAccessibleTeamsForUser(user.id);
    const activeMembershipIds = context.memberships
      .filter((m) => activeTeamIds.includes(m.teamId))
      .map((m) => m.id);

    if (activeTeamIds.length > 0 && activeMembershipIds.length > 0) {
      memberCleanings = await prisma.cleaning.findMany({
        where: {
          tenantId: { in: cleanerScope.tenantIds },
          propertyId: { in: cleanerScope.propertyIds },
          scheduledDate: { gte: extendedRangeStart, lte: extendedRangeEnd },
          status: { not: "CANCELLED" },
          assignedMembershipId: { not: null },
          TeamMembership: { is: { teamId: { in: activeTeamIds } } },
          NOT: { assignedMembershipId: { in: activeMembershipIds } },
        },
        include: {
          property: {
            select: { id: true, name: true, shortName: true, coverAssetGroupId: true },
          },
        },
        orderBy: { scheduledDate: "asc" },
      });
    }
  }

  // Calendario (filtrar por rango del calendario)
  myCleaningsForCalendar = myCleanings.filter((c: any) => {
    const d = new Date(c.scheduledDate);
    return d >= dateRangeStart && d <= dateRangeEnd;
  });
  eligibleCleaningsForCalendar = eligibleFuture.filter((c: any) => {
    const d = new Date(c.scheduledDate);
    return d >= dateRangeStart && d <= dateRangeEnd;
  });
  lostCleaningsForCalendar = eligibleLost.filter((c: any) => {
    const d = new Date(c.scheduledDate);
    return d >= dateRangeStart && d <= dateRangeEnd;
  });
  memberCleaningsForCalendar = memberCleanings.filter((c: any) => {
    const d = new Date(c.scheduledDate);
    return d >= dateRangeStart && d <= dateRangeEnd;
  });

  // Filtro para "Mis limpiezas" - por defecto "pending"
  const myFilter = params?.myFilter || "pending";
  const filteredMyCleanings = myCleanings.filter((c: any) => {
    if (myFilter === "pending") {
      return c.status === "PENDING";
    }
    if (myFilter === "in_progress") {
      return c.status === "IN_PROGRESS";
    }
    // Por defecto, mostrar pendientes
    return c.status === "PENDING";
  });

  // OPTIMIZACIÓN: Obtener todos los thumbnails en una sola llamada batch
  // Recolectar todas las propiedades únicas que necesitamos
  const allPropertyIds = new Set<string>();
  
  // Propiedades de limpiezas disponibles
  eligibleCleanings.forEach((c: any) => allPropertyIds.add(c.property.id));
  
  // Propiedades de mis limpiezas
  filteredMyCleanings.forEach((c: any) => allPropertyIds.add(c.property.id));
  
  // Propiedades del calendario (vista día)
  if (view === "day") {
    myCleaningsForCalendar.forEach((c: any) => allPropertyIds.add(c.property.id));
    eligibleCleaningsForCalendar.forEach((c: any) => allPropertyIds.add(c.property.id));
    memberCleaningsForCalendar.forEach((c: any) => allPropertyIds.add(c.property.id));
  }

  // Obtener todos los thumbnails en una sola llamada
  const allThumbUrls = allPropertyIds.size > 0
    ? await getCoverThumbUrlsBatch(
        Array.from(allPropertyIds).map((propertyId) => {
          // Buscar la propiedad en cualquiera de las listas para obtener coverAssetGroupId
          const cleaning = [
            ...eligibleCleanings,
            ...filteredMyCleanings,
            ...myCleaningsForCalendar,
            ...eligibleCleaningsForCalendar,
            ...memberCleaningsForCalendar,
          ]
            .find((c: any) => c.property.id === propertyId);
          return {
            id: propertyId,
            coverAssetGroupId: cleaning?.property?.coverAssetGroupId || null,
          };
        })
      )
    : new Map<string, string | null>();

  // Extraer thumbnails específicos desde el mapa único
  const availableThumbUrls = new Map<string, string | null>();
  eligibleCleanings.forEach((c: any) => {
    const thumbUrl = allThumbUrls.get(c.property.id) || null;
    if (thumbUrl !== undefined) availableThumbUrls.set(c.property.id, thumbUrl);
  });

  const myThumbUrls = new Map<string, string | null>();
  filteredMyCleanings.forEach((c: any) => {
    const thumbUrl = allThumbUrls.get(c.property.id) || null;
    if (thumbUrl !== undefined) myThumbUrls.set(c.property.id, thumbUrl);
  });

  // También necesitamos thumbs para "Del equipo" (TL) en la vista diaria
  memberCleaningsForCalendar.forEach((c: any) => {
    if (myThumbUrls.has(c.property.id)) return;
    const thumbUrl = allThumbUrls.get(c.property.id) || null;
    if (thumbUrl !== undefined) myThumbUrls.set(c.property.id, thumbUrl);
  });

  const calendarMyThumbUrls = view === "day" ? new Map<string, string | null>() : new Map<string, string | null>();
  if (view === "day") {
    myCleaningsForCalendar.forEach((c: any) => {
      const thumbUrl = allThumbUrls.get(c.property.id) || null;
      if (thumbUrl !== undefined) calendarMyThumbUrls.set(c.property.id, thumbUrl);
    });
  }

  const calendarAvailableThumbUrls = view === "day" ? new Map<string, string | null>() : new Map<string, string | null>();
  if (view === "day") {
    eligibleCleaningsForCalendar.forEach((c: any) => {
      const thumbUrl = allThumbUrls.get(c.property.id) || null;
      if (thumbUrl !== undefined) calendarAvailableThumbUrls.set(c.property.id, thumbUrl);
    });
  }

  // Helpers para construir URLs
  const buildViewHref = (newView: "day" | "month") => {
    const urlParams = new URLSearchParams();
    if (memberIdParam) urlParams.set("memberId", memberIdParam);
    urlParams.set("view", newView);
    if (newView === "day" && dateParam) {
      urlParams.set("date", dateParam);
    }
    if (newView === "month" && monthParam) {
      urlParams.set("month", monthParam);
    }
    return `/cleaner?${urlParams.toString()}`;
  };

  const buildReturnTo = () => {
    const urlParams = new URLSearchParams();
    if (memberIdParam) urlParams.set("memberId", memberIdParam);
    if (view) urlParams.set("view", view);
    if (dateParam) urlParams.set("date", dateParam);
    if (monthParam) urlParams.set("month", monthParam);
    return `/cleaner?${urlParams.toString()}`;
  };

  // Construir parámetros para los links del calendario
  const formatDateParam = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const formatMonthParam = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const dateParamForCalendar = formatDateParam(referenceDate);
  const monthParamForCalendar = formatMonthParam(monthDate);

  // Helpers para el calendario mensual
  const buildMonthHref = (date: Date) => {
    const urlParams = new URLSearchParams();
    if (memberIdParam) urlParams.set("memberId", memberIdParam);
    urlParams.set("view", "month");
    urlParams.set("month", formatMonthParam(date));
    return `/cleaner?${urlParams.toString()}`;
  };

  const buildDayHref = (date: Date) => {
    const urlParams = new URLSearchParams();
    if (memberIdParam) urlParams.set("memberId", memberIdParam);
    urlParams.set("view", "day");
    urlParams.set("date", formatDateParam(date));
    // Preservar month para volver fácilmente
    urlParams.set("month", formatMonthParam(monthDate));
    return `/cleaner?${urlParams.toString()}`;
  };

  const buildMyFilterHref = (filter: string) => {
    const urlParams = new URLSearchParams();
    if (memberIdParam) urlParams.set("memberId", memberIdParam);
    if (filter !== "all") urlParams.set("myFilter", filter);
    // Preservar view, date, month si existen
    if (view) urlParams.set("view", view);
    if (dateParam) urlParams.set("date", dateParam);
    if (monthParam) urlParams.set("month", monthParam);
    return `/cleaner?${urlParams.toString()}`;
  };

  return (
    <Page
      title={
        <span className="flex items-center gap-2">
          <span>Hoy para:</span>
          <span className="text-neutral-600 font-normal">
            {displayName}
            {teamLabel ? ` · ${teamLabel}` : ""}
          </span>
        </span>
      }
      containerClassName="pt-6"
    >
      {/* Mis limpiezas */}
      <MyCleaningsSection
        myCleanings={myCleanings.map((c: any) => ({
          id: c.id,
          scheduledDate: c.scheduledDate,
          property: {
            id: c.property.id,
            name: c.property.name,
            shortName: c.property.shortName,
            coverAssetGroupId: c.property.coverAssetGroupId,
          },
          status: c.status,
          notes: c.notes,
        }))}
        myThumbUrls={Object.fromEntries(myThumbUrls)}
        currentMemberId={currentMemberId}
        myFilter={myFilter}
        memberIdParam={memberIdParam}
        returnTo={buildReturnTo()}
      />

      {/* Calendario */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-neutral-200">
          <h2 className="text-base font-semibold text-neutral-800">Calendario</h2>

          {/* Tabs Día / Mes */}
          <div className="flex items-center gap-2">
            <Link
              href={buildViewHref("month")}
              className={`px-3 py-2 text-base font-medium transition ${
                view === "month" ? "text-black border-b-2 border-black" : "text-neutral-600 hover:text-black"
              }`}
            >
              Mes
            </Link>
            <Link
              href={buildViewHref("day")}
              className={`px-3 py-2 text-base font-medium transition ${
                view === "day" ? "text-black border-b-2 border-black" : "text-neutral-600 hover:text-black"
              }`}
            >
              Día
            </Link>
          </div>
        </div>

        {/* Render del calendario según vista */}
        {view === "month" ? (
          <CleanerMonthlyCalendar
            monthDate={monthDate}
            myCleanings={myCleaningsForCalendar.map((c: any) => ({
              id: c.id,
              scheduledDate: c.scheduledDate,
              property: {
                id: c.property.id,
                name: c.property.name,
                shortName: c.property.shortName,
              },
              status: c.status,
            }))}
            memberCleanings={memberCleaningsForCalendar.map((c: any) => ({
              id: c.id,
              scheduledDate: c.scheduledDate,
              property: {
                id: c.property.id,
                name: c.property.name,
                shortName: c.property.shortName,
              },
              status: c.status,
            }))}
            lostCleanings={lostCleaningsForCalendar.map((c: any) => ({
              id: c.id,
              scheduledDate: c.scheduledDate,
              property: {
                id: c.property.id,
                name: c.property.name,
                shortName: c.property.shortName,
              },
              status: c.status,
            }))}
            availableCleanings={eligibleCleaningsForCalendar.map((c: any) => ({
              id: c.id,
              scheduledDate: c.scheduledDate,
              property: {
                id: c.property.id,
                name: c.property.name,
                shortName: c.property.shortName,
              },
              status: c.status,
            }))}
            buildMonthHref={buildMonthHref}
            buildDayHref={buildDayHref}
          />
        ) : (
          <CleanerDailyCalendar
            referenceDate={referenceDate}
            basePath="/cleaner"
            currentMemberId={currentMemberId}
            myCleanings={myCleaningsForCalendar.map((c: any) => ({
              id: c.id,
              scheduledDate: c.scheduledDate,
              property: {
                id: c.property.id,
                name: c.property.name,
                shortName: c.property.shortName,
                coverAssetGroupId: c.property.coverAssetGroupId,
              },
              status: c.status,
              notes: c.notes,
            }))}
            memberCleanings={memberCleaningsForCalendar.map((c: any) => ({
              id: c.id,
              scheduledDate: c.scheduledDate,
              property: {
                id: c.property.id,
                name: c.property.name,
                shortName: c.property.shortName,
                coverAssetGroupId: c.property.coverAssetGroupId,
              },
              status: c.status,
              notes: c.notes,
            }))}
            lostCleanings={lostCleaningsForCalendar.map((c: any) => ({
              id: c.id,
              scheduledDate: c.scheduledDate,
              property: {
                id: c.property.id,
                name: c.property.name,
                shortName: c.property.shortName,
                coverAssetGroupId: c.property.coverAssetGroupId,
              },
              status: c.status,
              notes: c.notes,
            }))}
            availableCleanings={eligibleCleaningsForCalendar.map((c: any) => ({
              id: c.id,
              scheduledDate: c.scheduledDate,
              property: {
                id: c.property.id,
                name: c.property.name,
                shortName: c.property.shortName,
                coverAssetGroupId: c.property.coverAssetGroupId,
              },
              status: c.status,
              notes: c.notes,
            }))}
            myThumbUrls={calendarMyThumbUrls}
            availableThumbUrls={calendarAvailableThumbUrls}
            returnTo={buildReturnTo()}
          />
        )}
      </section>

      {/* Resumen con indicadores */}
      <SummaryCards
        myCount={myCount}
        availableCount={availableCount}
        upcomingCount={upcomingCount}
        memberId={memberIdParam}
        returnTo={buildReturnTo()}
      />

      {/* Disponibles */}
      <AvailableCleaningsSection
        availableCount={availableCount}
        eligibleCleanings={eligibleCleanings.map((c: any) => ({
          id: c.id,
          scheduledDate: c.scheduledDate,
          property: {
            id: c.property.id,
            name: c.property.name,
            shortName: c.property.shortName,
            coverAssetGroupId: c.property.coverAssetGroupId,
          },
          status: c.status,
          notes: c.notes,
        }))}
        availableThumbUrls={Object.fromEntries(availableThumbUrls)}
        currentMemberId={currentMemberId}
        returnTo={buildReturnTo()}
      />
    </Page>
  );
}
