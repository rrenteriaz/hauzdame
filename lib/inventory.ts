// lib/inventory.ts
import prisma from "@/lib/prisma";
import { InventoryCategory, InventoryCondition, InventoryPriority, Prisma } from "@prisma/client";
import { normalizeName, normalizeVariantValue } from "./inventory-normalize";

export interface InventoryLineWithItem {
  id: string;
  area: string;
  expectedQty: number;
  condition: InventoryCondition;
  priority: InventoryPriority;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  color: string | null;
  size: string | null;
  notes: string | null;
  variantKey: string | null;
  variantValue: string | null;
  variantValueNormalized: string | null;
  createdAt: Date;
  updatedAt: Date;
  item: {
    id: string;
    category: InventoryCategory;
    name: string;
    defaultBrand: string | null;
    defaultModel: string | null;
    defaultColor: string | null;
    defaultSize: string | null;
    defaultVariantKey: string | null;
  };
}

/**
 * Lista el inventario de una propiedad con filtros y paginación.
 */
export async function listInventoryByProperty(
  tenantId: string,
  propertyId: string,
  options?: {
    search?: string;
    area?: string;
    category?: InventoryCategory;
    priority?: InventoryPriority;
    page?: number;
    pageSize?: number;
  }
): Promise<{
  lines: InventoryLineWithItem[];
  total: number;
  hasMore: boolean;
}> {
  const page = options?.page || 1;
  const pageSize = options?.pageSize || 50;
  const skip = (page - 1) * pageSize;

  // Construir where clause - solo líneas activas
  const where: Prisma.InventoryLineWhereInput = {
    tenantId,
    propertyId,
    isActive: true, // Solo líneas activas
  };

  if (options?.area) {
    where.areaNormalized = normalizeName(options.area);
  }

  if (options?.category) {
    where.item = {
      category: options.category,
    };
  }

  if (options?.priority) {
    where.priority = options.priority;
  }

  if (options?.search) {
    const searchNormalized = normalizeName(options.search);
    where.OR = [
      { areaNormalized: { contains: searchNormalized } },
      { item: { nameNormalized: { contains: searchNormalized } } },
      { item: { name: { contains: options.search, mode: "insensitive" } } },
      { variantValueNormalized: { contains: searchNormalized } },
    ];
  }

  const [lines, total] = await Promise.all([
    prisma.inventoryLine.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            category: true,
            name: true,
            defaultBrand: true,
            defaultModel: true,
            defaultColor: true,
            defaultSize: true,
            defaultVariantKey: true,
          },
        },
      },
      orderBy: [
        { area: "asc" },
        { item: { name: "asc" } },
      ],
      skip,
      take: pageSize + 1, // +1 para saber si hay más
    }),
    prisma.inventoryLine.count({ where }),
  ]);

  const hasMore = lines.length > pageSize;
  const paginatedLines = hasMore ? lines.slice(0, pageSize) : lines;

  return {
    lines: paginatedLines,
    total,
    hasMore,
  };
}

/**
 * Lista items del catálogo por categoría para sugerencias.
 */
export async function listInventoryCatalogByCategory(
  tenantId: string,
  category: InventoryCategory,
  limit: number = 200,
  includeArchived: boolean = false
): Promise<Array<{ 
  id: string; 
  name: string; 
  defaultVariantKey: string | null;
  defaultVariantLabel: string | null;
  defaultVariantOptions: any;
}>> {
  // Catálogo derivado: solo items activos (archivedAt: null) 
  // que tengan al menos 1 InventoryLine activa (isActive: true)
  const items = await prisma.inventoryItem.findMany({
    where: {
      tenantId,
      category,
      archivedAt: includeArchived ? undefined : null, // Solo activos por defecto
      inventoryLines: {
        some: {
          isActive: true, // Al menos una línea activa
        },
      },
    },
    select: {
      id: true,
      name: true,
      defaultVariantKey: true,
      defaultVariantLabel: true,
      defaultVariantOptions: true,
    },
    orderBy: {
      name: "asc",
    },
    take: limit,
  });

  return items;
}

/**
 * Lista líneas hermanas (siblings) para un mismo (propertyId, areaNormalized, itemId).
 * Usado en el editor de inventario para mostrar variantes existentes.
 */
export async function listInventorySiblings(
  tenantId: string,
  propertyId: string,
  areaNormalized: string,
  itemId: string
): Promise<
  Array<{
    id: string;
    expectedQty: number;
    variantKey: string | null;
    variantValue: string | null;
    variantValueNormalized: string | null;
    isActive: boolean;
  }>
> {
  const lines = await prisma.inventoryLine.findMany({
    where: {
      tenantId,
      propertyId,
      areaNormalized,
      itemId,
      isActive: true,
    },
    select: {
      id: true,
      expectedQty: true,
      variantKey: true,
      variantValue: true,
      variantValueNormalized: true,
      isActive: true,
    },
    orderBy: [{ variantValueNormalized: "asc" }],
  });

  const withNull = lines.filter((l) => l.variantValueNormalized == null);
  const withValue = lines.filter((l) => l.variantValueNormalized != null);
  withValue.sort((a, b) =>
    (a.variantValueNormalized ?? "").localeCompare(b.variantValueNormalized ?? "")
  );
  return [...withValue, ...withNull];
}

/**
 * Busca items en el catálogo por nombre (búsqueda global, todas las categorías).
 * Útil para el nuevo flujo de creación sin categoría.
 */
export async function searchInventoryCatalog(
  tenantId: string,
  searchTerm: string,
  limit: number = 50
): Promise<Array<{
  id: string;
  name: string;
  category: InventoryCategory;
  defaultVariantKey: string | null;
  defaultVariantLabel: string | null;
  defaultVariantOptions: any;
}>> {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return [];
  }

  // Normalizar el término de búsqueda (eliminar acentos)
  const normalizedSearch = normalizeName(searchTerm.trim());

  // Estrategia: obtener candidatos de la BD y filtrar en Node
  // Opción A: Si el término es >= 3 caracteres, usar prefijo corto para optimizar la query
  // Opción B: Si el término es < 3 caracteres, traer más resultados y filtrar en Node
  
  let candidates;
  
  if (normalizedSearch.length >= 3) {
    // Usar prefijo corto (primeros 4 caracteres) para obtener candidatos amplios
    const dbPrefix = normalizedSearch.slice(0, 4);
    
    candidates = await prisma.inventoryItem.findMany({
      where: {
        tenantId,
        archivedAt: null, // Solo activos
        nameNormalized: {
          contains: dbPrefix,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        name: true,
        category: true,
        defaultVariantKey: true,
        defaultVariantLabel: true,
        defaultVariantOptions: true,
      },
      take: 200, // Obtener más candidatos para filtrar después
    });
  } else {
    // Para términos muy cortos, traer más resultados sin filtro de BD
    candidates = await prisma.inventoryItem.findMany({
      where: {
        tenantId,
        archivedAt: null, // Solo activos
      },
      select: {
        id: true,
        name: true,
        category: true,
        defaultVariantKey: true,
        defaultVariantLabel: true,
        defaultVariantOptions: true,
      },
      take: 500, // Límite razonable para filtrar en Node
    });
  }

  // Filtrar en Node usando normalización sin acentos en ambos lados
  const filtered = candidates.filter(item => {
    const itemKey = normalizeName(item.name);
    return itemKey.includes(normalizedSearch);
  });

  // Ordenar alfabéticamente respetando casing exacto
  const sorted = filtered.sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" })
  );

  // Limitar resultados finales
  return sorted.slice(0, limit);
}

/**
 * Busca items en el Catálogo Global por nombre (para autocomplete).
 * Fuente primaria para el modal "Agregar ítem" Step 1.
 */
export async function searchGlobalCatalogItems(
  searchTerm: string,
  locale: string = "es-MX",
  limit: number = 20
): Promise<Array<{
  id: string;
  name: string;
  nameNormalized: string;
  defaultCategory: string | null;
}>> {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return [];
  }

  // Normalizar el término de búsqueda (eliminar acentos)
  const normalizedSearch = normalizeName(searchTerm.trim());

  // Query optimizada: usar contains con prefijo si es >= 3 caracteres
  const where: any = {
    locale,
    isActive: true,
  };

  if (normalizedSearch.length >= 3) {
    // Usar prefijo corto para optimizar la query
    const dbPrefix = normalizedSearch.slice(0, 4);
    where.nameNormalized = {
      contains: dbPrefix,
      mode: "insensitive",
    };
  }

  const candidates = await (prisma as any).globalCatalogItem.findMany({
    where,
    select: {
      id: true,
      name: true,
      nameNormalized: true,
      defaultCategory: true,
    },
    orderBy: {
      name: "asc",
    },
    take: normalizedSearch.length >= 3 ? 200 : 500, // Más candidatos para filtrar después
  });

  // Filtrar en Node usando normalización sin acentos
  const filtered = candidates.filter((item: { nameNormalized: string }) => {
    return item.nameNormalized.includes(normalizedSearch);
  });

  // Ordenar alfabéticamente
  const sorted = filtered.sort((a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" })
  );

  // Limitar resultados finales
  return sorted.slice(0, limit);
}

/**
 * Asegura que existe un InventoryItem del tenant basado en un GlobalCatalogItem.
 * Lazy copy: busca primero, crea solo si no existe.
 * Idempotente por (tenantId, nameNormalized).
 */
export async function ensureTenantCatalogItemFromGlobal(
  tenantId: string,
  globalCatalogItemId: string
): Promise<{ id: string; isNew: boolean }> {
  // Leer el GlobalCatalogItem
  const globalItem = await (prisma as any).globalCatalogItem.findUnique({
    where: { id: globalCatalogItemId },
    select: {
      id: true,
      name: true,
      nameNormalized: true,
      defaultCategory: true,
    },
  });

  if (!globalItem) {
    throw new Error(`GlobalCatalogItem con id ${globalCatalogItemId} no encontrado`);
  }

  // Buscar InventoryItem existente por tenantId + nameNormalized + archivedAt null
  // IMPORTANTE: El constraint único es (tenantId, nameNormalized) sin considerar archivedAt
  // Por lo tanto, si existe un item archivado, no podemos crear uno nuevo
  // En ese caso, debemos reactivarlo o retornar el existente
  const existingItem = await prisma.inventoryItem.findFirst({
    where: {
      tenantId,
      nameNormalized: globalItem.nameNormalized,
      archivedAt: null, // Solo activos
    },
    select: {
      id: true,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }], // Determinístico
  });

  if (existingItem) {
    return { id: existingItem.id, isNew: false };
  }

  // Importar capitalizeFirst antes de usarlo
  const { capitalizeFirst } = await import("@/lib/inventory-normalize");
  const itemNameCapitalized = capitalizeFirst(globalItem.name.trim());

  // Verificar si existe un item archivado (el constraint único no permite crear otro)
  // El constraint único es (tenantId, nameNormalized) sin considerar archivedAt
  const archivedItem = await prisma.inventoryItem.findFirst({
    where: {
      tenantId,
      nameNormalized: globalItem.nameNormalized,
      archivedAt: { not: null }, // Solo archivados
    },
    select: {
      id: true,
      archivedAt: true,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  if (archivedItem) {
    // Reactivar el item archivado en lugar de crear uno nuevo
    console.log(`[ensureTenantCatalogItemFromGlobal] Reactivando item archivado: ${archivedItem.id}`);
    const reactivatedItem = await prisma.inventoryItem.update({
      where: { id: archivedItem.id },
      data: {
        archivedAt: null,
        // Actualizar nombre y categoría por si cambiaron en el CG
        name: itemNameCapitalized,
        category: (globalItem.defaultCategory as InventoryCategory) || InventoryCategory.OTHER,
      },
      select: {
        id: true,
      },
    });
    return { id: reactivatedItem.id, isNew: false };
  }

  try {
    const newItem = await prisma.inventoryItem.create({
      data: {
        tenantId,
        category: (globalItem.defaultCategory as InventoryCategory) || InventoryCategory.OTHER,
        name: itemNameCapitalized,
        nameNormalized: globalItem.nameNormalized,
        archivedAt: null,
      },
      select: {
        id: true,
      },
    });

    return { id: newItem.id, isNew: true };
  } catch (error: any) {
    // Manejar race condition: si otro request creó el item entre la búsqueda y el create
    if (error?.code === "P2002") {
      console.log(`[ensureTenantCatalogItemFromGlobal] P2002 detectado, buscando item existente...`);
      // Buscar nuevamente (puede ser activo o archivado)
      const raceConditionItem = await prisma.inventoryItem.findFirst({
        where: {
          tenantId,
          nameNormalized: globalItem.nameNormalized,
        },
        select: {
          id: true,
          archivedAt: true,
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });

      if (raceConditionItem) {
        // Si está archivado, reactivarlo
        if (raceConditionItem.archivedAt) {
          console.log(`[ensureTenantCatalogItemFromGlobal] Reactivando item de race condition: ${raceConditionItem.id}`);
          const reactivated = await prisma.inventoryItem.update({
            where: { id: raceConditionItem.id },
            data: {
              archivedAt: null,
              name: itemNameCapitalized,
              category: (globalItem.defaultCategory as InventoryCategory) || InventoryCategory.OTHER,
            },
            select: {
              id: true,
            },
          });
          return { id: reactivated.id, isNew: false };
        }
        // Si está activo, retornarlo
        return { id: raceConditionItem.id, isNew: false };
      }
      
      // Si no se encontró después de P2002, es un error inesperado
      console.error(`[ensureTenantCatalogItemFromGlobal] P2002 pero no se encontró item existente para ${globalItem.nameNormalized}`);
    }
    throw error;
  }
}

/**
 * Obtiene items frecuentes del catálogo (para mostrar cuando no hay búsqueda).
 * Retorna items de todas las categorías que tienen más líneas activas.
 */
export async function getFrequentInventoryItems(
  tenantId: string,
  limit: number = 20
): Promise<Array<{
  id: string;
  name: string;
  category: InventoryCategory;
  defaultVariantKey: string | null;
  defaultVariantLabel: string | null;
  defaultVariantOptions: any;
  lineCount: number; // Número de líneas activas (para ordenar)
}>> {
  // Obtener items con más líneas activas
  const items = await prisma.inventoryItem.findMany({
    where: {
      tenantId,
      archivedAt: null,
      inventoryLines: {
        some: {
          isActive: true,
        },
      },
    },
    select: {
      id: true,
      name: true,
      category: true,
      defaultVariantKey: true,
      defaultVariantLabel: true,
      defaultVariantOptions: true,
      inventoryLines: {
        where: {
          isActive: true,
        },
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
    take: limit * 2, // Obtener más para luego ordenar por frecuencia
  });

  // Ordenar por número de líneas activas (más frecuentes primero)
  const itemsWithCount = items
    .map((item) => ({
      ...item,
      lineCount: item.inventoryLines.length,
    }))
    .sort((a, b) => b.lineCount - a.lineCount)
    .slice(0, limit)
    .map(({ inventoryLines, ...item }) => item);

  return itemsWithCount;
}

/**
 * Verifica si ya existe una línea de inventario con el mismo item en la misma área.
 * Retorna información sobre el duplicado si existe.
 */
export async function checkDuplicateInventoryLine(
  tenantId: string,
  propertyId: string,
  data: {
    area: string;
    itemId: string;
    variantKey?: string | null;
    variantValue?: string | null;
  }
): Promise<{
  exists: boolean;
  lineId?: string;
  itemName?: string;
  quantity?: number;
  variantText?: string;
} | null> {
  const { normalizeName, normalizeVariantValue } = await import("./inventory-normalize");
  
  const areaNormalized = normalizeName(data.area);
  const variantValueNormalized = data.variantValue
    ? normalizeVariantValue(data.variantValue)
    : null;

  const existingLine = await prisma.inventoryLine.findFirst({
    where: {
      tenantId,
      propertyId,
      areaNormalized,
      itemId: data.itemId,
      variantKey: data.variantKey || null,
      variantValueNormalized: variantValueNormalized || null,
      isActive: true,
    },
    include: {
      item: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!existingLine) {
    return { exists: false };
  }

  const variantText = variantValueNormalized
    ? ` (${variantValueNormalized})`
    : "";

  return {
    exists: true,
    lineId: existingLine.id,
    itemName: existingLine.item.name,
    quantity: existingLine.expectedQty,
    variantText,
  };
}

/**
 * Crea una línea de inventario. Si el item no existe, lo crea primero.
 * Usa normalización para evitar duplicados semánticos.
 * 
 * @throws Error si ya existe una línea con el mismo item en la misma área (a menos que allowDuplicate sea true)
 */
export async function createInventoryLine(
  tenantId: string,
  propertyId: string,
  data: {
    area: string;
    itemId?: string; // Si no existe, se crea el item
    itemName?: string; // Nombre del item si se crea nuevo
    category: InventoryCategory;
    expectedQty: number;
    condition?: InventoryCondition;
    priority?: InventoryPriority;
    brand?: string | null;
    model?: string | null;
    serialNumber?: string | null;
    color?: string | null;
    size?: string | null;
    notes?: string | null;
    variantKey?: string | null;
    variantValue?: string | null;
    defaultVariantKey?: string | null; // Para setear en InventoryItem si se crea nuevo
    allowDuplicate?: boolean; // Si es true, permite crear duplicados sin lanzar error
  }
): Promise<{ id: string; isNewItem: boolean; itemId: string }> {
  return await prisma.$transaction(async (tx) => {
    let itemId = data.itemId;
    let isNewItem = false;

    // Si no hay itemId, buscar o crear el item usando normalización
    if (!itemId && data.itemName) {
      const nameNormalized = normalizeName(data.itemName);
      
      // Buscar item existente por nombre normalizado (category is classification, not identity - CATALOG_ITEMS_V1)
      // Usar findFirst con ordenamiento determinístico (más robusto hasta que se ejecute la migración)
      // Si existe, reutilizar SIEMPRE independientemente de la categoría solicitada
      const existingItem = await tx.inventoryItem.findFirst({
        where: {
          tenantId,
          nameNormalized,
        },
        select: {
          id: true,
          archivedAt: true,
          category: true, // Necesario para logging/debugging
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }], // Determinístico: más antiguo primero
      });

      if (existingItem) {
        itemId = existingItem.id;
        // Si el item estaba archivado, restaurarlo (archivedAt: null)
        if (existingItem.archivedAt) {
          await tx.inventoryItem.update({
            where: { id: itemId },
            data: { archivedAt: null },
          });
          console.log("[createInventoryLine] Item restaurado de archivo:", itemId);
        }
        // NOTA: Se conserva la categoría original del item existente (CATALOG_ITEMS_V1 §4.3)
        // La categoría solicitada (data.category) se ignora al reutilizar
      } else {
        // Crear nuevo item con la categoría solicitada
        // El manejo de race conditions se hace con try/catch de P2002 a nivel superior
        const { capitalizeFirst } = await import("@/lib/inventory-normalize");
        const itemNameCapitalized = capitalizeFirst(data.itemName.trim()); // Capitalizar primera letra para consistencia visual
        const item = await tx.inventoryItem.create({
          data: {
            tenantId,
            category: data.category,
            name: itemNameCapitalized, // Capitalizar primera letra para consistencia visual
            nameNormalized, // nameNormalized sin capitalizar (normalización canónica)
            defaultVariantKey: data.defaultVariantKey ?? null,
            archivedAt: null, // Asegurar que esté activo
          },
        });
        itemId = item.id;
        isNewItem = true;
      }
    }

    if (!itemId) {
      throw new Error("Se requiere itemId o itemName");
    }

    // Normalizar área
    const areaNormalized = normalizeName(data.area);

    // Normalizar variante si existe
    const variantValueNormalized = data.variantValue
      ? normalizeVariantValue(data.variantValue)
      : null;
    const variantKey = data.variantKey || null;

    // Validar: si hay variantKey, debe haber variantValue
    if (variantKey && !variantValueNormalized) {
      throw new Error("Si se especifica una variante, debe tener un valor");
    }

    // NOTA: Duplicados permitidos por diseño.
    // Se permite crear múltiples líneas del mismo item en la misma área,
    // incluso con la misma variante, para soportar marcas/series distintas.
    // Sin embargo, el constraint único en la BD puede bloquear esto.
    // Buscar línea existente ANTES de crear para evitar error P2002 que aborta la transacción.

    // Buscar línea existente (activa o inactiva) ANTES de intentar crear
    const existingLine = await tx.inventoryLine.findFirst({
      where: {
        tenantId,
        propertyId,
        areaNormalized,
        itemId,
        variantKey: variantKey || null,
        variantValueNormalized: variantValueNormalized || null,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (existingLine) {
      // Si la línea está inactiva, reactivarla y actualizarla con los nuevos datos
      if (!existingLine.isActive) {
        console.log(
          `[createInventoryLine] Línea inactiva encontrada, reactivando y actualizando: ${existingLine.id}`
        );
        const reactivatedLine = await tx.inventoryLine.update({
          where: { id: existingLine.id },
          data: {
            area: data.area.trim(), // Actualizar área (puede haber cambiado)
            expectedQty: data.expectedQty,
            condition: data.condition || InventoryCondition.USED_LT_1Y,
            priority: data.priority ?? InventoryPriority.MEDIUM,
            brand: data.brand ?? null,
            model: data.model ?? null,
            serialNumber: data.serialNumber ?? null,
            color: data.color ?? null,
            size: data.size ?? null,
            notes: data.notes ?? null,
            variantValue: data.variantValue || null,
            isActive: true, // Reactivar
          },
        });
        return { id: reactivatedLine.id, isNewItem, itemId };
      }

      // Si la línea está activa y allowDuplicate es true, retornarla
      if (data.allowDuplicate) {
        console.log(
          `[createInventoryLine] Duplicado permitido: retornando línea existente ${existingLine.id}`
        );
        return { id: existingLine.id, isNewItem, itemId };
      }

      // Si la línea está activa y allowDuplicate es false, lanzar error
      const variantText = variantValueNormalized
        ? ` con variante ${data.variantValue || variantValueNormalized}`
        : "";
      throw new Error(
        `Ya existe una línea de inventario activa para este ítem en el área "${data.area}"${variantText}. ` +
        `El constraint único de la base de datos no permite duplicados exactos. ` +
        `Si necesitas crear una línea duplicada, considera agregar información distintiva (marca, modelo, notas, etc.).`
      );
    }

    // No existe línea con estos valores únicos, crear nueva
    // Manejar race condition: si dos requests simultáneos intentan crear la misma línea
    try {
      const line = await tx.inventoryLine.create({
        data: {
          tenantId,
          propertyId,
          area: data.area.trim(), // Mantener original con trim
          areaNormalized,
          itemId,
          expectedQty: data.expectedQty,
          condition: data.condition || InventoryCondition.USED_LT_1Y,
          priority: data.priority ?? InventoryPriority.MEDIUM, // Usar ?? para respetar undefined explícito
          brand: data.brand ?? null,
          model: data.model ?? null,
          serialNumber: data.serialNumber ?? null,
          color: data.color ?? null,
          size: data.size ?? null,
          notes: data.notes ?? null,
          variantKey: variantKey || null,
          variantValue: data.variantValue || null,
          variantValueNormalized: variantValueNormalized || null,
          isActive: true, // Nueva línea siempre activa
        },
      });

      return { id: line.id, isNewItem, itemId };
    } catch (createError: any) {
      // Manejar race condition: si otro request creó la línea entre la búsqueda y el create
      if (createError?.code === "P2002") {
        // Buscar la línea que se creó en el otro request
        const raceConditionLine = await tx.inventoryLine.findFirst({
          where: {
            tenantId,
            propertyId,
            areaNormalized,
            itemId,
            variantKey: variantKey || null,
            variantValueNormalized: variantValueNormalized || null,
          },
          select: {
            id: true,
            isActive: true,
          },
        });

        if (raceConditionLine) {
          // Si está inactiva, reactivarla (raro pero posible)
          if (!raceConditionLine.isActive) {
            const reactivatedLine = await tx.inventoryLine.update({
              where: { id: raceConditionLine.id },
              data: {
                area: data.area.trim(),
                expectedQty: data.expectedQty,
                condition: data.condition || InventoryCondition.USED_LT_1Y,
                priority: data.priority ?? InventoryPriority.MEDIUM,
                brand: data.brand ?? null,
                model: data.model ?? null,
                serialNumber: data.serialNumber ?? null,
                color: data.color ?? null,
                size: data.size ?? null,
                notes: data.notes ?? null,
                variantValue: data.variantValue || null,
                isActive: true,
              },
            });
            return { id: reactivatedLine.id, isNewItem, itemId };
          }

          // Si está activa y allowDuplicate es true, retornarla
          if (data.allowDuplicate) {
            return { id: raceConditionLine.id, isNewItem, itemId };
          }

          // Si está activa y allowDuplicate es false, lanzar error
          const variantText = variantValueNormalized
            ? ` con variante ${data.variantValue || variantValueNormalized}`
            : "";
          throw new Error(
            `Ya existe una línea de inventario activa para este ítem en el área "${data.area}"${variantText}. ` +
            `El constraint único de la base de datos no permite duplicados exactos. ` +
            `Si necesitas crear una línea duplicada, considera agregar información distintiva (marca, modelo, notas, etc.).`
          );
        }

        // Si no se encontró la línea (no debería pasar), lanzar error genérico
        const variantText = variantValueNormalized
          ? ` con variante ${data.variantValue || variantValueNormalized}`
          : "";
        throw new Error(
          `Ya existe una línea de inventario para este ítem en el área "${data.area}"${variantText}. ` +
          `El constraint único de la base de datos no permite duplicados exactos. ` +
          `Si necesitas crear una línea duplicada, considera agregar información distintiva (marca, modelo, notas, etc.).`
        );
      }
      throw createError;
    }
  });
}

/**
 * Obtiene una línea de inventario por ID.
 */
export async function getInventoryLineById(
  tenantId: string,
  lineId: string
): Promise<InventoryLineWithItem | null> {
  const line = await prisma.inventoryLine.findFirst({
    where: {
      id: lineId,
      tenantId,
    },
    include: {
      item: {
        select: {
          id: true,
          category: true,
          name: true,
          defaultBrand: true,
          defaultModel: true,
          defaultColor: true,
          defaultSize: true,
          defaultVariantKey: true,
        },
      },
    },
  });

  return line;
}

/**
 * Actualiza una línea de inventario.
 */
export async function updateInventoryLine(
  tenantId: string,
  lineId: string,
  data: {
    area?: string;
    expectedQty?: number;
    condition?: InventoryCondition;
    priority?: InventoryPriority;
    brand?: string | null;
    model?: string | null;
    serialNumber?: string | null;
    color?: string | null;
    size?: string | null;
    notes?: string | null;
    variantKey?: string | null;
    variantValue?: string | null;
    isActive?: boolean;
  }
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Verificar que la línea existe y pertenece al tenant
    const existingLine = await tx.inventoryLine.findFirst({
      where: {
        id: lineId,
        tenantId,
      },
    });

    if (!existingLine) {
      throw new Error("La línea de inventario no existe");
    }

    // Preparar datos de actualización
    const updateData: any = {};

    if (data.area !== undefined) {
      updateData.area = data.area.trim();
      updateData.areaNormalized = normalizeName(data.area);
    }

    if (data.expectedQty !== undefined) {
      updateData.expectedQty = data.expectedQty;
    }

    if (data.condition !== undefined) {
      updateData.condition = data.condition;
    }

    if (data.priority !== undefined) {
      updateData.priority = data.priority;
    }

    if (data.brand !== undefined) {
      updateData.brand = data.brand;
    }

    if (data.model !== undefined) {
      updateData.model = data.model;
    }

    if (data.serialNumber !== undefined) {
      updateData.serialNumber = data.serialNumber;
    }

    if (data.color !== undefined) {
      updateData.color = data.color;
    }

    if (data.size !== undefined) {
      updateData.size = data.size;
    }

    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    // Manejar variantes
    if (data.variantKey !== undefined || data.variantValue !== undefined) {
      const variantKey = data.variantKey || null;
      const variantValue = data.variantValue || null;
      const variantValueNormalized = variantValue
        ? normalizeVariantValue(variantValue)
        : null;

      // Validar: si hay variantKey, debe haber variantValue
      if (variantKey && !variantValueNormalized) {
        throw new Error("Si se especifica una variante, debe tener un valor");
      }

      updateData.variantKey = variantKey;
      updateData.variantValue = variantValue;
      updateData.variantValueNormalized = variantValueNormalized;

      // Si se guarda con variantKey="bed_size", limpiar size para evitar duplicidad visual
      if (variantKey === "bed_size") {
        updateData.size = null;
      }

      // Single-select por grupo: si la variante destino ya existe en otra línea, actualizar esa y desactivar la actual
      const existingTyped = existingLine as { variantKey?: string | null; variantValueNormalized?: string | null };
      const currentNormalized = existingTyped.variantValueNormalized ?? null;
      if (
        variantKey &&
        variantValueNormalized &&
        currentNormalized !== variantValueNormalized
      ) {
        const existingTargetLine = await tx.inventoryLine.findFirst({
          where: {
            tenantId,
            propertyId: existingLine.propertyId,
            areaNormalized: existingLine.areaNormalized,
            itemId: existingLine.itemId,
            variantKey,
            variantValueNormalized,
            id: { not: lineId },
          },
        });
        if (existingTargetLine) {
          await tx.inventoryLine.update({
            where: { id: existingTargetLine.id },
            data: { ...updateData, isActive: true },
          });
          await tx.inventoryLine.update({
            where: { id: lineId },
            data: { isActive: false },
          });
          return;
        }
      }
    }
    
    // NOTA: Duplicados permitidos por diseño. No se valida duplicidad al actualizar.

    // Actualizar la línea
    await tx.inventoryLine.update({
      where: {
        id: lineId,
      },
      data: updateData,
    });
  });
}

/**
 * Elimina una línea de inventario.
 */
export async function deleteInventoryLine(
  tenantId: string,
  lineId: string
): Promise<void> {
  // Obtener información de la línea antes de eliminarla (para auto-archivar el item si es necesario)
  const line = await prisma.inventoryLine.findUnique({
    where: {
      id: lineId,
      tenantId,
    },
    select: {
      id: true,
      itemId: true,
      isActive: true,
    },
  });

  if (!line) {
    throw new Error("La línea de inventario no existe o ya fue eliminada");
  }

  // Soft delete: marcar como inactiva en lugar de eliminar físicamente
  await prisma.inventoryLine.update({
    where: {
      id: lineId,
      tenantId,
    },
    data: {
      isActive: false,
    },
  });

  // Verificar si el item sigue en uso (tiene otras líneas activas)
  const remainingActiveLines = await prisma.inventoryLine.count({
    where: {
      itemId: line.itemId,
      tenantId,
      isActive: true, // Solo contar líneas activas
    },
  });

  console.log("[deleteInventoryLine] Líneas activas restantes para item:", {
    itemId: line.itemId,
    remainingActiveLines,
  });

  // Si no quedan líneas activas, archivar el item automáticamente
  if (remainingActiveLines === 0) {
    console.log("[deleteInventoryLine] Auto-archivando item:", line.itemId);
    await prisma.inventoryItem.update({
      where: {
        id: line.itemId,
        tenantId,
      },
      data: {
        archivedAt: new Date(),
      },
    });
    console.log("[deleteInventoryLine] Item archivado exitosamente");
  }
}

/**
 * Desactiva todas las líneas de inventario en un área para una propiedad.
 * Soft delete: marca isActive=false en todas las líneas del área.
 * Busca por area (exact) y por areaNormalized para soportar datos legacy inconsistentes.
 */
export async function deleteInventoryArea(
  tenantId: string,
  propertyId: string,
  area: string
): Promise<{ count: number }> {
  const areaTrimmed = area.trim();
  const areaClean = areaTrimmed.replace(/^"|"$/g, "").trim();
  if (!areaClean) {
    throw new Error("El área es obligatoria");
  }

  const areaNormalized = normalizeName(areaClean);

  const baseWhere = {
    tenantId,
    propertyId,
    isActive: true,
  };

  // Buscar por area exacta O por areaNormalized. Incluye areaTrimmed por si la BD tiene comillas literales.
  const result = await prisma.inventoryLine.updateMany({
    where: {
      ...baseWhere,
      OR: [{ area: areaTrimmed }, { area: areaClean }, { areaNormalized }],
    },
    data: {
      isActive: false,
    },
  });

  return { count: result.count };
}

/**
 * Actualiza un item del catálogo (InventoryItem).
 */
export async function updateInventoryItem(
  tenantId: string,
  itemId: string,
  data: {
    name?: string;
    defaultVariantKey?: string | null;
    defaultVariantLabel?: string | null;
    defaultVariantOptions?: any; // JSON array de opciones
  }
): Promise<void> {
  const updateData: Prisma.InventoryItemUpdateInput = {};

  if (data.name !== undefined) {
    const nameNormalized = normalizeName(data.name);
    updateData.name = data.name.trim();
    updateData.nameNormalized = nameNormalized;
  }

  if (data.defaultVariantKey !== undefined) {
    updateData.defaultVariantKey = data.defaultVariantKey || null;
  }

  if (data.defaultVariantLabel !== undefined) {
    updateData.defaultVariantLabel = data.defaultVariantLabel || null;
    console.log("[updateInventoryItem] Actualizando defaultVariantLabel:", data.defaultVariantLabel);
  }

  if (data.defaultVariantOptions !== undefined) {
    updateData.defaultVariantOptions = data.defaultVariantOptions || null;
    console.log("[updateInventoryItem] Actualizando defaultVariantOptions:", data.defaultVariantOptions);
  }
  
  console.log("[updateInventoryItem] Update data:", updateData);

  console.log("[updateInventoryItem] Actualizando item con data:", updateData);
  const updated = await prisma.inventoryItem.update({
    where: {
      id: itemId,
      tenantId, // Asegurar que pertenece al tenant
    },
    data: updateData,
  });
  console.log("[updateInventoryItem] Item actualizado:", updated);
}

/**
 * Elimina un item del catálogo (InventoryItem).
 * Solo se puede eliminar si no está siendo usado en ninguna línea de inventario.
 */
export async function deleteInventoryItem(
  tenantId: string,
  itemId: string
): Promise<void> {
  // Logging para diagnóstico
  console.log("[deleteInventoryItem] Iniciando eliminación:", {
    tenantId,
    itemId,
    timestamp: new Date().toISOString(),
  });

  // Obtener información del item antes de eliminar (para logging)
  const item = await prisma.inventoryItem.findUnique({
    where: {
      id: itemId,
      tenantId,
    },
    select: {
      id: true,
      name: true,
      category: true,
    },
  });

  if (!item) {
    console.log("[deleteInventoryItem] Item no encontrado:", { itemId, tenantId });
    throw new Error("El item no existe o ya fue eliminado");
  }

  console.log("[deleteInventoryItem] Item encontrado:", {
    id: item.id,
    name: item.name,
    category: item.category,
  });

  // Verificar si el item está archivado
  const itemWithArchive = await prisma.inventoryItem.findUnique({
    where: {
      id: itemId,
      tenantId,
    },
    select: {
      archivedAt: true,
    },
  });

  // Verificar si el item tiene líneas activas (solo isActive: true)
  const activeLineCount = await prisma.inventoryLine.count({
    where: {
      itemId,
      tenantId,
      isActive: true, // Solo contar líneas activas
    },
  });

  // Verificar total de líneas (activas + inactivas) para logging
  const totalLineCount = await prisma.inventoryLine.count({
    where: {
      itemId,
      tenantId,
    },
  });

  console.log("[deleteInventoryItem] Estado del item:", {
    itemId,
    itemName: item.name,
    archivedAt: itemWithArchive?.archivedAt,
    activeLineCount,
    totalLineCount,
  });

  // Hard delete solo permitido si:
  // 1. El item está archivado (archivedAt != null)
  // 2. Y no tiene líneas activas (activeLineCount === 0)
  if (activeLineCount > 0) {
    // Obtener contexto de uso para mensaje más útil
    const lines = await prisma.inventoryLine.findMany({
      where: {
        itemId,
        tenantId,
        isActive: true,
      },
      select: {
        id: true,
        propertyId: true,
        area: true,
        property: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 10,
    });

    console.log("[deleteInventoryItem] Bloqueado - Item en uso:", {
      activeLineCount,
      sampleLines: lines.length,
      itemName: item.name,
    });

    // Construir mensaje más accionable
    const propertiesCount = new Set(lines.map((l) => l.propertyId)).size;
    const areasCount = new Set(lines.map((l) => l.area)).size;
    
    let contextMessage = "";
    if (propertiesCount === 1 && areasCount <= 3) {
      // Si está en una sola propiedad y pocas áreas, dar más contexto
      const propertyName = lines[0]?.property?.name || "una propiedad";
      const areas = Array.from(new Set(lines.map((l) => l.area))).slice(0, 3);
      contextMessage = ` en ${propertyName}${areas.length > 0 ? ` (${areas.join(", ")})` : ""}`;
    } else if (propertiesCount > 1) {
      contextMessage = ` en ${propertiesCount} ${propertiesCount === 1 ? "propiedad" : "propiedades"}`;
    }

    throw new Error(
      `No se puede eliminar "${item.name}" porque está en uso en ${activeLineCount} ${activeLineCount === 1 ? "línea activa" : "líneas activas"} de inventario${contextMessage}. Elimina el item de esas líneas primero; se archivará automáticamente cuando no quede en uso.`
    );
  }

  // Si el item NO está archivado pero no tiene líneas activas, 
  // debería haberse archivado automáticamente. Permitir eliminación pero advertir.
  if (!itemWithArchive?.archivedAt && activeLineCount === 0) {
    console.warn("[deleteInventoryItem] Item no archivado pero sin líneas activas. Archivar primero...");
    // Archivar primero
    await prisma.inventoryItem.update({
      where: {
        id: itemId,
        tenantId,
      },
      data: {
        archivedAt: new Date(),
      },
    });
    console.log("[deleteInventoryItem] Item archivado antes de eliminación");
  }

  // Si el item está archivado y no tiene líneas activas, permitir hard delete
  if (itemWithArchive?.archivedAt && activeLineCount === 0) {
    console.log("[deleteInventoryItem] Item archivado y sin líneas activas. Procediendo con hard delete...");
  }

  // Ejecutar eliminación
  console.log("[deleteInventoryItem] Ejecutando DELETE...");
  await prisma.inventoryItem.delete({
    where: {
      id: itemId,
      tenantId,
    },
  });

  console.log("[deleteInventoryItem] DELETE exitoso:", {
    itemId,
    itemName: item.name,
    category: item.category,
  });
}

/**
 * Copia inventario de una propiedad a otra.
 * 
 * @param tenantId - ID del tenant
 * @param fromPropertyId - ID de la propiedad origen
 * @param toPropertyId - ID de la propiedad destino
 * @param copyQuantities - Si true, copia expectedQty del origen; si false, usa 0 para nuevas líneas
 * @param mode - "merge" (default) o "overwrite"
 * @returns Objeto con estadísticas de la copia
 */
export async function copyInventoryBetweenProperties({
  tenantId,
  fromPropertyId,
  toPropertyId,
  copyQuantities = true,
  mode = "merge",
}: {
  tenantId: string;
  fromPropertyId: string;
  toPropertyId: string;
  copyQuantities?: boolean;
  mode?: "merge" | "overwrite";
}): Promise<{
  created: number;
  updated: number;
  skipped: number;
  archivedInDestination?: number;
  examples: Array<{ area: string; itemName: string }>;
}> {
  console.log("[copyInventoryBetweenProperties] Iniciando copia:", {
    tenantId,
    fromPropertyId,
    toPropertyId,
    copyQuantities,
    mode,
    timestamp: new Date().toISOString(),
  });

  // Validar que las propiedades sean diferentes
  if (fromPropertyId === toPropertyId) {
    throw new Error("No se puede copiar inventario de una propiedad a sí misma");
  }

  return await prisma.$transaction(
    async (tx) => {
      // 1) Leer líneas activas del origen con información del item
      const sourceLines = await tx.inventoryLine.findMany({
        where: {
          tenantId,
          propertyId: fromPropertyId,
          isActive: true,
        },
        select: {
          id: true,
          area: true,
          areaNormalized: true,
          itemId: true,
          expectedQty: true,
          condition: true,
          priority: true,
          brand: true,
          model: true,
          serialNumber: true,
          color: true,
          size: true,
          notes: true,
          variantKey: true,
          variantValue: true,
          variantValueNormalized: true,
          item: {
            select: {
              name: true,
            },
          },
        },
      });

      console.log("[copyInventoryBetweenProperties] Líneas activas encontradas en origen:", sourceLines.length);

      let archivedInDestination: number | undefined = undefined;

      // 2) Si mode="overwrite": desactivar todas las líneas activas del destino
      if (mode === "overwrite") {
        const result = await tx.inventoryLine.updateMany({
          where: {
            tenantId,
            propertyId: toPropertyId,
            isActive: true,
          },
          data: {
            isActive: false,
          },
        });
        archivedInDestination = result.count;
        console.log("[copyInventoryBetweenProperties] Líneas desactivadas en destino (overwrite):", archivedInDestination);
      }

      // 2.5) Cargar todas las líneas activas del destino de una vez (optimización)
      const destinationLines = await tx.inventoryLine.findMany({
        where: {
          tenantId,
          propertyId: toPropertyId,
          isActive: true,
        },
        select: {
          id: true,
          areaNormalized: true,
          itemId: true,
          variantKey: true,
          variantValueNormalized: true,
        },
      });

      // Crear un mapa para búsqueda rápida: key = `${areaNormalized}|${itemId}|${variantKey}|${variantValueNormalized}`
      const destinationMap = new Map<string, { id: string }>();
      for (const destLine of destinationLines) {
        const key = `${destLine.areaNormalized}|${destLine.itemId}|${destLine.variantKey || null}|${destLine.variantValueNormalized || null}`;
        destinationMap.set(key, { id: destLine.id });
      }

      console.log("[copyInventoryBetweenProperties] Líneas activas encontradas en destino:", destinationLines.length);

      let created = 0;
      let updated = 0;
      let skipped = 0;
      const examples: Array<{ area: string; itemName: string }> = [];

      // 3) Procesar cada línea del origen
      for (const sourceLine of sourceLines) {
        // Buscar en el mapa en lugar de hacer query individual
        const key = `${sourceLine.areaNormalized}|${sourceLine.itemId}|${sourceLine.variantKey || null}|${sourceLine.variantValueNormalized || null}`;
        const existingLine = destinationMap.get(key);

      if (existingLine) {
        // Línea existe: actualizar si copyQuantities=true
        if (copyQuantities) {
          await tx.inventoryLine.update({
            where: {
              id: existingLine.id,
            },
            data: {
              expectedQty: sourceLine.expectedQty,
              // También copiar otros campos opcionales
              condition: sourceLine.condition,
              priority: sourceLine.priority,
              brand: sourceLine.brand,
              model: sourceLine.model,
              serialNumber: sourceLine.serialNumber,
              color: sourceLine.color,
              size: sourceLine.size,
              notes: sourceLine.notes,
            },
          });
          updated++;
          // Agregar ejemplo si aún no hay 10
          if (examples.length < 10) {
            examples.push({
              area: sourceLine.area,
              itemName: sourceLine.item.name,
            });
          }
        } else {
          // Si copyQuantities=false, no modificar la línea existente (skipped)
          skipped++;
          // Agregar ejemplo si aún no hay 10
          if (examples.length < 10) {
            examples.push({
              area: sourceLine.area,
              itemName: sourceLine.item.name,
            });
          }
        }
      } else {
        // Línea no existe: crear nueva
        await tx.inventoryLine.create({
          data: {
            tenantId,
            propertyId: toPropertyId,
            area: sourceLine.area,
            areaNormalized: sourceLine.areaNormalized,
            itemId: sourceLine.itemId,
            expectedQty: copyQuantities ? sourceLine.expectedQty : 0,
            condition: sourceLine.condition,
            priority: sourceLine.priority,
            brand: sourceLine.brand,
            model: sourceLine.model,
            serialNumber: sourceLine.serialNumber,
            color: sourceLine.color,
            size: sourceLine.size,
            notes: sourceLine.notes,
            variantKey: sourceLine.variantKey,
            variantValue: sourceLine.variantValue,
            variantValueNormalized: sourceLine.variantValueNormalized,
            isActive: true,
          },
        });
        created++;
        // Agregar ejemplo si aún no hay 10
        if (examples.length < 10) {
          examples.push({
            area: sourceLine.area,
            itemName: sourceLine.item.name,
          });
        }
      }
    }

    const stats = {
      created,
      updated,
      skipped,
      ...(archivedInDestination !== undefined && { archivedInDestination }),
      examples,
    };

    console.log("[copyInventoryBetweenProperties] Copia completada:", {
      ...stats,
      examplesCount: examples.length,
    });
    console.log("[copyInventoryBetweenProperties] Ejemplos:", examples);

    return stats;
    },
    {
      timeout: 30000, // 30 segundos de timeout para operaciones grandes
    }
  );
}

