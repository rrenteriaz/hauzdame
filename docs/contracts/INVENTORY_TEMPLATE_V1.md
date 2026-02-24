# INVENTORY TEMPLATE — V1.0 (CANÓNICA)

## Propósito

Esta plantilla base de inventario para propiedades sirve como punto de arranque para que los usuarios creen rápidamente el inventario de una propiedad y luego lo personalicen.

**IMPORTANTE:** Esta plantilla NO representa un inventario final. Es una base genérica y reutilizable que debe ser adaptada a las necesidades específicas de cada propiedad.

---

## Alcance

### Items genéricos
- Los nombres de `InventoryItem` son canónicos y genéricos
- No incluyen marcas, modelos, tamaños específicos ni materiales hiper específicos
- La especificidad se maneja a nivel de `InventoryLine` (variantes, notas, tamaño, color)

### Áreas canónicas
- La plantilla utiliza áreas estándar de la aplicación:
  - Cocina
  - Sala
  - Recámara 1
  - Recámara 2
  - Comedor
  - Lavandería
  - Baño 1
  - Baño 2
  - Patio

### Variantes mínimas
- Solo se definen variantes cuando son esenciales para diferenciar items del mismo concepto
- Las variantes se aplican consistentemente en todas las líneas del item

### Sin marcas fijas
- No se incluyen marcas específicas en la plantilla
- Los campos `brand`, `model`, `serialNumber` están en `null` por defecto
- El usuario puede agregar marcas después de aplicar la plantilla

---

## Invariantes (NO ROMPER)

### V1.0 es INMUTABLE

**REGLA CRÍTICA:** La versión V1.0 de esta plantilla es **INMUTABLE**. Una vez congelada, NO debe ser editada, modificada ni migrada.

### Cambios futuros → Nueva versión

Si se requiere hacer cambios a la plantilla (correcciones, mejoras, expansiones):

1. **Crear una nueva versión** (V1.1, V2.0, etc.)
2. **Mantener V1.0 intacta** como referencia histórica
3. **Documentar los cambios** en el contrato de la nueva versión

### La aplicación SIEMPRE copia, nunca edita

- La aplicación debe **copiar** la plantilla V1.0 al crear inventario nuevo
- **NUNCA** debe editar directamente los archivos de la plantilla
- Los cambios del usuario se aplican sobre la copia, no sobre la plantilla original

---

## Archivos canónicos

Los archivos oficiales de la plantilla V1.0 se encuentran en:

- `docs/templates/plantillaInventario.v1.0.json`
- `docs/templates/plantillaInventario.v1.0.csv`

### Estructura del JSON

El archivo JSON sigue la estructura compatible con `InventoryItem` e `InventoryLine`:

```json
{
  "metadata": {
    "version": "1.0",
    "description": "Plantilla de inventario para propiedades",
    "createdAt": "2025-01-15"
  },
  "items": [
    {
      "item": {
        "category": "InventoryCategory",
        "name": "string",
        "defaultBrand": null,
        "defaultModel": null,
        "defaultColor": null,
        "defaultSize": null,
        "isReplacable": boolean,
        "defaultVariantKey": "string | null",
        "defaultVariantLabel": "string | null",
        "defaultVariantOptions": ["array"] | null
      },
      "lines": [
        {
          "area": "string",
          "expectedQty": number,
          "condition": "InventoryCondition",
          "priority": "InventoryPriority",
          "brand": null,
          "model": null,
          "serialNumber": null,
          "color": "string | null",
          "size": "string | null",
          "notes": "string | null",
          "variantKey": "string | null",
          "variantValue": "string | null",
          "isActive": true,
          "areaNormalized": "string"
        }
      ]
    }
  ]
}
```

### Estructura del CSV

El archivo CSV contiene una representación tabular de todos los items y líneas, con columnas para:
- Item Name, Category, Area
- Expected Qty, Condition, Priority
- Brand, Model, Serial Number, Color, Size, Notes
- Variant Key, Variant Value
- Is Active, Is Replacable
- Default values (Brand, Model, Color, Size, Variant Key/Label/Options)

---

## Versionado

### PATCH editoriales → Nueva versión

Cualquier cambio a la plantilla (incluso correcciones editoriales menores) debe resultar en una nueva versión:

- **V1.0** → Versión inicial congelada (2025-01-15)
- **V1.1** → Correcciones menores, ajustes editoriales
- **V2.0** → Cambios estructurales, expansiones significativas

### Nunca sobrescribir V1.0

**PROHIBIDO:**
- Modificar `plantillaInventario.v1.0.json` directamente
- Sobrescribir archivos con sufijo `v1.0`
- Eliminar o renombrar archivos versionados

**PERMITIDO:**
- Crear nuevas versiones (`v1.1.json`, `v2.0.json`)
- Documentar cambios entre versiones
- Mantener todas las versiones históricas

---

## Estadísticas V1.0

- **Total de InventoryItems:** 63
- **Total de InventoryLines:** 91
- **Categorías:** FURNITURE_EQUIPMENT, LINENS, TABLEWARE_UTENSILS, DECOR, KITCHEN_ACCESSORIES, KEYS_ACCESS
- **Áreas cubiertas:** 9 áreas canónicas
- **Items con variantes:** Múltiples (Almohadas, Frascos, Coladera, etc.)

---

## Referencias

- Documentación completa del proceso de creación: `docs/borrador/resumenLimpiezaPlantilla.md`
- Proceso técnico de creación de items: `docs/borrador/procesoCreacionItemInventario.md`
- Archivo fuente original (congelado): `docs/borrador/plantillaInventario.json`

---

## Checklist de cumplimiento

Al usar esta plantilla, verificar:

- [ ] Se copia el archivo, no se edita directamente
- [ ] Los items genéricos se mantienen canónicos
- [ ] Las áreas coinciden con las áreas canónicas de la aplicación
- [ ] Las variantes son consistentes dentro de cada item
- [ ] No se introducen marcas específicas en la plantilla base
- [ ] Los cambios del usuario se aplican sobre la copia, no sobre V1.0

---

**Versión del contrato:** 1.0  
**Fecha de congelado:** 2025-01-15  
**Estado:** INMUTABLE

