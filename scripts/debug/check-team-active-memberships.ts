import "dotenv/config";
import prisma from "../../lib/prisma";

async function main() {
  const teamId = process.argv[2];
  if (!teamId) {
    console.log("Uso: npx tsx scripts/debug/check-team-active-memberships.ts <teamId>");
    process.exit(1);
  }

  const rows = await prisma.teamMembership.findMany({
    where: { teamId, status: "ACTIVE" },
    select: { id: true, role: true, status: true, userId: true },
  });

  console.log("teamId:", teamId);
  console.log("ACTIVE memberships:", rows);
  console.log("count:", rows.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
