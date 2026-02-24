# Diagnóstico: Botón "Aceptar" no produce efecto

**Fecha:** 2025-01-XX  
**Estado:** ✅ Diagnóstico implementado

---

## Resumen

Se implementó instrumentación completa para diagnosticar por qué el botón "Aceptar" en `/cleaner/cleanings/available` no produce efecto visual ni asignación.

---

## Implementación Completa

### PASO A: Prevención de overlay (ListRow vs Botón)

**Problema identificado:**
- `ListRow` es un `<div>` con `onClick` que navega al detalle
- El botón "Aceptar" está dentro del mismo contenedor
- El click del botón podría propagarse al `onClick` del `ListRow`

**Solución implementada:**
- Creado componente cliente `AcceptButton.tsx` con `stopPropagation()` en form y botón
- Aumentado `z-index` del contenedor del botón de `z-10` a `z-50`
- Agregado `e.stopPropagation()` en ambos handlers (form y button)

**Archivos modificados:**
- `app/cleaner/cleanings/available/AcceptButton.tsx` (nuevo)
- `app/cleaner/cleanings/available/page.tsx` (actualizado para usar `AcceptButton`)

---

### PASO B: Logs de ejecución de server action (gated por DEBUG_LOGS)

**Logs implementados:**

1. **Al inicio de `acceptCleaning`:**
   ```typescript
   [acceptCleaning] START { cleaningId, returnTo }
   ```

2. **Después de resolver contexto:**
   ```typescript
   [acceptCleaning] Context { mode, userId, membershipsCount }
   ```

3. **Antes de cada redirect temprano:**
   - `[acceptCleaning] DENY: no cleaningId`
   - `[acceptCleaning] DENY: no memberships`
   - `[acceptCleaning] DENY: cleaning not found`
   - `[acceptCleaning] DENY: tenantId not accessible`
   - `[acceptCleaning] DENY: propertyId not accessible`
   - `[acceptCleaning] DENY: no propertyTeams found`
   - `[acceptCleaning] DENY: !isUnassigned`
   - `[acceptCleaning] DENY: !isInAllowedWindow`
   - `[acceptCleaning] DENY: future cleaning but team not active`
   - `[acceptCleaning] DENY: !myMembership`
   - `[acceptCleaning] DENY: ALREADY_TAKEN`

**Archivos modificados:**
- `app/cleaner/actions.ts` (líneas 20-52, 118-273)

---

### PASO C: Validación de DB update

**Implementado:**

1. **Estado antes de la transacción:**
   ```typescript
   [acceptCleaning] Cleaning state before TX {
     assignmentStatus,
     assignedMembershipId,
     assignedMemberId,
     scheduledDate,
     tenantId,
     propertyId
   }
   ```

2. **Si `current` no se encuentra en la transacción:**
   ```typescript
   [acceptCleaning] DENY: current not found in TX {
     currentState,
     expectedAssignmentStatus: "OPEN",
     expectedAssignedMembershipId: null,
     expectedAssignedMemberId: null,
     windowStart,
     windowEnd
   }
   ```

3. **Estado después del update (read back):**
   ```typescript
   [acceptCleaning] UPDATED OK {
     assignmentStatus,
     assignedMembershipId,
     assignedMemberId,
     teamId
   }
   ```

**Archivos modificados:**
- `app/cleaner/actions.ts` (líneas 123-142, 285-340)

---

### PASO D: Validación de returnTo/backHref

**Implementado:**

1. **Log del returnTo recibido y final:**
   ```typescript
   [acceptCleaning] SUCCESS, redirecting {
     returnTo: "original value or null",
     finalReturnTo: "/cleaner/cleanings/available or returnTo"
   }
   ```

2. **Lógica mejorada:**
   - Si `returnTo` es válido y empieza con `/cleaner`, usarlo
   - Si no, redirigir a `/cleaner/cleanings/available` (para que se vea el item desaparecer)
   - Aplicado también en el catch de `ALREADY_TAKEN`

**Archivos modificados:**
- `app/cleaner/actions.ts` (líneas 342-350, 351-357)

---

## Cómo Usar el Diagnóstico

### Activar logs:

```bash
DEBUG_LOGS=1 npm run dev
```

### Probar el flujo:

1. Ir a `/cleaner/cleanings/available`
2. Hacer click en "Aceptar" en una limpieza disponible
3. Revisar logs en terminal:
   - Si aparece `[acceptCleaning] START`: el form se disparó correctamente
   - Si aparece `[acceptCleaning] DENY:*`: ver el motivo exacto
   - Si aparece `[acceptCleaning] UPDATED OK`: el update fue exitoso
   - Si aparece `[acceptCleaning] SUCCESS, redirecting`: el redirect ocurrió

### Interpretación de logs:

**Si NO aparece ningún log:**
- El form no se está disparando (problema de overlay o JS)

**Si aparece `DENY: tenantId not accessible`:**
- El `hostTenantId` no está en `accessibleTenantIds` (problema de scoping)

**Si aparece `DENY: propertyId not accessible`:**
- La propiedad no está en `accessiblePropertyIds` (problema de WGE/PropertyTeam)

**Si aparece `DENY: current not found in TX`:**
- La limpieza cambió de estado entre la validación inicial y la transacción (race condition)

**Si aparece `UPDATED OK` pero no se ve cambio:**
- El redirect está yendo a la misma página (problema de returnTo)

---

## Evidencia Esperada

### Caso exitoso:
```
[acceptCleaning] START { cleaningId: "...", returnTo: "/cleaner/cleanings/available" }
[acceptCleaning] Context { mode: "membership", userId: "...", membershipsCount: 1 }
[acceptCleaning] Cleaning state before TX { assignmentStatus: "OPEN", ... }
[acceptCleaning] UPDATED OK { assignmentStatus: "ASSIGNED", assignedMembershipId: "..." }
[acceptCleaning] SUCCESS, redirecting { returnTo: "/cleaner/cleanings/available", finalReturnTo: "/cleaner/cleanings/available" }
```

### Caso con DENY:
```
[acceptCleaning] START { cleaningId: "...", returnTo: "..." }
[acceptCleaning] Context { mode: "membership", userId: "...", membershipsCount: 1 }
[acceptCleaning] DENY: tenantId not accessible { cleaningTenantId: "host-xxx", accessibleTenantIds: ["services-xxx"] }
```

---

## Archivos Creados/Modificados

### Nuevos:
- `app/cleaner/cleanings/available/AcceptButton.tsx`
- `docs/debug/DIAGNOSTICO_ACEPTAR_LIMPIEZA.md`

### Modificados:
- `app/cleaner/actions.ts` (logs y validaciones)
- `app/cleaner/cleanings/available/page.tsx` (uso de `AcceptButton`)

---

## Próximos Pasos

1. Activar `DEBUG_LOGS=1` y probar el flujo
2. Revisar logs en terminal para identificar la causa exacta
3. Aplicar fix mínimo según el diagnóstico obtenido

---

## Notas Técnicas

- Todos los logs están gated por `DEBUG_LOGS=1`
- Los logs son fáciles de revertir (solo eliminar las líneas con `if (DEBUG_LOGS)`)
- El componente `AcceptButton` es mínimo y reutilizable
- El `stopPropagation()` previene el overlay sin afectar otros comportamientos

