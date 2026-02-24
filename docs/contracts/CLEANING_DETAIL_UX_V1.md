# Detalle de Limpieza (Host) — Contrato UX v1

**Estado:** Canonical  
**Última actualización:** v1.0 — Definición inicial del comportamiento UX del detalle de limpieza  
**Alcance:** Host — Comportamiento UX y mensajes del detalle de limpieza

**Referencias:**
- `CLEANING_ASSIGNMENT_V1.md`: Modelo de asignación y niveles conceptuales
- `HOY_HOST_V1.md`: Navegación desde página "Hoy" y listados

---

## 1. Propósito del Detalle de Limpieza (Host)

### 1.1 Para qué existe esta página

**Propósito principal:**
- Mostrar información completa de una limpieza específica
- Permitir al Host revisar el estado de asignación y ejecución
- Facilitar acciones relacionadas con la limpieza (asignación manual, cancelación, etc.)
- Proporcionar contexto para tomar decisiones sobre la limpieza

**Decisiones que permite tomar:**
- Asignar manualmente un cleaner a la limpieza (si está disponible)
- Cancelar la limpieza (si aplica)
- Revisar detalles de la propiedad asociada
- Revisar detalles de la reserva asociada (si existe)
- Ver historial y estado de ejecución

**Qué NO es su responsabilidad:**
- ❌ NO permite configurar Work Groups en propiedades (eso se hace en Detalle de Propiedad)
- ❌ NO permite activar/desactivar WorkGroupExecutors (eso se hace en Detalle de Grupo de Trabajo)
- ❌ NO permite agregar miembros a Teams (eso se hace en Services)
- ❌ NO permite cambiar la configuración de equipos disponibles (eso es configuración, no asignación)

**Principio rector:** Esta página muestra **estado y permite acciones sobre la limpieza**, no configuración de equipos.

---

## 2. Información base siempre visible

### 2.1 Bloques siempre presentes

**Independientemente del nivel de asignación, estos bloques SIEMPRE se muestran:**

#### 2.1.1 Header de página

**Componente:** `PageHeader`

**Contenido:**
- Título: "Detalle de limpieza"
- Subtítulo: `{nombrePropiedad} · {fechaHora} · {estado}`
- Botón "Volver" con `returnTo` preservado

**Comportamiento:**
- El subtítulo siempre muestra información básica
- El botón "Volver" navega al contexto de origen (Hoy, Listado, etc.)

---

#### 2.1.2 Información de propiedad

**Sección:** Tarjeta con información básica

**Contenido:**
- Label: "Propiedad"
- Valor: Nombre completo de la propiedad (o alias corto si existe)
- Link opcional: Navegación a Detalle de Propiedad (si aplica)

**Comportamiento:**
- Siempre visible, sin importar estado de asignación
- No muestra información de equipos configurados (eso va en otra sección)

---

#### 2.1.3 Fecha y hora

**Sección:** Tarjeta con información básica

**Contenido:**
- Label: "Fecha y hora"
- Valor: Fecha y hora programada formateada

**Comportamiento:**
- Siempre visible
- Muestra la fecha programada original o planificada (según corresponda)

---

#### 2.1.4 Estado de la limpieza

**Sección:** Tarjeta con información básica

**Contenido:**
- Label: "Estado"
- Valor: Estado de ejecución (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`)

**Comportamiento:**
- Siempre visible
- Muestra el estado actual de ejecución (no el estado de asignación)

---

#### 2.1.5 Reserva asociada (si existe)

**Sección:** Tarjeta con información básica (solo si `reservationId` existe)

**Contenido:**
- Label: "Reserva"
- Link: "Ver reserva" → `/host/reservations/[id]?returnTo=...`
- Información: Fechas de check-in y check-out

**Comportamiento:**
- Solo visible si la limpieza está asociada a una reserva
- El link preserva `returnTo` para regresar al detalle de limpieza

---

#### 2.1.6 Información de ejecución (si aplica)

**Sección:** Tarjeta con información básica (condicional)

**Contenido:**
- "Iniciada": Timestamp de inicio (si `startedAt` existe)
- "Completada": Timestamp de finalización (si `completedAt` existe)
- "Duración": Tiempo transcurrido (si `startedAt` existe)

**Comportamiento:**
- Solo visible si la limpieza ha sido iniciada o completada
- Muestra información de ejecución real, no de asignación

---

#### 2.1.7 Notas

**Sección:** Tarjeta con información básica

**Contenido:**
- Label: "Notas"
- Valor: Notas de la limpieza o "—" si no hay

**Comportamiento:**
- Siempre visible
- Muestra información adicional sobre la limpieza

---

## 3. Asignación y Atención (core)

### 3.1 Mapeo de niveles a comportamiento UX

**Referencia:** `CLEANING_ASSIGNMENT_V1.md` — Sección 2 (Niveles de asignación)

Cada nivel de asignación determina qué se muestra en:
- Banner de atención requerida (`CleaningWarningCard`)
- Tarjeta de asignación (`AssignmentSection`)

---

### 3.2 Nivel 0: Sin contexto ejecutor

**Condiciones (según `CLEANING_ASSIGNMENT_V1.md`):**
- `Cleaning.teamId`: `null`
- `Cleaning.assignedMembershipId`: `null`
- No existe `HostWorkGroupProperty` con `WorkGroupExecutor` activo
- No existe `PropertyTeam` (fallback legacy)

#### 3.2.1 Banner de atención requerida

**¿Se muestra?** ✅ SÍ

**Tipo de atención:** Configuración (CRITICAL)

**Mensaje conceptual:** "No hay equipos disponibles para esta propiedad"

**Detalle conceptual:** "Esta propiedad no tiene equipos configurados. Configura un equipo en la propiedad para poder asignar limpiezas."

**CTA conceptual:** "Ir a propiedad y configurar equipo" → `/host/properties/[id]`

**Severidad:** CRITICAL (banner ámbar)

**Código de razón:** `NO_TEAM_EXECUTING` o `NO_HOST_TEAM_CONFIG`

---

#### 3.2.2 Tarjeta de asignación

**¿Se muestra?** ✅ SÍ

**Contenido conceptual:**
- Título: "Asignación"
- Estado: "Sin equipo disponible"
- Detalle: "Esta propiedad no tiene equipos configurados. Ve a la propiedad para configurar equipos."

**Botón "Ver equipos":** ❌ NO se muestra (no hay equipos para mostrar)

**Qué NO debe mostrar:**
- ❌ NO mostrar "Ningún cleaner ha aceptado" (no hay equipo asignado, no aplica)
- ❌ NO mostrar información de equipos disponibles (no existen)

---

### 3.3 Nivel 1: Con contexto disponible pero sin asignar

**Condiciones (según `CLEANING_ASSIGNMENT_V1.md`):**
- `Cleaning.teamId`: `null`
- `Cleaning.assignedMembershipId`: `null`
- Existe `HostWorkGroupProperty` con `WorkGroupExecutor` activo, O existe `PropertyTeam`

#### 3.3.1 Banner de atención requerida

**¿Se muestra?** ⚠️ DEPENDE

**Caso A: Sin atención requerida (asignación pendiente normal)**
- Si `needsAttention: false` → ❌ NO se muestra banner
- La limpieza puede ser asignada automáticamente o manualmente

**Caso B: Con atención requerida (asignación pendiente con problema)**
- Si `needsAttention: true` y `attentionReason` indica problema operativo → ✅ SÍ se muestra banner
- Tipo de atención: Operativa (según `attentionReason`)

**Mensaje conceptual (si se muestra):**
- Depende del `attentionReason` específico
- NO debe decir "No hay equipo asignado" (hay equipos disponibles)
- Debe indicar el problema operativo específico

**CTA conceptual:** Opcional, según el tipo de problema

**Severidad:** Según el tipo de problema (CRITICAL o WARNING)

---

#### 3.3.2 Tarjeta de asignación

**¿Se muestra?** ✅ SÍ

**Contenido conceptual:**
- Título: "Asignación"
- Estado: "Pendiente de asignación"
- Detalle: "Hay equipos disponibles para esta propiedad. La limpieza será asignada automáticamente o puedes asignarla manualmente."

**Botón "Ver equipos":** ✅ SÍ se muestra (hay equipos disponibles)

**Qué NO debe mostrar:**
- ❌ NO mostrar "No hay equipo asignado" (hay equipos disponibles, solo falta asignar)
- ❌ NO mostrar "Ningún cleaner ha aceptado" (no hay equipo asignado aún, no aplica)

---

### 3.4 Nivel 2: Asignada a Team

**Condiciones (según `CLEANING_ASSIGNMENT_V1.md`):**
- `Cleaning.teamId`: `<teamId>` (no null)
- `Cleaning.assignedMembershipId`: `null`
- El Team puede tener miembros activos o no

#### 3.4.1 Banner de atención requerida

**¿Se muestra?** ⚠️ DEPENDE

**Caso A: Team con miembros activos (espera normal)**
- Si el Team tiene `TeamMembership` con `status: ACTIVE` → ❌ NO se muestra banner
- La limpieza está asignada y esperando aceptación del cleaner

**Caso B: Team sin miembros activos (problema de configuración)**
- Si el Team NO tiene `TeamMembership` con `status: ACTIVE` → ✅ SÍ se muestra banner
- Tipo de atención: Configuración (CRITICAL)

**Mensaje conceptual (si se muestra):**
- "El equipo asignado no tiene miembros activos"
- Detalle: "Invita o agrega miembros al equipo para que puedan aceptar esta limpieza."

**CTA conceptual:** "Ir a propiedad y configurar equipo" → `/host/properties/[id]`

**Severidad:** CRITICAL (banner ámbar)

**Código de razón:** `NO_AVAILABLE_MEMBER`

---

#### 3.4.2 Tarjeta de asignación

**¿Se muestra?** ✅ SÍ

**Contenido conceptual:**
- Título: "Asignación"
- Estado: "Asignada a equipo: {nombreTeam}"
- Detalle: "La limpieza está asignada al equipo. Los cleaners del equipo pueden ver y aceptar la limpieza."

**Botón "Ver equipos":** ✅ SÍ se muestra (hay equipos configurados)

**Qué NO debe mostrar:**
- ❌ NO mostrar "No hay equipo asignado" (hay `teamId` establecido)
- ❌ NO mostrar información de cleaner específico (no hay `assignedMembershipId`)

**Qué SÍ debe mostrar:**
- ✅ Nombre del Team asignado (si está disponible)
- ✅ Estado de "Pendiente de aceptación" o similar

---

### 3.5 Nivel 3: Aceptada por Cleaner

**Condiciones (según `CLEANING_ASSIGNMENT_V1.md`):**
- `Cleaning.teamId`: `<teamId>` (generalmente no null)
- `Cleaning.assignedMembershipId`: `<membershipId>` (no null)
- `Cleaning.assignmentStatus`: `ASSIGNED`

#### 3.5.1 Banner de atención requerida

**¿Se muestra?** ⚠️ DEPENDE

**Caso A: Sin problemas adicionales**
- Si `needsAttention: false` → ❌ NO se muestra banner
- La limpieza está correctamente asignada y aceptada

**Caso B: Con problemas operativos**
- Si `needsAttention: true` y `attentionReason` indica problema operativo → ✅ SÍ se muestra banner
- Tipo de atención: Operativa (según `attentionReason`)

**Ejemplos de problemas operativos:**
- Cleaner no disponible en el horario programado (`CLEANING_ASSIGNED_NOT_AVAILABLE`)
- Limpieza con fecha pasada (`CLEANING_PENDING_OVERDUE`)
- Cleaner rechazó después de aceptar (`DECLINED_BY_ASSIGNEE`)

**Mensaje conceptual (si se muestra):**
- Depende del `attentionReason` específico
- NO debe decir "No hay equipo asignado" (hay equipo y cleaner)
- NO debe decir "Ningún cleaner ha aceptado" (hay cleaner aceptado)

**CTA conceptual:** Opcional, según el tipo de problema

**Severidad:** Según el tipo de problema (CRITICAL o WARNING)

---

#### 3.5.2 Tarjeta de asignación

**¿Se muestra?** ✅ SÍ

**Contenido conceptual:**
- Título: "Asignación"
- Estado: "Aceptada por: {nombreCleaner}"
- Detalle: "Equipo: {nombreTeam}"
- Estado de ejecución: "Pendiente" / "En progreso" / "Completada" (según `status`)

**Botón "Ver equipos":** ✅ SÍ se muestra (hay equipos configurados)

**Qué NO debe mostrar:**
- ❌ NO mostrar "Ningún cleaner ha aceptado" (hay `assignedMembershipId`)
- ❌ NO mostrar "No hay equipo asignado" (hay `teamId`)

**Qué SÍ debe mostrar:**
- ✅ Nombre del cleaner que aceptó
- ✅ Nombre del Team al que pertenece
- ✅ Estado de ejecución de la limpieza

---

### 3.6 Nivel 4: En ejecución

**Condiciones (según `CLEANING_ASSIGNMENT_V1.md`):**
- `Cleaning.status`: `IN_PROGRESS`
- `Cleaning.startedAt`: `<timestamp>` (no null)
- `Cleaning.assignedMembershipId`: `<membershipId>` (generalmente no null)

#### 3.6.1 Banner de atención requerida

**¿Se muestra?** ⚠️ DEPENDE

**Caso A: Sin problemas adicionales**
- Si `needsAttention: false` → ❌ NO se muestra banner
- La limpieza está en ejecución normalmente

**Caso B: Con problemas operativos**
- Si `needsAttention: true` y `attentionReason` indica problema operativo → ✅ SÍ se muestra banner
- Tipo de atención: Operativa (según `attentionReason`)

**Mensaje conceptual (si se muestra):**
- Depende del `attentionReason` específico
- NO debe mostrar problemas de asignación (ya está asignada y en ejecución)

---

#### 3.6.2 Tarjeta de asignación

**¿Se muestra?** ✅ SÍ

**Contenido conceptual:**
- Título: "Asignación"
- Estado: "En ejecución por: {nombreCleaner}"
- Detalle: "Equipo: {nombreTeam}"
- Estado de ejecución: "En progreso"

**Botón "Ver equipos":** ✅ SÍ se muestra (hay equipos configurados)

**Qué SÍ debe mostrar:**
- ✅ Nombre del cleaner que está ejecutando
- ✅ Nombre del Team
- ✅ Estado "En progreso"

---

### 3.7 Nivel 5: Completada

**Condiciones (según `CLEANING_ASSIGNMENT_V1.md`):**
- `Cleaning.status`: `COMPLETED`
- `Cleaning.completedAt`: `<timestamp>` (no null)

#### 3.7.1 Banner de atención requerida

**¿Se muestra?** ❌ NO

**Razón:** Las limpiezas completadas no requieren atención (estado terminal)

**Excepción:** Solo si hay problemas de revisión o calidad (fuera del modelo de asignación)

---

#### 3.7.2 Tarjeta de asignación

**¿Se muestra?** ✅ SÍ

**Contenido conceptual:**
- Título: "Asignación"
- Estado: "Completada por: {nombreCleaner}"
- Detalle: "Equipo: {nombreTeam}"
- Estado de ejecución: "Completada"

**Botón "Ver equipos":** ✅ SÍ se muestra (hay equipos configurados)

**Qué SÍ debe mostrar:**
- ✅ Nombre del cleaner que completó
- ✅ Nombre del Team
- ✅ Estado "Completada"

---

## 4. Tarjeta de Asignación

### 4.1 Propósito de la tarjeta

**Qué significa esta tarjeta:**
- Muestra el estado actual de asignación de la limpieza
- Indica quién está asignado o qué falta para la asignación
- Proporciona contexto sobre equipos disponibles (vía botón "Ver equipos")

**Qué NO debe inferir:**
- ❌ NO debe inferir que "no hay equipo" si existe `HostWorkGroupProperty` con `WorkGroupExecutor` activo
- ❌ NO debe mezclar conceptos de "equipo configurado" con "equipo asignado"
- ❌ NO debe mostrar información de configuración (eso va en Detalle de Propiedad)

---

### 4.2 Información que puede mostrar

**Según el nivel de asignación:**

**Nivel 0 (Sin contexto):**
- Estado: "Sin equipo disponible"
- Detalle: Mensaje sobre necesidad de configuración
- Botón "Ver equipos": NO se muestra

**Nivel 1 (Contexto disponible, sin asignar):**
- Estado: "Pendiente de asignación"
- Detalle: Mensaje sobre equipos disponibles
- Botón "Ver equipos": SÍ se muestra

**Nivel 2 (Asignada a Team):**
- Estado: "Asignada a equipo: {nombreTeam}"
- Detalle: Mensaje sobre espera de aceptación
- Botón "Ver equipos": SÍ se muestra

**Nivel 3 (Aceptada por Cleaner):**
- Estado: "Aceptada por: {nombreCleaner}"
- Detalle: "Equipo: {nombreTeam}"
- Estado de ejecución: "Pendiente" / "En progreso" / "Completada"
- Botón "Ver equipos": SÍ se muestra

**Nivel 4 (En ejecución):**
- Estado: "En ejecución por: {nombreCleaner}"
- Detalle: "Equipo: {nombreTeam}"
- Estado de ejecución: "En progreso"
- Botón "Ver equipos": SÍ se muestra

**Nivel 5 (Completada):**
- Estado: "Completada por: {nombreCleaner}"
- Detalle: "Equipo: {nombreTeam}"
- Estado de ejecución: "Completada"
- Botón "Ver equipos": SÍ se muestra

---

### 4.3 Botón "Ver equipos"

**Cuándo se muestra:**
- ✅ SÍ cuando hay `propertyTeams` (equipos configurados en la propiedad)
- ❌ NO cuando no hay equipos configurados (Nivel 0)

**Qué muestra al hacer click:**
- Modal con lista de equipos asignados a la propiedad
- Para cada equipo: nombre y cantidad de miembros
- Lista de miembros de cada equipo

**Propósito:**
- Proporcionar contexto sobre qué equipos están disponibles
- NO permite modificar la configuración (eso se hace en Detalle de Propiedad)

---

## 5. Navegación relacionada

### 5.1 Navegación hacia Detalle de Propiedad

**Desde:** Banner de atención requerida o botón "Ver equipos"

**Ruta:** `/host/properties/[id]?returnTo=/host/cleanings/[cleaningId]?returnTo=...`

**Reglas de `returnTo`:**
- El `returnTo` del Detalle de Propiedad apunta al Detalle de Limpieza actual
- El Detalle de Limpieza preserva su propio `returnTo` original (Hoy, Listado, etc.)
- Al regresar desde Propiedad, se vuelve al Detalle de Limpieza
- Al regresar desde Detalle de Limpieza, se vuelve al contexto original

**Preservación de contexto:**
- Se preserva la cadena completa: `Hoy/Listado → Detalle Limpieza → Detalle Propiedad`
- Cada nivel mantiene su `returnTo` para regresar al nivel anterior

---

### 5.2 Navegación hacia Detalle de Grupo de Trabajo

**Desde:** No hay navegación directa desde Detalle de Limpieza

**Ruta:** No aplica (no se navega directamente)

**Razón:** El Detalle de Limpieza no muestra información de Work Groups directamente. La configuración de Work Groups se hace desde Detalle de Propiedad.

---

### 5.3 Navegación hacia Detalle de Reserva

**Desde:** Sección de información básica (si `reservationId` existe)

**Ruta:** `/host/reservations/[id]?returnTo=/host/cleanings/[cleaningId]?returnTo=...`

**Reglas de `returnTo`:**
- Similar a navegación hacia Propiedad
- Preserva cadena completa de contexto

---

### 5.4 Reglas generales de `returnTo`

**Principio:** Cada página preserva su contexto de origen y lo pasa a páginas hijas.

**Estructura típica:**
```
Hoy/Listado (returnTo: null o /host/hoy)
  → Detalle Limpieza (returnTo: /host/hoy o /host/actividad/...)
    → Detalle Propiedad (returnTo: /host/cleanings/[id]?returnTo=...)
      → Regresa a Detalle Limpieza
        → Regresa a Hoy/Listado
```

**Validación de `returnTo`:**
- Solo se aceptan rutas que empiezan con `/host`
- Si `returnTo` no es válido, fallback a `/host/cleanings?view=day&date=...`

---

## 6. Invariantes UX (MUST NOT BREAK)

### 6.1 Invariantes de mensajes

**INV-UX-1: La UI no debe mezclar conceptos de nivel**
- NO mostrar "No hay equipo asignado" si hay `HostWorkGroupProperty` con `WorkGroupExecutor` activo (Nivel 1)
- NO mostrar "Ningún cleaner ha aceptado" si `teamId` es `null` (Nivel 0 o 1)
- Cada nivel tiene mensajes específicos que NO deben mezclarse

**INV-UX-2: El banner no contradice la tarjeta**
- Si el banner dice "No hay equipo asignado", la tarjeta NO debe decir "Asignada a equipo"
- Si el banner dice "Ningún cleaner ha aceptado", la tarjeta NO debe mostrar nombre de cleaner
- Banner y tarjeta deben ser consistentes con el mismo nivel de asignación

**INV-UX-3: El detalle no "corrige" configuración**
- El Detalle de Limpieza NO permite configurar Work Groups
- El Detalle de Limpieza NO permite activar/desactivar WorkGroupExecutors
- Solo muestra estado y permite acciones sobre la limpieza específica

**INV-UX-4: Los mensajes reflejan estados reales**
- Los mensajes deben derivarse de campos explícitos de `Cleaning`
- NO inferir estados no explícitos
- NO mostrar información que no corresponde al nivel actual

**INV-UX-5: Banner solo para atención requerida**
- El banner solo se muestra si `needsAttention: true` (excepto casos especiales documentados)
- NO mostrar banner si la limpieza está correctamente asignada y aceptada sin problemas

**INV-UX-6: Tarjeta siempre visible**
- La tarjeta de asignación SIEMPRE se muestra (excepto estados terminales si aplica)
- Proporciona contexto sobre el estado de asignación actual

**INV-UX-7: Navegación preserva contexto**
- Todas las navegaciones hacia páginas relacionadas preservan `returnTo`
- El usuario siempre puede regresar al contexto de origen

---

## 7. Mensajes actuales inválidos

### 7.1 Mensajes que violan el contrato

#### 7.1.1 "No hay equipo asignado a esta limpieza"

**Ubicación actual:** Banner de atención requerida (`CleaningWarningCard`)

**Cuándo se muestra actualmente:**
- Cuando `Cleaning.teamId` es `null` Y `Cleaning.assignedMembershipId` es `null`

**Por qué es incorrecto:**
- ❌ NO distingue entre Nivel 0 (sin contexto) y Nivel 1 (contexto disponible sin asignar)
- ❌ Puede mostrar este mensaje cuando SÍ hay equipos disponibles (solo falta asignar)
- ❌ Es confuso para el usuario que ve equipos en Detalle de Propiedad pero este mensaje en Detalle de Limpieza

**Qué tipo de mensaje debería reemplazarlo:**
- **Nivel 0:** "No hay equipos disponibles para esta propiedad" (configuración requerida)
- **Nivel 1:** NO mostrar este mensaje, o mostrar "Pendiente de asignación" (asignación pendiente)

**Referencia:** `CLEANING_ASSIGNMENT_V1.md` — Secciones 2.1 y 2.2

---

#### 7.1.2 "Ningún cleaner ha aceptado la limpieza"

**Ubicación actual:** Tarjeta de asignación (`AssignmentSection`)

**Cuándo se muestra actualmente:**
- Cuando `assignees.length === 0` Y `primaryAssigneeId` es `null`

**Por qué es incorrecto:**
- ❌ Se muestra incluso cuando `teamId` es `null` (Nivel 0 o 1)
- ❌ No tiene sentido decir "ningún cleaner ha aceptado" si no hay equipo asignado
- ❌ Mezcla conceptos de "equipo asignado" con "cleaner aceptó"

**Qué tipo de mensaje debería reemplazarlo:**
- **Nivel 0:** "Sin equipo disponible" (no aplica mensaje de aceptación)
- **Nivel 1:** "Pendiente de asignación" (no aplica mensaje de aceptación)
- **Nivel 2:** "Pendiente de aceptación por cleaner" (aplica mensaje de aceptación)

**Referencia:** `CLEANING_ASSIGNMENT_V1.md` — Secciones 2.1, 2.2 y 2.3

---

#### 7.1.3 "Configuración de equipo pendiente"

**Ubicación actual:** Banner de atención requerida (`CleaningWarningCard`)

**Cuándo se muestra actualmente:**
- Cuando `propertyTeamsCount === 0`

**Por qué es incorrecto (parcialmente):**
- ⚠️ El mensaje es correcto para Nivel 0
- ❌ Pero puede aparecer junto con "No hay equipo asignado" creando confusión
- ❌ No distingue entre falta de configuración y falta de asignación

**Qué tipo de mensaje debería reemplazarlo:**
- **Nivel 0:** Mantener este mensaje pero asegurar que NO aparezca junto con mensajes contradictorios
- **Nivel 1:** NO mostrar este mensaje (hay configuración, falta asignación)

**Referencia:** `CLEANING_ASSIGNMENT_V1.md` — Sección 2.1

---

#### 7.1.4 "El equipo asignado no tiene miembros activos"

**Ubicación actual:** Banner de atención requerida (`CleaningWarningCard`)

**Cuándo se muestra actualmente:**
- Cuando `teamId` está establecido pero el Team no tiene `TeamMembership` con `status: ACTIVE`

**Por qué es correcto:**
- ✅ Este mensaje es correcto para Nivel 2 cuando hay problema de configuración
- ✅ Distingue correctamente entre "equipo asignado" y "miembros disponibles"

**Qué ajustar:**
- ⚠️ Asegurar que NO aparezca junto con "Ningún cleaner ha aceptado" en la tarjeta
- ⚠️ Asegurar que la tarjeta muestre información consistente

**Referencia:** `CLEANING_ASSIGNMENT_V1.md` — Sección 2.3

---

### 7.2 Inconsistencias entre banner y tarjeta

#### 7.2.1 Banner y tarjeta muestran mensajes contradictorios

**Problema observado:**
- Banner: "No hay equipo asignado a esta limpieza"
- Tarjeta: "Ningún cleaner ha aceptado la limpieza"
- Propiedad: SÍ tiene Work Group y Team configurado

**Por qué es incorrecto:**
- ❌ El banner sugiere falta de configuración (Nivel 0)
- ❌ La tarjeta sugiere falta de aceptación (Nivel 2)
- ❌ Ambos pueden ser falsos si hay equipos disponibles pero no asignados (Nivel 1)

**Qué debería pasar:**
- **Nivel 1:** Banner NO debe mostrar "No hay equipo asignado", tarjeta debe mostrar "Pendiente de asignación"
- Banner y tarjeta deben ser consistentes con el mismo nivel

**Referencia:** `CLEANING_ASSIGNMENT_V1.md` — Sección 2.2

---

#### 7.2.2 Información de equipos no visible directamente

**Problema observado:**
- El Detalle de Limpieza no muestra qué equipos están disponibles
- Requiere hacer click en "Ver equipos" o navegar a Propiedad

**Por qué puede ser problemático:**
- ⚠️ El usuario no ve inmediatamente qué equipos están disponibles
- ⚠️ Puede generar confusión sobre por qué no se muestra información de equipos

**Qué considerar:**
- Evaluar si mostrar información básica de equipos disponibles directamente en la tarjeta
- O mantener el comportamiento actual pero asegurar que los mensajes sean claros

---

## 8. Referencias cruzadas

### 8.1 Contratos relacionados

- **CLEANING_ASSIGNMENT_V1.md:** Modelo de asignación y niveles conceptuales (referencia principal)
- **HOY_HOST_V1.md:** Navegación desde página "Hoy" y listados
- **WORKGROUPS_V1.md:** Estructura y comportamiento de Work Groups

### 8.2 Archivos de código relevantes

- `app/host/cleanings/[id]/page.tsx`: Página principal del detalle
- `app/host/cleanings/[id]/CleaningWarningCard.tsx`: Componente de banner de atención
- `app/host/cleanings/[id]/AssignmentSection.tsx`: Componente de tarjeta de asignación
- `lib/cleaning-attention-reasons.ts`: Lógica de cálculo de motivos de atención

---

## 9. Visualización de imágenes de referencia en tareas (Cleaner)

**MUST:**
- El Cleaner puede visualizar miniaturas de imágenes asociadas a tareas del checklist.
- Las miniaturas:
  - Ayudan a comprender cómo debe ejecutarse la tarea.
  - Se muestran antes de la viñeta (•) para mantener alineación consistente.
  - Tamaño discreto: 32px × 32px.
  - Abren un modal de preview de solo lectura al hacer tap/click.
- El Cleaner NO puede:
  - Agregar imágenes.
  - Eliminar imágenes.
  - Editar imágenes.
- La visualización está disponible:
  - Antes de aceptar la limpieza (modo preview).
  - Después de aceptar la limpieza (modo operativo).
- Si una tarea no tiene imágenes:
  - No se muestra miniatura.
  - El slot de 32px permanece vacío pero ocupa espacio para mantener alineación de viñetas.
- El preview modal:
  - Muestra la imagen en grande (solo visualización).
  - Se cierra con botón X, click fuera o tecla Escape.
  - NO permite agregar, editar ni eliminar imágenes.

**MUST NOT:**
- Permitir gestión de imágenes desde el preview modal.
- Mostrar miniatura si no hay imágenes.
- Prometer automatismos o validaciones adicionales basadas en imágenes.

**NOTA (no contractual):**
- Las miniaturas se obtienen haciendo match entre CleaningChecklistItem (snapshot) y PropertyChecklistItem usando (area, title, sortOrder).
- Las miniaturas reutilizan los thumbnails obtenidos vía batch SSR para optimizar performance.
- El preview modal usa el mismo thumbnail (no carga imagen original) para mantener consistencia.
- La presencia de imágenes no implica obligación adicional ni cambio en el alcance del servicio.

---

## 10. Checklist de implementación

### 9.1 Verificaciones por nivel

**Para cada nivel de asignación (0-5), verificar:**

- [ ] El banner muestra el mensaje correcto según el nivel
- [ ] La tarjeta muestra el mensaje correcto según el nivel
- [ ] Banner y tarjeta son consistentes entre sí
- [ ] Los mensajes NO mezclan conceptos de diferentes niveles
- [ ] El botón "Ver equipos" se muestra solo cuando corresponde
- [ ] La navegación preserva `returnTo` correctamente

---

### 9.2 Verificaciones generales

- [ ] Los mensajes reflejan estados reales (no inferidos)
- [ ] El banner solo se muestra cuando `needsAttention: true` (excepto casos especiales)
- [ ] La tarjeta siempre se muestra (excepto estados terminales si aplica)
- [ ] La navegación hacia Propiedad preserva contexto completo
- [ ] No hay mensajes contradictorios entre banner y tarjeta

---

**Fin del contrato**

