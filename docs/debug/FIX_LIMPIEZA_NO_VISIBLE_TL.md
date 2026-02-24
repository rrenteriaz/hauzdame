# Fix: Limpieza no visible para Team Leader

**Fecha:** 2025-01-XX  
**Estado:** ✅ Implementado

---

## Resumen

Se corrigió el bug donde las limpiezas no aparecían como "Disponibles" para el Team Leader, aunque el Host las veía como "Pendiente de aceptación".

**Causa raíz:** Las queries de cleaner filtraban por `tenantId` usando solo `servicesTenantId` (tenant del Team), pero las limpiezas están en `hostTenantId` (tenant del Host).

---

## Cambios Implementados

### 1. Nuevo Helper: `getAccessibleHostTenantIdsForUser.ts`

Obtiene los `hostTenantIds` accesibles por un cleaner vía WorkGroupExecutor.

```typescript
// lib/cleaner/getAccessibleHostTenantIdsForUser.ts
export async function getAccessibleHostTenantIdsForUser(userId: string): Promise<string[]>
```

**Lógica:**
- Obtiene TeamMemberships ACTIVE del usuario
- Busca WorkGroupExecutors ACTIVE para esos teams
- Verifica que los WorkGroups estén ACTIVE
- Devuelve `hostTenantIds` únicos

### 2. Nuevo Helper: `getAccessiblePropertiesAndTenants.ts`

Helper canónico que unifica la lógica de obtención de propiedades accesibles y tenantIds correctos.

```typescript
// lib/cleaner/getAccessiblePropertiesAndTenants.ts
export async function getAccessiblePropertiesAndTenants(
  userId: string,
  teamIds: string[]
): Promise<AccessiblePropertiesResult>
```

**Lógica:**
- Prioriza WorkGroupExecutor sobre PropertyTeam
- Si hay WGE: usa `hostTenantIds` para filtrar Cleanings
- Si solo hay PropertyTeam: usa `property.tenantId` (donde está la Cleaning)
- Devuelve `propertyIds` y `tenantIds` correctos

### 3. Modificado: `getCleanerCleanings.ts`

- Usa `getAccessibleHostTenantIdsForUser()` cuando hay propiedades vía WGE
- Usa `tenantIds` de las Properties cuando usa PropertyTeam (fallback)
- Filtra Cleanings por `tenantId: { in: cleaningTenantIds }` (correcto)

**Antes:**
```typescript
const tenantIds = await getAccessibleTenantIdsForUser(resolvedContext.user.id); // Solo servicesTenantId
const whereClause: any = {
  tenantId: { in: tenantIds }, // ❌ Filtra por servicesTenantId
  propertyId: { in: propertyIds },
};
```

**Después:**
```typescript
if (wgePropertyIds.length > 0) {
  propertyIds = wgePropertyIds;
  const hostTenantIds = await getAccessibleHostTenantIdsForUser(resolvedContext.user.id);
  cleaningTenantIds = hostTenantIds; // ✅ hostTenantIds
} else {
  // PropertyTeam fallback
  const propertyTenantIds = activePropertyTeams.map(pt => pt.property?.tenantId);
  cleaningTenantIds = Array.from(new Set(propertyTenantIds)); // ✅ property.tenantId
}

const whereClause: any = {
  tenantId: { in: cleaningTenantIds }, // ✅ Filtra por tenantId correcto
  propertyId: { in: propertyIds },
};
```

### 4. Modificado: `app/cleaner/page.tsx`

- Reemplazada lógica local de `PropertyTeam.findMany()` por `getAccessiblePropertiesAndTenants()`
- Usa `cleaningTenantIds` en lugar de solo `servicesTenantId`

**Antes:**
```typescript
const { activeTeamIds, tenantIds } = await getAccessibleTeamsForUser(user.id);
const propertyTeams = await prisma.propertyTeam.findMany({
  where: {
    tenantId: { in: tenantIds }, // ❌ Solo servicesTenantId
    teamId: { in: activeTeamIds },
  },
});
const baseWhere: any = {
  tenantId: { in: tenantIds }, // ❌ Solo servicesTenantId
  propertyId: { in: allowedPropertyIds },
};
```

**Después:**
```typescript
const { activeTeamIds } = await getAccessibleTeamsForUser(user.id);
const { propertyIds: allowedPropertyIds, tenantIds: cleaningTenantIds } =
  await getAccessiblePropertiesAndTenants(user.id, activeTeamIds);
const baseWhere: any = {
  tenantId: { in: cleaningTenantIds }, // ✅ TenantId correcto (hostTenantId o property.tenantId)
  propertyId: { in: allowedPropertyIds },
};
```

### 5. Modificado: `app/cleaner/cleanings/available/page.tsx`

- Reemplazada lógica local de `PropertyTeam.findMany()` por `getAccessiblePropertiesAndTenants()`
- Usa `cleaningTenantIds` en lugar de solo `servicesTenantId`

**Antes:**
```typescript
const { activeTeamIds, tenantIds } = await getAccessibleTeamsForUser(user.id);
const propertyTeams = await prisma.propertyTeam.findMany({
  where: {
    tenantId: { in: tenantIds }, // ❌ Solo servicesTenantId
    teamId: { in: activeTeamIds },
  },
});
const whereBase: any = {
  tenantId: { in: tenantIds }, // ❌ Solo servicesTenantId
  propertyId: { in: allowedPropertyIds },
};
```

**Después:**
```typescript
const { activeTeamIds } = await getAccessibleTeamsForUser(user.id);
const { propertyIds: allowedPropertyIds, tenantIds: cleaningTenantIds } =
  await getAccessiblePropertiesAndTenants(user.id, activeTeamIds);
const whereBase: any = {
  tenantId: { in: cleaningTenantIds }, // ✅ TenantId correcto
  propertyId: { in: allowedPropertyIds },
};
```

---

## Archivos Modificados

### Nuevos
- `lib/cleaner/getAccessibleHostTenantIdsForUser.ts`
- `lib/cleaner/getAccessiblePropertiesAndTenants.ts`

### Modificados
- `lib/cleaner/getCleanerCleanings.ts`
- `app/cleaner/page.tsx`
- `app/cleaner/cleanings/available/page.tsx`
- `docs/debug/DIAGNOSTICO_LIMPIEZA_NO_VISIBLE_TL.md`

---

## Validación

### Script de Diagnóstico

Usar el script existente para validar el fix:

```bash
npx tsx scripts/debug/diagnose-cleaning-visibility-issue.ts <host-email> <cleaner-email>
```

**Ejemplo:**
```bash
npx tsx scripts/debug/diagnose-cleaning-visibility-issue.ts ranferi.ia@gmail.com itzel@hausdame.test
```

### Resultados Esperados

**Antes del fix:**
- Query simulada con `servicesTenantId` devuelve 0 limpiezas
- Limpieza no aparece en `/cleaner` ni `/cleaner/cleanings/available`

**Después del fix:**
- Query con `hostTenantIds` devuelve las limpiezas esperadas
- Limpieza aparece como "Disponible" en `/cleaner` y `/cleaner/cleanings/available`
- Host sigue viendo "Pendiente de aceptación" hasta que alguien acepte

---

## Seguridad Multi-Tenant

✅ **Mantenida:** Solo se incluyen `hostTenantIds` cuando existe vínculo real vía:
- WorkGroupExecutor ACTIVE
- PropertyTeam (legacy)

✅ **No se ven limpiezas** de hostTenants no vinculados al cleaner.

---

## Notas Técnicas

- Los cambios son quirúrgicos y mínimos
- No se modificaron migraciones ni schema
- Se mantiene compatibilidad con PropertyTeam (legacy)
- Se prioriza WorkGroupExecutor sobre PropertyTeam
- Ambas páginas (`app/cleaner/page.tsx` y `app/cleaner/cleanings/available/page.tsx`) usan la misma lógica canónica

