"use server";

import prisma from "@/lib/prisma";
import { requireHostUser } from "@/lib/auth/requireUser";
import { normalizeKey, normalizeValue } from "@/lib/normalize";
import { revalidatePath } from "next/cache";

async function getTenantIdOrThrow() {
  const user = await requireHostUser();
  if (!user.tenantId) throw new Error("Usuario sin tenant asociado");
  return user.tenantId;
}

function assertTenantOwnership(tenantId: string, expectedTenantId: string) {
  if (tenantId !== expectedTenantId) {
    throw new Error("FORBIDDEN");
  }
}

/** 5.1 Listar grupos de variantes del tenant */
export async function listTenantVariantGroupsAction() {
  const tenantId = await getTenantIdOrThrow();
  const groups = await prisma.variantGroup.findMany({
    where: { tenantId },
    include: {
      options: {
        where: { isArchived: false },
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      },
      itemLinks: { where: { isActive: true } },
    },
    orderBy: { label: "asc" },
  });
  return groups.map((g) => ({
    id: g.id,
    key: g.key,
    label: g.label,
    optionCount: g.options.length,
    options: g.options.map((o) => ({
      id: o.id,
      label: o.label,
      valueNormalized: o.valueNormalized,
    })),
    itemCount: g.itemLinks.length,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  }));
}

/** 5.2 Crear grupo */
export async function createTenantVariantGroupAction(payload: {
  key: string;
  label: string;
}) {
  const tenantId = await getTenantIdOrThrow();
  const keyNormalized = normalizeKey(payload.key);
  const label = payload.label.trim();
  if (!keyNormalized) throw new Error("La key no puede estar vacía");
  if (!label) throw new Error("El label no puede estar vacío");

  const existing = await prisma.variantGroup.findUnique({
    where: { tenantId_key: { tenantId: tenantId, key: keyNormalized } },
  });
  if (existing) throw new Error("Ya existe un grupo con esa key");

  const group = await prisma.variantGroup.create({
    data: {
      tenantId: tenantId,
      key: keyNormalized,
      label,
    },
  });
  revalidatePath("/host/catalog/variant-groups");
  return group;
}

/** 5.3 Actualizar label del grupo */
export async function updateTenantVariantGroupLabelAction(payload: {
  groupId: string;
  label: string;
}) {
  const tenantId = await getTenantIdOrThrow();
  const label = payload.label.trim();
  if (!label) throw new Error("El label no puede estar vacío");

  const group = await prisma.variantGroup.findFirst({
    where: { id: payload.groupId, tenantId },
  });
  if (!group) throw new Error("Grupo no encontrado");

  return prisma.variantGroup.update({
    where: { id: payload.groupId },
    data: { label },
  });
}

/** 5.4 Listar opciones de un grupo */
export async function listVariantGroupOptionsAction(payload: {
  groupId: string;
  includeArchived?: boolean;
}) {
  const tenantId = await getTenantIdOrThrow();
  const group = await prisma.variantGroup.findFirst({
    where: { id: payload.groupId, tenantId },
  });
  if (!group) throw new Error("Grupo no encontrado");

  const where: { groupId: string; isArchived?: boolean } = {
    groupId: payload.groupId,
  };
  if (!payload.includeArchived) {
    where.isArchived = false;
  }

  return prisma.variantOption.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
}

/** 5.5 Crear opción */
export async function createVariantOptionAction(payload: {
  groupId: string;
  value: string;
  label: string;
  sortOrder?: number;
}) {
  const tenantId = await getTenantIdOrThrow();
  const group = await prisma.variantGroup.findFirst({
    where: { id: payload.groupId, tenantId },
  });
  if (!group) throw new Error("Grupo no encontrado");

  const valueNormalized = normalizeValue(payload.value);
  const label = payload.label.trim();
  if (!valueNormalized) throw new Error("El value no puede estar vacío");
  if (!label) throw new Error("El label no puede estar vacío");

  const existing = await prisma.variantOption.findUnique({
    where: {
      groupId_valueNormalized: {
        groupId: payload.groupId,
        valueNormalized,
      },
    },
  });
  if (existing) throw new Error("Ya existe una opción con ese value");

  const option = await prisma.variantOption.create({
    data: {
      groupId: payload.groupId,
      valueNormalized,
      label,
      sortOrder: payload.sortOrder ?? 0,
    },
  });
  revalidatePath("/host/catalog/variant-groups");
  revalidatePath(`/host/catalog/variant-groups/${payload.groupId}`);
  return option;
}

/** 5.6 Actualizar label/sortOrder de opción */
export async function updateVariantOptionLabelAction(payload: {
  optionId: string;
  label?: string;
  sortOrder?: number;
}) {
  const tenantId = await getTenantIdOrThrow();
  const option = await prisma.variantOption.findFirst({
    where: { id: payload.optionId, group: { tenantId } },
    include: { group: true },
  });
  if (!option) throw new Error("Opción no encontrada");

  const data: { label?: string; sortOrder?: number } = {};
  if (payload.label !== undefined) data.label = payload.label.trim();
  if (payload.sortOrder !== undefined) data.sortOrder = payload.sortOrder;

  return prisma.variantOption.update({
    where: { id: payload.optionId },
    data,
  });
}

/** 5.7 Archivar opción */
export async function archiveVariantOptionAction(payload: { optionId: string }) {
  const tenantId = await getTenantIdOrThrow();
  const option = await prisma.variantOption.findFirst({
    where: { id: payload.optionId, group: { tenantId } },
    include: { group: true },
  });
  if (!option) throw new Error("Opción no encontrada");

  return prisma.variantOption.update({
    where: { id: payload.optionId },
    data: { isArchived: true },
  });
}

/** Asociar grupo a ítem por groupKey (para backfill desde plantilla) */
export async function attachVariantGroupToItemByKeyAction(payload: {
  itemId: string;
  groupKey: string;
  required?: boolean;
  sortOrder?: number;
}) {
  const tenantId = await getTenantIdOrThrow();
  const group = await prisma.variantGroup.findUnique({
    where: {
      tenantId_key: { tenantId: tenantId, key: payload.groupKey },
    },
  });
  if (!group) return null;

  const item = await prisma.inventoryItem.findFirst({
    where: { id: payload.itemId, tenantId },
  });
  if (!item) return null;

  return prisma.inventoryItemVariantGroup.upsert({
    where: {
      itemId_groupId: { itemId: payload.itemId, groupId: group.id },
    },
    create: {
      itemId: payload.itemId,
      groupId: group.id,
      required: payload.required ?? false,
      sortOrder: payload.sortOrder ?? 0,
      isActive: true,
    },
    update: { isActive: true },
  });
}

/** 5.8 Asociar grupo a ítem */
export async function attachVariantGroupToItemAction(payload: {
  itemId: string;
  groupId: string;
  required?: boolean;
  sortOrder?: number;
}) {
  const tenantId = await getTenantIdOrThrow();
  const [item, group] = await Promise.all([
    prisma.inventoryItem.findFirst({ where: { id: payload.itemId, tenantId } }),
    prisma.variantGroup.findFirst({ where: { id: payload.groupId, tenantId } }),
  ]);
  if (!item) throw new Error("Ítem no encontrado");
  if (!group) throw new Error("Grupo no encontrado");

  const link = await prisma.inventoryItemVariantGroup.upsert({
    where: {
      itemId_groupId: { itemId: payload.itemId, groupId: payload.groupId },
    },
    create: {
      itemId: payload.itemId,
      groupId: payload.groupId,
      required: payload.required ?? false,
      sortOrder: payload.sortOrder ?? 0,
      isActive: true,
    },
    update: {
      isActive: true,
      required: payload.required ?? false,
      sortOrder: payload.sortOrder ?? 0,
    },
  });
  revalidatePath("/host/properties");
  revalidatePath("/host/catalog/variant-groups");
  return link;
}

/** 5.9 Desasociar grupo de ítem */
export async function detachVariantGroupFromItemAction(payload: {
  itemId: string;
  groupId: string;
}) {
  const tenantId = await getTenantIdOrThrow();
  const item = await prisma.inventoryItem.findFirst({
    where: { id: payload.itemId, tenantId },
  });
  if (!item) throw new Error("Ítem no encontrado");

  await prisma.inventoryItemVariantGroup.deleteMany({
    where: {
      itemId: payload.itemId,
      groupId: payload.groupId,
    },
  });
  revalidatePath("/host/properties");
  revalidatePath("/host/catalog/variant-groups");
}

/** 5.10 Toggle isActive en asociación */
export async function setItemVariantGroupActiveAction(payload: {
  itemId: string;
  groupId: string;
  isActive: boolean;
}) {
  const tenantId = await getTenantIdOrThrow();
  const item = await prisma.inventoryItem.findFirst({
    where: { id: payload.itemId, tenantId },
  });
  if (!item) throw new Error("Ítem no encontrado");

  const link = await prisma.inventoryItemVariantGroup.findUnique({
    where: {
      itemId_groupId: { itemId: payload.itemId, groupId: payload.groupId },
    },
  });
  if (!link) return null;

  return prisma.inventoryItemVariantGroup.update({
    where: { id: link.id },
    data: { isActive: payload.isActive },
  });
}

/** Listar grupos asociados a un ítem */
export async function listItemVariantGroupsAction(itemId: string) {
  const tenantId = await getTenantIdOrThrow();
  const item = await prisma.inventoryItem.findFirst({
    where: { id: itemId, tenantId },
    include: {
      variantGroupLinks: {
        include: { group: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!item) return [];
  return item.variantGroupLinks;
}

/** Obtener un grupo por ID (para validación) */
export async function getVariantGroupAction(groupId: string) {
  const tenantId = await getTenantIdOrThrow();
  const group = await prisma.variantGroup.findFirst({
    where: { id: groupId, tenantId },
    include: {
      options: { where: { isArchived: false }, orderBy: [{ sortOrder: "asc" }] },
    },
  });
  if (!group) return null;
  return group;
}
