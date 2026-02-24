import "dotenv/config";
import prisma from "@/lib/prisma";

function fmt(d: any) {
  if (!d) return null;
  const dd = new Date(d);
  return Number.isNaN(dd.getTime()) ? String(d) : dd.toISOString();
}

async function main() {
  const reservations = await prisma.reservation.findMany({
    orderBy: { createdAt: "asc" }, // o { id: "asc" }
    take: 10,
    select: {
      id: true,
      tenantId: true,
      propertyId: true,

      source: true,
      status: true,

      startDate: true,
      endDate: true,

      calendarUid: true,
      reservationCodeCalendar: true,

      guestName: true,
      guestPhoneLast4: true,
      confirmationCodeEmail: true,
      guestMessage: true,

      guestsAdult: true,
      guestsChildren: true,
      guestsInfants: true,
      guestsPets: true,

      pricingNightly: true,
      pricingCleaningFee: true,
      pricingPetFee: true,
      pricingHostServiceFee: true,
      pricingHostPayout: true,
      pricingCurrency: true,

      createdAt: true,
      updatedAt: true,
    },
  });

  console.log("=== 10 ejemplos reales de Reservation ===\n");

  let i = 1;
  for (const r of reservations) {
    console.log(`--- #${i} ---`);
    console.log({
      reservationId: r.id,
      tenantId: r.tenantId,
      propertyId: r.propertyId,

      source: r.source,
      status: r.status,

      startDate: fmt(r.startDate),
      endDate: fmt(r.endDate),

      calendarUid: r.calendarUid,
      reservationCodeCalendar: r.reservationCodeCalendar,

      guestName: r.guestName,
      guestPhoneLast4: r.guestPhoneLast4,
      confirmationCodeEmail: r.confirmationCodeEmail,
      guestMessage: r.guestMessage,

      guestsAdult: r.guestsAdult,
      guestsChildren: r.guestsChildren,
      guestsInfants: r.guestsInfants,
      guestsPets: r.guestsPets,

      pricingNightly: r.pricingNightly?.toString?.() ?? r.pricingNightly,
      pricingCleaningFee: r.pricingCleaningFee?.toString?.() ?? r.pricingCleaningFee,
      pricingPetFee: r.pricingPetFee?.toString?.() ?? r.pricingPetFee,
      pricingHostServiceFee: r.pricingHostServiceFee?.toString?.() ?? r.pricingHostServiceFee,
      pricingHostPayout: r.pricingHostPayout?.toString?.() ?? r.pricingHostPayout,
      pricingCurrency: r.pricingCurrency,

      createdAt: fmt(r.createdAt),
      updatedAt: fmt(r.updatedAt),
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
