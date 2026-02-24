// app/api/host-workgroups/[workGroupId]/available-executors/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDefaultTenant } from "@/lib/tenant";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workGroupId: string }> }
) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    return NextResponse.json({ error: "Tenant no encontrado" }, { status: 401 });
  }

  const resolvedParams = await params;
  const workGroupId = resolvedParams.workGroupId;

  // Verificar que el WorkGroup existe
  const workGroup = await prisma.hostWorkGroup.findFirst({
    where: {
      id: workGroupId,
      tenantId: tenant.id,
    },
    select: { id: true },
  });

  if (!workGroup) {
    return NextResponse.json({ error: "Grupo de trabajo no encontrado" }, { status: 404 });
  }

  // Obtener todos los WorkGroupExecutors ACTIVE del hostTenantId
  const allExecutors = await prisma.workGroupExecutor.findMany({
    where: {
      hostTenantId: tenant.id,
      status: "ACTIVE",
    },
    select: {
      teamId: true,
      servicesTenantId: true,
    },
    distinct: ["teamId"],
  });

  // Obtener información de los teams
  const teamIds = allExecutors.map((e) => e.teamId);
  const teams = teamIds.length > 0
    ? await prisma.team.findMany({
        where: {
          id: { in: teamIds },
        },
        select: {
          id: true,
          name: true,
        },
      })
    : [];

  const teamsMap = new Map(teams.map((t) => [t.id, t]));

  // Formatear ejecutores disponibles
  const executors = allExecutors.map((executor) => ({
    teamId: executor.teamId,
    teamName: teamsMap.get(executor.teamId)?.name || `Equipo ${executor.teamId.slice(0, 8)}`,
    servicesTenantId: executor.servicesTenantId,
  }));

  return NextResponse.json({ executors });
}

