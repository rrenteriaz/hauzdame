import "dotenv/config";
import prisma from "../../lib/prisma";

async function main() {
  const propertyId = process.argv[2];
  if (!propertyId) {
    console.log("Uso: npx tsx scripts/debug/check-cleanings-by-property.ts <propertyId>");
    process.exit(1);
  }

  const rows = await prisma.cleaning.findMany({
    where: { propertyId },
    select: { id: true, assignmentStatus: true, teamId: true, assignedMembershipId: true },
    orderBy: { createdAt: "asc" as any },
  });

  console.log("propertyId:", propertyId);
  console.log("rows:", rows);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
