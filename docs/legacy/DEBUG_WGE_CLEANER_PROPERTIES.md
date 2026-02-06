# DIAGNÓSTICO: WorkGroupExecutor → Propiedades para Cleaner

**Fecha:** 2025-01-XX  
**Problema:** Después de aceptar una invitación Host→Cleaner (WorkGroupInvite), el TL (Cleaner) NO ve:
- El/los WorkGroups conectados (o señales de conexión) en su UX de Cleaner
- Las propiedades asignadas vía WorkGroupExecutor (WGE) en `/cleaner/teams` y `/cleaner/teams/[teamId]`

---

## A) VERIFICACIÓN DE DATOS EN DB

### Script de Diagnóstico

Ejecutar: `npx tsx scripts/debug/diagnose-wge-cleaner-properties.ts`

**Caso de prueba:**
- Cleaner email: `cleaner2@hausdame.test`
- WorkGroup: `"Licha"`

**El script verifica:**
1. ✅ Usuario cleaner existe y tiene `tenantId` (Services tenant)
2. ✅ Team "Mi equipo" existe en Services tenant
3. ✅ TeamMembership ACTIVE existe para el cleaner
4. ✅ WorkGroup "Licha" existe
5. 🔍 WorkGroupExecutor ACTIVE para el teamId
6. 🔍 HostWorkGroupProperty para el workGroupId
7. 🔍 PropertyIds retornados por helper `getPropertiesForCleanerTeamViaWGE`
8. 🔍 Properties encontradas directamente

**Queries ejecutadas:**

```typescript
// 1. WorkGroupExecutor
prisma.workGroupExecutor.findMany({
  where: {
    teamId: teamId,
    status: "ACTIVE",
  },
})

// 2. HostWorkGroupProperty
prisma.hostWorkGroupProperty.findMany({
  where: {
    tenantId: hostTenantId,
    workGroupId: workGroupId,
  },
})

// 3. Helper
getPropertiesForCleanerTeamViaWGE(teamId)

// 4. Properties
prisma.property.findMany({
  where: {
    tenantId: hostTenantId,
    id: { in: propertyIdsFromHelper },
  },
})
```

---

## B) DIAGNÓSTICO DEL HELPER WGE

### Archivo: `lib/workgroups/getPropertiesForCleanerTeamViaWGE.ts`

#### Función: `getPropertiesForCleanerTeamViaWGE(teamId: string)`

**Entrada:**
- `teamId`: ID del Team (Services domain)

**Salida:**
- `string[]`: Array de propertyIds accesibles

**Flujo:**
1. Buscar `WorkGroupExecutor` ACTIVE donde `teamId = X`
2. Agrupar por `hostTenantId` y obtener `workGroupIds` únicos
3. Para cada `hostTenantId`, buscar `HostWorkGroupProperty` donde:
   - `tenantId = hostTenantId` ✅
   - `workGroupId IN (workGroupIds)` ✅
   - `property.isActive = true` ✅
4. Retornar `propertyIds` únicos

**Filtros exactos:**

```typescript
// Paso 1: WorkGroupExecutor
where: {
  teamId,           // ✅ Correcto
  status: "ACTIVE", // ✅ Correcto
}

// Paso 3: HostWorkGroupProperty
where: {
  tenantId: hostTenantId,                    // ✅ Correcto (usa hostTenantId, NO servicesTenantId)
  workGroupId: { in: Array.from(workGroupIds) }, // ✅ Correcto
  property: {
    isActive: true,                          // ✅ Correcto
  },
}
```

**Riesgos identificados:**
- ✅ Filtra por `teamId` correcto
- ✅ Usa `hostTenantId` para consultar `HostWorkGroupProperty` (NO `servicesTenantId`)
- ✅ Agrupa correctamente por `hostTenantId` antes de consultar propiedades
- ✅ Deduplica `propertyIds` con `Set`
- ✅ Retorna solo `propertyIds` (no objetos completos)

**Conclusión:** El helper parece correcto. ✅

---

#### Función: `getPropertiesForCleanerTeamsViaWGE(teamIds: string[])`

**Entrada:**
- `teamIds`: Array de IDs de Teams (Services domain)

**Salida:**
- `string[]`: Array de propertyIds accesibles (consolidado de todos los teams)

**Flujo:** Similar a la función individual, pero para múltiples teams.

**Filtros exactos:**

```typescript
where: {
  teamId: { in: teamIds }, // ✅ Correcto
  status: "ACTIVE",        // ✅ Correcto
}
```

**Conclusión:** El helper parece correcto. ✅

---

## C) DIAGNÓSTICO DE PÁGINAS CLEANER

### 1. `/cleaner/teams` (Listado)

**Archivo:** `app/cleaner/teams/page.tsx`

**Líneas relevantes:** 92-183

**Flujo:**
1. Obtiene `teamIds` de `TeamMembership` ACTIVE del usuario
2. Llama a `getPropertiesForCleanerTeamsViaWGE(teamIds)` (línea 98)
3. Si `wgePropertyIds.length > 0`:
   - Obtiene `WorkGroupExecutors` para estos teams (líneas 102-112)
   - Agrupa por `hostTenantId` y `workGroupId` (líneas 114-128)
   - Consulta `HostWorkGroupProperty` por cada `hostTenantId` (líneas 134-147)
   - Cuenta propiedades únicas por `teamId` (líneas 149-164)
4. Si `wgePropertyIds.length === 0`:
   - Fallback a `PropertyTeam.groupBy` (líneas 168-182)

**Problema identificado:** ❌

En las líneas 134-147, el código hace:

```typescript
const properties = await prisma.hostWorkGroupProperty.findMany({
  where: {
    tenantId: hostTenantId,
    workGroupId: { in: Array.from(workGroupIds) },
    propertyId: { in: wgePropertyIds }, // ⚠️ PROBLEMA AQUÍ
    property: {
      isActive: true,
    },
  },
})
```

**El filtro `propertyId: { in: wgePropertyIds }` es REDUNDANTE y puede causar problemas:**
- `wgePropertyIds` ya viene de `getPropertiesForCleanerTeamsViaWGE`, que ya filtró por `HostWorkGroupProperty`
- Este filtro adicional puede estar excluyendo propiedades válidas si hay alguna discrepancia
- Además, está filtrando por `propertyId` ANTES de obtener las propiedades del WorkGroup, lo cual es lógico pero innecesario

**Sin embargo, el problema REAL es más sutil:**

El código está intentando contar propiedades por `teamId`, pero la lógica de agrupación puede estar perdiendo la relación correcta entre `workGroupId` y `teamId` cuando hay múltiples `hostTenantIds`.

**Conclusión:** ⚠️ Posible bug en la lógica de conteo, pero el helper principal está bien.

---

### 2. `/cleaner/teams/[teamId]` (Detalle)

**Archivo:** `app/cleaner/teams/[teamId]/page.tsx`

**Líneas relevantes:** 63-119

**Flujo:**
1. Llama a `getPropertiesForCleanerTeamViaWGE(team.id)` (línea 65)
2. Si `wgePropertyIds.length > 0`:
   - Consulta `Property` directamente con `id IN (wgePropertyIds)` (líneas 71-89)
   - **PROBLEMA:** ❌ NO filtra por `tenantId` (líneas 71-74)
3. Si `wgePropertyIds.length === 0`:
   - Fallback a `PropertyTeam.findMany` (líneas 98-119)

**Problema crítico identificado:** ❌

```typescript
const wgeProperties = await prisma.property.findMany({
  where: {
    id: { in: wgePropertyIds },
    isActive: true,
  },
  // ⚠️ FALTA: tenantId: hostTenantId
})
```

**Riesgo:**
- Si hay propiedades con el mismo ID en diferentes tenants (aunque es poco probable con CUIDs), podría traer propiedades incorrectas
- Más importante: **NO está usando el `hostTenantId`** que viene del `WorkGroupExecutor`, lo cual es inconsistente con el resto del código

**Solución esperada:**

El helper `getPropertiesForCleanerTeamViaWGE` debería retornar objetos con `{ propertyId, hostTenantId }` o la página debería obtener el `hostTenantId` de los `WorkGroupExecutors` y filtrar por él.

**Conclusión:** 🔴 **BUG CONFIRMADO** - Falta filtrar por `tenantId` en la consulta de Properties.

---

## D) DIAGNÓSTICO DEL CLAIM ENDPOINT

### Archivo: `app/api/host-workgroup-invites/[token]/claim/route.ts`

**Líneas relevantes:** 72-163

**Flujo:**
1. Valida usuario y invite
2. Resuelve contexto del cleaner (asegura tenant y team "Mi equipo") (líneas 77-117)
3. Obtiene `hostTenantId` del `invite.workGroup.tenantId` (línea 119) ✅
4. Obtiene `workGroupId` del `invite.workGroupId` (línea 120) ✅
5. Upsert `WorkGroupExecutor` (líneas 126-145) ✅

**Verificación del upsert:**

```typescript
await tx.workGroupExecutor.upsert({
  where: {
    hostTenantId_workGroupId_teamId: {
      hostTenantId,    // ✅ Correcto (viene de invite.workGroup.tenantId)
      workGroupId,     // ✅ Correcto (viene de invite.workGroupId)
      teamId,          // ✅ Correcto (viene de ensureCleanerPersonalTeam)
    },
  },
  create: {
    hostTenantId,      // ✅ Correcto
    workGroupId,       // ✅ Correcto
    servicesTenantId,  // ✅ Correcto (viene de cleanerContext.homeTenantId)
    teamId,            // ✅ Correcto
    status: "ACTIVE",  // ✅ Correcto
  },
  update: {
    status: "ACTIVE",  // ✅ Correcto
    servicesTenantId,  // ✅ Correcto (asegura actualización)
  },
})
```

**Conclusión:** ✅ El claim endpoint parece correcto.

---

## E) TABLA "EXPECTATIVA VS REALIDAD"

| Componente | Expectativa | Realidad | Estado |
|------------|-------------|----------|--------|
| **Claim crea WGE** | `WorkGroupExecutor` con `status=ACTIVE`, `hostTenantId`, `workGroupId`, `teamId`, `servicesTenantId` correctos | ✅ Parece correcto según código | ✅ |
| **Helper WGE retorna propertyIds** | Array de `propertyIds` únicos accesibles vía `WorkGroupExecutor` | ✅ Helper parece correcto | ✅ |
| **UI lista propiedades** | `/cleaner/teams` muestra conteo correcto | ⚠️ Posible bug en lógica de conteo | ⚠️ |
| **UI detalle propiedades** | `/cleaner/teams/[teamId]` lista propiedades correctas | 🔴 **BUG:** No filtra por `tenantId` | 🔴 |

---

## F) EVIDENCIA DE CÓDIGO

### Trazado completo del flujo:

```
1. Claim Invite
   └─> app/api/host-workgroup-invites/[token]/claim/route.ts
       └─> resolveCleanerContext() → obtiene teamId y servicesTenantId
       └─> workGroupExecutor.upsert() → crea WGE con hostTenantId, workGroupId, teamId, status=ACTIVE ✅

2. Helper WGE
   └─> lib/workgroups/getPropertiesForCleanerTeamViaWGE.ts
       └─> getPropertiesForCleanerTeamViaWGE(teamId)
           └─> workGroupExecutor.findMany({ teamId, status: "ACTIVE" }) ✅
           └─> hostWorkGroupProperty.findMany({ tenantId: hostTenantId, workGroupId IN (...) }) ✅
           └─> Retorna propertyIds únicos ✅

3. UI Listado (/cleaner/teams)
   └─> app/cleaner/teams/page.tsx
       └─> getPropertiesForCleanerTeamsViaWGE(teamIds) ✅
       └─> Lógica de conteo con filtro redundante ⚠️

4. UI Detalle (/cleaner/teams/[teamId])
   └─> app/cleaner/teams/[teamId]/page.tsx
       └─> getPropertiesForCleanerTeamViaWGE(teamId) ✅
       └─> property.findMany({ id IN (wgePropertyIds) }) 🔴 FALTA tenantId
```

---

## G) HIPÓTESIS

### Hipótesis Principal (1)

**El problema está en `/cleaner/teams/[teamId]/page.tsx` línea 71-74:**

La consulta de `Property` NO filtra por `tenantId`, lo cual puede causar:
1. Traer propiedades de tenants incorrectos si hay IDs duplicados (poco probable pero posible)
2. Inconsistencia con el resto del código que siempre filtra por `hostTenantId`

**Evidencia:**
- El helper `getPropertiesForCleanerTeamViaWGE` retorna solo `propertyIds`, sin información de `hostTenantId`
- La página necesita obtener el `hostTenantId` de los `WorkGroupExecutors` para filtrar correctamente

---

### Hipótesis Secundarias (2-3)

**Hipótesis 2:** El WorkGroup NO tiene propiedades asignadas (`HostWorkGroupProperty = 0`)

**Evidencia:**
- Si el script de diagnóstico muestra `HostWorkGroupProperties encontradas: 0`, entonces NO es un bug, es un problema de datos
- El Host debe asignar propiedades al WorkGroup desde la UX

**Hipótesis 3:** El `WorkGroupExecutor` NO se está creando correctamente durante el claim

**Evidencia:**
- Si el script muestra `WorkGroupExecutors encontrados: 0`, entonces el problema está en el claim endpoint
- Verificar logs del servidor durante el claim

---

## H) LISTA DE FIXES CANDIDATOS

### Fix 1: Filtrar por `tenantId` en `/cleaner/teams/[teamId]/page.tsx` (ALTA PRIORIDAD)

**Archivo:** `app/cleaner/teams/[teamId]/page.tsx`  
**Líneas:** 63-89

**Problema:** La consulta de `Property` no filtra por `tenantId`.

**Solución:**

```typescript
// Obtener hostTenantIds de los WorkGroupExecutors
const executors = await prisma.workGroupExecutor.findMany({
  where: {
    teamId: team.id,
    status: "ACTIVE",
  },
  select: {
    hostTenantId: true,
  },
});

const hostTenantIds = Array.from(new Set(executors.map(e => e.hostTenantId)));

// Luego filtrar Properties por tenantId
const wgeProperties = await prisma.property.findMany({
  where: {
    id: { in: wgePropertyIds },
    tenantId: { in: hostTenantIds }, // ✅ Agregar este filtro
    isActive: true,
  },
  // ... resto del código
});
```

**Impacto:** ALTO - Asegura que solo se muestren propiedades del tenant correcto.

---

### Fix 2: Mejorar helper para retornar `hostTenantId` (MEDIA PRIORIDAD)

**Archivo:** `lib/workgroups/getPropertiesForCleanerTeamViaWGE.ts`

**Problema:** El helper solo retorna `propertyIds`, sin información de `hostTenantId`.

**Solución:**

```typescript
export async function getPropertiesForCleanerTeamViaWGE(
  teamId: string
): Promise<Array<{ propertyId: string; hostTenantId: string }>> {
  // ... código existente ...
  
  // Retornar objetos con propertyId y hostTenantId
  const result: Array<{ propertyId: string; hostTenantId: string }> = [];
  for (const [hostTenantId, workGroupIds] of workGroupIdsByTenant.entries()) {
    const properties = await prisma.hostWorkGroupProperty.findMany({
      // ... código existente ...
    });
    
    for (const prop of properties) {
      result.push({
        propertyId: prop.propertyId,
        hostTenantId,
      });
    }
  }
  
  return result;
}
```

**Impacto:** MEDIO - Mejora la trazabilidad pero requiere cambios en todas las páginas que usan el helper.

---

### Fix 3: Simplificar lógica de conteo en `/cleaner/teams/page.tsx` (BAJA PRIORIDAD)

**Archivo:** `app/cleaner/teams/page.tsx`  
**Líneas:** 92-183

**Problema:** La lógica de conteo es compleja y tiene un filtro redundante.

**Solución:**

```typescript
// Simplificar: usar directamente el helper y contar por teamId
const propertyCountsMap = new Map<string, number>();

if (teamIds.length > 0) {
  const { getPropertiesForCleanerTeamsViaWGE } = await import("@/lib/workgroups/getPropertiesForCleanerTeamViaWGE");
  const wgePropertyIds = await getPropertiesForCleanerTeamsViaWGE(teamIds);
  
  if (wgePropertyIds.length > 0) {
    // Obtener WorkGroupExecutors y contar propiedades por teamId
    const executors = await prisma.workGroupExecutor.findMany({
      where: {
        teamId: { in: teamIds },
        status: "ACTIVE",
      },
      select: {
        teamId: true,
        workGroupId: true,
        hostTenantId: true,
      },
    });
    
    // Agrupar por teamId y contar propiedades únicas
    const propertiesByTeamId = new Map<string, Set<string>>();
    // ... lógica simplificada sin filtro redundante ...
  }
}
```

**Impacto:** BAJO - Mejora mantenibilidad pero no corrige bugs críticos.

---

## I) RECOMENDACIÓN DEL SIGUIENTE PASO MÍNIMO

### Paso 1: Ejecutar script de diagnóstico

```bash
npx tsx scripts/debug/diagnose-wge-cleaner-properties.ts
```

**Objetivo:** Obtener evidencia real de los datos en DB:
- ¿Existe `WorkGroupExecutor` ACTIVE?
- ¿Existe `HostWorkGroupProperty` para el WorkGroup?
- ¿El helper retorna `propertyIds`?

---

### Paso 2: Aplicar Fix 1 (si el script confirma que hay datos)

**Archivo:** `app/cleaner/teams/[teamId]/page.tsx`

**Cambio mínimo:** Agregar filtro por `tenantId` en la consulta de `Property`.

**Verificación:** Después del fix, verificar que las propiedades se muestran correctamente en `/cleaner/teams/[teamId]`.

---

### Paso 3: Verificar Fix 1 funciona

1. Aceptar invitación Host→Cleaner (WorkGroupInvite)
2. Navegar a `/cleaner/teams`
3. Verificar que el conteo de propiedades es correcto
4. Navegar a `/cleaner/teams/[teamId]`
5. Verificar que las propiedades se listan correctamente

---

## J) NOTAS ADICIONALES

### Si el script muestra `HostWorkGroupProperties encontradas: 0`

**NO es un bug**, es un problema de datos:
- El Host debe asignar propiedades al WorkGroup desde la UX de Host
- Verificar: `/host/workgroups/[id]` tiene funcionalidad para asignar propiedades

### Si el script muestra `WorkGroupExecutors encontrados: 0`

**El problema está en el claim:**
- Verificar logs del servidor durante el claim
- Verificar que `ensureCleanerPersonalTeam` retorna el `teamId` correcto
- Verificar que el `hostTenantId` viene correctamente del `invite.workGroup.tenantId`

### Si el helper retorna `propertyIds` pero la UI muestra 0

**El problema está en el mapping/UI:**
- Verificar que la página está usando el helper correctamente
- Verificar que el formato de datos es compatible con lo que espera la UI

---

## K) ARCHIVOS INVOLUCRADOS

### Código relacionado:

1. **Claim endpoint:**
   - `app/api/host-workgroup-invites/[token]/claim/route.ts`

2. **Helper WGE:**
   - `lib/workgroups/getPropertiesForCleanerTeamViaWGE.ts`

3. **UI Cleaner:**
   - `app/cleaner/teams/page.tsx` (listado)
   - `app/cleaner/teams/[teamId]/page.tsx` (detalle)
   - `app/cleaner/teams/[teamId]/PropertyAssignmentsSection.tsx`

4. **Script de diagnóstico:**
   - `scripts/debug/diagnose-wge-cleaner-properties.ts`

---

**FIN DEL DIAGNÓSTICO**

