// app/cleaner/team/page.tsx
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireCleanerUser } from "@/lib/auth/requireUser";

export default async function CleanerMyTeamRedirectPage() {
  const user = await requireCleanerUser();

  // BUGFIX: resolver "Mi equipo" por TeamMembership (no asumir un solo team).
  const leaderMembership = await prisma.teamMembership.findFirst({
    where: {
      userId: user.id,
      role: "TEAM_LEADER",
      status: "ACTIVE",
    },
    select: { teamId: true },
  });

  if (!leaderMembership?.teamId) {
    notFound();
  }

  redirect(`/cleaner/teams/${leaderMembership.teamId}`);
}

