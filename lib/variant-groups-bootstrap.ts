/**
 * Bootstrap de grupos de variantes canónicos por tenant.
 * Asegura que bed_size, material y use existan con sus opciones.
 * Idempotente: crea solo lo que falta.
 *
 * Se usa en:
 * - Aplicar plantilla de inventario (cualquier tenant)
 * - Signup Host (nuevos tenants)
 * - API tenant/init
 */

import type { Prisma } from "@prisma/client";
import prisma from "./prisma";

const CANONICAL_GROUPS = [
  {
    key: "bed_size",
    label: "Tamaño de cama",
    options: [
      { label: "Individual", valueNormalized: "individual", sortOrder: 10 },
      { label: "Matrimonial", valueNormalized: "matrimonial", sortOrder: 20 },
      { label: "Queen", valueNormalized: "queen", sortOrder: 30 },
      { label: "King", valueNormalized: "king", sortOrder: 40 },
    ],
  },
  {
    key: "material",
    label: "Material",
    options: [
      { label: "Barro", valueNormalized: "barro", sortOrder: 10 },
      { label: "Cantera", valueNormalized: "cantera", sortOrder: 20 },
      { label: "Cerámica", valueNormalized: "ceramica", sortOrder: 30 },
      { label: "MDF", valueNormalized: "mdf", sortOrder: 40 },
      { label: "Madera", valueNormalized: "madera", sortOrder: 50 },
      { label: "Metal", valueNormalized: "metal", sortOrder: 60 },
      { label: "Plástico", valueNormalized: "plastico", sortOrder: 70 },
      { label: "Tela", valueNormalized: "tela", sortOrder: 80 },
      { label: "Vidrio", valueNormalized: "vidrio", sortOrder: 90 },
    ],
  },
  {
    key: "use",
    label: "Uso",
    options: [
      { label: "Limpiar", valueNormalized: "limpiar", sortOrder: 10 },
      { label: "Secar", valueNormalized: "secar", sortOrder: 20 },
    ],
  },
] as const;

type DbClient = typeof prisma | Prisma.TransactionClient;

/**
 * Asegura que los grupos canónicos (bed_size, material, use) existan para el tenant.
 * Idempotente: crea solo lo que falta.
 * @param tenantId - ID del tenant
 * @param db - Cliente Prisma (prisma o tx dentro de transacción). Si se omite, usa prisma global.
 */
export async function ensureCanonicalVariantGroupsForTenant(
  tenantId: string,
  db?: DbClient
): Promise<void> {
  const client = db ?? prisma;

  for (const groupDef of CANONICAL_GROUPS) {
    let group = await client.variantGroup.findUnique({
      where: { tenantId_key: { tenantId, key: groupDef.key } },
    });

    if (!group) {
      group = await client.variantGroup.create({
        data: {
          tenantId,
          key: groupDef.key,
          label: groupDef.label,
        },
      });
    } else {
      await client.variantGroup.update({
        where: { id: group.id },
        data: { label: groupDef.label },
      });
    }

    for (const opt of groupDef.options) {
      const existing = await client.variantOption.findUnique({
        where: {
          groupId_valueNormalized: { groupId: group.id, valueNormalized: opt.valueNormalized },
        },
      });

      if (!existing) {
        await client.variantOption.create({
          data: {
            groupId: group.id,
            valueNormalized: opt.valueNormalized,
            label: opt.label,
            sortOrder: opt.sortOrder,
            isArchived: false,
          },
        });
      }
    }
  }
}
