# Diagnóstico: Inconsistencias en Contadores de Limpiezas (Cleaner)

**Fecha:** 2025-01-XX  
**Estado:** Diagnosticado

---

## Problemas Identificados

### 1. Card "Mis limpiezas" muestra 1 pero lista está vacía

**Causa:**
- En `app/cleaner/page.tsx` línea 311: `myCount` filtra por `status === "PENDING" || status === "IN_PROGRESS"`
- En `app/cleaner/cleanings/all/page.tsx` línea 300: La query NO filtra por status (solo por `assignedMembershipId`)
- Resultado: El count incluye limpiezas COMPLETED, pero la vista puede estar filtrando por status diferente o no filtrar correctamente

**Evidencia:**
```typescript
// app/cleaner/page.tsx:311
myCount = myCleanings.filter((c: any) => c.status === "PENDING" || c.status === "IN_PROGRESS").length;

// app/cleaner/cleanings/all/page.tsx:300
// No filtra por status en el whereClause base, solo si params?.status existe
```

---

### 2. Card "Próximas limpiezas" muestra 0 pero debería mostrar 1

**Causa:**
- En `app/cleaner/page.tsx` línea 305-309: `upcomingCount` filtra `myCleanings` por fecha (próximos 7 días)
- Pero `myCleanings` ya está filtrado por `assignedMembershipId` y puede no incluir todas las limpiezas asignadas
- La vista `/cleaner/cleanings/all?scope=upcoming` usa un rango diferente o no filtra correctamente

**Evidencia:**
```typescript
// app/cleaner/page.tsx:305-309
const upcomingCleanings = myCleanings.filter((c: any) => {
  const d = new Date(c.scheduledDate);
  return d >= now && d <= sevenDaysLater;
});
upcomingCount = upcomingCleanings.length;

// app/cleaner/cleanings/all/page.tsx:209-212
const sevenDaysLater = new Date();
sevenDaysLater.setDate(now.getDate() + 7);
sevenDaysLater.setHours(23, 59, 59, 999);
// Pero puede haber diferencias en el cálculo de "now" o en los filtros base
```

---

### 3. Inconsistencia en tenantId filtering

**Causa:**
- En `app/cleaner/page.tsx` línea 217-218: Usa `getAccessiblePropertiesAndTenants` (canónico, incluye hostTenantIds)
- En `app/cleaner/cleanings/all/page.tsx` línea 159: Usa `PropertyTeam.findMany` directamente con `accessibleTenantIds` que puede incluir solo `servicesTenantId`
- Resultado: Las limpiezas en `hostTenantId` pueden no aparecer en `/cleaner/cleanings/all`

**Evidencia:**
```typescript
// app/cleaner/page.tsx:217-218
const { propertyIds: allowedPropertyIds, tenantIds: cleaningTenantIds } =
  await getAccessiblePropertiesAndTenants(user.id, activeTeamIds);

// app/cleaner/cleanings/all/page.tsx:159
const propertyTeams = await (prisma as any).propertyTeam.findMany({
  where: {
    tenantId: { in: accessibleTenantIds }, // Puede ser solo servicesTenantId
    teamId: { in: teamIdsForScope },
  },
});
```

---

### 4. Falta de filtro por propertyId en base query

**Causa:**
- En `app/cleaner/cleanings/all/page.tsx` línea 267-270: El `whereClause` base NO incluye `propertyId` en el filtro
- Solo se agrega si `propertyIdParam` existe (línea 286-288)
- Pero las limpiezas deben estar limitadas a propiedades accesibles vía WGE o PropertyTeam

**Evidencia:**
```typescript
// app/cleaner/cleanings/all/page.tsx:267-270
const whereClause: any = {
  tenantId: { in: accessibleTenantIds },
  scheduledDate: { gte: dateFrom, lte: dateTo },
};
// NO incluye propertyId: { in: allowedPropertyIds }
```

---

## Clasificación Esperada (Canónica)

### Disponible:
- `assignmentStatus = "OPEN"`
- `assignedMembershipId IS NULL`
- `assignedMemberId IS NULL`
- `status != "CANCELLED"`
- `scheduledDate >= availabilityStart` (futuras)

### Mis limpiezas (asignadas a mí):
- `assignmentStatus = "ASSIGNED"`
- `assignedMembershipId IN myMembershipIds` (membership mode)
- `assignedMemberId = myLegacyMemberId` (legacy mode)
- `status IN ["PENDING", "IN_PROGRESS"]` (para count de cards)
- `status IN ["PENDING", "IN_PROGRESS", "COMPLETED"]` (para vista "Todas")

### Próximas:
- Subconjunto de "Mis limpiezas"
- `scheduledDate BETWEEN now AND now+7d`
- `status IN ["PENDING", "IN_PROGRESS"]`

### Historial:
- `status = "COMPLETED"` (o `CANCELLED` si aplica)
- `assignedMembershipId IN myMembershipIds` (membership mode)
- `assignedMemberId = myLegacyMemberId` (legacy mode)
- NO debe incluir `OPEN`

---

## Solución Propuesta

1. Crear `lib/cleaner/cleanings/query.ts` con funciones canónicas:
   - `getCleanerScope(ctx)`: Retorna scope unificado (propertyIds, tenantIds, teamIds, membershipIds)
   - `getCleanerCleaningsList(params)`: Retorna lista con filtros consistentes
   - `getCleanerCleaningsCounts(params)`: Retorna counts usando la misma lógica que la lista

2. Migrar todas las vistas a usar el query layer canónico

3. Asegurar que todos los filtros base incluyan:
   - `propertyId IN allowedPropertyIds` (vía WGE o PropertyTeam)
   - `tenantId IN cleaningTenantIds` (hostTenantIds cuando hay WGE)

---

## Notas

- El problema principal es que cada vista recalcula accesibilidad por su cuenta
- Algunas usan `getAccessiblePropertiesAndTenants` (correcto), otras usan `PropertyTeam.findMany` directamente (incorrecto)
- Los contadores y las vistas usan diferentes filtros base, causando inconsistencias

---

## Fix Aplicado

**Fecha:** 2025-01-XX

### Cambios realizados:

1. **Fix del scope UPCOMING en query layer:**
   - `getCleanerCleaningsList()` con `scope="upcoming"` ahora usa `startOfToday` (00:00:00) en lugar de `now` (hora actual)
   - `getCleanerCleaningsCounts()` para `upcoming7dCount` también usa `startOfToday`
   - Esto asegura que limpiezas de hoy a horas pasadas aparezcan en "Próximas"

2. **Fix de navegación en all/page.tsx:**
   - Tab "Próximas" ahora usa `startOfToday` para `dateFrom` en lugar de `now`
   - Consistente con el query layer

3. **Migración completa de /cleaner/page.tsx:**
   - Reemplazadas queries ad-hoc por `getCleanerCleaningsList()` canónico
   - Listas ahora usan el mismo filtro base que los contadores
   - Eliminado drift entre counts y listas

### Resultado:
- Cards y listas ahora coinciden exactamente
- "Próximas" incluye limpiezas de hoy aunque la hora ya haya pasado
- Sin duplicación de lógica de accesibilidad

