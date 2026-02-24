import "dotenv/config";
import prisma from "@/lib/prisma";

const propertyId = "h02mv7zdql06n3kerxn2vnth";

async function main() {
  console.log("▶️ Backfill CleaningAssignee from assignedMembershipId for propertyId:", propertyId);

  const cleanings = await prisma.cleaning.findMany({
    where: { propertyId },
    select: {
      id: true,
      tenantId: true,
      teamId: true,
      assignedMembershipId: true,
      assignmentStatus: true,
      status: true,
      scheduledDate: true,
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  console.log("\n🧼 CLEANINGS");
  console.table(cleanings);

  const targets = cleanings.filter(
    (c) => c.assignmentStatus === "ASSIGNED" && !!c.assignedMembershipId && !!c.teamId
  );

  if (targets.length === 0) {
    console.log("\n✅ No hay cleanings ASSIGNED con assignedMembershipId + teamId. Nada que hacer.");
    return;
  }

  for (const c of targets) {
    const membership = await prisma.teamMembership.findUnique({
      where: { id: c.assignedMembershipId! },
      select: { id: true, userId: true, status: true, teamId: true, role: true },
    });

    if (!membership) {
      console.log(`\n⚠️ Cleaning ${c.id}: assignedMembershipId no existe`);
      continue;
    }

    if (membership.status !== "ACTIVE") {
      console.log(`\n⚠️ Cleaning ${c.id}: membership no está ACTIVE (${membership.status})`);
      continue;
    }

    // Asegurar TeamMember (memberId) para este user en este team
    let member = await prisma.teamMember.findFirst({
      where: { teamId: c.teamId!, userId: membership.userId },
      select: { id: true, teamId: true, userId: true, isActive: true },
    });

    if (!member) {
      const user = await prisma.user.findUnique({
        where: { id: membership.userId },
        select: { name: true, email: true },
      });
      const name = user?.name?.trim() || user?.email || "Miembro";
      const team = await prisma.team.findUnique({
        where: { id: c.teamId! },
        select: { tenantId: true },
      });
      if (!team) {
        console.log(`\n⚠️ Cleaning ${c.id}: team no encontrado (${c.teamId})`);
        continue;
      }
      member = await (prisma as any).teamMember.create({
        data: {
          tenantId: team.tenantId,
          teamId: c.teamId!,
          userId: membership.userId,
          name,
          isActive: true,
          workingDays: [],
          workingStartTime: null,
          workingEndTime: null,
        },
        select: { id: true, teamId: true, userId: true, isActive: true },
      });
    } else if (!member.isActive) {
      member = await (prisma as any).teamMember.update({
        where: { id: member.id },
        data: { isActive: true },
        select: { id: true, teamId: true, userId: true, isActive: true },
      });
    }
    if (!member) {
      console.log(`\n⚠️ Cleaning ${c.id}: no se pudo resolver TeamMember`);
      continue;
    }

    // Asegurar CleaningAssignee ACTIVE para este cleaning
    // (si no tienes unique, hacemos findFirst + create; si tienes unique compuesto, mejor upsert)
    const existing = await prisma.cleaningAssignee.findFirst({
      where: { cleaningId: c.id, memberId: member.id },
      select: { id: true, status: true },
    });

    if (existing) {
      if (existing.status !== "ASSIGNED") {
        await prisma.cleaningAssignee.update({
          where: { id: existing.id },
          data: { status: "ASSIGNED", assignedAt: new Date() },
        });
        console.log(`\n✅ Cleaning ${c.id}: CleaningAssignee re-activado (${existing.id})`);
      } else {
        console.log(`\n✅ Cleaning ${c.id}: CleaningAssignee ya existía ACTIVE (${existing.id})`);
      }
    } else {
      const created = await prisma.cleaningAssignee.create({
        data: {
          tenantId: c.tenantId,
          cleaningId: c.id,
          memberId: member.id,
          status: "ASSIGNED",
          assignedAt: new Date(),
        },
        select: { id: true },
      });
      console.log(`\n✅ Cleaning ${c.id}: CleaningAssignee creado (${created.id})`);
    }
  }

  console.log("\n✅ Fin backfill.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
