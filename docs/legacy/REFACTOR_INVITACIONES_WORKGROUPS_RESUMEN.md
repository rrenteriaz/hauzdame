# RESUMEN: Refactor UX Invitaciones WorkGroups → Paridad con TL→SM

**Fecha:** 2025-01-XX  
**Estado:** Implementación completada

---

## ✅ ARCHIVOS MODIFICADOS

1. **`app/host/workgroups/[id]/WorkGroupInvitesSection.tsx`** (refactorizado completamente)
   - Reemplazado UI anterior por patrón visual idéntico a `TeamInvitesList.tsx`
   - Mismo layout, badges, filas, botones y comportamientos

2. **`app/host/workgroups/[id]/page.tsx`** (modificado)
   - Query actualizada para incluir `claimedByUser` en el include

---

## 🎨 CAMBIOS VISUALES Y FUNCIONALES

### Antes (UI anterior):
- Lista simple sin colapsar
- Badge y expiración en líneas separadas
- Botón "Revocar" como link de texto
- Layout menos estructurado

### Después (paridad con TL→SM):
- ✅ Botón colapsable con contador de pendientes
- ✅ Badge + "Expira en X días" en la misma fila (solo PENDING)
- ✅ Botón "Revocar enlace" alineado a la derecha (solo PENDING/EXPIRED)
- ✅ "Invitado: nombre" debajo del badge
- ✅ "Creada: fecha · Expira: fecha" debajo
- ✅ Input con link + botón "Copiar" (solo PENDING)
- ✅ "Aceptada: fecha" cuando status=CLAIMED
- ✅ Mismo estilo de badges y colores
- ✅ Mismo comportamiento de copiar (con feedback visual "Copiado")
- ✅ StopPropagationDiv en botones para evitar navegación accidental

---

## 📋 ESTRUCTURA DEL COMPONENTE

### Header
```tsx
<div className="flex items-center justify-between">
  <h2>Invitaciones</h2>
  <button>Crear invitación</button>
</div>
```

### Botón Colapsable
```tsx
<button onClick={toggleCollapsed}>
  <span>Ver invitaciones</span>
  <span>{pendingCount} pendientes</span>
  <svg>chevron</svg>
</button>
```

### Fila de Invitación (cuando no colapsado)
```tsx
<div className="rounded-xl border border-neutral-200 p-3 space-y-2">
  {/* Fila 1: Badge + Expiración + Revocar */}
  <div className="flex items-center justify-between">
    <div>
      <Badge status />
      {status === "PENDING" && <span>Expira en X días</span>}
    </div>
    {(status === "PENDING" || "EXPIRED") && <button>Revocar enlace</button>}
  </div>
  
  {/* Fila 2: Invitado */}
  <div>Invitado: {prefillName || "(sin nombre)"}</div>
  
  {/* Fila 3: Fechas */}
  <div>Creada: fecha · Expira: fecha</div>
  
  {/* Fila 4: Link + Copiar (solo PENDING) */}
  {status === "PENDING" && (
    <div>
      <input value={link} readOnly />
      <button>Copiar</button>
    </div>
  )}
  
  {/* Fila 5: Aceptada (solo CLAIMED) */}
  {status === "CLAIMED" && <div>Aceptada: fecha</div>}
</div>
```

---

## 🔍 PARIDAD EXACTA CON TL→SM

### ✅ Elementos que coinciden:

1. **Badges de estado:**
   - Pendiente: `bg-amber-100 text-amber-800`
   - Aceptada: `bg-emerald-100 text-emerald-800`
   - Expirada: `bg-neutral-100 text-neutral-600`
   - Revocada: `bg-red-100 text-red-800`

2. **Layout de filas:**
   - Badge + "Expira en X días" en misma fila (izquierda)
   - Botón "Revocar enlace" alineado derecha
   - Mismo espaciado y padding

3. **Input + Botón Copiar:**
   - Input readonly con `bg-neutral-50`
   - Botón con estados: normal → "Copiar", copiado → "Copiado" (verde)
   - Mismo estilo de transición

4. **Mensajes:**
   - "¿Revocar este enlace? La persona ya no podrá usarlo."
   - "Invitado: {nombre}"
   - "Creada: fecha · Expira: fecha"
   - "Aceptada: fecha"

5. **Comportamiento:**
   - Colapsar/expandir con localStorage
   - Copiar link con feedback visual
   - Revocar con confirmación
   - Router.refresh() después de acciones

---

## 🔄 DIFERENCIAS INTENCIONALES (solo backend)

1. **URL del link:** `/join/host?token=...` (en lugar de `/join?token=...`)
2. **Acción de revocar:** Usa `revokeInvite` de `actions.ts` (en lugar de API PATCH)
3. **Tipo de invitación:** HostWorkGroupInvite (en lugar de TeamInvite)

---

## ✅ CRITERIOS DE ACEPTACIÓN

- ✅ La sección de invitaciones se ve y se siente igual a TL→SM
- ✅ Badge + expiración + revoke en la misma fila (revoke alineado derecha)
- ✅ Copy link idéntico con feedback visual
- ✅ Estados y estilos consistentes
- ✅ Cero cambios en flujo de datos (HostWorkGroupInvite sigue igual)
- ✅ No se rompe /cleaner/** ni la UX de TL→SM
- ✅ StopPropagation en botones para evitar navegación accidental

---

## 📝 NOTAS

1. **Reutilización:** Se decidió NO extraer componente compartido porque:
   - Los contratos de datos son diferentes (TeamInvite vs HostWorkGroupInvite)
   - Las acciones son diferentes (API vs Server Actions)
   - Mantener separación de dominios es más seguro

2. **Empty state:** Se mantiene simple como en TL→SM (solo texto, sin card especial)

3. **Colapsar:** Se usa localStorage para persistir estado (igual que TL→SM)

4. **claimedByUser:** Se incluye en query pero solo se muestra fecha de aceptación (igual que TL→SM no muestra quién aceptó en la lista principal)

---

## ✅ CONFIRMACIÓN FINAL

**No se tocó:**
- ✅ Backend de HostWorkGroupInvite (sin cambios)
- ✅ `/cleaner/**` (sin cambios)
- ✅ UX de TL→SM (sin cambios)

**Se modificó:**
- ✅ `WorkGroupInvitesSection.tsx` - Refactor completo para paridad visual
- ✅ `page.tsx` - Query actualizada para incluir `claimedByUser`

**Estado:** ✅ **LISTO PARA PRUEBAS**

