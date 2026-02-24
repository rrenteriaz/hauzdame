// scripts/debug/why-attention-depa01.ts
import "dotenv/config";
import prisma from "@/lib/prisma";

const cleaningId = "cmkdf7v0x000dxso7ghm1l12g";

async function main() {
  console.log("▶️ Why attention for cleaningId:", cleaningId);

  const c = await prisma.cleaning.findUnique({
    where: { id: cleaningId },
    select: {
      id: true,
      tenantId: true,
      propertyId: true,
      status: true,
      assignmentStatus: true,
      attentionReason: true,

      // assignment pointers (legacy + new)
      teamId: true,
      assignedMembershipId: true,
      assignedToId: true,
      assignedMemberId: true,
      assignedTeamMemberId: true,

      // flags típicos
      notes: true,

      // schedule/meta
      scheduledDate: true,
      scheduledAtOriginal: true,
      scheduledAtPlanned: true,
      isScheduleOverridden: true,
      scheduleOverriddenAt: true,

      createdAt: true,
      updatedAt: true,
    },
  });

  if (!c) {
    console.log("❌ Cleaning no encontrado");
    return;
  }

  console.log("\n🧼 CLEANING");
  console.log(c);

  // 1) Membership actual
  const membership = c.assignedMembershipId
    ? await prisma.teamMembership.findUnique({
        where: { id: c.assignedMembershipId },
        select: { id: true, teamId: true, status: true, role: true, userId: true },
      })
    : null;

  console.log("\n👤 assignedMembership");
  console.log(membership);

  // 2) CleaningAssignee (tu modelo real usa memberId + assignedAt)
  const assignees = await prisma.cleaningAssignee.findMany({
    where: { cleaningId: c.id },
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

  console.log("\n👥 CLEANING ASSIGNEES");
  console.table(assignees);

  // 3) TeamMember del assignee (si existe)
  const memberIds = assignees.map((a) => a.memberId).filter(Boolean);
  const members = memberIds.length
    ? await prisma.teamMember.findMany({
        where: { id: { in: memberIds } },
        select: { id: true, userId: true, teamId: true, isActive: true },
      })
    : [];

  console.log("\n🧩 TEAM MEMBERS (para assignees)");
  console.table(members);

  // 4) Reglas “por qué caería en atención” (diagnóstico)
  const hasAssignedAssignee = assignees.some((a) => a.status === "ASSIGNED");
  const membershipOk = membership?.status === "ACTIVE";
  const teamIdOk = !!c.teamId;

  const reasons: string[] = [];
  if (c.attentionReason) reasons.push(`attentionReason=${c.attentionReason}`);
  // Si tu schema tiene needsAttention, lo reportamos si existe
  // (si no existe, Prisma no lo hubiera dejado en select, así que no lo usamos aquí)
  if (!teamIdOk) reasons.push("teamId is null");
  if (!!c.assignedMembershipId && !membershipOk) reasons.push("assignedMembershipId not ACTIVE");
  if (c.assignmentStatus === "ASSIGNED" && !hasAssignedAssignee) reasons.push("assignmentStatus=ASSIGNED pero NO hay CleaningAssignee ASSIGNED");
  if (hasAssignedAssignee && members.length === 0) reasons.push("hay CleaningAssignee pero no resolve TeamMember (dato roto)");

  console.log("\n🧠 Derived diagnosis");
  console.log({
    teamIdOk,
    membershipOk,
    hasAssignedAssignee,
    reasons,
  });

  console.log("\n✅ Fin.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
