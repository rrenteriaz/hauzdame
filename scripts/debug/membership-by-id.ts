import "dotenv/config";
import prisma from "@/lib/prisma";

const membershipId = "cmkdeqwxn0004xso7p050587t";

async function main() {
  console.log("▶️ Debug TeamMembership by id:", membershipId);

  const m = await prisma.teamMembership.findUnique({
    where: { id: membershipId },
    select: {
      id: true,
      teamId: true,
      userId: true,
      role: true,
      status: true,
      createdAt: true,
      Team: { select: { id: true, tenantId: true, status: true, createdAt: true } },
      User: { select: { id: true, email: true, name: true, role: true, tenantId: true } },
    },
  });

  if (!m) {
    console.log("❌ No existe esa TeamMembership");
    return;
  }

  console.log("\n👤 MEMBERSHIP");
  console.log({
    id: m.id,
    teamId: m.teamId,
    teamTenantId: m.Team?.tenantId,
    userId: m.userId,
    userEmail: m.User?.email,
    userName: m.User?.name,
    userRole: m.User?.role,
    userTenantId: m.User?.tenantId,
    membershipRole: m.role,
    membershipStatus: m.status,
    createdAt: m.createdAt,
  });

  console.log("\n✅ Fin debug.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
