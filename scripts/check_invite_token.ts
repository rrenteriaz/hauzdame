import prisma from "../lib/prisma";

const token = process.argv[2];

async function main() {
  if (!token) throw new Error("Usage: npx tsx -r dotenv/config scripts/check_invite_token.ts <token>");

  const invite = await prisma.teamInvite.findUnique({
    where: { token },
    select: {
      id: true,
      token: true,
      status: true,
      prefillName: true,
      message: true,
      createdAt: true,
      expiresAt: true,
      teamId: true,
      createdByUserId: true,
    },
  });

  console.log(invite);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
