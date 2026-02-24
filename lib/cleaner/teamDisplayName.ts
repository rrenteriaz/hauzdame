type UserLike = {
  name?: string | null;
  email?: string | null;
};

function getLeaderShortName(user?: UserLike | null): string | null {
  const name = user?.name?.trim();
  if (name) {
    const [firstName] = name.split(" ");
    return firstName || name;
  }
  const email = user?.email?.trim();
  return email || null;
}

export function getTeamDisplayName(args: {
  viewerUserId: string;
  viewerMembershipRole: string;
  leaderUser?: UserLike | null;
}): string {
  if (args.viewerMembershipRole === "TEAM_LEADER") {
    return "Mi equipo";
  }
  const leaderName = getLeaderShortName(args.leaderUser);
  if (!leaderName) {
    return "Team";
  }
  return `${leaderName}'s Team`;
}

