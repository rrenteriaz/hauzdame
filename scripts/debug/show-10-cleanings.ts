import "dotenv/config";
import prisma from "@/lib/prisma";

function fmt(d: any) {
  if (!d) return null;
  const dd = new Date(d);
  return Number.isNaN(dd.getTime()) ? String(d) : dd.toISOString();
}

async function main() {
  const cleanings = await prisma.cleaning.findMany({
    orderBy: { createdAt: "asc" }, // o id: "asc"
    take: 10,
    select: {
      id: true,
      tenantId: true,
      propertyId: true,
      reservationId: true,

      status: true,
      assignmentStatus: true,
      attentionReason: true,

      // 📅 Campos reales de fechas (según tu modelo)
      scheduledDate: true,
      scheduledAtOriginal: true,
      scheduledAtPlanned: true,
      startedAt: true,
      completedAt: true,

      needsAttention: true,
      isScheduleOverridden: true,
      scheduleOverriddenAt: true,

      createdAt: true,
      updatedAt: true,
    },
  });

  const reservationIds = Array.from(
    new Set(cleanings.map((c) => c.reservationId).filter(Boolean) as string[])
  );

  const reservations = reservationIds.length
    ? await prisma.reservation.findMany({
        where: { id: { in: reservationIds } },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          source: true,
          calendarUid: true,
        },
      })
    : [];

  const byReservationId = new Map(reservations.map((r) => [r.id, r]));

  console.log("=== 10 ejemplos reales de Cleaning ===\n");

  let i = 1;
  for (const c of cleanings) {
    const r = c.reservationId
      ? byReservationId.get(c.reservationId)
      : null;

    console.log(`--- #${i} ---`);
    console.log({
      cleaningId: c.id,
      reservationId: c.reservationId,

      // 🔗 Fechas de la reservation
      reservation_startDate: fmt(r?.startDate),
      reservation_endDate: fmt(r?.endDate),

      // 📅 Fechas en Cleaning (aquí está el bug)
      cleaning_scheduledDate: fmt(c.scheduledDate),
      cleaning_scheduledAtOriginal: fmt(c.scheduledAtOriginal),
      cleaning_scheduledAtPlanned: fmt(c.scheduledAtPlanned),

      cleaning_startedAt: fmt(c.startedAt),
      cleaning_completedAt: fmt(c.completedAt),

      // flags
      isScheduleOverridden: c.isScheduleOverridden,
      needsAttention: c.needsAttention,

      // estado
      status: c.status,
      assignmentStatus: c.assignmentStatus,
      attentionReason: c.attentionReason,

      // metadata
      createdAt: fmt(c.createdAt),
      updatedAt: fmt(c.updatedAt),
    });

    i++;
  }

  console.log("\n=== FIN ===");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
