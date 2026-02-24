# QA Checklist — Soporte de Variantes en Editor de InventoryLine

**Implementación:** Grupo de variantes en InventoryItem + chips unificados (qty + X dentro del chip activo)  
**Archivos clave:** `AddInventoryItemModal.tsx`, `CreateVariantGroupModal.tsx`, `AddVariantOptionModal.tsx`, `lib/variant-group.ts`, `app/host/inventory/actions.ts`

**UX (v3):**
- **bed_size** (Tamaño de cama): selección única (radio). Chips simples (label only), sin qty ni X. expectedQty en stepper general.
- **Otros grupos** (ej. tipo_copas): multi-select con chips que incluyen ✓ + input qty + botón X.
- NO existe "Variantes activas en esta área" como sección separada.

---

## ETAPA 0 — Ubicación del editor

| Concepto | Path / Archivo |
|----------|----------------|
| UI editor | `app/host/properties/[id]/inventory/AddInventoryItemModal.tsx` (modo edición cuando `lineId` presente) |
| Carga de línea | `getInventoryLine(lineId)` en `app/host/inventory/actions.ts` → `getInventoryLineById` en `lib/inventory.ts` |
| Formulario submit | `handleSubmit` → `updateInventoryLineAction(formData)` en `app/host/inventory/actions.ts` |
| Botón editar | `EditInventoryItemButton.tsx` pasa `lineId` a `AddInventoryItemModal` |
| Lista de líneas | `InventoryList.tsx` → `EditInventoryItemButton` por línea |

---

## 1) Colcha desde plantilla (bed_size, selección única)

- [ ] Ejecutar `npm run seed:colcha-variants` para crear el grupo ejemplar (una vez)
- [ ] Aplicar plantilla donde "Colcha" llega con `variantKey`/`variantValue` null en Recámara 1
- [ ] Abrir editar esa línea
- [ ] Activar toggle "Este ítem tiene variantes"
- [ ] Verificar: Colcha ya tiene grupo bed_size → texto "Selecciona un tamaño de cama" y chips Individual/Matrimonial/Queen/King
- [ ] Clic en chip "Queen"
- [ ] Verificar:
  - [ ] Se creó `InventoryLine` con `variantKey="bed_size"`, `variantValue` normalizado
  - [ ] Línea base quedó `isActive=false`
  - [ ] Chip Queen se marca seleccionado (resaltado) — SIN input de cantidad ni botón X
  - [ ] Stepper "Cantidad esperada" visible para editar expectedQty

---

## 1b) bed_size — selección única (radio)

- [ ] Con Colcha en Recámara 1, toggle variantes ON
- [ ] Seleccionar Individual → chip queda marcado
- [ ] Seleccionar Matrimonial → Individual se desmarca, Matrimonial se marca
- [ ] En BD: solo 1 línea activa bed_size para ese item+área
- [ ] Refrescar modal: el seleccionado se mantiene
- [ ] NO debe verse input de cantidad ni botón X dentro de chips bed_size

---

## 2) Modal crear grupo — ayuda visual (no precarga)

- [ ] Abrir modal "Crear grupo de variantes" en cualquier ítem (ej. Copas)
- [ ] Verificar: NO aparece botón "Usar grupo sugerido"
- [ ] Verificar: texto de ayuda en gris (si ítem es bed_size-variantable)
- [ ] Verificar: campos key, label, opciones vacíos por defecto

---

## 3) Copas — grupo custom

- [ ] Item "Copas" en Cocina (crear si no existe)
- [ ] Editar la línea
- [ ] Activar toggle "Este ítem tiene variantes"
- [ ] Clic "Crear grupo de variantes"
- [ ] Definir key "tipo_copas" (o similar), opciones: Tinto, Blanco, Champagne
- [ ] Guardar grupo
- [ ] Clic en varios chips para activar (multi-select)
- [ ] Verificar: cada chip activo muestra ✓ + input qty + botón X dentro del mismo chip
- [ ] Verificar: `variantKey` en líneas = key del grupo

---

## 4) Multi-select (solo grupos NO bed_size)

- [ ] Copas (o ítem con grupo custom), toggle ON
- [ ] Activar varios chips (ej. Tinto y Blanco)
- [ ] Verificar: ambos chips activos con ✓ + input cantidad + X dentro de cada chip
- [ ] Editar cantidad en chip Tinto (blur para guardar)
- [ ] Verificar: cantidad se persiste tras refresh

---

## 5) Duplicado

- [ ] Con variante "Tinto" ya activa en el área
- [ ] Si se intenta activar "Tinto" otra vez (chip ya activo no es clickeable para crear), backend bloquea: "Esa variante ya existe en esta área."

---

## 6) Desactivar variante (botón X — solo grupos NO bed_size)

- [ ] Con grupo custom (ej. Copas), chip activo (ej. Tinto con ✓, input qty y X)
- [ ] Clic en botón X dentro del chip para desactivar
- [ ] Usa `deleteInventoryLineAction`: `isActive=false` solo para ESA línea
- [ ] Chip vuelve a inactivo; otras variantes no se tocan
- [ ] Nota: bed_size no tiene X; para cambiar se selecciona otro chip (radio)

---

## 7) Re-aplicar plantilla

- [ ] Tras modificar variantes en una propiedad
- [ ] Re-aplicar plantilla a la propiedad (OVERWRITE)
- [ ] Verificar que se re-crean líneas según plantilla
- [ ] Confirmar que el editor sigue funcionando tras overwrite

---

## 8) Bloqueo de guardar sin variantes

- [ ] Línea sin variante, toggle ON, grupo creado
- [ ] No seleccionar ninguna opción para esta área
- [ ] Intentar Guardar
- [ ] Debe bloquear: "Selecciona un tamaño de cama" (bed_size) o "Selecciona al menos una opción..." (otros)

---

## 9) + Agregar opción

- [ ] Con grupo de variantes (ej. Colcha con bed_size)
- [ ] Verificar: botón "+ Agregar opción" visible debajo de los chips
- [ ] Clic en "+ Agregar opción" → abre AddVariantOptionModal
- [ ] Agregar "California King" (o similar)
- [ ] Guardar
- [ ] Verificar: nuevo chip "California King" aparece como opción inactiva

---

## 10) Latencia / estado optimista

- [ ] **bed_size:** Seleccionar tamaño: chip se marca inmediato. Si falla, revierte.
- [ ] **Multi-select:** Activar variante: chip pasa a activo (✓ + qty + X). Si falla, revierte.
- [ ] Durante "Guardando…": input qty y X deshabilitados hasta confirmación (multi-select)

---

## QA de regresión (Hardening)

### 1) Herencia de metadata (bed_size)

- [ ] Línea base con `color="Gris"` y `notes` (ej. Colcha de plantilla editada)
- [ ] Activar toggle, seleccionar primera variante "Queen"
- [ ] Nueva línea conserva `color="Gris"` y `notes`

### 2) expectedQty para bed_size

- [ ] Con bed_size seleccionado (ej. Queen)
- [ ] Stepper "Cantidad esperada" visible
- [ ] Cambiar cantidad y Guardar
- [ ] Verificar: expectedQty se persiste en la línea

### 3) Modo variantes ON — bloqueo de edición

- [ ] Editar línea con variantes (ej. Colcha Queen)
- [ ] Toggle "Este ítem tiene variantes" ON
- [ ] Verificar: no se pueden editar `variantKey`/`variantValue` desde el formulario principal (selector oculto)
