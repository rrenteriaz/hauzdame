# Empty States de Cleaner — Contrato v1

**Estado:** Canonical  
**Última actualización:** v1.0 — Contrato inicial  
**Alcance:** Cleaner — Estados vacíos cuando no puede acceder a funcionalidades

---

## 1. Propósito del contrato

Este contrato define los estados vacíos canónicos para Cleaners cuando no pueden acceder a funcionalidades debido a falta de equipos o permisos.

**Objetivo:**
- Establecer copy canónico para estados vacíos de Cleaner
- Definir condiciones exactas de activación
- Garantizar UX clara, proactiva y de bienvenida
- Eliminar ambigüedades sobre cuándo y cómo mostrar estos estados

**NO regula:**
- Lógica de negocio o permisos
- Flujos de invitación o asignación
- Backend o persistencia de datos
- Otros estados vacíos fuera del alcance de Cleaner

---

## 2. Estado vacío: Cleaner sin equipos

### 2.1 Condición exacta de activación

Este estado se muestra cuando se cumplen **TODAS** las siguientes condiciones:

1. **Usuario autenticado:** El usuario tiene una sesión válida (`hausdame_session` cookie)
2. **Rol Cleaner:** El usuario tiene `role === "CLEANER"`
3. **Sin equipos activos:** El usuario no pertenece a ningún equipo:
   - No tiene `TeamMembership` con `status === "ACTIVE"`
   - No tiene `TeamMember` legacy con `isActive === true`
4. **Sin invitaciones aceptadas:** No hay membresías pendientes que puedan activarse automáticamente

**Lógica de detección:**
- Se ejecuta `resolveCleanerContext()` que busca `TeamMembership` activas y `TeamMember` legacy activos
- Si ambas búsquedas retornan vacío, se renderiza `<NoMembershipPage />`
- El componente padre detecta `teamIds.length === 0` o error en `resolveCleanerContext()`

**Regla de visibilidad (CRÍTICA):**
- Este mensaje se muestra **SIEMPRE** que el Cleaner no pertenezca a ningún equipo activo
- **NO** depende de:
  - Primera sesión
  - Número de veces visto
  - Tiempo transcurrido
- El mensaje desaparece automáticamente cuando:
  - El Cleaner acepta una invitación de Host o Team Leader
  - Se crea una `TeamMembership` con `status === "ACTIVE"` para el usuario

---

### 2.2 Copy canónico

#### Título
**Copy canónico:** "¡Bienvenido a Hausdame!"

**Variantes permitidas:** Ninguna

**Intención:** Dar la bienvenida y establecer un tono positivo desde el inicio.

---

#### Mensaje principal
**Copy canónico:** "Para empezar a ver y aceptar limpiezas, necesitas unirte a un equipo de trabajo. Un Host debe enviarte una invitación para que puedas acceder a las limpiezas disponibles."

**Variantes permitidas:** Ninguna

**Intención:**
- Explicar claramente qué necesita hacer el Cleaner
- Indicar que el proceso requiere acción del Host (enviar invitación)
- No culpar al usuario ni sugerir error del sistema

---

#### Mensaje secundario
**Copy canónico:** "Cuando aceptes una invitación, las limpiezas se mostrarán en tu calendario. Mientras tanto, puedes explorar la plataforma y familiarizarte con el flujo de trabajo."

**Variantes permitidas:** Ninguna

**Intención:**
- Explicar qué ocurrirá después de aceptar la invitación
- Ofrecer una acción alternativa (explorar la plataforma)
- Mantener un tono esperanzador y orientado al futuro

---

#### CTA primario
**Texto canónico:** "Entendido"

**Navegación:** `href="/cleaner"` (página "Hoy" del Cleaner)

**Variantes permitidas:** Ninguna

**Intención:** Confirmar que el Cleaner entendió el mensaje y permitirle navegar a la página "Hoy" del Cleaner.

---

### 2.3 CTAs permitidos

**CTA primario:**
- ✅ "Entendido" — Navega a `/` (página de inicio)
- ❌ NO se permite ningún otro texto
- ❌ NO se permite cambiar la navegación

**CTAs secundarios:**
- ❌ NO se muestran CTAs secundarios
- ❌ NO se muestra botón "Cerrar sesión"
- ❌ NO se muestra botón "Dismiss" o "Cerrar"
- ❌ NO se permite cerrar/dismiss manual del mensaje

---

### 2.4 Principios de copy (MUST)

#### Bienvenida y tono positivo

**✅ PERMITIDO:**
- Usar lenguaje de bienvenida ("¡Bienvenido!")
- Tono profesional pero acogedor
- Orientado al siguiente paso

**❌ PROHIBIDO:**
- Lenguaje de error o bloqueo
- Culpar al usuario
- Sugerir que algo está mal

---

#### Claridad sobre el estado

**✅ PERMITIDO:**
- Explicar por qué no ve limpiezas
- Indicar qué necesita hacer (recibir invitación)
- Explicar qué ocurrirá después (limpiezas aparecerán)

**❌ PROHIBIDO:**
- Mensajes ambiguos o confusos
- No explicar el siguiente paso
- Dejar al usuario sin orientación

---

#### No promesas de automatismo

**✅ PERMITIDO:**
- Describir el proceso (Host envía invitación → Cleaner acepta → Limpiezas aparecen)
- Usar lenguaje factual ("cuando aceptes")

**❌ PROHIBIDO:**
- Prometer automatismos ("automáticamente", "al instante", "inmediatamente")
- Garantizar tiempos específicos
- Crear expectativas no verificables

---

#### No permitir dismiss manual

**✅ PERMITIDO:**
- Mostrar el mensaje siempre que se cumplan las condiciones
- El mensaje desaparece automáticamente cuando el Cleaner acepta una invitación

**❌ PROHIBIDO:**
- Mostrar el mensaje solo la primera vez
- Permitir cerrar/dismiss manual
- Ocultar el mensaje con cookies o localStorage
- Mostrar el mensaje solo después de X intentos

---

### 2.5 Invariantes UX (MUST NOT BREAK)

#### No mostrar limpiezas

**Regla:** Cuando se muestra este estado vacío, **NO** se deben mostrar:
- Lista de limpiezas disponibles
- Calendario con limpiezas
- Contadores de limpiezas
- Cualquier dato relacionado con limpiezas

**Razón:** El Cleaner no tiene acceso a limpiezas hasta que pertenezca a un equipo.

---

#### No mostrar errores

**Regla:** Este estado **NO** debe:
- Mostrar mensajes de error
- Indicar fallos del sistema
- Sugerir problemas técnicos
- Usar iconos o colores de error (rojo, alertas)

**Razón:** Es un estado esperado y transitorio, no un error.

---

#### No sugerir fallo del sistema

**Regla:** El copy **NO** debe:
- Implicar que algo está roto
- Sugerir que el sistema no funciona
- Indicar problemas técnicos

**Razón:** El estado es correcto y esperado para un Cleaner sin equipo.

---

#### Mantener estructura visual

**Regla:** La estructura visual debe mantenerse:
- Centrado en pantalla
- Card con fondo blanco y borde
- Botón primario destacado (azul)
- Sin botones secundarios

**Razón:** Consistencia visual con otros estados vacíos de la aplicación.

---

## 3. Ejemplos válidos / inválidos

### 3.1 Copy válido

**✅ Válido:**
```
Título: ¡Bienvenido a Hausdame!
Mensaje: Para empezar a ver y aceptar limpiezas, necesitas unirte a un equipo de trabajo...
CTA: Entendido
```

**Razón:** Sigue el copy canónico exacto, tono positivo, explica el proceso claramente.

---

### 3.2 Copy inválido

**❌ Inválido — Lenguaje de error:**
```
Título: Error: No perteneces a un equipo
Mensaje: No puedes acceder a las limpiezas porque no estás en ningún equipo.
```

**Razón:** Usa lenguaje de error, culpa al usuario, no explica el siguiente paso.

---

**❌ Inválido — Promesa de automatismo:**
```
Mensaje: Las limpiezas aparecerán automáticamente cuando aceptes una invitación.
```

**Razón:** Promete automatismo no garantizado.

---

**❌ Inválido — CTA incorrecto:**
```
CTA: Ir al inicio
```

**Razón:** El CTA debe ser "Entendido", no "Ir al inicio".

---

**❌ Inválido — Botón secundario:**
```
CTA primario: Entendido
CTA secundario: Cerrar sesión
```

**Razón:** No se permiten CTAs secundarios.

---

**❌ Inválido — Dismiss manual:**
```
Mensaje con botón "X" para cerrar
```

**Razón:** No se permite dismiss manual del mensaje.

---

## 4. Archivos involucrados

### 4.1 Componente principal
- `app/cleaner/NoMembershipPage.tsx` — Componente que renderiza el estado vacío

### 4.2 Páginas que usan el componente
- `app/cleaner/page.tsx` — Dashboard principal del Cleaner
- `app/cleaner/cleanings/available/page.tsx` — Lista de limpiezas disponibles
- `app/cleaner/cleanings/all/page.tsx` — Lista de todas las limpiezas

### 4.3 Lógica de detección
- `lib/cleaner/resolveCleanerContext.ts` — Resuelve el contexto del Cleaner y detecta si tiene equipos

---

## 5. Referencias a futuras variantes (NOTA)

**Nota:** Este contrato documenta la variante actual (Cleaner sin equipo). En el futuro pueden existir otras variantes:

- Cleaner con invitación pendiente (no implementado aún)
- Cleaner con equipo inactivo (no implementado aún)
- Cleaner con permisos limitados (no implementado aún)

**IMPORTANTE:** Estas variantes NO están implementadas y NO deben inferirse del código actual. Cada variante futura requerirá su propio copy canónico y se documentará en este mismo contrato.

---

## 6. Criterios de aceptación (QA)

### 6.1 Copy canónico

- ✅ El título es exactamente "¡Bienvenido a Hausdame!"
- ✅ El mensaje principal explica claramente el proceso de invitación
- ✅ El mensaje secundario explica qué ocurrirá después
- ✅ El CTA primario dice exactamente "Entendido" (no "Ir al inicio" ni variantes)

### 6.2 CTAs

- ✅ Solo hay un CTA: "Entendido"
- ✅ NO hay botón "Cerrar sesión"
- ✅ NO hay botón "Dismiss" o "Cerrar"
- ✅ El CTA navega a `/cleaner` (página "Hoy" del Cleaner)

### 6.3 Principios de copy

- ✅ No usa lenguaje de error o bloqueo
- ✅ No culpa al usuario
- ✅ No promete automatismos
- ✅ Explica claramente el siguiente paso

### 6.4 Regla de visibilidad

- ✅ Se muestra siempre que el Cleaner no tiene equipos activos
- ✅ NO depende de primera sesión o número de veces visto
- ✅ Desaparece automáticamente cuando el Cleaner acepta una invitación
- ✅ NO se puede cerrar/dismiss manualmente

### 6.5 Invariantes UX

- ✅ No muestra limpiezas cuando se muestra este estado
- ✅ No muestra mensajes de error
- ✅ No sugiere fallo del sistema
- ✅ Mantiene estructura visual consistente

### 6.6 Condición de activación

- ✅ Se muestra solo cuando el Cleaner no tiene equipos activos
- ✅ Se muestra solo cuando el Cleaner está autenticado
- ✅ Se muestra solo cuando el rol es CLEANER

---

## 7. Referencias

### 7.1 Contratos relacionados

- `docs/contracts/CLEANER_DASHBOARD_HOY_CONTRACT.md` — Contrato del Dashboard del Cleaner (cuando tiene equipos)
- `docs/contracts/CLEANER_EMPTY_STATE_NO_TEAM_V1.md` — Contrato anterior (deprecado, referenciar este contrato)

### 7.2 Archivos técnicos

- `lib/cleaner/resolveCleanerContext.ts` — Lógica de detección de contexto
- `app/cleaner/NoMembershipPage.tsx` — Componente del estado vacío

---

**Fin del contrato**

