import "dotenv/config";
import prisma from "@/lib/prisma";

async function main() {
  const teamId = process.argv[2];
  if (!teamId) {
    console.log("Uso: npx tsx scripts/debug/check-team-memberships.ts <teamId>");
    process.exit(1);
  }

  const rows = await prisma.teamMembership.findMany({
    where: { teamId },
    select: { id: true, status: true, role: true, userId: true },
  });

  const byStatus = await prisma.teamMembership.groupBy({
    by: ["status"],
    where: { teamId },
    _count: { _all: true },
  });

  console.log("teamId:", teamId);
  console.log("TeamMembership rows:", rows);
  console.log("TeamMembership by status:", byStatus);

  const tm = (prisma as any).teamMember;
  if (tm?.findMany) {
    const legacy = await tm.findMany({
      where: { teamId },
      select: { id: true, isActive: true, tenantId: true, name: true },
    });
    console.log("Legacy TeamMember rows:", legacy);
  } else {
    console.log("Legacy TeamMember model: not available in prisma client");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
