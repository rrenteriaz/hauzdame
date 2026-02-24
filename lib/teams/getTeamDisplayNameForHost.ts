/**
 * Helper para obtener el nombre de visualización de un Team en el contexto Host.
 * 
 * Regla UX:
 * - Si team.name NO es genérico, mostrar team.name.
 * - Si team.name es genérico tipo "Mi equipo" (o vacío), mostrar "${leaderName}'s Team".
 * - Si no se puede determinar leaderName, fallback: team.name o "Equipo ${idCorto}".
 * 
 * @param team - Objeto con id, name y opcionalmente leaderName
 * @param leaderName - Nombre del Team Leader (opcional)
 * @returns Nombre de visualización para el Host
 */
export function getTeamDisplayNameForHost(
  team: { id: string; name: string; leaderName?: string | null },
  leaderName?: string | null
): string {
  const finalLeaderName = leaderName ?? team.leaderName ?? null;
  const teamName = team.name?.trim() || "";

  // Si el nombre del team es genérico o vacío, usar el nombre del leader
  const isGenericName =
    !teamName ||
    teamName.toLowerCase() === "mi equipo" ||
    teamName.toLowerCase() === "equipo" ||
    teamName.toLowerCase() === "team" ||
    teamName.toLowerCase() === "my team";

  if (isGenericName && finalLeaderName) {
    // Usar formato consistente: "${leaderName}'s Team"
    return `${finalLeaderName}'s Team`;
  }

  // Si el nombre no es genérico, usar el nombre del team
  if (teamName) {
    return teamName;
  }

  // Fallback: usar ID corto si no hay nombre ni leader
  const shortId = team.id.slice(0, 8);
  return `Equipo ${shortId}`;
}

