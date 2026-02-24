// app/host/workgroups/actions.ts
"use server";

import prisma from "@/lib/prisma";
import { getDefaultTenant } from "@/lib/tenant";
import { getCurrentUser } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function redirectBack(formData: FormData) {
  const returnTo = formData.get("returnTo")?.toString();
  if (returnTo && returnTo.startsWith("/host/workgroups")) {
    redirect(returnTo);
  }
  redirect("/host/workgroups");
}

export async function createWorkGroup(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    const returnTo = formData.get("returnTo")?.toString();
    if (returnTo) {
      redirectBack(formData);
    }
    throw new Error("Tenant no encontrado");
  }

  const name = formData.get("name")?.toString().trim();
  const notes = formData.get("notes")?.toString().trim() || null;
  const returnTo = formData.get("returnTo")?.toString();

  if (!name) {
    if (returnTo) {
      redirectBack(formData);
    }
    throw new Error("El nombre es requerido");
  }

  // Validar unicidad de nombre solo para WGs ACTIVE (ver contrato 7.8)
  const existingActive = await prisma.hostWorkGroup.findFirst({
    where: {
      tenantId: tenant.id,
      name,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  if (existingActive) {
    throw new Error("Ya existe un grupo de trabajo ACTIVE con ese nombre en este tenant.");
  }

  try {
    const workGroup = await prisma.hostWorkGroup.create({
      data: {
        tenantId: tenant.id,
        name,
        status: "ACTIVE", // Default según contrato
      },
      select: {
        id: true,
        name: true,
      },
    });

    revalidatePath("/host/workgroups");

    // Si hay returnTo, redirigir (comportamiento original)
    if (returnTo) {
      redirectBack(formData);
      return;
    }

    // Si no hay returnTo, retornar el ID y nombre (para uso en modales)
    return { id: workGroup.id, name: workGroup.name };
  } catch (error: any) {
    // Manejar error de constraint único (nombre duplicado)
    if (error?.code === "P2002" && error?.meta?.target?.includes("tenantId") && error?.meta?.target?.includes("name")) {
      throw new Error("Ya existe un grupo de trabajo con ese nombre en este tenant.");
    }
    // Re-lanzar otros errores
    throw error;
  }
}

export async function updateWorkGroup(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    redirectBack(formData);
    return;
  }

  const id = String(formData.get("workGroupId") || "");
  const name = formData.get("name")?.toString().trim();

  if (!id || !name) {
    redirectBack(formData);
    return;
  }

  // Validar unicidad de nombre solo para WGs ACTIVE (ver contrato 7.8)
  // Si el WG actual está ACTIVE, verificar que no existe otro WG ACTIVE con el mismo nombre
  const currentWG = await prisma.hostWorkGroup.findFirst({
    where: {
      id,
      tenantId: tenant.id,
    },
    select: { status: true },
  });

  if (currentWG?.status === "ACTIVE") {
    const existingActive = await prisma.hostWorkGroup.findFirst({
      where: {
        tenantId: tenant.id,
        name,
        status: "ACTIVE",
        id: { not: id }, // Excluir el WG actual
      },
      select: { id: true },
    });

    if (existingActive) {
      throw new Error("Ya existe un grupo de trabajo ACTIVE con ese nombre en este tenant.");
    }
  }

  try {
    await prisma.hostWorkGroup.updateMany({
      where: {
        id,
        tenantId: tenant.id,
      },
      data: {
        name,
      },
    });

    revalidatePath("/host/workgroups");
    revalidatePath(`/host/workgroups/${id}`);
    redirectBack(formData);
  } catch (error: any) {
    // Manejar error de constraint único (nombre duplicado)
    if (error?.code === "P2002" && error?.meta?.target?.includes("tenantId") && error?.meta?.target?.includes("name")) {
      throw new Error("Ya existe un grupo de trabajo con ese nombre en este tenant.");
    }
    // Re-lanzar otros errores
    throw error;
  }
}

export async function updateWorkGroupProperties(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    redirectBack(formData);
    return;
  }

  const workGroupId = String(formData.get("workGroupId") || "");
  const rawPropertyIds = formData.get("propertyIds")?.toString() || "[]";
  let propertyIds: string[] = [];
  try {
    propertyIds = JSON.parse(rawPropertyIds);
  } catch {
    propertyIds = [];
  }

  if (!workGroupId) {
    throw new Error("Grupo de trabajo inválido.");
  }

  const workGroup = await prisma.hostWorkGroup.findFirst({
    where: { id: workGroupId, tenantId: tenant.id },
    select: { id: true },
  });

  if (!workGroup) {
    throw new Error("Grupo de trabajo no encontrado.");
  }

  // Validar que las propiedades existen y pertenecen al tenant del host
  const validProperties = await prisma.property.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
      id: { in: propertyIds },
    },
    select: { id: true },
  });
  const validPropertyIds = new Set(validProperties.map((p) => p.id));
  
  // Deduplicar propertyIds y filtrar solo válidos
  const finalPropertyIds = Array.from(new Set(propertyIds.filter((id) => validPropertyIds.has(id))));

  // HostWorkGroupProperty: replace semantics to ensure consistency.
  // Delete ALL existing rows for workGroupId (regardless of tenantId) to clean stale rows.
  // Then insert new ones with correct hostTenantId.
  const hostTenantId = tenant.id; // Explicitly use host tenant, NOT servicesTenantId

  await prisma.$transaction(async (tx) => {
    // Eliminar TODAS las filas existentes para este workGroup (sin filtrar por tenantId)
    // Esto limpia filas "stale" con tenantId incorrecto (ej. servicesTenantId)
    await tx.hostWorkGroupProperty.deleteMany({
      where: {
        workGroupId,
      },
    });

    // Insertar las nuevas filas (deduplicadas) con tenantId correcto
    if (finalPropertyIds.length > 0) {
      await tx.hostWorkGroupProperty.createMany({
        data: finalPropertyIds.map((propertyId) => ({
          tenantId: hostTenantId, // Asegurar que siempre use hostTenantId
          workGroupId,
          propertyId,
        })),
        skipDuplicates: true, // Resiliencia adicional contra duplicados
      });
    }
  });

  // Log de desarrollo para debugging
  if (process.env.NODE_ENV === "development") {
    console.warn("[HostWorkGroup save properties]", {
      hostTenantId,
      workGroupId,
      propertyIdsCount: finalPropertyIds.length,
      propertyIdsPreview: finalPropertyIds.slice(0, 5),
    });
  }

  revalidatePath("/host/workgroups");
  revalidatePath(`/host/workgroups/${workGroupId}`);
}

export async function deleteWorkGroup(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    redirectBack(formData);
    return;
  }

  const id = String(formData.get("workGroupId") || "");
  if (!id) redirectBack(formData);

  // Verificar si tiene propiedades asignadas o ejecutores
  const [propertiesCount, executorsCount] = await Promise.all([
    prisma.hostWorkGroupProperty.count({
      where: {
        workGroupId: id,
        tenantId: tenant.id,
      },
    }),
    prisma.workGroupExecutor.count({
      where: {
        workGroupId: id,
        hostTenantId: tenant.id,
        status: "ACTIVE",
      },
    }),
  ]);

  if (propertiesCount > 0 || executorsCount > 0) {
    throw new Error(
      `No se puede eliminar este grupo de trabajo porque tiene ${propertiesCount} propiedades asignadas y ${executorsCount} ejecutores activos.`
    );
  }

  await prisma.hostWorkGroup.deleteMany({
    where: {
      id,
      tenantId: tenant.id,
    },
  });

  revalidatePath("/host/workgroups");
  redirect("/host/workgroups");
}

export async function toggleWorkGroupStatus(
  workGroupId: string,
  status: "ACTIVE" | "INACTIVE"
) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    throw new Error("Tenant no encontrado.");
  }

  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Usuario no autenticado.");
  }

  // Validar permisos: solo OWNER, MANAGER o AUXILIAR pueden editar propiedades
  const canEditProperties = ["OWNER", "MANAGER", "AUXILIAR"].includes(user.role);
  if (!canEditProperties) {
    throw new Error("No tienes permisos para realizar esta acción.");
  }

  // Verificar que el workGroup existe y pertenece al tenant
  const workGroup = await prisma.hostWorkGroup.findFirst({
    where: {
      id: workGroupId,
      tenantId: tenant.id,
    },
    select: {
      id: true,
      name: true,
      status: true,
    },
  });

  if (!workGroup) {
    throw new Error("Grupo de trabajo no encontrado.");
  }

  // Si el status es el mismo, no hacer nada
  if (workGroup.status === status) {
    return { ok: true };
  }

  // Validar unicidad de nombre solo si se está activando (según contrato 7.8)
  if (status === "ACTIVE") {
    const existingActive = await prisma.hostWorkGroup.findFirst({
      where: {
        tenantId: tenant.id,
        name: workGroup.name,
        status: "ACTIVE",
        id: { not: workGroupId },
      },
      select: { id: true },
    });

    if (existingActive) {
      throw new Error("Ya existe un grupo de trabajo ACTIVE con ese nombre en este tenant.");
    }
  }

  // Actualizar status usando updateMany para hard tenant-scope
  await prisma.hostWorkGroup.updateMany({
    where: {
      id: workGroupId,
      tenantId: tenant.id,
    },
    data: {
      status,
    },
  });

  // Revalidar rutas
  revalidatePath("/host/workgroups");
  revalidatePath(`/host/workgroups/${workGroupId}`);

  return { ok: true };
}

