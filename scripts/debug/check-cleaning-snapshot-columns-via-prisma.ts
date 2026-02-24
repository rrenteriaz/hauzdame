import "dotenv/config";
import prisma from "@/lib/prisma";

async function main() {
  // Si estas columnas NO existen en la DB, este select va a fallar con P2022 (column does not exist)
  const row = await prisma.cleaning.findFirst({
    select: {
      id: true,
      propertyName: true,
      propertyShortName: true,
      propertyAddress: true,
    },
  });

  console.log("✅ Columns exist. Sample row:");
  console.log(row);
}

main()
  .catch((e) => {
    console.error("❌ Error (this usually means a missing column):");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
