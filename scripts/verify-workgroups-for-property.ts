import "dotenv/config";
import prisma from "../lib/prisma";
import {
  getExecutorsForWorkGroups,
  getHostWorkGroupsForProperty,
  getServiceTeamsForPropertyViaWorkGroups,
} from "../lib/workgroups/resolveWorkGroupsForProperty";
import { resolveEffectiveTeamsForProperty } from "../lib/workgroups/resolveEffectiveTeamsForProperty";

async function main() {
  const propertyId = process.argv[2];
  const hostTenantId = process.argv[3];

  if (!propertyId || !hostTenantId) {
    console.log(
      "Uso: npx tsx scripts/verify-workgroups-for-property.ts <propertyId> <hostTenantId>"
    );
    process.exit(1);
  }

  console.log(
    "prisma workgroup keys:",
    Object.keys(prisma).filter((k) => k.toLowerCase().includes("workgroup"))
  );
  console.log(
    "has hostWorkGroupProperty:",
    !!(prisma as any).hostWorkGroupProperty
  );

  const workGroups = await getHostWorkGroupsForProperty(hostTenantId, propertyId);
  const workGroupIds = workGroups.map((wg: { id: string }) => wg.id);
  const executors = await getExecutorsForWorkGroups(hostTenantId, workGroupIds);
  const teamIdsViaWg = await getServiceTeamsForPropertyViaWorkGroups(
    hostTenantId,
    propertyId
  );
  const effectiveTeamIds = await resolveEffectiveTeamsForProperty(
    hostTenantId,
    propertyId
  );

  console.log("propertyId:", propertyId);
  console.log("hostTenantId:", hostTenantId);
  console.log(
    "workGroups:",
    workGroups.map((wg: { id: string; name: string }) => ({
      id: wg.id,
      name: wg.name,
    }))
  );
  console.log("executors:", executors);
  console.log("teamIdsViaWg:", teamIdsViaWg);
  console.log("effectiveTeamIds:", effectiveTeamIds);

  const propertyTeams = await (prisma as any).propertyTeam.findMany({
    where: { tenantId: hostTenantId, propertyId },
    select: { id: true, tenantId: true, propertyId: true, teamId: true },
  });
  console.log("propertyTeams(host):", propertyTeams);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

