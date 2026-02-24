# Diagnóstico: Limpieza no visible para Team Leader

**Fecha:** 2025-01-XX  
**Problema:** El Host ve una limpieza como "Pendiente de aceptación" pero el Team Leader no la ve como "Disponible" en su vista.

---

## Resumen Ejecutivo

**Causa raíz identificada:** Las queries de cleaner filtran por `tenantId` usando solo el `servicesTenantId` (tenant del Team), pero las limpiezas están en el `hostTenantId` (tenant del Host). Esto causa que las limpiezas sean excluidas por el filtro de `tenantId` antes de aplicar otros filtros.

**Problemas secundarios:**
1. Inconsistencia en el uso de WorkGroupExecutor vs PropertyTeam entre diferentes páginas
2. Falta de inclusión del `hostTenantId` derivado de WorkGroupExecutor en las queries de cleaner

---

## Hallazgos Técnicos

### 1. Filtro de tenantId incorrecto

**Ubicación:** Múltiples archivos en `app/cleaner/`

**Problema:**
- Las queries de limpiezas disponibles usan `tenantId: { in: tenantIds }`
- `tenantIds` viene de `getAccessibleTenantIdsForUser()` o `getAccessibleTeamsForUser()`
- Estas funciones devuelven solo los `tenantIds` de los Teams (servicesTenantId)
- Las limpiezas están en el tenant del Host (hostTenantId)
- Resultado: Las limpiezas son excluidas por el filtro de tenantId

**Evidencia:**

```typescript
// lib/cleaner/getAccessibleTenantIdsForUser.ts (línea 3-18)
export async function getAccessibleTenantIdsForUser(userId: string): Promise<string[]> {
  const memberships = await prisma.teamMembership.findMany({
    where: { userId, status: "ACTIVE" },
    select: {
      Team: {
        select: { tenantId: true },  // ← Solo devuelve servicesTenantId
      },
    },
  });

  const tenantIds = memberships
    .map((m) => m.Team?.tenantId)  // ← servicesTenantId del Team
    .filter((id): id is string => Boolean(id));

  return Array.from(new Set(tenantIds));
}
```

```typescript
// app/cleaner/page.tsx (línea 239)
const baseWhere: any = {
  scheduledDate: { gte: extendedRangeStart, lte: extendedRangeEnd },
  status: { not: "CANCELLED" },
  tenantId: { in: tenantIds },  // ← tenantIds = [servicesTenantId]
  propertyId: { in: allowedPropertyIds },
};
```

**Query SQL equivalente:**
```sql
SELECT * FROM "Cleaning"
WHERE "tenantId" IN ('services-tenant-id')  -- ← Solo servicesTenantId
  AND "propertyId" IN ('property-id-1', 'property-id-2')
  AND "assignmentStatus" = 'OPEN'
  AND "assignedMembershipId" IS NULL;
```

**Problema:** La limpieza tiene `tenantId = 'host-tenant-id'`, por lo que no coincide con el filtro.

---

### 2. Inconsistencia en uso de WorkGroupExecutor vs PropertyTeam

**Ubicación:** `app/cleaner/page.tsx`, `app/cleaner/cleanings/available/page.tsx`

**Problema:**
- Estas páginas solo usan `PropertyTeam.findMany()` para obtener `propertyIds`
- NO usan `getPropertiesForCleanerTeamsViaWGE()` que obtiene propiedades vía WorkGroupExecutor
- Si la propiedad está conectada SOLO vía WorkGroupExecutor (no PropertyTeam), no aparecerá

**Evidencia:**

```typescript
// app/cleaner/page.tsx (línea 215-224)
const propertyTeams = await prisma.propertyTeam.findMany({
  where: {
    tenantId: { in: tenantIds },  // ← Solo busca en servicesTenantId
    teamId: { in: activeTeamIds },
  },
  select: {
    propertyId: true,
    property: { select: { isActive: true } },
  },
});

const allowedPropertyIds = propertyTeams
  .filter((pt) => pt.property?.isActive !== false)
  .map((pt) => pt.propertyId);
```

**Comparación con `lib/cleaner/getCleanerCleanings.ts`:**

```typescript
// lib/cleaner/getCleanerCleanings.ts (línea 51-85)
// ✅ SÍ usa WorkGroupExecutor primero
const { getPropertiesForCleanerTeamsViaWGE } = await import("@/lib/workgroups/getPropertiesForCleanerTeamViaWGE");
const wgePropertyIds = await getPropertiesForCleanerTeamsViaWGE(teamIds);

let propertyIds: string[] = [];

if (wgePropertyIds.length > 0) {
  // Usar propiedades vía WGE
  propertyIds = wgePropertyIds;
} else {
  // Fallback a PropertyTeam
  const propertyTeams = await (prisma as any).propertyTeam.findMany({
    where: {
      tenantId: { in: tenantIds },
      teamId: { in: teamIds },
    },
    // ...
  });
  propertyIds = propertyTeams
    .filter((pt: any) => pt.property?.isActive !== false)
    .map((pt: any) => pt.propertyId);
}
```

**Problema:** `getCleanerCleanings.ts` tiene la lógica correcta (usa WGE primero), pero aún tiene el problema del filtro de tenantId (línea 92).

---

### 3. Falta de inclusión de hostTenantId en queries

**Ubicación:** `lib/workgroups/getPropertiesForCleanerTeamViaWGE.ts`

**Problema:**
- `getPropertiesForCleanerTeamsViaWGE()` obtiene correctamente los `propertyIds` vía WorkGroupExecutor
- Pero las queries de cleaning que usan estos `propertyIds` aún filtran por `tenantId: { in: tenantIds }`
- `tenantIds` no incluye el `hostTenantId` derivado de WorkGroupExecutor

**Evidencia:**

```typescript
// lib/workgroups/getPropertiesForCleanerTeamViaWGE.ts (línea 97-170)
export async function getPropertiesForCleanerTeamsViaWGE(
  teamIds: string[]
): Promise<string[]> {
  const executors = await prisma.workGroupExecutor.findMany({
    where: {
      teamId: { in: teamIds },
      status: "ACTIVE",
    },
    select: {
      workGroupId: true,
      hostTenantId: true,  // ← Obtiene hostTenantId
    },
  });

  // ... obtiene propertyIds correctamente ...

  return Array.from(allPropertyIds);
}
```

Pero luego:

```typescript
// lib/cleaner/getCleanerCleanings.ts (línea 91-94)
const whereClause: any = {
  tenantId: { in: tenantIds },  // ← tenantIds NO incluye hostTenantId
  propertyId: { in: propertyIds },  // ← propertyIds SÍ incluye propiedades del host
};
```

**Problema:** Aunque `propertyIds` incluye propiedades del host, el filtro `tenantId` las excluye porque `tenantIds` no incluye el `hostTenantId`.

---

## Evidencia con Queries

### Query actual (incorrecta):

```typescript
// app/cleaner/page.tsx (línea 274-287)
eligibleCleanings = await prisma.cleaning.findMany({
  where: {
    scheduledDate: { gte: extendedRangeStart, lte: extendedRangeEnd },
    status: { not: "CANCELLED" },
    tenantId: { in: tenantIds },  // ← [servicesTenantId]
    propertyId: { in: allowedPropertyIds },
    assignmentStatus: "OPEN",
    assignedMembershipId: null,
    assignedMemberId: null,
  },
});
```

**SQL equivalente:**
```sql
SELECT * FROM "Cleaning"
WHERE "tenantId" IN ('services-itzel')  -- ← Solo servicesTenantId
  AND "propertyId" IN ('property-id')
  AND "assignmentStatus" = 'OPEN'
  AND "assignedMembershipId" IS NULL
  AND "assignedMemberId" IS NULL;
```

**Resultado:** 0 filas (la limpieza tiene `tenantId = 'host-ranferi'`)

### Query esperada (correcta):

```typescript
// Debería incluir hostTenantId derivado de WorkGroupExecutor
const hostTenantIds = await getHostTenantIdsForCleanerTeams(teamIds);
const allTenantIds = [...tenantIds, ...hostTenantIds];  // ← Incluir ambos

eligibleCleanings = await prisma.cleaning.findMany({
  where: {
    scheduledDate: { gte: extendedRangeStart, lte: extendedRangeEnd },
    status: { not: "CANCELLED" },
    tenantId: { in: allTenantIds },  // ← [servicesTenantId, hostTenantId]
    propertyId: { in: allowedPropertyIds },
    assignmentStatus: "OPEN",
    assignedMembershipId: null,
    assignedMemberId: null,
  },
});
```

**SQL equivalente:**
```sql
SELECT * FROM "Cleaning"
WHERE "tenantId" IN ('services-itzel', 'host-ranferi')  -- ← Ambos tenants
  AND "propertyId" IN ('property-id')
  AND "assignmentStatus" = 'OPEN'
  AND "assignedMembershipId" IS NULL
  AND "assignedMemberId" IS NULL;
```

**Resultado:** 1 fila (la limpieza coincide)

---

## Archivos Afectados

### 1. `app/cleaner/page.tsx`
- **Línea 201:** `getAccessibleTeamsForUser()` devuelve solo `servicesTenantId`
- **Línea 215-224:** Solo usa `PropertyTeam.findMany()`, no WGE
- **Línea 239:** Query usa `tenantId: { in: tenantIds }` (solo servicesTenantId)
- **Línea 274-287:** Query de limpiezas disponibles con filtro incorrecto

### 2. `app/cleaner/cleanings/available/page.tsx`
- **Línea 67:** `getAccessibleTeamsForUser()` devuelve solo `servicesTenantId`
- **Línea 70-79:** Solo usa `PropertyTeam.findMany()`, no WGE
- **Línea 91:** Query usa `tenantId: { in: tenantIds }` (solo servicesTenantId)
- **Línea 94-104:** Query de limpiezas disponibles con filtro incorrecto

### 3. `lib/cleaner/getCleanerCleanings.ts`
- **Línea 46:** `getAccessibleTenantIdsForUser()` devuelve solo `servicesTenantId`
- **Línea 51-54:** ✅ SÍ usa `getPropertiesForCleanerTeamsViaWGE()` primero
- **Línea 92:** Query usa `tenantId: { in: tenantIds }` (solo servicesTenantId)
- **Problema:** Aunque obtiene `propertyIds` correctos vía WGE, el filtro de tenantId los excluye

### 4. `lib/cleaner/getAccessibleTenantIdsForUser.ts`
- **Línea 3-18:** Solo devuelve `tenantIds` de los Teams (servicesTenantId)
- **Problema:** No incluye `hostTenantId` derivado de WorkGroupExecutor

### 5. `lib/cleaner/getAccessibleTeamsForUser.ts`
- **Línea 3-30:** Similar a `getAccessibleTenantIdsForUser()`, solo devuelve `servicesTenantId`

---

## Conclusión

**Por qué el Host ve "nadie aceptó" pero el TL no puede aceptar:**

1. **Filtro de tenantId incorrecto:** Las queries de cleaner filtran por `tenantId: { in: [servicesTenantId] }`, pero las limpiezas están en `hostTenantId`. Esto excluye las limpiezas antes de aplicar otros filtros.

2. **Falta de uso de WorkGroupExecutor:** Algunas páginas (`app/cleaner/page.tsx`, `app/cleaner/cleanings/available/page.tsx`) solo usan `PropertyTeam`, no `getPropertiesForCleanerTeamsViaWGE()`. Si la propiedad está conectada SOLO vía WorkGroupExecutor, no aparecerá.

3. **Inconsistencia entre páginas:** `lib/cleaner/getCleanerCleanings.ts` usa WGE correctamente, pero aún tiene el problema del filtro de tenantId.

**Flujo esperado vs actual:**

**Esperado:**
1. Cleaner tiene membership en Team (servicesTenantId)
2. Team está conectado a Property vía WorkGroupExecutor (hostTenantId)
3. Query incluye ambos tenants: `tenantId IN (servicesTenantId, hostTenantId)`
4. Limpieza aparece como disponible

**Actual:**
1. Cleaner tiene membership en Team (servicesTenantId)
2. Team está conectado a Property vía WorkGroupExecutor (hostTenantId)
3. Query solo incluye servicesTenantId: `tenantId IN (servicesTenantId)`
4. Limpieza NO aparece (excluida por filtro de tenantId)

---

## Fix Aplicado

**Fecha:** 2025-01-XX  
**Estado:** ✅ Implementado

### Cambios Realizados

1. **Creado `lib/cleaner/getAccessibleHostTenantIdsForUser.ts`**
   - Helper que obtiene `hostTenantIds` accesibles vía WorkGroupExecutor
   - Solo devuelve `hostTenantIds`, no `servicesTenantIds`
   - Valida que los WorkGroups estén ACTIVE

2. **Creado `lib/cleaner/getAccessiblePropertiesAndTenants.ts`**
   - Helper canónico que unifica la lógica de obtención de propiedades accesibles
   - Prioriza WorkGroupExecutor sobre PropertyTeam
   - Devuelve `propertyIds` y `tenantIds` correctos (donde están las Cleanings)
   - Usado por `app/cleaner/page.tsx` y `app/cleaner/cleanings/available/page.tsx`

3. **Modificado `lib/cleaner/getCleanerCleanings.ts`**
   - Usa `getAccessibleHostTenantIdsForUser()` cuando hay propiedades vía WGE
   - Usa `tenantIds` de las Properties cuando usa PropertyTeam (fallback)
   - Filtra Cleanings por `tenantId: { in: cleaningTenantIds }` (correcto)

4. **Modificado `app/cleaner/page.tsx`**
   - Reemplazada lógica local de `PropertyTeam.findMany()` por `getAccessiblePropertiesAndTenants()`
   - Usa `cleaningTenantIds` en lugar de solo `servicesTenantId`

5. **Modificado `app/cleaner/cleanings/available/page.tsx`**
   - Reemplazada lógica local de `PropertyTeam.findMany()` por `getAccessiblePropertiesAndTenants()`
   - Usa `cleaningTenantIds` en lugar de solo `servicesTenantId`

### Resultado

- ✅ Las queries ahora filtran por `hostTenantId` cuando hay propiedades vía WGE
- ✅ Las queries filtran por `property.tenantId` cuando solo hay PropertyTeam
- ✅ Ambas páginas (`app/cleaner/page.tsx` y `app/cleaner/cleanings/available/page.tsx`) usan la misma lógica canónica
- ✅ No se ven limpiezas de hostTenants no vinculados al cleaner (seguridad multi-tenant mantenida)

### Archivos Modificados

- `lib/cleaner/getAccessibleHostTenantIdsForUser.ts` (nuevo)
- `lib/cleaner/getAccessiblePropertiesAndTenants.ts` (nuevo)
- `lib/cleaner/getCleanerCleanings.ts` (modificado)
- `app/cleaner/page.tsx` (modificado)
- `app/cleaner/cleanings/available/page.tsx` (modificado)

---

## Script de Diagnóstico

Se creó `scripts/debug/diagnose-cleaning-visibility-issue.ts` para validar este diagnóstico con datos reales.

**Uso:**
```bash
npx tsx scripts/debug/diagnose-cleaning-visibility-issue.ts <host-email> <cleaner-email>
```

**Ejemplo:**
```bash
npx tsx scripts/debug/diagnose-cleaning-visibility-issue.ts ranferi.ia@gmail.com itzel@hausdame.test
```

**Validación del Fix:**
- Antes: Query simulada con `servicesTenantId` devuelve 0 limpiezas
- Después: Query con `hostTenantIds` devuelve las limpiezas esperadas

