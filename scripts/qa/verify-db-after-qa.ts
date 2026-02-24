import "dotenv/config";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";

const TOKENS_PATH = path.join("scripts", "qa", "qa-tokens.json");

function ok(label: string, pass: boolean) {
  console.log(`${pass ? "✅" : "❌"} ${label}`);
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("QA scripts no deben ejecutarse en producción.");
  }
  if (!fs.existsSync(TOKENS_PATH)) {
    throw new Error("qa-tokens.json no encontrado. Ejecuta create-qa-tokens.ts primero.");
  }
  const tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, "utf-8"));

  const teamInvites = await prisma.teamInvite.findMany({
    where: { token: { in: [tokens.service.teamInviteTokenSingle, tokens.service.teamInviteTokenRace] } },
    select: { id: true, token: true, status: true, claimedByUserId: true, teamId: true },
  });

  const propertyInvite = (prisma as any).propertyInvite;
  const propertyMemberAccess = (prisma as any).propertyMemberAccess;

  const propertyInvites = await propertyInvite.findMany({
    where: {
      token: { in: [tokens.host.propertyInviteTokenCleaner, tokens.host.propertyInviteTokenManager] },
    },
    select: { id: true, token: true, status: true, claimedByUserId: true, role: true, propertyId: true },
  });

  console.table(teamInvites);
  console.table(propertyInvites);

  const teamInviteSingle = teamInvites.find((i) => i.token === tokens.service.teamInviteTokenSingle);
  const teamInviteRace = teamInvites.find((i) => i.token === tokens.service.teamInviteTokenRace);

  ok("TeamInvite single CLAIMED", teamInviteSingle?.status === "CLAIMED");
  ok("TeamInvite race CLAIMED", teamInviteRace?.status === "CLAIMED");

  if (teamInviteSingle?.claimedByUserId) {
    const membership = await prisma.teamMembership.findUnique({
      where: {
        teamId_userId: {
          teamId: teamInviteSingle.teamId,
          userId: teamInviteSingle.claimedByUserId,
        },
      },
      select: { id: true, status: true, role: true },
    });
    ok("TeamMembership ACTIVE para claim single", membership?.status === "ACTIVE");
  }

  if (teamInviteRace?.claimedByUserId) {
    const membership = await prisma.teamMembership.findUnique({
      where: {
        teamId_userId: {
          teamId: teamInviteRace.teamId,
          userId: teamInviteRace.claimedByUserId,
        },
      },
      select: { id: true, status: true, role: true },
    });
    ok("TeamMembership ACTIVE para claim race", membership?.status === "ACTIVE");
  }

  const cleanerInvite = propertyInvites.find(
    (i: any) => i.token === tokens.host.propertyInviteTokenCleaner
  );
  const managerInvite = propertyInvites.find(
    (i: any) => i.token === tokens.host.propertyInviteTokenManager
  );

  ok("PropertyInvite CLEANER CLAIMED", cleanerInvite?.status === "CLAIMED");
  ok("PropertyInvite MANAGER CLAIMED", managerInvite?.status === "CLAIMED");

  if (cleanerInvite?.claimedByUserId) {
    const access = await propertyMemberAccess.findFirst({
      where: {
        propertyId: cleanerInvite.propertyId,
        userId: cleanerInvite.claimedByUserId,
      },
      select: { id: true, status: true, accessRole: true, teamMembershipId: true, userId: true },
    });
    ok("PropertyMemberAccess CLEANER ACTIVE", access?.status === "ACTIVE");
    ok("PropertyMemberAccess role CLEANER", access?.accessRole === "CLEANER");
    ok("PropertyMemberAccess userId set", !!access?.userId);
    ok("PropertyMemberAccess teamMembershipId null", !access?.teamMembershipId);
  }

  if (managerInvite?.claimedByUserId) {
    const access = await propertyMemberAccess.findFirst({
      where: {
        propertyId: managerInvite.propertyId,
        userId: managerInvite.claimedByUserId,
      },
      select: { id: true, status: true, accessRole: true, teamMembershipId: true, userId: true },
    });
    ok("PropertyMemberAccess MANAGER ACTIVE", access?.status === "ACTIVE");
    ok("PropertyMemberAccess role MANAGER", access?.accessRole === "MANAGER");
    ok("PropertyMemberAccess userId set", !!access?.userId);
    ok("PropertyMemberAccess teamMembershipId null", !access?.teamMembershipId);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

