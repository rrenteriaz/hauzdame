// scripts/dedupe-propertyteam-itzel.ts
// Dedupe PropertyTeam para Depa01..Depa06 dejando solo el team canónico de Itzel
// Ejecutar:
//   npx tsx -r dotenv/config scripts/dedupe-propertyteam-itzel.ts --dry-run
//   npx tsx -r dotenv/config scripts/dedupe-propertyteam-itzel.ts

import prisma from "../lib/prisma";

const DRY_RUN = process.argv.includes("--dry-run");

type PropertyRow = {
  id: string;
  name: string;
  shortName: string | null;
};

async function main() {
  console.log("\n=== DEDUPE PROPERTYTEAM (ITZEL) ===");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE (will modify DB)"}\n`);

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: { contains: "itzel", mode: "insensitive" } }, { name: { contains: "itzel", mode: "insensitive" } }],
    },
    select: { id: true, email: true, name: true, tenantId: true },
  });

  if (!user || !user.tenantId) {
    throw new Error("No se encontró usuario Itzel con tenantId.");
  }

  const canonicalMembership = await prisma.teamMembership.findFirst({
    where: {
      userId: user.id,
      role: "TEAM_LEADER",
      status: "ACTIVE",
      Team: { tenantId: user.tenantId },
    },
    select: {
      teamId: true,
      Team: { select: { name: true, tenantId: true } },
    },
  });

  if (!canonicalMembership) {
    throw new Error("No se encontró TEAM_LEADER ACTIVE de Itzel en su home tenant.");
  }

  const canonicalTeamId = canonicalMembership.teamId;

  const properties: PropertyRow[] = await prisma.property.findMany({
    where: {
      OR: [
        { shortName: { startsWith: "Depa0", mode: "insensitive" } },
        { name: { startsWith: "Depa0", mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, shortName: true },
    orderBy: [{ shortName: "asc" }, { name: "asc" }],
  });

  const propertyIds = properties.map((p) => p.id);
  if (propertyIds.length === 0) {
    console.log("No se encontraron propiedades Depa01..Depa06. Saliendo.");
    return;
  }

  const propertyTeams = await (prisma as any).propertyTeam.findMany({
    where: { propertyId: { in: propertyIds } },
    select: { propertyId: true, teamId: true },
  });

  const existingByProperty = new Map<string, Set<string>>();
  for (const pt of propertyTeams) {
    const set = existingByProperty.get(pt.propertyId) ?? new Set<string>();
    set.add(pt.teamId);
    existingByProperty.set(pt.propertyId, set);
  }

  const toCreate: Array<{ tenantId: string; propertyId: string; teamId: string }> = [];

  const toDelete: Array<{ propertyId: string; teamId: string }> = [];

  for (const propertyId of propertyIds) {
    const existingTeams = existingByProperty.get(propertyId) ?? new Set<string>();
    if (!existingTeams.has(canonicalTeamId)) {
      toCreate.push({ tenantId: user.tenantId, propertyId, teamId: canonicalTeamId });
    }
    for (const teamId of existingTeams) {
      if (teamId !== canonicalTeamId) {
        toDelete.push({ propertyId, teamId });
      }
    }
  }

  console.log("Canonical team:", canonicalTeamId, `(${canonicalMembership.Team?.name || "Sin nombre"})`);
  console.log(`Properties target: ${propertyIds.length}`);
  console.log(`Existing PropertyTeam rows: ${propertyTeams.length}`);
  console.log(`To create: ${toCreate.length}`);
  console.log(`To delete: ${toDelete.length}\n`);

  if (DRY_RUN) {
    console.log("Dry-run completo. No se realizaron cambios.\n");
    return;
  }

  if (toCreate.length > 0) {
    await (prisma as any).propertyTeam.createMany({
      data: toCreate,
      skipDuplicates: true,
    });
  }
  
  if (toDelete.length > 0) {
    await (prisma as any).propertyTeam.deleteMany({
      where: {
        OR: toDelete.map((row) => ({
          propertyId: row.propertyId,
          teamId: row.teamId,
        })),
      },
    });
  }
  

  console.log("✅ Cambios aplicados.");
}

main()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

