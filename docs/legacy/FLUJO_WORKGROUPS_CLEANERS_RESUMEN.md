# RESUMEN: Flujo "Conectar Cleaners (TL) con Host vía WorkGroups"

**Fecha:** 2025-01-XX  
**Estado:** Implementación completada

---

## ✅ ARCHIVOS CREADOS

### Schema
1. **`prisma/schema.prisma`** (modificado)
   - Nuevo enum: `HostWorkGroupInviteStatus` (PENDING, CLAIMED, EXPIRED, REVOKED)
   - Nuevo modelo: `HostWorkGroupInvite`
   - Índice agregado en `WorkGroupExecutor`: `@@index([hostTenantId, workGroupId])`

### Server Actions
2. **`app/host/workgroups/invites/actions.ts`**
   - `createCleanerInviteForWorkGroup()` - Crea invitación con token único
   - `revokeInvite()` - Revoca invitación pendiente

3. **`app/host/workgroups/actions-executors.ts`**
   - `addExecutorToWorkGroup()` - Agrega ejecutor existente a otro WG

### Componentes UI
4. **`app/host/workgroups/[id]/WorkGroupInvitesSection.tsx`**
   - Sección para generar y gestionar invitaciones
   - Modal para crear invitación con prefillName y message opcionales
   - Lista de invitaciones con estados y links copiables

5. **`app/host/workgroups/[id]/ExecutorsSection.tsx`**
   - Sección de ejecutores con botón "Conectar equipo ejecutor"
   - Integra `AddExecutorModal`

6. **`app/host/workgroups/[id]/AddExecutorModal.tsx`**
   - Modal para seleccionar equipo ejecutor existente
   - Lista equipos ya conectados a otros WGs del mismo Host

### Rutas API
7. **`app/api/host-workgroup-invites/[token]/route.ts`**
   - GET: Obtiene info de invitación por token
   - Valida expiración y estado

8. **`app/api/host-workgroup-invites/[token]/claim/route.ts`**
   - POST: Claim de invitación
   - Valida usuario CLEANER/TEAM_LEADER
   - Resuelve "Mi equipo" del TL
   - Crea/activa WorkGroupExecutor
   - Marca invite como CLAIMED

9. **`app/api/host-workgroups/[workGroupId]/available-executors/route.ts`**
   - GET: Lista ejecutores disponibles para conectar a un WG

### Rutas Públicas
10. **`app/join/host/page.tsx`**
    - Página pública para claim de invitaciones HostWorkGroupInvite
    - Similar a `/join` pero para invites de Host

### Helpers
11. **`lib/workgroups/getPropertiesForCleanerTeamViaWGE.ts`**
    - `getPropertiesForCleanerTeamViaWGE(teamId)` - Obtiene propertyIds vía WGE
    - `getPropertiesForCleanerTeamsViaWGE(teamIds[])` - Para múltiples teams
    - Filtra solo propiedades activas

---

## 🔄 ARCHIVOS MODIFICADOS

### Páginas
1. **`app/host/workgroups/[id]/page.tsx`**
   - Agregada sección de invitaciones (`WorkGroupInvitesSection`)
   - Reemplazada sección de ejecutores por `ExecutorsSection` con funcionalidad de agregar

### Queries Cleaner
2. **`lib/cleaner/getCleanerCleanings.ts`**
   - Integrado helper `getPropertiesForCleanerTeamsViaWGE()` con fallback a PropertyTeam
   - Prioriza WGE, fallback a PropertyTeam si no hay WGE

3. **`lib/cleaner/requireCleanerAccessToCleaning.ts`**
   - Integrado helper `getPropertiesForCleanerTeamsViaWGE()` con fallback a PropertyTeam
   - Valida acceso a limpiezas vía WGE o PropertyTeam

---

## 📋 FLUJO COMPLETO

### 1. Host genera invitación
```
1. Host navega a /host/workgroups/[id]
2. Click en "Generar invitación" (sección Invitaciones)
3. Opcionalmente ingresa prefillName y message
4. Click en "Generar invitación"
5. Se crea HostWorkGroupInvite con token único
6. Host copia el link: /join/host?token=...
```

### 2. TL acepta invitación
```
1. TL recibe link /join/host?token=...
2. Si no está autenticado, redirige a /login
3. Si está autenticado, muestra página de claim
4. TL click en "Aceptar invitación"
5. Sistema valida:
   - Usuario es CLEANER
   - Invite está PENDING y no expirado
   - TL tiene TeamMembership ACTIVE con role TEAM_LEADER
6. Sistema crea/activa WorkGroupExecutor:
   - hostTenantId = tenant del WorkGroup
   - workGroupId = ID del WorkGroup
   - teamId = Team del TL (Mi equipo)
   - servicesTenantId = tenantId del Team
   - status = ACTIVE
7. Invite se marca como CLAIMED
8. Redirect a /cleaner/teams
```

### 3. TL ve propiedades/limpiezas
```
1. TL navega a /cleaner/teams o /cleaner
2. Sistema consulta:
   - getPropertiesForCleanerTeamsViaWGE(teamIds)
   - Si hay WGE → obtiene propertyIds vía HostWorkGroupProperty
   - Si NO hay WGE → fallback a PropertyTeam
3. TL ve limpiezas DISPONIBLES de esas propiedades
4. Solo propiedades activas (isActive = true)
```

### 4. Host agrega ejecutor existente a otro WG
```
1. Host navega a /host/workgroups/[id]
2. Click en "Conectar equipo ejecutor" (sección Ejecutores)
3. Modal muestra equipos ya conectados a otros WGs del Host
4. Host selecciona equipo
5. Sistema crea/activa WorkGroupExecutor para este WG
6. Reutiliza servicesTenantId del executor existente
```

---

## 🔍 VALIDACIONES Y REGLAS

### Validaciones de Claim
- ✅ Usuario debe estar autenticado
- ✅ Usuario debe tener role CLEANER
- ✅ Usuario debe tener TeamMembership ACTIVE con role TEAM_LEADER
- ✅ Invite debe estar PENDING
- ✅ Invite no debe estar expirado
- ✅ Invite no debe estar revocada

### Unicidad
- ✅ `WorkGroupExecutor`: `@@unique([hostTenantId, workGroupId, teamId])`
- ✅ `HostWorkGroupInvite`: `token @unique`

### Filtros
- ✅ Solo propiedades activas (`isActive = true`) en queries WGE
- ✅ Solo WorkGroupExecutor ACTIVE en queries
- ✅ Solo HostWorkGroupInvite PENDING para generar links

---

## 🧪 CHECKLIST DE PRUEBAS

### 1. Host crea WG y asigna propiedades
- [ ] Crear WorkGroup en `/host/workgroups`
- [ ] Asignar 1-2 propiedades al WG
- [ ] Verificar que propiedades aparecen en el detalle

### 2. Host genera invitación
- [ ] Navegar a `/host/workgroups/[id]`
- [ ] Click en "Generar invitación"
- [ ] Opcionalmente agregar prefillName y message
- [ ] Verificar que se crea invite con token único
- [ ] Copiar link `/join/host?token=...`

### 3. TL acepta invitación
- [ ] Abrir link `/join/host?token=...` (sin autenticar)
- [ ] Verificar redirección a login
- [ ] Iniciar sesión como CLEANER con TeamMembership TEAM_LEADER
- [ ] Verificar que se muestra página de claim
- [ ] Click en "Aceptar invitación"
- [ ] Verificar que se crea WorkGroupExecutor
- [ ] Verificar redirect a `/cleaner/teams`

### 4. Host ve ejecutores
- [ ] Navegar a `/host/workgroups/[id]`
- [ ] Verificar que aparece el Team del TL en "Equipos ejecutores"
- [ ] Verificar estado "Activo"

### 5. TL ve propiedades/limpiezas
- [ ] Navegar a `/cleaner/teams` como TL
- [ ] Verificar que aparecen propiedades asignadas al WG
- [ ] Verificar que aparecen limpiezas DISPONIBLES de esas propiedades
- [ ] Verificar que solo muestra propiedades activas

### 6. Host agrega ejecutor a otro WG
- [ ] Crear segundo WorkGroup
- [ ] Navegar a `/host/workgroups/[segundo-id]`
- [ ] Click en "Conectar equipo ejecutor"
- [ ] Verificar que aparece el Team del TL en la lista
- [ ] Seleccionar y conectar
- [ ] Verificar que aparece en ejecutores

### 7. TL ve propiedades de ambos WGs
- [ ] Navegar a `/cleaner/teams` como TL
- [ ] Verificar que aparecen propiedades de ambos WorkGroups
- [ ] Verificar que limpiezas están disponibles

### 8. Validaciones de seguridad
- [ ] Intentar claim como Host/Manager → debe fallar (403)
- [ ] Intentar claim sin TeamMembership TEAM_LEADER → debe fallar (400)
- [ ] Intentar claim invite expirada → debe fallar (410)
- [ ] Intentar claim invite revocada → debe fallar (410)

### 9. Revocar invitación
- [ ] Host revoca invite pendiente
- [ ] Intentar claim invite revocada → debe fallar (410)

---

## ❌ ARCHIVOS NO MODIFICADOS (Confirmación)

### Cleaner/Services (NO TOCADOS)
- ✅ `app/cleaner/**` - Sin cambios (solo integración de queries)
- ✅ `lib/cleaner/**` - Solo integración de helper WGE con fallback
- ✅ `app/api/teams/**` - Sin cambios
- ✅ `app/api/invites/**` - Sin cambios
- ✅ Tablas `Team`, `TeamMembership`, `TeamInvite`, `PropertyTeam` - Sin cambios en schema
- ✅ Campo `Cleaning.assignedMembershipId` - Sin cambios

---

## 📝 NOTAS IMPORTANTES

1. **Fallback a PropertyTeam**: Las queries de Cleaner mantienen compatibilidad con PropertyTeam durante la transición. Si no hay WGE, usa PropertyTeam.

2. **Solo propiedades activas**: El helper `getPropertiesForCleanerTeamViaWGE` filtra solo propiedades con `isActive = true`.

3. **Unicidad garantizada**: `WorkGroupExecutor` tiene unique constraint en `(hostTenantId, workGroupId, teamId)`, evitando duplicados.

4. **Reutilización de ejecutores**: Un mismo Team puede estar conectado a múltiples WorkGroups del mismo Host, creando múltiples `WorkGroupExecutor` con el mismo `teamId` pero diferentes `workGroupId`.

5. **Expiración de invites**: Las invitaciones expiran después de 30 días. Se valida tanto en el GET como en el claim.

6. **Validación de roles**: Solo usuarios con `role: "CLEANER"` y `TeamMembership.role: "TEAM_LEADER"` pueden aceptar invitaciones.

---

## ✅ CONFIRMACIÓN FINAL

**No se tocó:**
- ✅ Cleaner/Services (`app/cleaner/**`, `lib/cleaner/**` - solo integración de queries)
- ✅ API routes existentes (`app/api/teams/**`, `app/api/invites/**`)
- ✅ Tablas `Team`, `TeamMembership`, `TeamInvite`, `PropertyTeam`
- ✅ Campo `Cleaning.assignedMembershipId`

**Se implementó:**
- ✅ Nueva tabla `HostWorkGroupInvite` en dominio Host
- ✅ Flujo completo de invitación y claim
- ✅ Integración de queries WGE en Cleaner con fallback
- ✅ UI para gestionar invitaciones y ejecutores
- ✅ Ruta pública `/join/host` para claim

**Estado:** ✅ **LISTO PARA PRUEBAS**

---

## 🚀 PRÓXIMOS PASOS (Opcional)

1. **Migración de datos**: Si hay `PropertyTeam` existentes, crear script para migrar a WorkGroups (fuera del alcance de esta tarea).

2. **Notificaciones**: Agregar notificaciones cuando se acepta una invitación.

3. **Dashboard TL**: Mostrar en `/cleaner/teams` qué WorkGroups están conectados.

4. **Desconectar ejecutor**: Agregar funcionalidad para desconectar un ejecutor de un WG.

