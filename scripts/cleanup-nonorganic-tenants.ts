import "dotenv/config";
import prisma from "@/lib/prisma";

type TenantInfo = { id: string; slug: string; name: string | null };
type MembershipRow = {
  id: string;
  teamId: string;
  userId: string;
  role: string;
};

const DEFAULT_TENANTS = ["ranferi-airbnb", "hausdame-demo"];

function parseArgs(argv: string[]) {
  const args = new Set(argv);
  const tenantsArg = argv.find((arg) => arg.startsWith("--tenants="));
  const tenants = tenantsArg
    ? tenantsArg.replace("--tenants=", "").split(",").map((slug) => slug.trim()).filter(Boolean)
    : DEFAULT_TENANTS;
  const apply = args.has("--apply");
  const pauseEmptyTeams = args.has("--pause-empty-teams");
  const dryRun = !apply;
  return { tenants, apply, dryRun, pauseEmptyTeams };
}

function groupBy<T, K extends string | number>(items: T[], keyFn: (item: T) => K) {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const bucket = map.get(key) ?? [];
    bucket.push(item);
    map.set(key, bucket);
  }
  return map;
}

async function main() {
  const { tenants, apply, dryRun, pauseEmptyTeams } = parseArgs(process.argv.slice(2));

  const tenantRows = await prisma.tenant.findMany({
    where: { slug: { in: tenants } },
    select: { id: true, slug: true, name: true },
  });

  if (tenantRows.length === 0) {
    console.log("No se encontraron tenants con los slugs proporcionados.");
    return;
  }

  const tenantIds = tenantRows.map((t) => t.id);
  const tenantById = new Map<string, TenantInfo>(tenantRows.map((t) => [t.id, t]));

  const teams = await prisma.team.findMany({
    where: { tenantId: { in: tenantIds } },
    select: { id: true, status: true, tenantId: true },
  });
  const teamIds = teams.map((t) => t.id);
  const teamsById = new Map(teams.map((t) => [t.id, t]));

  const targetMemberships = await prisma.teamMembership.findMany({
    where: {
      teamId: { in: teamIds },
      status: "ACTIVE",
      role: { in: ["CLEANER", "TEAM_LEADER"] },
    },
    select: { id: true, teamId: true, userId: true, role: true },
  });

  if (teamIds.length === 0) {
    console.log("No hay teams en los tenants indicados.");
    return;
  }
  if (targetMemberships.length === 0) {
    console.log("No hay memberships objetivo para remover.");
    return;
  }

  const targetByTeam = groupBy(targetMemberships, (m) => m.teamId);
  const activeCountsBefore = await prisma.teamMembership.groupBy({
    by: ["teamId"],
    where: {
      teamId: { in: teamIds },
      status: "ACTIVE",
    },
    _count: { id: true },
  });
  const activeBeforeMap = new Map(
    activeCountsBefore.map((item) => [item.teamId, Number(item._count.id)])
  );

  const tableRows = teams.map((team) => {
    const tenant = tenantById.get(team.tenantId);
    const activeMembershipsTotalBefore = activeBeforeMap.get(team.id) ?? 0;
    const targetMembershipsToRemove = targetByTeam.get(team.id)?.length ?? 0;
    return {
      tenantSlug: tenant?.slug ?? "unknown",
      teamId: team.id,
      teamStatus: team.status,
      activeMembershipsTotalBefore,
      targetMembershipsToRemove,
      activeMembershipsTotalAfter: null,
      removedCount: null,
    };
  });

  const targetRows = tableRows.filter((row) => row.targetMembershipsToRemove > 0);
  const otherTeamsCount = tableRows.length - targetRows.length;

  console.log(dryRun ? "DRY RUN" : "APPLY", "- tenants:", tenants.join(", "));
  console.table(targetRows);
  if (otherTeamsCount > 0) {
    console.log(`Otros teams sin targets: ${otherTeamsCount}`);
  }

  for (const tenant of tenantRows) {
    const teamIdsForTenant = teams.filter((t) => t.tenantId === tenant.id).map((t) => t.id);
    const membershipsForTenant = targetMemberships.filter((m) =>
      teamIdsForTenant.includes(m.teamId)
    );
    const sampleIds = membershipsForTenant.slice(0, 20).map((m) => m.id);
    console.log(`Membresías a remover (${tenant.slug}):`, sampleIds);
  }

  if (targetMemberships.length === 0) {
    console.log("No hay memberships objetivo; nada que aplicar.");
    return;
  }

  if (dryRun) {
    console.log("Dry run finalizado. Usa --apply para ejecutar cambios.");
    return;
  }

  await prisma.teamMembership.updateMany({
    where: { id: { in: targetMemberships.map((m) => m.id) } },
    data: { status: "REMOVED" },
  });

  if (pauseEmptyTeams) {
    const activeCountsAfter = await prisma.teamMembership.groupBy({
      by: ["teamId"],
      where: {
        teamId: { in: teamIds },
        status: "ACTIVE",
      },
      _count: { id: true },
    });
    const activeAfterMap = new Map(
      activeCountsAfter.map((item) => [item.teamId, Number(item._count.id)])
    );
    for (const team of teams) {
      const activeCount = activeAfterMap.get(team.id) ?? 0;
      if (activeCount === 0 && team.status !== "PAUSED") {
        await prisma.team.update({
          where: { id: team.id },
          data: { status: "PAUSED" },
        });
      }
    }
  }

  const activeCountsAfter = await prisma.teamMembership.groupBy({
    by: ["teamId"],
    where: {
      teamId: { in: teamIds },
      status: "ACTIVE",
    },
    _count: { id: true },
  });
  const activeAfterMap = new Map(
    activeCountsAfter.map((item) => [item.teamId, Number(item._count.id)])
  );
  const remainingTargetCounts = await prisma.teamMembership.groupBy({
    by: ["teamId"],
    where: {
      teamId: { in: teamIds },
      status: "ACTIVE",
      role: { in: ["CLEANER", "TEAM_LEADER"] },
    },
    _count: { id: true },
  });
  const remainingTargetMap = new Map(
    remainingTargetCounts.map((item) => [item.teamId, Number(item._count.id)])
  );
  const finalRows = teams.map((team) => {
    const tenant = tenantById.get(team.tenantId);
    const activeMembershipsTotalBefore = activeBeforeMap.get(team.id) ?? 0;
    const targetMembershipsToRemove = targetByTeam.get(team.id)?.length ?? 0;
    const activeMembershipsTotalAfter = activeAfterMap.get(team.id) ?? 0;
    const remainingTarget = remainingTargetMap.get(team.id) ?? 0;
    return {
      tenantSlug: tenant?.slug ?? "unknown",
      teamId: team.id,
      teamStatus: team.status,
      activeMembershipsTotalBefore,
      targetMembershipsToRemove,
      activeMembershipsTotalAfter,
      removedCount: Math.max(0, targetMembershipsToRemove - remainingTarget),
    };
  });

  console.table(finalRows);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

