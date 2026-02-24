// lib/host/teamDisplayName.ts
// Helper para obtener el display name de un team desde la perspectiva del Host
// El Host siempre ve el team como "{LeaderName}'s Team" (nunca "Mi equipo")

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

/**
 * Obtiene el display name de un team para la vista del Host.
 * Siempre muestra "{LeaderName}'s Team" basado en el Team Leader.
 * Si no hay leader, fallback a team.name.
 */
export function getTeamDisplayNameForHost(args: {
  teamName: string;
  leaderUser?: UserLike | null;
}): string {
  const leaderName = getLeaderShortName(args.leaderUser);
  if (!leaderName) {
    // Fallback al nombre del team si no hay leader
    return args.teamName;
  }
  return `${leaderName}'s Team`;
}

