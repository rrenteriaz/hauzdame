# Catálogo Operativo — Contrato v1

**Estado:** Canonical  
**Última actualización:** v1.0 — Contrato inicial  
**Alcance:** Catálogo de amenidades, consumibles y señalización/documentos para checklists y tareas de cleaners

---

## 1. Propósito y alcance

### 1.1 Qué es el Catálogo Operativo

El **Catálogo Operativo** es un catálogo separado del inventario de activos que contiene items utilizados para checklists y tareas de cleaners. Incluye amenidades, consumibles y señalización/documentos que no son parte del inventario físico de activos de una propiedad.

### 1.2 Para qué sirve

- **Checklists de cleaners:** Define items que los cleaners deben verificar o reponer durante las limpiezas.
- **Tareas operativas:** Permite crear tareas específicas para verificar amenidades, reponer consumibles o revisar señalización.
- **Separación de dominios:** Mantiene separado el inventario de activos del inventario operativo.

### 1.3 Qué NO es

- **NO es inventario de activos:** No contiene muebles, equipamiento, blancos ni vajilla (ver `CATALOG_ITEMS_V1.md`).
- **NO es un catálogo de productos:** No contiene catálogos de proveedores ni precios.
- **NO es un sistema de compras:** No gestiona órdenes ni reposición automática.

---

## 2. Separación explícita respecto al inventario

### 2.1 Dominios separados

**REGLA CRÍTICA:** El Catálogo Operativo es **explícitamente separado** del Catálogo de Ítems Genéricos (`CATALOG_ITEMS_V1.md`).

**Implicaciones:**
- No hay mezcla entre `CatalogItem` (inventario de activos) y `OperationalCatalogItem` (operativo).
- Los items operativos NO aparecen en el inventario de activos.
- Los items de activos NO aparecen en el catálogo operativo.

### 2.2 Casos de uso distintos

**Inventario de activos (`CatalogItem`):**
- "Colchón", "Refrigerador", "Toalla de manos", "Plato"
- Se verifica existencia, condición y cantidad.
- Se reportan cambios (faltantes, daños).

**Catálogo Operativo (`OperationalCatalogItem`):**
- "WiFi", "Aire acondicionado", "Jabón líquido", "Papel higiénico", "Extintor"
- Se verifica funcionamiento, disponibilidad o reposición.
- Se usa para checklists y tareas de cleaners.

**NOTA:** Un mismo concepto puede existir como activo en inventario (`CatalogItem`) y también como item operativo de verificación (`OperationalCatalogItem`). En V1 se mantienen separados por dominio: el inventario representa activos físicos; el catálogo operativo representa verificaciones/reposición en checklists.

---

## 3. Tipos de items operativos

### 3.1 AMENITY (Amenidades)

**Definición:** Servicios o características de la propiedad que los huéspedes esperan encontrar y que los cleaners deben verificar.

**Ejemplos:**
- WiFi
- Aire acondicionado
- Calefacción
- Agua caliente
- Televisión por cable / Streaming
- Piscina
- Estacionamiento
- Caja fuerte
- Secador de pelo
- Plancha y tabla de planchar

**Características:**
- Se verifica funcionamiento o disponibilidad.
- No se cuenta cantidad (solo existe/no existe).
- Puede tener estado (funciona/no funciona).

### 3.2 CONSUMABLE (Consumibles)

**Definición:** Items que se consumen o gastan y deben reponerse periódicamente.

**Ejemplos:**
- Jabón líquido
- Shampoo
- Acondicionador
- Papel higiénico
- Papel de cocina
- Toallas de papel
- Detergente
- Suavizante
- Bolsas de basura
- Filtros de café
- Aceite de cocina
- Sal y pimienta

**Características:**
- Se cuenta cantidad disponible.
- Tiene `recommendedQty` (cantidad recomendada).
- Se repone cuando está bajo el umbral.

### 3.3 SIGNAGE_DOC (Señalización y Documentos)

**Definición:** Señalización, documentos y elementos informativos que deben estar presentes y actualizados.

**Ejemplos:**
- Extintor
- Botiquín de primeros auxilios
- Manual de la propiedad
- Instrucciones de WiFi
- Señalización de salida de emergencia
- Certificado de seguridad
- Reglamento de la propiedad
- Mapa de la zona

**Características:**
- Se verifica existencia y vigencia (si aplica).
- Puede tener fecha de expiración.
- No se cuenta cantidad (solo existe/no existe).

---

## 4. Modelo conceptual

### 4.1 OperationalCatalogItem

Un **OperationalCatalogItem** representa un item operativo con las siguientes propiedades:

```typescript
interface OperationalCatalogItem {
  id: string;                    // Identificador único
  tenantId: string;              // Tenant propietario
  type: OperationalItemType;     // AMENITY | CONSUMABLE | SIGNAGE_DOC
  name: string;                  // Nombre canónico (ej: "WiFi")
  nameNormalized: string;        // Nombre normalizado (ej: "wifi")
  
  // Solo para CONSUMABLE
  unit: string | null;           // Unidad de medida (ej: "botella", "rollo", "paquete")
  recommendedQty: number | null;  // Cantidad recomendada
  
  // Metadata
  createdAt: DateTime;
  updatedAt: DateTime;
  archivedAt: DateTime | null;   // Soft delete
}
```

### 4.2 OperationalItemType

```typescript
enum OperationalItemType {
  AMENITY = "AMENITY",
  CONSUMABLE = "CONSUMABLE",
  SIGNAGE_DOC = "SIGNAGE_DOC"
}
```

### 4.3 Reglas de normalización y unicidad

**Normalización:** Igual que `CatalogItem`:
- Usa `normalizeName()` para calcular `nameNormalized`.
- Elimina acentos, convierte a minúsculas, hace trim y colapsa espacios.

**Unicidad:** `(tenantId, type, nameNormalized)`

**Significado:**
- No puede existir dos items operativos con el mismo `nameNormalized` en el mismo tipo para el mismo tenant.
- Ejemplo: No puede haber "WiFi" y "wifi" en el tipo `AMENITY`.

---

## 5. Uso esperado para checklists y tareas

### 5.1 Checklists de cleaners

**Escenario:** Checklist de limpieza que incluye verificación de amenidades y reposición de consumibles.

1. **Verificar amenidades:**
   - Tarea: "Verificar WiFi funciona"
   - Tarea: "Verificar aire acondicionado funciona"
   - Tarea: "Verificar agua caliente disponible"

2. **Reponer consumibles:**
   - Tarea: "Reponer papel higiénico (mínimo 2 rollos)"
   - Tarea: "Reponer jabón líquido (mínimo 1 botella)"
   - Tarea: "Reponer detergente (mínimo 1 botella)"

3. **Verificar señalización:**
   - Tarea: "Verificar extintor presente y vigente"
   - Tarea: "Verificar manual de la propiedad actualizado"
   - Tarea: "Verificar señalización de emergencia visible"

### 5.2 Tareas automáticas

**Escenario:** Sistema genera tareas automáticas basadas en el catálogo operativo.

1. **Tareas de verificación:**
   - Para cada `AMENITY`: "Verificar {name} funciona"
   - Para cada `SIGNAGE_DOC`: "Verificar {name} presente y vigente"

2. **Tareas de reposición:**
   - Para cada `CONSUMABLE`: "Reponer {name} si cantidad < {recommendedQty}"

---

## 6. Invariantes

### 6.1 Invariantes críticos

1. **Separación de dominios:**
   - `OperationalCatalogItem` NO se mezcla con `CatalogItem`.
   - Los items operativos NO aparecen en el inventario de activos.

2. **Unicidad por normalización:**
   - No puede existir dos `OperationalCatalogItem` con el mismo `(tenantId, type, nameNormalized)`.
   - Si se intenta crear un duplicado, se debe reutilizar el existente.

3. **Tipo requerido:**
   - Todo `OperationalCatalogItem` debe tener un `type` válido (`AMENITY`, `CONSUMABLE`, `SIGNAGE_DOC`).

4. **Campos condicionales:**
   - `unit` y `recommendedQty` solo aplican para `CONSUMABLE`.
   - Para `AMENITY` y `SIGNAGE_DOC`, estos campos deben ser `null`.

5. **Normalización consistente:**
   - `nameNormalized` siempre se calcula usando `normalizeName(name)`.
   - La normalización es idempotente.

### 6.2 Invariantes de integridad

1. **Referencias válidas:**
   - Las tareas y checklists que referencian items operativos deben validar que el item existe.
   - Si se archiva un `OperationalCatalogItem`, las tareas asociadas pueden seguir existiendo (soft delete).

2. **Tipos válidos:**
   - `type` debe ser uno de los valores permitidos de `OperationalItemType`.

---

## 7. Checklist de validación PR / QA

### 7.1 Creación de items operativos

- [ ] El nombre es genérico y claro (ej: "WiFi", no "WiFi de la propiedad").
- [ ] El `nameNormalized` se calcula correctamente usando `normalizeName()`.
- [ ] Se valida unicidad por `(tenantId, type, nameNormalized)`.
- [ ] Si existe un item con el mismo `nameNormalized` y tipo, se reutiliza.
- [ ] El `type` es válido (`AMENITY`, `CONSUMABLE`, `SIGNAGE_DOC`).
- [ ] Para `CONSUMABLE`, `unit` y `recommendedQty` están definidos.
- [ ] Para `AMENITY` y `SIGNAGE_DOC`, `unit` y `recommendedQty` son `null`.

### 7.2 Separación de dominios

- [ ] Los items operativos NO aparecen en el catálogo de activos.
- [ ] Los items de activos NO aparecen en el catálogo operativo.
- [ ] No hay mezcla entre `CatalogItem` y `OperationalCatalogItem`.

### 7.3 Integración con checklists

- [ ] Las tareas pueden referenciar items operativos.
- [ ] Las tareas validan que el item operativo existe.
- [ ] Las tareas muestran el nombre canónico del item.

### 7.4 Búsqueda y selección

- [ ] La búsqueda usa `normalizeName()` en ambos lados.
- [ ] "wifi" encuentra "WiFi" (sin acentos, case-insensitive).
- [ ] No aparecen duplicados en los resultados de búsqueda.

---

## 8. Restricciones y limitaciones

### 8.1 V1 NO incluye

- **Variantes complejas:** Solo se soporta `unit` y `recommendedQty` para `CONSUMABLE`.
- **Catálogo global:** El catálogo es por tenant, no compartido.
- **UI específica:** Este contrato no define UI, solo dominio.
- **Automatización de reposición:** No se gestiona reposición automática ni órdenes de compra.

### 8.2 Decisiones explícitas

- **Separación explícita:** El catálogo operativo es completamente separado del catálogo de activos.
- **Tipos fijos:** Solo 3 tipos en V1 (`AMENITY`, `CONSUMABLE`, `SIGNAGE_DOC`).
- **Soft delete:** Los items se archivan, no se eliminan físicamente.
- **Normalización sin acentos:** Se eliminan acentos para evitar duplicados semánticos.

---

## 9. Referencias cruzadas

- **Catálogo de Ítems Genéricos:** `docs/contracts/CATALOG_ITEMS_V1.md`
- **Checklists:** `docs/contracts/PROPERTIES_V1.md` (sección 7.2)

---

**Versión del contrato:** 1.0  
**Fecha de creación:** YYYY-MM-DD  
**Estado:** Canonical

