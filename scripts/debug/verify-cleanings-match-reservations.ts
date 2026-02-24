import "dotenv/config";
import prisma from "@/lib/prisma";

async function main() {
  const counts = await prisma.$queryRawUnsafe<
    Array<{ reservations: number; cleanings: number }>
  >(`
    SELECT
      (SELECT count(*)::int FROM "Reservation") AS reservations,
      (SELECT count(*)::int FROM "Cleaning") AS cleanings;
  `);

  const cleaningsWithoutReservation = await prisma.$queryRawUnsafe<
    Array<{ cleanings_without_reservation: number }>
  >(`
    SELECT count(*)::int AS cleanings_without_reservation
    FROM "Cleaning" c
    LEFT JOIN "Reservation" r ON r."id" = c."reservationId"
    WHERE c."reservationId" IS NOT NULL AND r."id" IS NULL;
  `);

  const reservationsWithoutCleaning = await prisma.$queryRawUnsafe<
    Array<{ reservations_without_cleaning: number }>
  >(`
    SELECT count(*)::int AS reservations_without_cleaning
    FROM "Reservation" r
    LEFT JOIN "Cleaning" c ON c."reservationId" = r."id"
    WHERE c."id" IS NULL;
  `);

  console.log("\n=== Cleaning vs Reservation (verify) ===");
  console.table(counts);
  console.table(cleaningsWithoutReservation);
  console.table(reservationsWithoutCleaning);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
