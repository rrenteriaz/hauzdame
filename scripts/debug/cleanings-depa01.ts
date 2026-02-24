import "dotenv/config";
import prisma from "@/lib/prisma";

const propertyId = "h02mv7zdql06n3kerxn2vnth";

async function main() {
  console.log("▶️ Debug Cleanings for propertyId:", propertyId);

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, name: true, tenantId: true },
  });

  if (!property) {
    console.log("❌ Propiedad no encontrada");
    return;
  }

  console.log("\n🏠 PROPERTY");
  console.log(property);

  // Campos confirmados por el error de Prisma (Available options):
  const cleanings = await prisma.cleaning.findMany({
    where: { propertyId },
    select: {
      id: true,
      tenantId: true,
      propertyId: true,
      reservationId: true,

      status: true,
      assignmentStatus: true,
      attentionReason: true,

      // asignación "legacy / directa"
      assignedToId: true,
      assignedMemberId: true,
      assignedTeamMemberId: true,
      assignedMembershipId: true,
      teamId: true,

      // scheduling (en tu schema hay scheduledDate y scheduledAtOriginal/Planned)
      scheduledDate: true,
      scheduledAtOriginal: true,
      scheduledAtPlanned: true,
      isScheduleOverridden: true,
      scheduleOverriddenAt: true,

      // tiempos
      startedAt: true,
      completedAt: true,

      notes: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },

    take: 30,
  });

  console.log("\n🧼 CLEANINGS (últimos 30)");
  console.table(cleanings);

  // ✅ CleaningAssignee: en tu schema NO existe createdAt; usa assignedAt.
  // Además parece que el FK es memberId (TeamMember), no teamMembershipId.

  const cleaningIds = cleanings.map((c: any) => c.id);

  let assignees: any[] = [];
  try {
    assignees = await prisma.cleaningAssignee.findMany({
      where: { cleaningId: { in: cleaningIds } },
      select: {
        id: true,
        cleaningId: true,
        memberId: true,
        status: true,
        assignedAt: true,
        assignedByUserId: true,
      },
      orderBy: { assignedAt: "desc" },
    });

    console.log("\n👥 CLEANING ASSIGNEES (CleaningAssignee)");
    console.table(assignees);
  } catch (e) {
    console.log("\nℹ️ No se pudo leer cleaningAssignee (ok).");
  }

  // ✅ PropertyTeam (raw): imprime todos los rows, incluyendo status si existe
 
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
