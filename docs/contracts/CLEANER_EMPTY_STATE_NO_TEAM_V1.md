# Estado Vacío: Cleaner sin Equipo — Contrato v1 (DEPRECADO)

**Estado:** Deprecated  
**Última actualización:** v1.0 — Deprecado en favor de `CLEANER_EMPTY_STATES_V1.md`  
**Alcance:** Cleaner — Vista cuando no pertenece a ningún equipo

**⚠️ IMPORTANTE:** Este contrato ha sido deprecado. La fuente de verdad canónica es:
- **`docs/contracts/CLEANER_EMPTY_STATES_V1.md`** — Contrato canónico de Empty States de Cleaner

Este documento se mantiene solo como referencia histórica. Para el copy canónico y las reglas actuales, consulta el contrato canónico mencionado arriba.

---

## 1. Propósito del estado vacío

Este estado vacío se muestra cuando un Cleaner autenticado accede a la plataforma pero aún no pertenece a ningún equipo de trabajo (no tiene invitaciones aceptadas).

**Objetivo:**
- Dar la bienvenida al Cleaner
- Explicar claramente por qué aún no ve limpiezas
- Orientar sobre el siguiente paso (recibir y aceptar invitación)
- Mantener un tono profesional y proactivo

**NO es:**
- Un mensaje de error
- Un bloqueo o rechazo
- Una indicación de fallo del sistema
- Un estado permanente (es transitorio hasta aceptar invitación)

---

## 2. Condición exacta de activación

Este estado se muestra cuando se cumplen **TODAS** las siguientes condiciones:

1. **Usuario autenticado:** El usuario tiene una sesión válida (`hausdame_session` cookie)
2. **Rol Cleaner:** El usuario tiene `role === "CLEANER"`
3. **Sin equipos:** El usuario no pertenece a ningún equipo:
   - No tiene `TeamMembership` con `status === "ACTIVE"`
   - No tiene `TeamMember` legacy con `isActive === true`
4. **Sin invitaciones aceptadas:** No hay membresías pendientes que puedan activarse automáticamente

**Lógica de detección:**
- Se ejecuta `resolveCleanerContext()` que:
  - Busca `TeamMembership` activas para el usuario
  - Busca `TeamMember` legacy activos
  - Si ambas búsquedas retornan vacío, lanza error o retorna contexto vacío
- El componente padre (`app/cleaner/page.tsx`, `app/cleaner/cleanings/*/page.tsx`) detecta `teamIds.length === 0` o error en `resolveCleanerContext()`
- Se renderiza `<NoMembershipPage />`

---

## 3. Copy canónico

### 3.1 Título

**Copy canónico:** "¡Bienvenido a Hausdame!"

**Variantes permitidas:** Ninguna

**Intención:** Dar la bienvenida y establecer un tono positivo desde el inicio.

---

### 3.2 Mensaje principal

**Copy canónico:** "Para empezar a ver y aceptar limpiezas, necesitas unirte a un equipo de trabajo. Un Host debe enviarte una invitación para que puedas acceder a las limpiezas disponibles."

**Variantes permitidas:** Ninguna

**Intención:**
- Explicar claramente qué necesita hacer el Cleaner
- Indicar que el proceso requiere acción del Host (enviar invitación)
- No culpar al usuario ni sugerir error del sistema

---

### 3.3 Mensaje secundario

**Copy canónico:** "Cuando aceptes una invitación, las limpiezas se mostrarán en tu calendario. Mientras tanto, puedes explorar la plataforma y familiarizarte con el flujo de trabajo."

**Variantes permitidas:** Ninguna

**Intención:**
- Explicar qué ocurrirá después de aceptar la invitación
- Ofrecer una acción alternativa (explorar la plataforma)
- Mantener un tono esperanzador y orientado al futuro

---

### 3.4 Botón primario

**Texto canónico:** "Ir al inicio"

**Navegación:** `href="/"` (página de inicio de la aplicación)

**Variantes permitidas:** Ninguna

**Intención:** Permitir al Cleaner navegar a la página principal para explorar la plataforma.

---

### 3.5 Botón secundario (opcional)

**Texto canónico:** "Cerrar sesión"

**Acción:** `POST /api/auth/logout`

**Variantes permitidas:** Puede omitirse en futuras variantes si no es necesario

**Intención:** Permitir al Cleaner cerrar sesión si lo desea.

---

## 4. Principios de copy (MUST)

### 4.1 Bienvenida y tono positivo

**✅ PERMITIDO:**
- Usar lenguaje de bienvenida ("¡Bienvenido!")
- Tono profesional pero acogedor
- Orientado al siguiente paso

**❌ PROHIBIDO:**
- Lenguaje de error o bloqueo
- Culpar al usuario
- Sugerir que algo está mal

---

### 4.2 Claridad sobre el estado

**✅ PERMITIDO:**
- Explicar por qué no ve limpiezas
- Indicar qué necesita hacer (recibir invitación)
- Explicar qué ocurrirá después (limpiezas aparecerán)

**❌ PROHIBIDO:**
- Mensajes ambiguos o confusos
- No explicar el siguiente paso
- Dejar al usuario sin orientación

---

### 4.3 No promesas de automatismo

**✅ PERMITIDO:**
- Describir el proceso (Host envía invitación → Cleaner acepta → Limpiezas aparecen)
- Usar lenguaje factual ("cuando aceptes")

**❌ PROHIBIDO:**
- Prometer automatismos ("automáticamente", "al instante", "inmediatamente")
- Garantizar tiempos específicos
- Crear expectativas no verificables

---

## 5. Invariantes UX (MUST NOT BREAK)

### 5.1 No mostrar limpiezas

**Regla:** Cuando se muestra este estado vacío, **NO** se deben mostrar:
- Lista de limpiezas disponibles
- Calendario con limpiezas
- Contadores de limpiezas
- Cualquier dato relacionado con limpiezas

**Razón:** El Cleaner no tiene acceso a limpiezas hasta que pertenezca a un equipo.

---

### 5.2 No mostrar errores

**Regla:** Este estado **NO** debe:
- Mostrar mensajes de error
- Indicar fallos del sistema
- Sugerir problemas técnicos
- Usar iconos o colores de error (rojo, alertas)

**Razón:** Es un estado esperado y transitorio, no un error.

---

### 5.3 No sugerir fallo del sistema

**Regla:** El copy **NO** debe:
- Implicar que algo está roto
- Sugerir que el sistema no funciona
- Indicar problemas técnicos

**Razón:** El estado es correcto y esperado para un Cleaner sin equipo.

---

### 5.4 Mantener estructura visual

**Regla:** La estructura visual debe mantenerse:
- Centrado en pantalla
- Card con fondo blanco y borde
- Botón primario destacado (azul)
- Botón secundario con borde

**Razón:** Consistencia visual con otros estados vacíos de la aplicación.

---

## 6. Archivos involucrados

### 6.1 Componente principal
- `app/cleaner/NoMembershipPage.tsx` — Componente que renderiza el estado vacío

### 6.2 Páginas que usan el componente
- `app/cleaner/page.tsx` — Dashboard principal del Cleaner
- `app/cleaner/cleanings/available/page.tsx` — Lista de limpiezas disponibles
- `app/cleaner/cleanings/all/page.tsx` — Lista de todas las limpiezas

### 6.3 Lógica de detección
- `lib/cleaner/resolveCleanerContext.ts` — Resuelve el contexto del Cleaner y detecta si tiene equipos

---

## 7. Referencias a futuras variantes (NOTA)

**Nota:** Este contrato documenta la variante actual (Cleaner sin equipo). En el futuro pueden existir otras variantes:

- Cleaner con invitación pendiente (no implementado aún)
- Cleaner con equipo inactivo (no implementado aún)
- Cleaner con permisos limitados (no implementado aún)

**IMPORTANTE:** Estas variantes NO están implementadas y NO deben inferirse del código actual. Cada variante futura requerirá su propio contrato y copy canónico.

---

## 8. Criterios de aceptación (QA)

### 8.1 Copy canónico

- ✅ El título es exactamente "¡Bienvenido a Hausdame!"
- ✅ El mensaje principal explica claramente el proceso de invitación
- ✅ El mensaje secundario explica qué ocurrirá después
- ✅ El botón primario dice "Ir al inicio" (no "Ir a Inicio")

### 8.2 Principios de copy

- ✅ No usa lenguaje de error o bloqueo
- ✅ No culpa al usuario
- ✅ No promete automatismos
- ✅ Explica claramente el siguiente paso

### 8.3 Invariantes UX

- ✅ No muestra limpiezas cuando se muestra este estado
- ✅ No muestra mensajes de error
- ✅ No sugiere fallo del sistema
- ✅ Mantiene estructura visual consistente

### 8.4 Condición de activación

- ✅ Se muestra solo cuando el Cleaner no tiene equipos activos
- ✅ Se muestra solo cuando el Cleaner está autenticado
- ✅ Se muestra solo cuando el rol es CLEANER

---

## 9. Referencias

### 9.1 Contratos relacionados

- `docs/contracts/CLEANER_DASHBOARD_HOY_CONTRACT.md` — Contrato del Dashboard del Cleaner (cuando tiene equipos)

### 9.2 Archivos técnicos

- `lib/cleaner/resolveCleanerContext.ts` — Lógica de detección de contexto
- `app/cleaner/NoMembershipPage.tsx` — Componente del estado vacío

---

**Fin del contrato**

