import "dotenv/config";
import prisma from "@/lib/prisma";

async function main() {
  const rows = await prisma.cleaningAssignee.groupBy({
    by: ["status"],
    _count: { status: true },
  });
  console.table(rows);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
