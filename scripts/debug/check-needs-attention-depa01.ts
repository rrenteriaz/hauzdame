    // scripts/debug/check-needs-attention-depa01.ts
import "dotenv/config";
import prisma from "@/lib/prisma";

const cleaningId = "cmkdf7v0x000dxso7ghm1l12g";

async function main() {
  const c = await prisma.cleaning.findUnique({
    where: { id: cleaningId },
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
  });
  console.log(c);
}

main()
  .catch(console.error)
  .finally(async () => prisma.$disconnect());
