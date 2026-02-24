# Contrato Canónico de Copy y Mensajes UX para Asignación de Limpiezas (Host)

**Versión:** 1.0  
**Estado:** Canónico  
**Última actualización:** 2025-01-XX  
**Alcance:** Detalle de Limpieza (Host) — Tarjeta "Asignación"

---

## 1. Propósito del contrato

### 1.1 Qué regula este contrato

Este contrato define:
- **Lenguaje UX canónico** para la tarjeta "Asignación" en Detalle de Limpieza (Host)
- **Textos válidos e inválidos** por nivel de asignación
- **Reglas semánticas** que gobiernan el copy
- **Relación entre Banner de Atención y Tarjeta de Asignación**

### 1.2 Qué NO regula este contrato

Este contrato **NO** regula:
- Lógica de negocio o automatización
- Backend o persistencia de datos
- Flujos de asignación o aceptación
- Comportamiento de botones o acciones
- Otros componentes fuera de la tarjeta "Asignación"

### 1.3 Relación con otros contratos

Este contrato se basa en y complementa:

- **`CLEANING_ASSIGNMENT_V1.md`**: Define los niveles de asignación (0-5) y su significado conceptual
- **`CLEANING_DETAIL_UX_V1.md`**: Define el comportamiento UX del Detalle de Limpieza, incluyendo cuándo mostrar la tarjeta de asignación

**Jerarquía:**
1. `CLEANING_ASSIGNMENT_V1.md` → Define qué significa cada nivel
2. `CLEANING_DETAIL_UX_V1.md` → Define qué mostrar según el nivel
3. **Este contrato** → Define el copy exacto que debe usarse

---

## 2. Principios de copy (MUST)

Los siguientes principios son **obligatorios** y deben aplicarse a todo copy relacionado con asignación:

### 2.1 No prometer automatismos

**❌ PROHIBIDO:**
- "Será asignada automáticamente"
- "Se asignará automáticamente"
- "La limpieza será asignada..."
- Cualquier promesa de comportamiento futuro automático

**✅ PERMITIDO:**
- Describir el estado actual
- Indicar qué puede ocurrir (sin garantizar)
- Usar lenguaje factual y verificable

**Razón:** El sistema puede tener múltiples reglas de asignación, y prometer automatismo crea expectativas que pueden no cumplirse.

---

### 2.2 No inferir aceptación

**❌ PROHIBIDO:**
- Afirmar que un cleaner "aceptará" cuando solo hay equipo configurado
- Usar "aceptado" cuando solo hay `teamId` asignado
- Confundir asignación a equipo con aceptación por cleaner

**✅ PERMITIDO:**
- Distinguir claramente entre "equipo asignado" y "cleaner aceptó"
- Usar "pendiente de aceptación" cuando hay equipo pero no cleaner
- Ser explícito sobre qué nivel de asignación se ha alcanzado

**Razón:** El modelo mental del Host distingue entre configuración de equipos, asignación a equipo, y aceptación por cleaner individual.

---

### 2.3 No confundir equipo configurado con cleaner asignado

**❌ PROHIBIDO:**
- "No hay equipo" cuando existe `HostWorkGroupProperty` o `PropertyTeam`
- "Sin equipo disponible" cuando hay equipos configurados pero no asignados a la limpieza
- Mezclar "equipos disponibles" con "equipo asignado a la limpieza"

**✅ PERMITIDO:**
- Distinguir entre "equipos asignados a la propiedad" y "equipo asignado a la limpieza"
- Ser claro sobre qué nivel de configuración existe
- Usar lenguaje que refleje el estado real de los datos

**Razón:** El Host necesita entender la diferencia entre configuración de propiedad y asignación de limpieza específica.

---

### 2.4 Usar lenguaje honesto y verificable

**❌ PROHIBIDO:**
- Afirmaciones que no pueden verificarse en el estado actual
- Promesas sobre comportamiento futuro
- Lenguaje ambiguo que puede interpretarse de múltiples formas

**✅ PERMITIDO:**
- Describir el estado actual verificable
- Usar lenguaje claro y directo
- Ser específico sobre qué existe y qué no existe

**Razón:** El copy debe reflejar la realidad del sistema, no crear expectativas falsas.

---

## 3. Copy canónico por nivel de asignación

### 3.1 Nivel 0: Sin contexto ejecutor

**Condición:** No hay equipos disponibles para la propiedad (ni WorkGroups ni PropertyTeam legacy).

#### Título de la tarjeta
**Copy canónico:** "Sin equipo disponible"

**Variantes permitidas:** Ninguna

#### Mensaje secundario
**Copy canónico:** "Esta propiedad no tiene equipos configurados. Ve a la propiedad para configurar equipos."

**Variantes permitidas:** Ninguna

#### Intención del mensaje
- Informar que no hay equipos disponibles para asignar limpiezas
- Proporcionar acción clara (ir a propiedad)
- No sugerir que es un error, sino configuración pendiente

#### Botón "Ver equipos"
**¿Se muestra?** ❌ NO

**Razón:** No hay equipos para mostrar.

---

### 3.2 Nivel 1: Con contexto disponible pero sin asignar

**Condición:** Hay equipos asignados a la propiedad, pero `Cleaning.teamId` es `null`.

#### Título de la tarjeta
**Copy canónico:** "Pendiente de aceptación"

**Variantes permitidas:** Ninguna

#### Mensaje secundario
**Copy canónico:** "Hay equipos asignados a esta propiedad, pero ningún miembro ha aceptado la limpieza."

**Variantes permitidas:** Ninguna

#### Intención del mensaje
- Indicar que hay equipos configurados (contexto disponible)
- Clarificar que ningún miembro ha aceptado aún
- No prometer automatismo ni asignación manual
- Usar lenguaje que funcione para 1 o múltiples miembros

#### Botón "Ver equipos"
**¿Se muestra?** ✅ SÍ

**Razón:** Hay equipos disponibles para mostrar.

---

### 3.3 Nivel 2: Asignada a Team

**Condición:** `Cleaning.teamId` está establecido, pero `Cleaning.assignedMembershipId` es `null`.

#### Título de la tarjeta
**Copy canónico:** "Asignada a equipo: {nombreTeam}"

**Variantes permitidas:**
- Si `teamName` no está disponible: "Asignada a equipo: Equipo"

#### Mensaje secundario
**Copy canónico:** "La limpieza está asignada al equipo. Los cleaners del equipo pueden ver y aceptar la limpieza."

**Variantes permitidas:** Ninguna

#### Intención del mensaje
- Confirmar que la limpieza está asignada a un equipo específico
- Indicar que los cleaners pueden ver y aceptar
- No afirmar que un cleaner específico aceptó (aún no hay `assignedMembershipId`)

#### Botón "Ver equipos"
**¿Se muestra?** ✅ SÍ

**Razón:** Hay equipos configurados para mostrar.

---

### 3.4 Nivel 3: Aceptada por Cleaner

**Condición:** `Cleaning.assignedMembershipId` está establecido (o `assignedMemberId` legacy).

#### Título de la tarjeta
**Copy canónico:** "{nombreCleaner}"

**Variantes permitidas:**
- Si `primaryAssignee?.member.name` no está disponible: "Cleaner asignado"

#### Mensaje secundario (línea 1)
**Copy canónico:** "{nombreEquipo}"

**Variantes permitidas:**
- Si `primaryAssignee?.member.team.name` no está disponible: "Equipo"

#### Mensaje secundario (línea 2)
**Copy canónico:** Depende del estado de la limpieza:
- Si `status === "PENDING"`: "Pendiente"
- Si `status === "IN_PROGRESS"`: "En progreso"
- Si `status === "COMPLETED"`: "Completada"

**Variantes permitidas:** Ninguna

#### Intención del mensaje
- Mostrar el cleaner específico que aceptó
- Mostrar el equipo al que pertenece
- Indicar el estado actual de ejecución

#### Botón "Ver equipos"
**¿Se muestra?** ✅ SÍ (si hay equipos disponibles)

**Razón:** Permite ver otros equipos aunque uno ya aceptó.

---

### 3.5 Nivel 4: En ejecución

**Condición:** `Cleaning.status === "IN_PROGRESS"` y `Cleaning.startedAt` está establecido.

#### Título de la tarjeta
**Copy canónico:** "En ejecución por: {nombreCleaner}"

**Variantes permitidas:**
- Si `primaryAssignee?.member.name` no está disponible: "En ejecución por: Cleaner asignado"

#### Mensaje secundario (línea 1)
**Copy canónico:** "{nombreEquipo}"

**Variantes permitidas:**
- Si `primaryAssignee?.member.team.name` no está disponible: "Equipo"

#### Mensaje secundario (línea 2)
**Copy canónico:** "En progreso"

**Variantes permitidas:** Ninguna

#### Intención del mensaje
- Confirmar que la limpieza está en ejecución
- Mostrar quién la está ejecutando
- Indicar claramente el estado activo

#### Botón "Ver equipos"
**¿Se muestra?** ✅ SÍ (si hay equipos disponibles)

**Razón:** Permite ver otros equipos aunque uno ya está ejecutando.

---

### 3.6 Nivel 5: Completada

**Condición:** `Cleaning.status === "COMPLETED"` y `Cleaning.completedAt` está establecido.

#### Título de la tarjeta
**Copy canónico:** "Completada por: {nombreCleaner}"

**Variantes permitidas:**
- Si `primaryAssignee?.member.name` no está disponible: "Completada por: Cleaner asignado"

#### Mensaje secundario (línea 1)
**Copy canónico:** "{nombreEquipo}"

**Variantes permitidas:**
- Si `primaryAssignee?.member.team.name` no está disponible: "Equipo"

#### Mensaje secundario (línea 2)
**Copy canónico:** "Completada"

**Variantes permitidas:** Ninguna

#### Intención del mensaje
- Confirmar que la limpieza fue completada
- Mostrar quién la completó
- Indicar estado terminal

#### Botón "Ver equipos"
**¿Se muestra?** ✅ SÍ (si hay equipos disponibles)

**Razón:** Permite ver equipos para referencia histórica.

---

### 3.7 Estado de error

**Condición:** Error al cargar datos de asignación.

#### Título de la tarjeta
**Copy canónico:** "Asignación"

#### Mensaje secundario
**Copy canónico:** "No se pudo cargar la asignación."

**Variantes permitidas:** Ninguna

#### Intención del mensaje
- Indicar que hubo un error técnico
- No sugerir estado de asignación cuando hay error
- Mantener mensaje neutral

---

## 4. Copy explícitamente prohibido

### 4.1 Frases prohibidas por prometer automatismos

**❌ "Será asignada automáticamente"**
- **Razón:** Promete comportamiento futuro que puede no ocurrir
- **Reemplazo válido:** "Pendiente de aceptación" o "Hay equipos asignados..."

**❌ "La limpieza será asignada automáticamente"**
- **Razón:** Misma que arriba
- **Reemplazo válido:** Describir estado actual

**❌ "Puedes asignarla manualmente"**
- **Razón:** Sugiere acción que puede no estar disponible o no ser necesaria
- **Reemplazo válido:** Describir estado actual sin sugerir acciones

**❌ "Se asignará cuando..."**
- **Razón:** Promete comportamiento futuro condicional
- **Reemplazo válido:** Describir estado actual

---

### 4.2 Frases prohibidas por confundir conceptos

**❌ "No hay equipo asignado"** (cuando hay equipos configurados en la propiedad)
- **Razón:** Confunde "equipos asignados a propiedad" con "equipo asignado a limpieza"
- **Reemplazo válido:** "Pendiente de aceptación" o "Hay equipos asignados a esta propiedad..."

**❌ "Ningún cleaner ha aceptado"** (cuando no hay `teamId` asignado)
- **Razón:** Implica que hay equipo asignado cuando no lo hay
- **Reemplazo válido:** "Pendiente de aceptación" (Nivel 1) o "Asignada a equipo..." (Nivel 2)

**❌ "Sin equipo disponible"** (cuando hay `HostWorkGroupProperty` o `PropertyTeam`)
- **Razón:** Niega existencia de equipos cuando sí existen
- **Reemplazo válido:** "Pendiente de aceptación" (si hay equipos pero no asignados) o "Sin equipo disponible" (solo si realmente no hay equipos)

**❌ "Equipo asignado"** (cuando solo hay equipos configurados en propiedad pero no `teamId` en cleaning)
- **Razón:** Confunde configuración de propiedad con asignación de limpieza
- **Reemplazo válido:** "Hay equipos asignados a esta propiedad..." (Nivel 1)

---

### 4.3 Frases prohibidas por inferir aceptación

**❌ "Cleaner aceptó"** (cuando solo hay `teamId` pero no `assignedMembershipId`)
- **Razón:** Afirma aceptación cuando solo hay asignación a equipo
- **Reemplazo válido:** "Asignada a equipo..." (Nivel 2)

**❌ "Miembro asignado"** (cuando solo hay `teamId`)
- **Razón:** Sugiere que hay miembro específico cuando solo hay equipo
- **Reemplazo válido:** "Asignada a equipo..." (Nivel 2)

---

### 4.4 Frases prohibidas por ser ambiguas

**❌ "Pendiente de asignación"** (para Nivel 1)
- **Razón:** Ambiguo: ¿asignación a equipo o aceptación por cleaner?
- **Reemplazo válido:** "Pendiente de aceptación" (más específico)

**❌ "Sin asignar"**
- **Razón:** No especifica qué nivel de asignación falta
- **Reemplazo válido:** "Sin equipo disponible" (Nivel 0) o "Pendiente de aceptación" (Nivel 1)

---

## 5. Relación Banner ↔ Tarjeta

### 5.1 Fuente común de verdad

**Ambos derivan del mismo `assignmentLevel`:**
- El Banner de Atención usa `getCleaningAttention()` que deriva de `assignmentLevel`
- La Tarjeta de Asignación usa directamente `assignmentLevel`

**Implicación:** Ambos deben reflejar el mismo nivel de asignación.

---

### 5.2 No pueden contradecirse

**Regla:** El Banner y la Tarjeta **NO** pueden mostrar información contradictoria sobre el mismo nivel.

**Ejemplos de contradicciones inválidas:**
- ❌ Banner: "No hay equipos disponibles" + Tarjeta: "Pendiente de aceptación"
- ❌ Banner: "El equipo asignado no tiene miembros" + Tarjeta: "Asignada a equipo: X"
- ❌ Banner: Sin alerta + Tarjeta: "Sin equipo disponible" (cuando debería haber alerta)

**Ejemplos válidos:**
- ✅ Banner: "No hay equipos disponibles" + Tarjeta: "Sin equipo disponible" (ambos Nivel 0)
- ✅ Banner: Sin alerta + Tarjeta: "Pendiente de aceptación" (ambos Nivel 1, sin problemas)
- ✅ Banner: "El equipo asignado no tiene miembros" + Tarjeta: "Asignada a equipo: X" (ambos Nivel 2, pero banner indica problema)

---

### 5.3 Ninguno "corrige" al otro

**Regla:** La Tarjeta **NO** debe "corregir" información del Banner, ni viceversa.

**Implicación:**
- Si el Banner muestra un problema, la Tarjeta debe reflejar el mismo nivel (puede mostrar más detalle, pero no contradecir)
- Si la Tarjeta muestra un estado, el Banner debe ser consistente con ese estado

**Ejemplo válido:**
- Banner: "No hay equipos disponibles" (Nivel 0)
- Tarjeta: "Sin equipo disponible" + "Esta propiedad no tiene equipos configurados..." (Nivel 0, con más detalle)

**Ejemplo inválido:**
- Banner: "No hay equipos disponibles" (Nivel 0)
- Tarjeta: "Pendiente de aceptación" (Nivel 1) ← Contradicción

---

## 6. Invariantes UX (MUST NOT BREAK)

### 6.1 El copy no anticipa comportamiento futuro

**Regla:** El copy debe describir el estado actual, no prometer o anticipar comportamiento futuro.

**Ejemplo válido:**
- "Pendiente de aceptación" (describe estado actual)

**Ejemplo inválido:**
- "Será asignada automáticamente" (anticipa comportamiento futuro)

---

### 6.2 El copy no depende de cantidad de miembros

**Regla:** El copy debe ser válido tanto para 1 miembro como para múltiples miembros.

**Ejemplo válido:**
- "Ningún miembro ha aceptado la limpieza" (funciona para 1 o N)

**Ejemplo inválido:**
- "El miembro puede aceptar" (implica singular, no funciona para múltiples)

---

### 6.3 El copy es válido aunque cambie la lógica interna

**Regla:** El copy debe reflejar el nivel de asignación, no la lógica específica de cómo se alcanzó ese nivel.

**Implicación:**
- Si cambia la lógica de asignación automática, el copy sigue siendo válido
- Si cambia la lógica de aceptación, el copy sigue siendo válido
- El copy se basa en el estado final (`assignmentLevel`), no en el proceso

---

### 6.4 El copy corresponde al nivel real

**Regla:** El copy mostrado debe corresponder exactamente al `assignmentLevel` calculado.

**Validación:**
- Nivel 0 → Copy de Nivel 0
- Nivel 1 → Copy de Nivel 1
- Nivel 2 → Copy de Nivel 2
- Nivel 3 → Copy de Nivel 3
- Nivel 4 → Copy de Nivel 4
- Nivel 5 → Copy de Nivel 5

**No permitido:**
- Mostrar copy de Nivel 1 cuando el nivel real es 0
- Mostrar copy de Nivel 2 cuando el nivel real es 1
- Cualquier desalineación entre nivel y copy

---

### 6.5 El copy no mezcla niveles

**Regla:** Un mensaje no debe mezclar conceptos de diferentes niveles.

**Ejemplo inválido:**
- "Hay equipos asignados pero ningún cleaner ha aceptado" (mezcla Nivel 1 y Nivel 2)

**Ejemplo válido:**
- Nivel 1: "Hay equipos asignados a esta propiedad, pero ningún miembro ha aceptado la limpieza"
- Nivel 2: "Asignada a equipo: X. Los cleaners del equipo pueden ver y aceptar la limpieza"

---

### 6.6 El copy es verificable

**Regla:** Cualquier afirmación en el copy debe ser verificable contra el estado actual de los datos.

**Ejemplo válido:**
- "Asignada a equipo: X" (verificable: `Cleaning.teamId` existe)

**Ejemplo inválido:**
- "Será asignada automáticamente" (no verificable: es predicción futura)

---

### 6.7 El copy no crea expectativas falsas

**Regla:** El copy no debe crear expectativas que pueden no cumplirse.

**Ejemplo inválido:**
- "La limpieza será asignada automáticamente" (crea expectativa que puede no cumplirse)

**Ejemplo válido:**
- "Pendiente de aceptación" (describe estado actual sin crear expectativas)

---

## 7. Checklist de validación

Use este checklist para validar copy en PRs o QA:

### 7.1 Validación de principios

- [ ] ¿El copy promete automatismos? → ❌ NO debe prometer
- [ ] ¿El copy mezcla conceptos de diferentes niveles? → ❌ NO debe mezclar
- [ ] ¿El copy es válido para 1 y N miembros? → ✅ DEBE ser válido
- [ ] ¿El copy corresponde al nivel real? → ✅ DEBE corresponder
- [ ] ¿El copy es verificable contra datos actuales? → ✅ DEBE ser verificable

### 7.2 Validación de consistencia

- [ ] ¿El Banner y la Tarjeta reflejan el mismo nivel? → ✅ DEBEN reflejar
- [ ] ¿El Banner y la Tarjeta se contradicen? → ❌ NO deben contradecirse
- [ ] ¿La Tarjeta "corrige" al Banner? → ❌ NO debe corregir

### 7.3 Validación de copy específico

- [ ] ¿El título corresponde al nivel? → ✅ DEBE corresponder
- [ ] ¿El mensaje secundario corresponde al nivel? → ✅ DEBE corresponder
- [ ] ¿Se usan frases prohibidas? → ❌ NO deben usarse
- [ ] ¿El copy es claro y directo? → ✅ DEBE ser claro

### 7.4 Validación de invariantes

- [ ] ¿El copy anticipa comportamiento futuro? → ❌ NO debe anticipar
- [ ] ¿El copy depende de cantidad de miembros? → ❌ NO debe depender
- [ ] ¿El copy crea expectativas falsas? → ❌ NO debe crear

---

## 8. Referencias

### 8.1 Contratos relacionados

- **`CLEANING_ASSIGNMENT_V1.md`**: Define niveles de asignación (0-5) y su significado conceptual
- **`CLEANING_DETAIL_UX_V1.md`**: Define comportamiento UX del Detalle de Limpieza

### 8.2 Archivos de código

- **`app/host/cleanings/[id]/AssignmentSection.tsx`**: Implementación actual del copy
- **`lib/cleanings/getCleaningAssignmentLevel.ts`**: Helper canónico para determinar nivel
- **`lib/cleanings/getCleaningAttention.ts`**: Helper para derivar atención requerida

### 8.3 Historial de cambios

- **v1.0 (2025-01-XX)**: Creación inicial del contrato
  - Formalización de copy implementado en `AssignmentSection.tsx`
  - Corrección de mensajes que prometían automatismos
  - Establecimiento de principios de copy

---

## 9. Glosario

### 9.1 Términos clave

**Equipos asignados a la propiedad:**
- Equipos configurados vía `HostWorkGroupProperty` + `WorkGroupExecutor` o `PropertyTeam`
- Indica que la propiedad tiene equipos disponibles para asignar limpiezas

**Equipo asignado a la limpieza:**
- `Cleaning.teamId` está establecido
- Indica que la limpieza específica está asignada a un equipo

**Cleaner aceptó:**
- `Cleaning.assignedMembershipId` está establecido
- Indica que un cleaner individual aceptó la limpieza

**Pendiente de aceptación:**
- Hay equipos disponibles pero ningún cleaner ha aceptado
- Puede aplicarse a Nivel 1 (equipos en propiedad) o Nivel 2 (equipo asignado a limpieza)

---

**Fin del Contrato**

