// scripts/backfill-team-leaders.ts
// Backfill: asigna TEAM_LEADER al TeamMembership ACTIVE más antiguo por team
// Ejecutar: npx tsx scripts/backfill-team-leaders.ts [--dry-run]

import prisma from "../lib/prisma";

const DRY_RUN = process.argv.includes("--dry-run");

type TeamSummary = {
  teamId: string;
  updated: boolean;
  noActiveMemberships: boolean;
  multipleLeaders: boolean;
};

async function backfillTeamLeaders() {
  console.log("\n=== BACKFILL TEAM LEADERS ===");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE (will modify DB)"}\n`);

  const teams = await prisma.team.findMany({
    select: { id: true },
  });

  const summaries: TeamSummary[] = [];

  for (const team of teams) {
    const memberships = await prisma.teamMembership.findMany({
      where: { teamId: team.id, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: { id: true, role: true },
    });

    if (memberships.length === 0) {
      summaries.push({
        teamId: team.id,
        updated: false,
        noActiveMemberships: true,
        multipleLeaders: false,
      });
      continue;
    }

    const leader = memberships[0];
    const existingLeaders = memberships.filter((m) => m.role === "TEAM_LEADER");
    const needsUpdate = leader.role !== "TEAM_LEADER";

    if (needsUpdate && !DRY_RUN) {
      await prisma.teamMembership.update({
        where: { id: leader.id },
        data: { role: "TEAM_LEADER" },
      });
    }

    const leaderCount = existingLeaders.length + (needsUpdate ? 1 : 0);

    summaries.push({
      teamId: team.id,
      updated: needsUpdate,
      noActiveMemberships: false,
      multipleLeaders: leaderCount > 1,
    });
  }

  const totalTeams = teams.length;
  const teamsUpdated = summaries.filter((s) => s.updated).length;
  const teamsWithoutActive = summaries.filter((s) => s.noActiveMemberships).length;
  const teamsWithMultipleLeaders = summaries.filter((s) => s.multipleLeaders).length;

  console.log("=== REPORT ===");
  console.log(`Teams total: ${totalTeams}`);
  console.log(`Teams actualizados: ${teamsUpdated}`);
  console.log(`Teams sin ACTIVE membership: ${teamsWithoutActive}`);
  console.log(`Teams con >1 TEAM_LEADER: ${teamsWithMultipleLeaders}\n`);
}

backfillTeamLeaders()
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

