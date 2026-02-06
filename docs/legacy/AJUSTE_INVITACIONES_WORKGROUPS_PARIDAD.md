# AJUSTE: Paridad Total Invitaciones Host→Cleaner con TL→SM

**Fecha:** 2025-01-XX  
**Estado:** ✅ Completado

---

## ✅ OBJETIVO CUMPLIDO

Ajustar la UX de invitación Host→Cleaner (WorkGroup) para que sea 1:1 con TL→SM en:
- ✅ Campos del modal (eliminado "Mensaje", agregado "Expira en (días)")
- ✅ Manejo/visualización de caducidad (expira en X días + fecha)
- ✅ Copy preestablecido (igual que TL→SM)

---

## 📋 CAMBIOS IMPLEMENTADOS

### 1. Modal de Creación de Invitación

#### Antes:
- Campo: "Nombre sugerido (opcional)"
- Campo: "Mensaje (opcional)" ❌ (no existía en TL→SM)
- Expiración: Fija 30 días (hardcoded)

#### Después (paridad con TL→SM):
- Campo: "Nombre (opcional)" ✅
- Campo: "Expira en (días)" ✅ (default: 7, min: 1, max: 30)
- ❌ Eliminado campo "Mensaje"

### 2. Server Action (`createCleanerInviteForWorkGroup`)

#### Cambios:
- ✅ Lee `expiresInDays` del FormData (default: 7 días)
- ✅ Clamp entre 1 y 30 días (igual que TL→SM)
- ✅ Calcula `expiresAt` igual que TL→SM: `expiresAt.setDate(expiresAt.getDate() + expiresInDays)`
- ✅ Genera token con `base64url` (igual que TL→SM)
- ✅ Intento de token único con retry (igual que TL→SM)
- ✅ `message` siempre `null` (no se usa mensaje personalizado)

### 3. Visualización de Caducidad

#### En la lista de invitaciones:
- ✅ Para PENDING: Badge "Pendiente" + "Expira en X días" + fecha completa
- ✅ Para EXPIRED: Badge "Expirada" + fecha expirada
- ✅ Para CLAIMED: "Aceptada: fecha"
- ✅ Para REVOKED: Badge "Revocada" (no se muestra en lista visible)

---

## 📁 ARCHIVOS MODIFICADOS

1. **`app/host/workgroups/[id]/WorkGroupInvitesSection.tsx`**
   - Eliminado estado `message`
   - Agregado estado `expiresInDays` (default: 7)
   - Eliminado campo textarea "Mensaje"
   - Agregado campo number "Expira en (días)"
   - Actualizado placeholder: "Nombre del Team Leader"
   - Actualizado label: "Nombre (opcional)" (igual que TL→SM)
   - Actualizado botón: "Generar link" (igual que TL→SM)
   - Eliminado `message` de interfaz `Invite`

2. **`app/host/workgroups/invites/actions.ts`**
   - Eliminado lectura de `message` del FormData
   - Agregado lectura de `expiresInDays` del FormData
   - Implementado clamp: `Math.max(1, Math.min(30, ...))`
   - Cambiado generación de token a `base64url` (igual que TL→SM)
   - Implementado retry para token único (igual que TL→SM)
   - Cambiado cálculo de `expiresAt` para usar `expiresInDays` en lugar de 30 días fijo
   - `message` siempre `null` en la creación

---

## 🔍 COMPARACIÓN TL→SM vs Host→Cleaner

### Campos del Modal

| Campo | TL→SM | Host→Cleaner | Estado |
|-------|-------|-------------|--------|
| Nombre (opcional) | ✅ | ✅ | ✅ Igual |
| Expira en (días) | ✅ (default: 7) | ✅ (default: 7) | ✅ Igual |
| Mensaje | ❌ No existe | ❌ Eliminado | ✅ Igual |

### Expiración

| Aspecto | TL→SM | Host→Cleaner | Estado |
|---------|-------|-------------|--------|
| Default | 7 días | 7 días | ✅ Igual |
| Min | 1 día | 1 día | ✅ Igual |
| Max | 30 días | 30 días | ✅ Igual |
| Cálculo | `setDate(getDate() + days)` | `setDate(getDate() + days)` | ✅ Igual |
| Clamp | `Math.max(1, Math.min(30, ...))` | `Math.max(1, Math.min(30, ...))` | ✅ Igual |

### Token

| Aspecto | TL→SM | Host→Cleaner | Estado |
|---------|-------|-------------|--------|
| Formato | `base64url` | `base64url` | ✅ Igual |
| Longitud | 32 bytes | 32 bytes | ✅ Igual |
| Retry | ✅ (max 5 intentos) | ✅ (max 5 intentos) | ✅ Igual |

### Visualización

| Estado | TL→SM | Host→Cleaner | Estado |
|--------|-------|-------------|--------|
| PENDING | Badge + "Expira en X días" + fecha | Badge + "Expira en X días" + fecha | ✅ Igual |
| EXPIRED | Badge "Expirada" + fecha | Badge "Expirada" + fecha | ✅ Igual |
| CLAIMED | "Aceptada: fecha" | "Aceptada: fecha" | ✅ Igual |
| REVOKED | No visible en lista | No visible en lista | ✅ Igual |

---

## ✅ CRITERIOS DE ACEPTACIÓN

- ✅ El modal Host→Cleaner tiene EXACTAMENTE los mismos campos que TL→SM (sin "Mensaje")
- ✅ Al crear una invitación, se crea con `expiresAt` calculado desde `expiresInDays`
- ✅ Se refleja en la lista: "Pendiente · Expira en X días" (y fecha de expiración)
- ✅ UI/estilos iguales a TL→SM
- ✅ No cambios en Cleaners salvo lo ya existente

---

## 📝 TTL/EXPIRACIÓN DOCUMENTADA

**TTL por defecto:** 7 días  
**TTL mínimo:** 1 día  
**TTL máximo:** 30 días  
**Cálculo:** `expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + expiresInDays);`

**Igual que TL→SM:** ✅ Sí

---

## 🔄 COMPATIBILIDAD

- ✅ No se tocó `/cleaner/**`
- ✅ No se tocaron endpoints existentes
- ✅ El schema `HostWorkGroupInvite` ya tenía `expiresAt` (sin cambios)
- ✅ El campo `message` sigue existiendo en el schema pero siempre se guarda como `null`

---

## ✅ CONFIRMACIÓN FINAL

**No se tocó:**
- ✅ `/cleaner/**`
- ✅ Endpoints existentes
- ✅ Schema (solo uso de campos existentes)

**Se modificó:**
- ✅ `WorkGroupInvitesSection.tsx` - Modal actualizado para paridad con TL→SM
- ✅ `actions.ts` - Server action actualizado para usar `expiresInDays` y calcular `expiresAt`

**Estado:** ✅ **LISTO PARA PRUEBAS**

---

## 🎯 EVIDENCIA VISUAL

### Modal TL→SM:
```
┌─────────────────────────────┐
│ Invitar miembro            │
│ Nombre (opcional)          │
│ [________________]          │
│ Expira en (días)           │
│ [7]                        │
│ [Generar link]             │
└─────────────────────────────┘
```

### Modal Host→Cleaner (después):
```
┌─────────────────────────────┐
│ Invitar Team Leader        │
│ Nombre (opcional)          │
│ [________________]          │
│ Expira en (días)           │
│ [7]                        │
│ [Generar link]             │
└─────────────────────────────┘
```

**Paridad:** ✅ 100%

