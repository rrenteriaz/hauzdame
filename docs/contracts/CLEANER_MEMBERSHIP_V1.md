# CLEANER_MEMBERSHIP_V1

**Contrato de estado y acceso para Cleaners (modo moderno)**

---

## 1. Propósito

Este contrato define los estados canónicos del Cleaner y las reglas de acceso basadas en TeamMembership ACTIVE. Establece que:

- Un Cleaner puede existir SIN TeamMembership (estado válido)
- El acceso a rutas operativas requiere TeamMembership ACTIVE
- La resolución de contexto NO muta el dominio (no crea entidades automáticamente)
- Las dependencias legacy (cookie `hd_cleaner_member_id`, ruta `/cleaner/select`) están retiradas

Este contrato elimina dependencias legacy y establece invariantes de dominio claros.

---

## 2. Definiciones Clave

### 2.1 User
Usuario autenticado actuando en contexto CLEANER.
La autenticación se basa en sesión (`hausdame_session` cookie).

### 2.2 Team
Equipo de trabajo. Un Team pertenece a un Tenant y puede tener múltiples TeamMembership.

### 2.3 TeamMembership
Relación User ↔ Team con:
- `role`: TeamRole (TEAM_LEADER, CLEANER, HANDYMAN, etc.)
- `status`: TeamMembershipStatus (PENDING, ACTIVE, REMOVED)
- Solo miembros con `status: "ACTIVE"` tienen acceso operativo

### 2.4 Cleaner SIN TeamMembership
Usuario con `role: "CLEANER"` que NO tiene ninguna TeamMembership con `status: "ACTIVE"`.

**Estado válido:** Puede existir en el sistema y acceder a rutas permitidas.

### 2.5 Cleaner CON TeamMembership
Usuario con `role: "CLEANER"` que tiene al menos una TeamMembership con `status: "ACTIVE"`.

**Acceso completo:** Puede acceder a todas las rutas operativas bajo `/cleaner/*`.

---

## 3. Estados Canónicos

### 3.1 Estado A: NO_MEMBERSHIP

**Condición:** `hasMembership === false` (no hay TeamMembership ACTIVE).

**Características:**
- `context.memberships.length === 0`
- `context.teamIds.length === 0`
- `context.homeTenantId` puede ser `null` o `string` (según `user.tenantId`)
- `context.hasMembership === false`

**Comportamiento:**
- Puede acceder SOLO a rutas permitidas (allowlist)
- Cualquier intento de acceso a rutas operativas redirige a `/cleaner/onboarding`
- NO se crea Team ni TeamMembership automáticamente

**Estado válido:** NO_MEMBERSHIP es un estado válido y persistente. No es un error ni condición transitoria.

### 3.2 Estado B: HAS_MEMBERSHIP

**Condición:** `hasMembership === true` (al menos una TeamMembership ACTIVE).

**Características:**
- `context.memberships.length >= 1`
- `context.teamIds.length >= 1`
- `context.hasMembership === true`
- `context.homeTenantId` es `string` (no null)

**Comportamiento:**
- Acceso completo a todas las rutas bajo `/cleaner/*`
- Puede operar limpiezas, mensajes, equipos, etc.

---

## 4. Reglas de Autenticación (MUST)

### 4.1 Sesión Obligatoria

**MUST:** Todas las rutas bajo `/cleaner/*` requieren sesión válida.

**Implementación:**
- Middleware verifica `hausdame_session` cookie
- Si no hay sesión → redirect a `/login`
- Layout server component valida `user.role === "CLEANER"`

**MUST NOT:** Permitir acceso a `/cleaner/*` sin sesión.

### 4.2 Prohibición de Bypass Legacy

**MUST NOT:** Usar cookie `hd_cleaner_member_id` como mecanismo de autenticación.

**Implementación:**
- Middleware elimina `hd_cleaner_member_id` si existe (higiene defensiva)
- No se lee `hd_cleaner_member_id` para determinar acceso
- No se setea `hd_cleaner_member_id` en ningún flujo moderno

**MUST NOT:** Permitir bypass de sesión usando cookies legacy.

---

## 5. Reglas de Autorización por Estado

### 5.1 Allowlist de Rutas (NO_MEMBERSHIP)

**MUST:** Las siguientes rutas son accesibles SIN TeamMembership ACTIVE:

- `/cleaner` (home/landing)
- `/cleaner/onboarding`
- `/cleaner/marketplace`
- `/cleaner/profile`
- `/cleaner/logout`
- `/cleaner/select` (deprecated, redirige a onboarding)

**Implementación:**
- `MembershipGuard` (client-side) verifica pathname contra allowlist
- Si `hasMembership === false` y ruta NO está en allowlist → redirect a `/cleaner/onboarding`

### 5.2 Rutas Bloqueadas (NO_MEMBERSHIP)

**MUST NOT:** Acceder a rutas operativas sin TeamMembership ACTIVE.

**Rutas bloqueadas incluyen (no exhaustivo):**
- `/cleaner/upcoming`
- `/cleaner/cleanings/*`
- `/cleaner/history`
- `/cleaner/messages/*`
- `/cleaner/teams/*`
- Cualquier ruta que requiera operar con limpiezas o equipos

**Comportamiento:**
- Intentar acceso → redirect automático a `/cleaner/onboarding`
- No se muestra contenido operativo
- No se ejecutan queries de limpiezas/equipos

### 5.3 Acceso Completo (HAS_MEMBERSHIP)

**MAY:** Acceder a todas las rutas bajo `/cleaner/*` cuando `hasMembership === true`.

**Implementación:**
- `MembershipGuard` permite todo si `hasActiveMembership === true`
- Layout server component no bloquea rutas operativas
- Páginas pueden asumir que `context.hasMembership === true` y `context.memberships.length > 0`

---

## 6. Reglas Estrictas de `resolveCleanerContext`

### 6.1 Principio Fundamental

**REGLA DE ORO:** `resolveCleanerContext()` resuelve contexto, NO muta dominio.

**MUST NOT:**
- Crear Tenant
- Crear Team
- Crear TeamMembership
- Modificar `user.tenantId`
- Ejecutar cualquier operación de escritura en base de datos

**MUST:**
- Solo leer datos existentes
- Retornar contexto válido incluso si no hay TeamMembership
- Usar `hasMembership: boolean` para indicar estado explícitamente

### 6.2 Retorno cuando NO_MEMBERSHIP

**MUST:** Cuando no hay TeamMembership ACTIVE, retornar:

```typescript
{
  user: { id, email, name, role },
  homeTenantId: user.tenantId | null,
  memberships: [],
  hasMembership: false,
  legacyMember: null,
  mode: "membership",
  teamIds: []
}
```

**MUST NOT:** Lanzar excepciones ni crear entidades automáticamente.

### 6.3 Retorno cuando HAS_MEMBERSHIP

**MUST:** Cuando hay TeamMembership ACTIVE, retornar:

```typescript
{
  user: { id, email, name, role },
  homeTenantId: string (no null),
  memberships: Array<{ id, teamId, role, status }>,
  hasMembership: true,
  legacyMember: null,
  mode: "membership",
  teamIds: Array<string>
}
```

### 6.4 Uso de `homeTenantId`

**MAY:** `homeTenantId` ser `null` si `user.tenantId` es `null`.

**MUST:** Consumidores que requieren `homeTenantId` deben verificar `null` antes de usar.

**Ejemplo:** Crear Team requiere `homeTenantId` no-null. Si es `null`, lanzar error explícito.

---

## 7. Creación de Team / TeamMembership

### 7.1 Acciones Explícitas Permitidas

**MAY:** Crear Team/TeamMembership SOLO mediante acciones explícitas:

- **Claim de invitación:** `/api/host-workgroup-invites/[token]/claim`
- **Aceptar invitación de equipo:** Flujos de invitación de Team
- **Crear equipo propio:** `createCleanerTeam` server action

**MUST NOT:** Crear Team/TeamMembership por:
- Navegación a rutas
- Render de componentes
- Resolución de contexto
- Cualquier operación de lectura

### 7.2 Prohibición de Auto-Creación

**MUST NOT:** Auto-crear Team/TeamMembership cuando:
- Un cleaner sin membership accede a `/cleaner`
- Se resuelve contexto sin memberships
- Se renderiza una página que requiere membership

**Comportamiento esperado:**
- Redirigir a `/cleaner/onboarding`
- Mostrar mensaje informativo
- NO crear entidades en background

---

## 8. Legacy (DEPRECATED)

### 8.1 Cookie `hd_cleaner_member_id`

**Estado:** DEPRECATED, retirada del flujo moderno.

**MUST NOT:**
- Usar como fuente de verdad para autenticación
- Leer para determinar acceso
- Setear en ningún flujo nuevo

**MAY:** Eliminar defensivamente si existe (higiene).

**Implementación:**
- Middleware elimina cookie si existe
- Helpers legacy (`getCurrentMember`, `setCurrentMember`) retornan `null`/no-op
- No se usa en ningún flujo moderno

### 8.2 Ruta `/cleaner/select`

**Estado:** DEPRECATED, redirige a `/cleaner/onboarding`.

**MUST NOT:**
- Usar como mecanismo de autenticación
- Setear cookies legacy
- Mostrar selector de miembros

**Comportamiento:**
- Server action `selectMember` redirige a `/cleaner/onboarding` (no-op)
- Página `/cleaner/select` redirige a `/cleaner/onboarding`
- Mantenida en allowlist solo para evitar loops de redirect

### 8.3 Helpers Legacy

**Estado:** DEPRECATED, neutralizados.

**Funciones afectadas:**
- `getCurrentMember()` → siempre retorna `null`
- `getCurrentMemberId()` → siempre retorna `null`
- `setCurrentMember()` → no-op (no setea cookies)

**MUST NOT:** Usar estas funciones en código nuevo.

**MAY:** Mantener por compatibilidad con código existente, pero no confiar en su comportamiento.

---

## 9. Invariantes del Sistema (MUST NOT BREAK)

### 9.1 Invariante de Estado

**MUST NOT:** Un Cleaner puede tener `hasMembership: true` sin TeamMembership ACTIVE en base de datos.

**Garantía:** `context.hasMembership === true` implica `context.memberships.length > 0` y todas tienen `status: "ACTIVE"`.

### 9.2 Invariante de Resolución

**MUST NOT:** `resolveCleanerContext()` cree entidades en base de datos.

**Garantía:** La función solo ejecuta operaciones de lectura (SELECT). No ejecuta CREATE, UPDATE ni DELETE.

### 9.3 Invariante de Acceso

**MUST NOT:** Acceder a rutas operativas sin TeamMembership ACTIVE.

**Garantía:** El guard del layout (`MembershipGuard`) redirige a `/cleaner/onboarding` si `hasMembership === false` y la ruta no está en allowlist.

### 9.4 Invariante de Sesión

**MUST NOT:** Acceder a `/cleaner/*` sin sesión válida.

**Garantía:** Middleware y layout server component validan sesión antes de renderizar contenido.

### 9.5 Invariante de NO_MEMBERSHIP

**MUST NOT:** Tratar NO_MEMBERSHIP como error o condición transitoria.

**Garantía:** NO_MEMBERSHIP es un estado válido y persistente. El sistema debe funcionar correctamente con cleaners sin TeamMembership.

---

## 10. Checklist de Validación (QA / PR)

### 10.1 Autenticación

- [ ] Usuario sin sesión intenta `/cleaner/*` → redirect `/login`
- [ ] Usuario con sesión HOST intenta `/cleaner/*` → redirect `/host/hoy`
- [ ] Cookie `hd_cleaner_member_id` existe pero no hay sesión → redirect `/login` (cookie eliminada)

### 10.2 Estado NO_MEMBERSHIP

- [ ] Cleaner con sesión, sin TeamMembership → puede acceder a `/cleaner`
- [ ] Cleaner con sesión, sin TeamMembership → puede acceder a `/cleaner/marketplace`
- [ ] Cleaner con sesión, sin TeamMembership → puede acceder a `/cleaner/profile`
- [ ] Cleaner con sesión, sin TeamMembership → puede acceder a `/cleaner/onboarding`
- [ ] Cleaner con sesión, sin TeamMembership → intenta `/cleaner/upcoming` → redirect `/cleaner/onboarding`
- [ ] Cleaner con sesión, sin TeamMembership → intenta `/cleaner/cleanings/*` → redirect `/cleaner/onboarding`
- [ ] Verificar en DB: NO se creó Team ni TeamMembership automáticamente

### 10.3 Estado HAS_MEMBERSHIP

- [ ] Cleaner con sesión, con TeamMembership ACTIVE → acceso completo a todas las rutas
- [ ] Cleaner con sesión, con TeamMembership ACTIVE → puede ver limpiezas asignadas
- [ ] Cleaner con sesión, con TeamMembership ACTIVE → puede ver mensajes
- [ ] Cleaner con sesión, con TeamMembership ACTIVE → puede ver equipos

### 10.4 Resolución de Contexto

- [ ] `resolveCleanerContext()` sin memberships → retorna `hasMembership: false`
- [ ] `resolveCleanerContext()` sin memberships → NO crea Team en DB
- [ ] `resolveCleanerContext()` sin memberships → NO crea TeamMembership en DB
- [ ] `resolveCleanerContext()` con memberships → retorna `hasMembership: true`
- [ ] `resolveCleanerContext()` con memberships → retorna `memberships` array no vacío

### 10.5 Legacy

- [ ] `/cleaner/select` → redirect `/cleaner/onboarding`
- [ ] `getCurrentMember()` → retorna `null`
- [ ] Cookie `hd_cleaner_member_id` no se usa para determinar acceso

### 10.6 Build y Tipos

- [ ] `npm run build` compila sin errores
- [ ] TypeScript valida tipos correctamente
- [ ] No hay warnings de tipos relacionados con `homeTenantId` nullable

---

## 11. Estado del Contrato

**Versión:** V1  
**Estado:** ACTIVO

**Cambios futuros:**
- Cualquier modificación a las reglas MUST/MUST NOT requiere nueva versión (V2, V3, etc.)
- Cambios MAY pueden documentarse como notas sin cambiar versión
- Este contrato es la fuente de verdad para el flujo moderno de Cleaners

**Relación con otros contratos:**
- `NAVIGATION_V1.md`: Define reglas de navegación "Volver" (aplica también a `/cleaner/*`)
- `PROPERTIES_V1.md`: Define reglas de propiedades (Host scope, no aplica directamente a Cleaner)
- `TEAM_TL_CONTRACT.txt`: Define acciones operativas de Team Leaders (asume HAS_MEMBERSHIP)

---

## 12. Notas Técnicas

### 12.1 Implementación del Guard

El guard de membresía se implementa en dos capas:

1. **Server Component (`app/cleaner/layout.tsx`):**
   - Resuelve contexto usando `resolveCleanerContext()`
   - Pasa `hasActiveMembership` al componente cliente

2. **Client Component (`app/cleaner/MembershipGuard.tsx`):**
   - Usa `usePathname()` para obtener ruta actual
   - Redirige a `/cleaner/onboarding` si `hasMembership === false` y ruta no está en allowlist

### 12.2 Normalización de Pathname

El guard normaliza el pathname antes de verificar:
- Remueve query params (`?param=value`)
- Remueve trailing slash (`/cleaner/` → `/cleaner`)
- Compara contra allowlist usando `startsWith()` para rutas anidadas

### 12.3 Compatibilidad con Tipos Legacy

Los tipos `CleanerContextMode` y `legacyMember` se mantienen por compatibilidad con código existente, pero:

- `mode` siempre es `"membership"` en runtime
- `legacyMember` siempre es `null` en runtime
- No se debe confiar en estos campos para lógica nueva

---

**Fin del contrato CLEANER_MEMBERSHIP_V1**
