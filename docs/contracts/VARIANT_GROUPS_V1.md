# Grupos de Variantes Reutilizables a nivel Tenant — Contrato v1

**Estado:** Canonical  
**Última actualización:** v1.0 — Contrato inicial  
**Alcance:** Grupos de variantes definidos a nivel tenant, asociables a múltiples InventoryItem

---

## 1. Propósito y alcance

### 1.1 Qué son los Grupos de Variantes

Los **Grupos de Variantes** permiten definir conjuntos de opciones (ej. Tamaño de cama: Individual, Matrimonial, Queen, King) una sola vez a nivel tenant y asociarlos a múltiples ítems del catálogo (Cama, Colchón, Sábanas, Colcha, etc.).

### 1.2 Para qué sirve

- **Reutilización:** Un grupo "bed_size" sirve para todos los ítems que lo requieran.
- **Consistencia:** Mismas opciones y valores en todo el inventario.
- **Mantenimiento:** Cambios en el grupo (nueva opción, archivar) se reflejan en todos los ítems asociados.
- **Reducción de duplicación:** No capturar las mismas opciones por cada ítem.

### 1.3 Qué NO es

- **NO reemplaza** las variantes embebidas en InventoryItem en esta fase; conviven.
- **NO modifica** InventoryLine en esta fase (solo lectura/uso futuro).
- **NO migra** ni deduplica los JSON existentes en defaultVariantOptions.

---

## 2. Entidades

### 2.1 VariantGroup

| Campo    | Tipo     | Descripción                                      |
|----------|----------|--------------------------------------------------|
| id       | String   | CUID, PK                                         |
| tenantId | String   | Tenant dueño del grupo                           |
| key      | String   | Identificador estable (inmutable tras crear)      |
| label    | String   | Etiqueta legible (ej. "Tamaño de cama")          |
| createdAt| DateTime | Fecha de creación                               |
| updatedAt| DateTime | Fecha de actualización                           |

**Reglas:**
- `@@unique([tenantId, key])`
- `key` es **inmutable** tras crear. NO hay UI para editar key.
- `key` debe ser slug-safe (normalizado con `normalizeKey`).

### 2.2 VariantOption

| Campo          | Tipo     | Descripción                                      |
|----------------|----------|--------------------------------------------------|
| id             | String   | CUID, PK                                         |
| groupId        | String   | FK → VariantGroup                                |
| valueNormalized| String   | Valor estable (inmutable tras crear)              |
| label          | String   | Etiqueta legible (ej. "Queen")                   |
| sortOrder      | Int      | Orden de presentación (default 0)                |
| isArchived     | Boolean  | Si está archivada (default false)                |
| createdAt      | DateTime | Fecha de creación                               |
| updatedAt      | DateTime | Fecha de actualización                           |

**Reglas:**
- `@@unique([groupId, valueNormalized])`
- `valueNormalized` es **inmutable** tras crear. NO hay UI para editar valueNormalized.
- "Eliminar opción" = **archive** (isArchived=true). NO delete físico.
- Opciones archivadas no aparecen en pickers para crear nuevas líneas; sí en contexto admin si "Mostrar archivadas".

### 2.3 InventoryItemVariantGroup

| Campo          | Tipo    | Descripción                                      |
|----------------|---------|--------------------------------------------------|
| id             | String  | CUID, PK                                         |
| itemId         | String  | FK → InventoryItem                               |
| groupId        | String  | FK → VariantGroup                                |
| required       | Boolean | Si es obligatorio para este ítem (default false)  |
| isActive       | Boolean | Si la asociación está activa (default true)       |
| sortOrder      | Int     | Orden de presentación (default 0)                |
| optionAllowlist| Json?   | Lista opcional de valueNormalized permitidos     |
| createdAt      | DateTime| Fecha de creación                               |
| updatedAt      | DateTime| Fecha de actualización                           |

**Reglas:**
- `@@unique([itemId, groupId])`
- **Detach** (desasociar) solo elimina la relación. NO elimina el grupo ni las opciones.

---

## 3. Reglas MUST (Obligatorio)

- **group.key** inmutable tras crear. NO UI para editar key.
- **option.valueNormalized** inmutable tras crear. NO UI para editar valueNormalized.
- "Eliminar opción" = archive (isArchived=true). NO delete físico.
- Opciones archivadas no aparecen en pickers para crear nuevas líneas; deben poder mostrarse en contexto admin.
- Detach de un grupo en un ítem solo elimina la relación; NO elimina el grupo ni opciones.
- Todas las acciones validan **tenant scoping**: VariantGroup.tenantId y InventoryItem.tenantId deben coincidir con el tenant actual. Si no: throw "FORBIDDEN".

---

## 4. Flujos UX

### 4.1 Admin de Grupos (Tenant)

- Crear grupo: label + key (key sugerido desde label con normalizeKey).
- Agregar opciones: label + value (valueNormalized derivado).
- Reordenar opciones (sortOrder).
- Archivar opción (confirmación).
- Toggle "Mostrar archivadas" para ver opciones archivadas.

### 4.2 Edición de InventoryItem (asociar grupos)

- Listar grupos asociados al ítem: label + key.
- Botón "Agregar grupo existente": select searchable de VariantGroup del tenant.
- Desasociar grupo (elimina relación únicamente).
- Toggle isActive si implementado.

---

## 5. Compatibilidad

- **Variantes embebidas** en InventoryItem (defaultVariantKey, defaultVariantOptions) siguen funcionando.
- Esta fase **NO migra** ni deduplica los JSON existentes.
- Convivencia: un ítem puede tener variantes embebidas Y grupos asociados (fase futura unificará).

---

## 6. Normalización

- **normalizeKey(input):** trim, lowercase, espacios/underscores → guion, remover acentos. Resultado slug-safe.
- **normalizeValue(input):** similar; para valueNormalized de opciones.
