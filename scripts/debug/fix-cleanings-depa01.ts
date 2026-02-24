import "dotenv/config";
import prisma from "@/lib/prisma";

const propertyId = "h02mv7zdql06n3kerxn2vnth";
const APPLY = process.argv.includes("--apply");

async function main() {
  console.log(`▶️ Fix cleanings for propertyId: ${propertyId} (APPLY=${APPLY})`);

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

  // 1) Team asignado a la property (PropertyTeam)
  const pt = await prisma.propertyTeam.findFirst({
    where: { propertyId },
    select: { id: true, teamId: true, createdAt: true },
    orderBy: { createdAt: "desc" }, // por si hubiera más de uno (nos quedamos con el más reciente)
  });

  if (!pt?.teamId) {
    console.log("❌ La propiedad no tiene PropertyTeam asignado (no hay teamId). Abort.");
    return;
  }

  console.log("\n🔗 PROPERTY TEAM (latest)");
  console.log(pt);

  const teamId = pt.teamId;

  // 2) Tomar cleanings recientes (ajusta take si quieres)
  const cleanings = await prisma.cleaning.findMany({
    where: { propertyId },
    select: {
      id: true,
      status: true,
      assignmentStatus: true,
      attentionReason: true,
      teamId: true,
      assignedMembershipId: true,
      scheduledDate: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  console.log(`\n🧼 CLEANINGS encontrados: ${cleanings.length}`);
  console.table(cleanings);

  const cleaningIds = cleanings.map((c: { id: string }) => c.id);
  const membershipIds = cleanings.map((c: { assignedMembershipId: string | null }) => c.assignedMembershipId).filter(Boolean) as string[];

  // 3) Cargar memberships actuales referenciadas por los cleanings
  const memberships = membershipIds.length
    ? await prisma.teamMembership.findMany({
        where: { id: { in: membershipIds } },
        select: { id: true, teamId: true, userId: true, role: true, status: true },
      })
    : [];

  const membershipById = new Map(memberships.map((m: { id: string; teamId: string; userId: string; role: string; status: string }) => [m.id, m]));

  // 4) Para cada cleaning, decidir si hay que:
  //   a) set teamId si null
  //   b) remap assignedMembershipId si REMOVED o team mismatch
  const planned: Array<{
    cleaningId: string;
    setTeamId?: string;
    fromMembershipId?: string | null;
    toMembershipId?: string | null;
    reason: string;
  }> = [];

  // Helper: busca membership ACTIVE del mismo user en el team correcto
  async function findActiveMembershipInCorrectTeam(userId: string) {
    return prisma.teamMembership.findFirst({
      where: {
        teamId,
        userId,
        status: "ACTIVE",
      },
      select: { id: true, role: true, status: true },
    });
  }

  for (const c of cleanings) {
    let setTeamId: string | undefined;
    let toMembershipId: string | null | undefined;
    const reasonParts: string[] = [];

    if (!c.teamId) {
      setTeamId = teamId;
      reasonParts.push("teamId was null → set from PropertyTeam");
    } else if (c.teamId !== teamId) {
      // Caso raro: cleaning.teamId apunta a otro team
      setTeamId = teamId;
      reasonParts.push("teamId mismatch → set from PropertyTeam");
    }

    if (c.assignedMembershipId) {
      const m = membershipById.get(c.assignedMembershipId);
      if (!m) {
        // membership no existe
        toMembershipId = null;
        reasonParts.push("assignedMembershipId missing in DB → clear");
      } else {
        const membership: { id: string; teamId: string; userId: string; role: string; status: string } = m;
        if (membership.status !== "ACTIVE") {
          // membership REMOVED/...
          const replacement = await findActiveMembershipInCorrectTeam(membership.userId);
          if (replacement) {
            toMembershipId = replacement.id;
            reasonParts.push(`assignedMembership REMOVED → remap to ACTIVE in team ${teamId}`);
          } else {
            toMembershipId = null;
            reasonParts.push("assignedMembership REMOVED and no replacement in correct team → clear");
          }
        } else if (membership.teamId !== teamId) {
          // membership pertenece a otro team
          const replacement = await findActiveMembershipInCorrectTeam(membership.userId);
          if (replacement) {
            toMembershipId = replacement.id;
            reasonParts.push(`assignedMembership team mismatch → remap to ACTIVE in team ${teamId}`);
          } else {
            toMembershipId = null;
            reasonParts.push("assignedMembership team mismatch and no replacement → clear");
          }
        }
      }
    }

    if (setTeamId || toMembershipId !== undefined) {
      planned.push({
        cleaningId: c.id,
        setTeamId,
        fromMembershipId: c.assignedMembershipId ?? null,
        toMembershipId: toMembershipId ?? (toMembershipId === null ? null : undefined),
        reason: reasonParts.join(" | "),
      });
    }
  }

  console.log(`\n🧩 Planned changes: ${planned.length}`);
  console.table(planned);

  if (!APPLY) {
    console.log("\n🟡 DRY-RUN: corre con --apply para ejecutar.");
    return;
  }

  console.log("\n🚀 APPLY…");

  for (const p of planned) {
    const data: any = {};
    if (p.setTeamId) data.teamId = p.setTeamId;

    if (p.toMembershipId !== undefined) {
      data.assignedMembershipId = p.toMembershipId;

      // Si limpiaste la membership, también debes “des-asignar” el cleaning
      if (p.toMembershipId === null) {
        // Ajusta aquí si tu enum se llama distinto
        data.assignmentStatus = "UNASSIGNED";
        // Opcional:
        // data.attentionReason = "MISSING_ASSIGNEE";
      }
    }

    await prisma.cleaning.update({
      where: { id: p.cleaningId },
      data,
    });
  }

  console.log("✅ APPLY terminado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
