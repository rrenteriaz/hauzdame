"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getDefaultTenant } from "@/lib/tenant";
import {
  createInventoryLine,
  updateInventoryLine,
  deleteInventoryLine,
  deleteInventoryArea,
  listInventoryCatalogByCategory,
  listInventorySiblings,
  getInventoryLineById,
  updateInventoryItem,
  deleteInventoryItem,
  copyInventoryBetweenProperties,
  checkDuplicateInventoryLine,
  searchInventoryCatalog,
  getFrequentInventoryItems,
  searchGlobalCatalogItems,
  ensureTenantCatalogItemFromGlobal,
} from "@/lib/inventory";
import { getInventoryItemImageThumbs } from "@/lib/media/getInventoryItemImageThumbs";
import {
  InventoryCategory,
  InventoryCondition,
  InventoryPriority,
} from "@prisma/client";
import {
  serializeDefaultVariantOptions,
  parseDefaultVariantOptions,
  parseDefaultVariantGroups,
  serializeDefaultVariantGroups,
  normalizeVariantKey,
  type VariantGroupData,
} from "@/lib/variant-group";

function redirectBack(formData: FormData) {
  const propertyId = formData.get("propertyId")?.toString();
  if (propertyId) {
    redirect(`/host/properties/${propertyId}/inventory`);
  }
  redirect("/host/properties");
}

export async function createInventoryLineAction(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    throw new Error("No se encontró el tenant");
  }

  const propertyId = formData.get("propertyId")?.toString();
  if (!propertyId) {
    throw new Error("No se encontró la propiedad");
  }

  // Validación y sanitización de campos requeridos
  const areaRaw = formData.get("area")?.toString() || "";
  const area = areaRaw.trim();
  
  if (!area || area.length === 0) {
    throw new Error("El área es obligatoria");
  }
  
  if (area.length > 80) {
    throw new Error("El área no puede tener más de 80 caracteres");
  }

  const category = formData.get("category")?.toString() as InventoryCategory | null;
  if (!category || !Object.values(InventoryCategory).includes(category)) {
    throw new Error("La categoría es obligatoria y debe ser válida");
  }

  const itemId = formData.get("itemId")?.toString() || null;
  const itemNameRaw = formData.get("itemName")?.toString() || "";
  const itemName = itemNameRaw.trim() || null;

  if (!itemId && !itemName) {
    throw new Error("Debes seleccionar un ítem o ingresar un nombre");
  }

  if (itemName && itemName.length === 0) {
    throw new Error("El nombre del ítem es obligatorio");
  }

  if (itemName && itemName.length > 120) {
    throw new Error("El nombre del ítem no puede tener más de 120 caracteres");
  }

  const expectedQtyStr = formData.get("expectedQty")?.toString();
  const expectedQty = expectedQtyStr ? parseInt(expectedQtyStr, 10) : 1;

  if (!expectedQty || isNaN(expectedQty) || expectedQty <= 0) {
    throw new Error("La cantidad debe ser mayor a 0");
  }

  // Variantes comerciales
  const variantKey = formData.get("variantKey")?.toString().trim() || null;
  const variantValue = formData.get("variantValue")?.toString().trim() || null;
  const defaultVariantKey = formData.get("defaultVariantKey")?.toString().trim() || null;

  // Validar: si hay variantKey, debe haber variantValue
  if (variantKey && !variantValue) {
    throw new Error("Si se especifica una variante, debe tener un valor");
  }

  // Campos opcionales avanzados
  const brand = formData.get("brand")?.toString().trim() || null;
  const model = formData.get("model")?.toString().trim() || null;
  const serialNumber = formData.get("serialNumber")?.toString().trim() || null;
  const color = formData.get("color")?.toString().trim() || null;
  const size = formData.get("size")?.toString().trim() || null;
  const notes = formData.get("notes")?.toString().trim() || null;
  
  // Validar y obtener condition
  const conditionRaw = formData.get("condition")?.toString();
  let condition: InventoryCondition = InventoryCondition.USED_LT_1Y; // Default
  if (conditionRaw && Object.values(InventoryCondition).includes(conditionRaw as InventoryCondition)) {
    condition = conditionRaw as InventoryCondition;
  }
  
  // Validar y obtener priority
  const priorityRaw = formData.get("priority")?.toString();
  let priority: InventoryPriority = InventoryPriority.MEDIUM; // Default
  if (priorityRaw && Object.values(InventoryPriority).includes(priorityRaw as InventoryPriority)) {
    priority = priorityRaw as InventoryPriority;
  }

  // Leer allowDuplicate del FormData
  const allowDuplicate = formData.get("allowDuplicate") === "true";
  console.log("[createInventoryLineAction] allowDuplicate:", allowDuplicate);

  try {
    const result = await createInventoryLine(tenant.id, propertyId, {
      area,
      category,
      itemId: itemId || undefined,
      itemName: itemName || undefined,
      expectedQty,
      condition,
      priority,
      brand,
      model,
      serialNumber,
      color,
      size,
      notes,
      variantKey: variantKey || undefined,
      variantValue: variantValue || undefined,
      defaultVariantKey: defaultVariantKey || undefined,
      allowDuplicate, // Pasar el flag
    });

    // Obtener el nombre del item para el modal de confirmación
    // result.itemId siempre debería existir porque createInventoryLine lo retorna
    const finalItemId = result.itemId;
    let finalItemName = itemName || null;
    
    // Si se usó itemId existente, obtener el nombre del item
    if (itemId && !finalItemName) {
      const item = await prisma.inventoryItem.findUnique({
        where: { id: itemId },
        select: { name: true },
      });
      if (item) {
        finalItemName = item.name;
      }
    }
    
    // Si aún no tenemos nombre y tenemos itemId, obtenerlo de la BD
    if (finalItemId && !finalItemName) {
      const item = await prisma.inventoryItem.findUnique({
        where: { id: finalItemId },
        select: { name: true },
      });
      if (item) {
        finalItemName = item.name;
      }
    }

    console.log("[createInventoryLineAction] Retornando:", { itemId: finalItemId, itemName: finalItemName });

    revalidatePath(`/host/properties/${propertyId}/inventory`);
    
    // Retornar itemId y nombre para el modal de confirmación
    return {
      itemId: finalItemId,
      itemName: finalItemName,
    };
  } catch (error: any) {
    console.error("[createInventoryLineAction] Error:", error);
    // Re-lanzar errores de validación y duplicados con mensajes amigables
    if (error?.message) {
      throw error;
    }
    throw new Error("Ocurrió un error al crear el item. Por favor, intenta de nuevo.");
  }
}

/**
 * Verifica si ya existe un item duplicado antes de crear.
 * Si no hay itemId pero hay itemName, busca el item primero por nombre normalizado.
 */
export async function checkDuplicateInventoryLineAction(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    return { exists: false };
  }

  const propertyId = formData.get("propertyId")?.toString();
  if (!propertyId) {
    return { exists: false };
  }

  const areaRaw = formData.get("area")?.toString() || "";
  const area = areaRaw.trim();
  
  if (!area || area.length === 0) {
    return { exists: false };
  }

  let itemId = formData.get("itemId")?.toString() || null;
  
  // Si no hay itemId pero hay itemName, buscar el item por nombre normalizado
  if (!itemId) {
    const itemNameRaw = formData.get("itemName")?.toString() || "";
    const itemName = itemNameRaw.trim();
    const category = formData.get("category")?.toString() as InventoryCategory | null;
    
    if (itemName && category && Object.values(InventoryCategory).includes(category)) {
      const { normalizeName } = await import("@/lib/inventory-normalize");
      const nameNormalized = normalizeName(itemName);
      
      // Buscar por nameNormalized únicamente (category is classification, not identity - CATALOG_ITEMS_V1 §4.3)
      // Usar findFirst con ordenamiento determinístico hasta que se regenere el cliente de Prisma
      // después de aplicar la migración del compound unique
      const existingItem = await prisma.inventoryItem.findFirst({
        where: {
          tenantId: tenant.id,
          nameNormalized,
          archivedAt: null, // Solo items activos
        },
        select: {
          id: true,
          name: true,
          category: true, // Para logging/debugging
          defaultVariantKey: true,
          defaultVariantLabel: true,
          defaultVariantOptions: true,
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }], // Determinístico: más antiguo primero
      });
      
      if (existingItem) {
        itemId = existingItem.id;
        console.log("[checkDuplicateInventoryLineAction] Item encontrado por nombre:", itemId, "categoría original:", existingItem.category);
      } else {
        // Si el item no existe, no puede haber duplicado
        console.log("[checkDuplicateInventoryLineAction] Item no existe aún, no hay duplicado");
        return { exists: false };
      }
    } else {
      console.log("[checkDuplicateInventoryLineAction] No hay itemName para buscar");
      return { exists: false };
    }
  }

  if (!itemId) {
    console.log("[checkDuplicateInventoryLineAction] No hay itemId disponible");
    return { exists: false };
  }

  console.log("[checkDuplicateInventoryLineAction] Verificando duplicado con itemId:", itemId, "área:", area);

  const variantKey = formData.get("variantKey")?.toString().trim() || null;
  const variantValue = formData.get("variantValue")?.toString().trim() || null;

  try {
    const result = await checkDuplicateInventoryLine(tenant.id, propertyId, {
      area,
      itemId,
      variantKey,
      variantValue,
    });

    return result || { exists: false };
  } catch (error: any) {
    console.error("[checkDuplicateInventoryLineAction] Error:", error);
    return { exists: false };
  }
}

export async function deleteInventoryLineAction(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    throw new Error("No se encontró el tenant");
  }

  const lineId = formData.get("lineId")?.toString();
  const propertyId = formData.get("propertyId")?.toString();

  if (!lineId) {
    throw new Error("No se encontró la línea de inventario");
  }

  try {
    await deleteInventoryLine(tenant.id, lineId);
    if (propertyId) {
      revalidatePath(`/host/properties/${propertyId}/inventory`);
    }
    // No redirigir aquí - el componente cliente maneja el refresh
  } catch (error) {
    console.error("[deleteInventoryLineAction] Error:", error);
    throw error;
  }
}

/**
 * Elimina un área completa y todos sus items (soft delete).
 */
export async function deleteInventoryAreaAction(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    throw new Error("No se encontró el tenant");
  }

  const propertyId = formData.get("propertyId")?.toString();
  const area = formData.get("area")?.toString()?.trim();

  if (!propertyId) {
    throw new Error("No se encontró la propiedad");
  }
  if (!area) {
    throw new Error("El área es obligatoria");
  }

  const { count } = await deleteInventoryArea(tenant.id, propertyId, area);
  revalidatePath(`/host/properties/${propertyId}/inventory`);
  return { count };
}

/**
 * Obtiene el catálogo de items por categoría para el modal.
 */
export async function getCatalogByCategory(category: InventoryCategory) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    return [];
  }

  try {
    return await listInventoryCatalogByCategory(tenant.id, category, 200);
  } catch (error) {
    console.error("[getCatalogByCategory] Error:", error);
    return [];
  }
}

/**
 * Actualiza una línea de inventario.
 */
export async function updateInventoryLineAction(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    throw new Error("No se encontró el tenant");
  }

  const lineId = formData.get("lineId")?.toString();
  if (!lineId) {
    throw new Error("No se encontró la línea de inventario");
  }

  const propertyId = formData.get("propertyId")?.toString();
  if (!propertyId) {
    throw new Error("No se encontró la propiedad");
  }

  // Validación y sanitización de campos
  const areaRaw = formData.get("area")?.toString() || "";
  const area = areaRaw.trim();
  
  if (!area || area.length === 0) {
    throw new Error("El área es obligatoria");
  }
  
  if (area.length > 80) {
    throw new Error("El área no puede tener más de 80 caracteres");
  }

  const expectedQtyStr = formData.get("expectedQty")?.toString();
  const expectedQty = expectedQtyStr ? parseInt(expectedQtyStr, 10) : 1;

  if (!expectedQty || isNaN(expectedQty) || expectedQty <= 0) {
    throw new Error("La cantidad debe ser mayor a 0");
  }

  // Variantes comerciales
  const clearVariant = formData.get("clearVariant") === "true";
  const variantKeyRaw = formData.get("variantKey")?.toString().trim();
  const variantValueRaw = formData.get("variantValue")?.toString().trim();
  const variantKey = clearVariant ? null : (variantKeyRaw || null);
  const variantValue = clearVariant ? null : (variantValueRaw || null);

  // Validar: si hay variantKey, debe haber variantValue
  if (variantKey && !variantValue) {
    throw new Error("Si se especifica una variante, debe tener un valor");
  }

  // Campos opcionales avanzados
  const brand = formData.get("brand")?.toString().trim() || null;
  const model = formData.get("model")?.toString().trim() || null;
  const serialNumber = formData.get("serialNumber")?.toString().trim() || null;
  const color = formData.get("color")?.toString().trim() || null;
  const size = formData.get("size")?.toString().trim() || null;
  const notes = formData.get("notes")?.toString().trim() || null;
  
  // Validar y obtener condition
  const conditionRaw = formData.get("condition")?.toString();
  let condition: InventoryCondition = InventoryCondition.USED_LT_1Y; // Default
  if (conditionRaw && Object.values(InventoryCondition).includes(conditionRaw as InventoryCondition)) {
    condition = conditionRaw as InventoryCondition;
  }
  
  // Validar y obtener priority
  const priorityRaw = formData.get("priority")?.toString();
  let priority: InventoryPriority = InventoryPriority.MEDIUM; // Default
  if (priorityRaw && Object.values(InventoryPriority).includes(priorityRaw as InventoryPriority)) {
    priority = priorityRaw as InventoryPriority;
  }

  try {
    // Si se guarda con variantKey="bed_size", no enviar size (se limpiará en el servidor)
    const finalSize = variantKey === "bed_size" ? null : size;

    // Cuando clearVariant: pasar null explícitamente para limpiar. Si no, undefined = no actualizar.
    const lineVariantKey = clearVariant ? null : (variantKey || undefined);
    const lineVariantValue = clearVariant ? null : (variantValue || undefined);

    await updateInventoryLine(tenant.id, lineId, {
      area,
      expectedQty,
      condition,
      priority,
      brand,
      model,
      serialNumber,
      color,
      size: finalSize,
      notes,
      variantKey: lineVariantKey,
      variantValue: lineVariantValue,
    });

    const itemId = formData.get("itemId")?.toString();

    if (clearVariant) {
      // Si se desmarcó variantes, limpiar también el grupo de variantes del ítem
      if (itemId) {
        await updateInventoryItem(tenant.id, itemId, {
          defaultVariantKey: null,
          defaultVariantLabel: null,
          defaultVariantOptions: null,
        });
        // Desactivar links a VariantGroup en DB (no borrar; mantener integridad histórica)
        await prisma.inventoryItemVariantGroup.updateMany({
          where: {
            itemId,
            isActive: true,
          },
          data: {
            isActive: false,
          },
        });
      }
    }
    // No reactivar automáticamente al guardar con checkbox ON: solo reactivar cuando
    // el usuario usa "Agregar grupo" (attachVariantGroupToItemByKeyAction).

    revalidatePath(`/host/properties/${propertyId}/inventory`);
    // No redirigir aquí - el componente cliente maneja el cierre del modal
  } catch (error: any) {
    console.error("[updateInventoryLineAction] Error:", error);
    if (error?.message) {
      throw error;
    }
    throw new Error("Ocurrió un error al actualizar el item. Por favor, intenta de nuevo.");
  }
}

/**
 * Obtiene una línea de inventario por ID (para edición).
 */
/**
 * Crea un item en el catálogo sin crear una línea de inventario.
 * Útil para cuando el usuario crea un item personalizado desde "Otro..."
 */
export async function createInventoryItemAction(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    throw new Error("No se encontró el tenant");
  }

  const category = formData.get("category")?.toString() as InventoryCategory | null;
  if (!category || !Object.values(InventoryCategory).includes(category)) {
    throw new Error("La categoría es obligatoria y debe ser válida");
  }

  const itemNameRaw = formData.get("itemName")?.toString() || "";
  const itemName = itemNameRaw.trim();

  if (!itemName || itemName.length === 0) {
    throw new Error("El nombre del ítem es obligatorio");
  }

  if (itemName.length > 120) {
    throw new Error("El nombre del ítem no puede tener más de 120 caracteres");
  }

  const variantKey = formData.get("variantKey")?.toString().trim() || null;
  const variantLabel = formData.get("variantLabel")?.toString().trim() || null;
  const variantOptionsRaw = formData.get("variantOptions")?.toString();
  let variantOptions: any = null;
  
  if (variantOptionsRaw) {
    try {
      variantOptions = JSON.parse(variantOptionsRaw);
    } catch (e) {
      console.error("[createInventoryItemAction] Error parsing variantOptions:", e);
      throw new Error("Las opciones de variante tienen un formato inválido");
    }
  }

  try {
    const { normalizeName, capitalizeFirst } = await import("@/lib/inventory-normalize");
    const nameNormalized = normalizeName(itemName);
    const itemNameCapitalized = capitalizeFirst(itemName); // Capitalizar primera letra para display

    // Buscar si ya existe por nameNormalized únicamente (category is classification, not identity - CATALOG_ITEMS_V1 §4.3)
    // Usar findFirst con ordenamiento determinístico (más robusto hasta que se ejecute la migración)
    // Solo considerar items activos (archivedAt: null)
    const existingItem = await prisma.inventoryItem.findFirst({
      where: {
        tenantId: tenant.id,
        nameNormalized,
        archivedAt: null, // Solo items activos
      },
      select: {
        id: true,
        name: true,
        category: true, // Para logging/debugging
        defaultVariantKey: true,
        defaultVariantLabel: true,
        defaultVariantOptions: true,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }], // Determinístico: más antiguo primero
    });

    if (existingItem) {
      // Reutilizar item existente y conservar su categoría original (CATALOG_ITEMS_V1 §4.3)
      return {
        id: existingItem.id,
        name: existingItem.name,
        defaultVariantKey: existingItem.defaultVariantKey,
        // Los campos pueden no existir si la migración no se ha aplicado
        defaultVariantLabel: (existingItem as any).defaultVariantLabel || null,
        defaultVariantOptions: (existingItem as any).defaultVariantOptions || null,
      };
    }

    // Crear nuevo item usando create (upsert no disponible hasta que se ejecute la migración)
    // El manejo de race conditions se hace con try/catch de P2002
    const itemData: any = {
      tenantId: tenant.id,
      category,
      name: itemNameCapitalized, // Capitalizar primera letra para consistencia visual
      nameNormalized, // nameNormalized sin capitalizar (normalización canónica)
      defaultVariantKey: variantKey,
    };
    
    // Solo agregar estos campos si tienen valores
    if (variantLabel !== null && variantLabel !== undefined && variantLabel.trim() !== "") {
      itemData.defaultVariantLabel = variantLabel;
      console.log("[createInventoryItemAction] Agregando defaultVariantLabel:", variantLabel);
    }
    if (variantOptions !== null && variantOptions !== undefined) {
      itemData.defaultVariantOptions = variantOptions;
      console.log("[createInventoryItemAction] Agregando defaultVariantOptions:", variantOptions);
    }
    
    console.log("[createInventoryItemAction] Creando item con data:", itemData);
    let item;
    try {
      item = await prisma.inventoryItem.create({
        data: itemData,
      });
      console.log("[createInventoryItemAction] Item creado:", item);
    } catch (createError: any) {
      console.error("[createInventoryItemAction] Error al crear item con variantes:", createError);
      console.error("[createInventoryItemAction] Error code:", createError?.code);
      console.error("[createInventoryItemAction] Error message:", createError?.message);
      
      // Si falla porque los campos no existen, intentar sin esos campos
      if (createError?.code === "P2021" || 
          createError?.message?.includes("Unknown column") || 
          createError?.message?.includes("does not exist") || 
          createError?.message?.includes("Unknown field") ||
          createError?.message?.includes("column") && createError?.message?.includes("does not exist")) {
        console.warn("[createInventoryItemAction] Campos de variantes personalizadas no existen, creando sin ellos");
        item = await prisma.inventoryItem.create({
          data: {
            tenantId: tenant.id,
            category,
            name: itemNameCapitalized, // Capitalizar primera letra para consistencia visual
            nameNormalized, // nameNormalized sin capitalizar (normalización canónica)
            defaultVariantKey: variantKey,
          },
        });
      } else {
        // Si es otro error, lanzarlo para que se maneje arriba
        throw createError;
      }
    }
    
    // Retornar solo los campos que sabemos que existen
    return {
      id: item.id,
      name: item.name,
      defaultVariantKey: item.defaultVariantKey,
      defaultVariantLabel: (item as any).defaultVariantLabel || null,
      defaultVariantOptions: (item as any).defaultVariantOptions || null,
    };
  } catch (error: any) {
    console.error("[createInventoryItemAction] Error:", error);
    console.error("[createInventoryItemAction] Error details:", {
      code: error?.code,
      message: error?.message,
      meta: error?.meta,
    });
    if (error?.code === "P2002") {
      // Duplicado único - buscar el existente por nameNormalized únicamente (CATALOG_ITEMS_V1 §4.3)
      // category is classification, not identity
      const { normalizeName, capitalizeFirst } = await import("@/lib/inventory-normalize");
      const nameNormalized = normalizeName(itemName);
      const itemNameCapitalized = capitalizeFirst(itemName); // Capitalizar primera letra para display (aunque no se use si existe)
      
      // Usar findFirst con ordenamiento determinístico (más robusto hasta que se ejecute la migración)
      // Solo considerar items activos (archivedAt: null)
      const existingItem = await prisma.inventoryItem.findFirst({
        where: {
          tenantId: tenant.id,
          nameNormalized,
          archivedAt: null, // Solo items activos
        },
        select: {
          id: true,
          name: true,
          category: true, // Para logging/debugging
          defaultVariantKey: true,
          defaultVariantLabel: true,
          defaultVariantOptions: true,
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }], // Determinístico: más antiguo primero
      });
      
      if (existingItem) {
        // Reutilizar item existente y conservar su categoría original (CATALOG_ITEMS_V1 §4.3)
        return {
          id: existingItem.id,
          name: existingItem.name,
          defaultVariantKey: existingItem.defaultVariantKey,
          defaultVariantLabel: (existingItem as any).defaultVariantLabel || null,
          defaultVariantOptions: (existingItem as any).defaultVariantOptions || null,
        };
      }
    }
    // Si el error es porque los campos no existen, dar un mensaje más específico
    if (error?.code === "P2021" || error?.message?.includes("Unknown column") || error?.message?.includes("does not exist")) {
      throw new Error("Los campos de variantes personalizadas no existen en la base de datos. Por favor, ejecuta la migración de Prisma: npx prisma migrate dev");
    }
    throw new Error(error?.message || "Ocurrió un error al crear el item. Por favor, intenta de nuevo.");
  }
}

/**
 * Actualiza un item del catálogo (InventoryItem).
 */
export async function updateInventoryItemAction(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    throw new Error("No se encontró el tenant");
  }

  const itemId = formData.get("itemId")?.toString();
  if (!itemId) {
    throw new Error("No se encontró el item");
  }

  const itemNameRaw = formData.get("itemName")?.toString() || "";
  const itemName = itemNameRaw.trim();

  if (!itemName || itemName.length === 0) {
    throw new Error("El nombre del ítem es obligatorio");
  }

  if (itemName.length > 120) {
    throw new Error("El nombre del ítem no puede tener más de 120 caracteres");
  }

  const variantKey = formData.get("variantKey")?.toString().trim() || null;
  const variantLabel = formData.get("variantLabel")?.toString().trim() || null;
  const variantOptionsRaw = formData.get("variantOptions")?.toString();
  let variantOptions: any = null;
  
  if (variantOptionsRaw) {
    try {
      variantOptions = JSON.parse(variantOptionsRaw);
    } catch (e) {
      console.error("[updateInventoryItemAction] Error parsing variantOptions:", e);
      throw new Error("Las opciones de variante tienen un formato inválido");
    }
  }

  try {
    // Aplicar capitalización de primera letra para consistencia visual (MUST)
    const { capitalizeFirst } = await import("@/lib/inventory-normalize");
    const itemNameCapitalized = capitalizeFirst(itemName);
    
    console.log("[updateInventoryItemAction] Actualizando item:", {
      itemId,
      itemName: itemNameCapitalized,
      variantKey,
      variantLabel,
      variantOptions,
    });
    await updateInventoryItem(tenant.id, itemId, {
      name: itemNameCapitalized, // Capitalizar primera letra para consistencia visual
      defaultVariantKey: variantKey || null,
      defaultVariantLabel: variantLabel || null,
      defaultVariantOptions: variantOptions,
    });
    console.log("[updateInventoryItemAction] Item actualizado correctamente");
  } catch (error: any) {
    console.error("[updateInventoryItemAction] Error:", error);
    console.error("[updateInventoryItemAction] Error details:", {
      code: error?.code,
      message: error?.message,
      meta: error?.meta,
    });
    if (error?.code === "P2025") {
      throw new Error("El item no existe o no tienes permisos para editarlo");
    }
    // Si el error es porque los campos no existen, dar un mensaje más específico
    if (error?.code === "P2021" || error?.message?.includes("Unknown column") || error?.message?.includes("does not exist") || error?.message?.includes("Unknown field")) {
      throw new Error("Los campos de variantes personalizadas no existen en la base de datos. Por favor, ejecuta la migración de Prisma: npx prisma migrate dev");
    }
    throw new Error(error?.message || "Ocurrió un error al actualizar el item. Por favor, intenta de nuevo.");
  }
}

/**
 * Elimina un item del catálogo.
 */
export async function deleteInventoryItemAction(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    throw new Error("No se encontró el tenant");
  }

  const itemId = formData.get("itemId")?.toString();
  if (!itemId) {
    throw new Error("No se encontró el item");
  }

  console.log("[deleteInventoryItemAction] Iniciando eliminación:", {
    tenantId: tenant.id,
    itemId,
    timestamp: new Date().toISOString(),
  });

  try {
    await deleteInventoryItem(tenant.id, itemId);
    console.log("[deleteInventoryItemAction] Eliminación exitosa:", { itemId });
  } catch (error: any) {
    console.error("[deleteInventoryItemAction] Error al eliminar:", {
      itemId,
      errorMessage: error?.message,
      errorCode: error?.code,
      error: error,
    });
    // Re-lanzar el error con el mensaje original para que la UI lo muestre
    if (error?.message) {
      throw error;
    }
    throw new Error("Ocurrió un error al eliminar el item. Por favor, intenta de nuevo.");
  }
}

export async function getInventoryLine(lineId: string) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    return null;
  }

  try {
    return await getInventoryLineById(tenant.id, lineId);
  } catch (error) {
    console.error("[getInventoryLine] Error:", error);
    return null;
  }
}

/**
 * Carga en un solo round-trip: línea, siblings, variantGroup y variantGroups.
 * Optimiza la apertura del editor de inventario.
 */
export async function getInventoryLineForEditAction(
  lineId: string,
  propertyId: string
): Promise<{
  line: NonNullable<Awaited<ReturnType<typeof getInventoryLineById>>>;
  siblings: Awaited<ReturnType<typeof listInventorySiblings>>;
  variantGroup: Awaited<ReturnType<typeof getInventoryItemVariantGroupAction>>;
  variantGroups: VariantGroupData[];
} | null> {
  const tenant = await getDefaultTenant();
  if (!tenant) return null;

  try {
    const line = await getInventoryLineById(tenant.id, lineId);
    if (!line) return null;

    const { normalizeName } = await import("@/lib/inventory-normalize");
    const areaNorm =
      (line as { areaNormalized?: string }).areaNormalized ?? normalizeName(line.area);

    const lineVariantKey = (line as { variantKey?: string | null }).variantKey;
    const [siblings, variantGroup, variantGroups] = await Promise.all([
      listInventorySiblings(tenant.id, propertyId, areaNorm, line.item.id),
      getInventoryItemVariantGroupAction(line.item.id, lineVariantKey),
      getInventoryItemVariantGroupsAction(line.item.id),
    ]);

    return { line, siblings, variantGroup, variantGroups };
  } catch (error) {
    console.error("[getInventoryLineForEditAction] Error:", error);
    return null;
  }
}

/**
 * Lista líneas hermanas (variantes) para mismo (propertyId, areaNormalized, itemId).
 */
export async function getInventoryLineSiblingsAction(
  propertyId: string,
  areaNormalized: string,
  itemId: string
) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    return [];
  }

  try {
    return await listInventorySiblings(
      tenant.id,
      propertyId,
      areaNormalized,
      itemId
    );
  } catch (error) {
    console.error("[getInventoryLineSiblingsAction] Error:", error);
    return [];
  }
}

export interface VariantGroupPayload {
  key: string;
  label?: string | null;
  options: Array<{ value: string }>;
}

/**
 * Actualiza el grupo de variantes de un InventoryItem.
 * Si ya existen otros grupos, los conserva y actualiza solo este.
 */
export async function updateInventoryItemVariantGroupAction(
  itemId: string,
  payload: VariantGroupPayload
) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    throw new Error("No se encontró el tenant");
  }

  const key = normalizeVariantKey(payload.key);
  if (!key) {
    throw new Error("El key del grupo es obligatorio");
  }

  const optionsJson = serializeDefaultVariantOptions(payload.options);
  if (optionsJson.options.length < 2) {
    throw new Error("Se requieren al menos 2 opciones");
  }

  const groups = await getInventoryItemVariantGroupsAction(itemId);
  const updatedGroup = {
    key,
    label: payload.label?.trim() || null,
    options: optionsJson.options.map((o) => ({ value: o.value })),
  };

  const otherGroups = groups.filter((g) => g.key !== key);
  const newGroups = [...otherGroups, updatedGroup];
  const serialized = serializeDefaultVariantGroups(
    newGroups.map((g) => ({
      key: g.key,
      label: g.label,
      options: g.options.map((o) => ({ value: o.value })),
    }))
  );

  await updateInventoryItem(tenant.id, itemId, {
    defaultVariantKey: (newGroups[0]?.key ?? key),
    defaultVariantLabel: (newGroups[0]?.label ?? payload.label?.trim()) || null,
    defaultVariantOptions: serialized as unknown,
  });
}

/**
 * Agrega un nuevo grupo de variantes a un InventoryItem.
 */
export async function addInventoryItemVariantGroupAction(
  itemId: string,
  payload: VariantGroupPayload
) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    throw new Error("No se encontró el tenant");
  }

  const key = normalizeVariantKey(payload.key);
  if (!key) {
    throw new Error("El nombre del grupo es obligatorio");
  }

  const optionsJson = serializeDefaultVariantOptions(payload.options);
  if (optionsJson.options.length < 2) {
    throw new Error("Se requieren al menos 2 opciones");
  }

  const groups = await getInventoryItemVariantGroupsAction(itemId);
  if (groups.some((g) => g.key === key)) {
    throw new Error(`El grupo "${key}" ya existe`);
  }

  // Si key es canónica y el tenant ya tiene ese grupo: usar "Agregar grupo", no crear
  const canonicalKeys = ["bed_size", "material", "use"];
  if (canonicalKeys.includes(key)) {
    const existingGroup = await prisma.variantGroup.findUnique({
      where: { tenantId_key: { tenantId: tenant.id, key } },
    });
    if (existingGroup) {
      throw new Error(
        `El grupo "${key}" ya existe. Usa "Agregar grupo" para asociarlo al ítem.`
      );
    }
  }

  const newGroup = {
    key,
    label: payload.label?.trim() || null,
    options: optionsJson.options.map((o) => ({ value: o.value })),
  };
  const newGroups = [...groups.map((g) => ({
    key: g.key,
    label: g.label,
    options: g.options.map((o) => ({ value: o.value })),
  })), newGroup];

  const serialized = serializeDefaultVariantGroups(newGroups);

  await updateInventoryItem(tenant.id, itemId, {
    defaultVariantKey: groups.length > 0 ? groups[0].key : key,
    defaultVariantLabel: groups.length > 0 ? groups[0].label : payload.label?.trim() || null,
    defaultVariantOptions: serialized as unknown,
  });
}

/**
 * Obtiene todos los grupos de variantes de un InventoryItem.
 * Prefiere VariantGroups DB si el ítem tiene links; fallback a variantes embebidas (legacy).
 */
export async function getInventoryItemVariantGroupsAction(
  itemId: string
): Promise<VariantGroupData[]> {
  const tenant = await getDefaultTenant();
  if (!tenant) return [];

  const item = await prisma.inventoryItem.findFirst({
    where: { id: itemId, tenantId: tenant.id },
    select: {
      defaultVariantKey: true,
      defaultVariantLabel: true,
      defaultVariantOptions: true,
      variantGroupLinks: {
        where: { isActive: true },
        include: {
          group: {
            include: {
              options: {
                where: { isArchived: false },
                orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
              },
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!item) return [];

  if (
    item.variantGroupLinks &&
    item.variantGroupLinks.length > 0
  ) {
    return item.variantGroupLinks.map((link) => {
      let options = link.group.options.map((o) => ({
        value: o.label,
        valueNormalized: o.valueNormalized,
      }));
      // optionAllowlist: filtrar opciones visibles (ej. Vaso solo Vidrio/Plástico, no MDF/Tela)
      const allowlist = link.optionAllowlist;
      if (
        Array.isArray(allowlist) &&
        allowlist.length > 0
      ) {
        const allowSet = new Set(allowlist as string[]);
        options = options.filter((o) => allowSet.has(o.valueNormalized));
      }
      return {
        key: link.group.key,
        label: link.group.label,
        options,
      };
    });
  }

  return parseDefaultVariantGroups(item);
}

/**
 * Obtiene el grupo de variantes de un InventoryItem.
 * Si variantKey se proporciona, devuelve ese grupo; si no, el primero (o el que coincida con la línea en edición).
 */
export async function getInventoryItemVariantGroupAction(
  itemId: string,
  preferredVariantKey?: string | null
) {
  const groups = await getInventoryItemVariantGroupsAction(itemId);
  if (groups.length === 0) return null;
  if (preferredVariantKey) {
    const keyNorm = normalizeVariantKey(preferredVariantKey);
    const found = groups.find((g) => g.key === keyNorm);
    if (found) return found;
  }
  return groups[0];
}

/**
 * Reactiva links inactivos de VariantGroup para un ítem.
 * Solo reactiva existentes (isActive=false -> true); no crea nuevos.
 * Útil cuando el usuario vuelve a marcar "Este ítem tiene variantes".
 */
export async function reactivateItemVariantGroupsAction(itemId: string): Promise<{
  reactivatedCount: number;
}> {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    throw new Error("No se encontró el tenant");
  }

  const item = await prisma.inventoryItem.findFirst({
    where: { id: itemId, tenantId: tenant.id },
    select: { id: true },
  });
  if (!item) {
    throw new Error("Ítem no encontrado");
  }

  const result = await prisma.inventoryItemVariantGroup.updateMany({
    where: {
      itemId,
      isActive: false,
    },
    data: { isActive: true },
  });

  return { reactivatedCount: result.count };
}

/**
 * Desactiva una línea de inventario (isActive=false).
 * Reutilizado para "remover variante" sin eliminar físicamente.
 */
export async function setInventoryLineActiveAction(
  lineId: string,
  propertyId: string,
  isActive: boolean
) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    throw new Error("No se encontró el tenant");
  }

  await updateInventoryLine(tenant.id, lineId, { isActive });
  revalidatePath(`/host/properties/${propertyId}/inventory`);
}

/**
 * Actualiza solo la cantidad esperada de una línea.
 */
export async function updateInventoryLineExpectedQtyAction(
  lineId: string,
  propertyId: string,
  expectedQtyRaw: number | string
) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    throw new Error("No se encontró el tenant");
  }

  const expectedQty =
    typeof expectedQtyRaw === "number" ? expectedQtyRaw : parseInt(String(expectedQtyRaw), 10);

  if (
    !Number.isFinite(expectedQty) ||
    !Number.isInteger(expectedQty) ||
    expectedQty <= 0
  ) {
    throw new Error("Cantidad inválida. Debe ser un entero mayor a 0.");
  }

  await updateInventoryLine(tenant.id, lineId, { expectedQty });
  revalidatePath(`/host/properties/${propertyId}/inventory`);
}

/**
 * Busca items en el catálogo por nombre (búsqueda global).
 * @deprecated Usar searchGlobalCatalogItemsAction para autocomplete Step 1
 */
export async function searchCatalogAction(searchTerm: string) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    return [];
  }

  try {
    return await searchInventoryCatalog(tenant.id, searchTerm);
  } catch (error) {
    console.error("[searchCatalogAction] Error:", error);
    return [];
  }
}

/**
 * Busca items en el Catálogo Global (fuente primaria para autocomplete Step 1).
 */
export async function searchGlobalCatalogItemsAction(searchTerm: string) {
  try {
    return await searchGlobalCatalogItems(searchTerm, "es-MX", 20);
  } catch (error) {
    console.error("[searchGlobalCatalogItemsAction] Error:", error);
    return [];
  }
}

/**
 * Asegura que existe un InventoryItem del tenant basado en un GlobalCatalogItem.
 * Lazy copy: busca primero, crea solo si no existe.
 */
export async function ensureTenantCatalogItemFromGlobalAction(globalCatalogItemId: string) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    throw new Error("No se encontró el tenant");
  }

  try {
    return await ensureTenantCatalogItemFromGlobal(tenant.id, globalCatalogItemId);
  } catch (error) {
    console.error("[ensureTenantCatalogItemFromGlobalAction] Error:", error);
    throw error;
  }
}

/**
 * Obtiene items frecuentes del catálogo (para mostrar cuando no hay búsqueda).
 */
export async function getFrequentItemsAction() {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    return [];
  }

  try {
    return await getFrequentInventoryItems(tenant.id);
  } catch (error) {
    console.error("[getFrequentItemsAction] Error:", error);
    return [];
  }
}

/**
 * Obtiene las áreas existentes para una propiedad (para sugerencias en el modal).
 */
export async function getExistingAreas(propertyId: string) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    return [];
  }

  try {
    // Usar groupBy para obtener áreas únicas
    const areas = await prisma.inventoryLine.groupBy({
      by: ["area"],
      where: {
        tenantId: tenant.id,
        propertyId,
      },
      orderBy: {
        area: "asc",
      },
      take: 50, // Límite razonable
    });

    return areas.map((a) => a.area);
  } catch (error) {
    console.error("[getExistingAreas] Error:", error);
    return [];
  }
}

/**
 * Copia inventario de una propiedad a otra.
 */
export async function copyInventoryBetweenPropertiesAction(formData: FormData) {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    throw new Error("No se encontró el tenant");
  }

  const fromPropertyId = formData.get("fromPropertyId")?.toString();
  const toPropertyId = formData.get("toPropertyId")?.toString();
  const copyQuantitiesStr = formData.get("copyQuantities")?.toString();
  const mode = (formData.get("mode")?.toString() as "merge" | "overwrite") || "merge";

  // Validaciones
  if (!fromPropertyId) {
    throw new Error("No se encontró la propiedad origen");
  }

  if (!toPropertyId) {
    throw new Error("No se encontró la propiedad destino");
  }

  if (fromPropertyId === toPropertyId) {
    throw new Error("No se puede copiar inventario de una propiedad a sí misma");
  }

  // Verificar que ambas propiedades existan y pertenezcan al tenant
  const [fromProperty, toProperty] = await Promise.all([
    prisma.property.findFirst({
      where: {
        id: fromPropertyId,
        tenantId: tenant.id,
      },
    }),
    prisma.property.findFirst({
      where: {
        id: toPropertyId,
        tenantId: tenant.id,
      },
    }),
  ]);

  if (!fromProperty) {
    throw new Error("La propiedad origen no existe o no pertenece a tu cuenta");
  }

  if (!toProperty) {
    throw new Error("La propiedad destino no existe o no pertenece a tu cuenta");
  }

  // Validar modo
  if (mode !== "merge" && mode !== "overwrite") {
    throw new Error("El modo debe ser 'merge' o 'overwrite'");
  }

  // Parsear copyQuantities (default: true)
  const copyQuantities = copyQuantitiesStr === "false" ? false : true;

  console.log("[copyInventoryBetweenPropertiesAction] Iniciando copia:", {
    tenantId: tenant.id,
    fromPropertyId,
    toPropertyId,
    fromPropertyName: fromProperty.name,
    toPropertyName: toProperty.name,
    copyQuantities,
    mode,
  });

  try {
    const stats = await copyInventoryBetweenProperties({
      tenantId: tenant.id,
      fromPropertyId,
      toPropertyId,
      copyQuantities,
      mode,
    });

    // Revalidar las páginas de inventario de ambas propiedades
    revalidatePath(`/host/properties/${fromPropertyId}/inventory`);
    revalidatePath(`/host/properties/${toPropertyId}/inventory`);

    console.log("[copyInventoryBetweenPropertiesAction] Copia exitosa:", stats);

    return stats;
  } catch (error: any) {
    console.error("[copyInventoryBetweenPropertiesAction] Error:", {
      errorMessage: error?.message,
      errorCode: error?.code,
      error: error,
    });

    if (error?.message) {
      throw error;
    }

    throw new Error("Ocurrió un error al copiar el inventario. Por favor, intenta de nuevo.");
  }
}

/**
 * Obtiene las URLs de thumbnails para un InventoryItem
 */
export async function getInventoryItemThumbsAction(itemId: string): Promise<Array<string | null>> {
  const tenant = await getDefaultTenant();
  if (!tenant) {
    throw new Error("No se encontró el tenant");
  }

  // Verificar que el item existe y pertenece al tenant
  const item = await prisma.inventoryItem.findFirst({
    where: {
      id: itemId,
      tenantId: tenant.id,
    },
  });

  if (!item) {
    throw new Error("InventoryItem no encontrado o no pertenece a tu cuenta");
  }

  return await getInventoryItemImageThumbs(itemId);
}


