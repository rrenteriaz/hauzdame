# Reporte: Normalización de variantes en plantillaInventario.v1.0.json

**Fecha:** 2026-02-17  
**Alcance:** Solo plantilla JSON. Sin cambios en schema, DB ni código.

---

## 1. Conteo final de ítems con variantes

| Antes | Después |
|-------|---------|
| 25    | **28**  |

**Discrepancia 24 vs 25:** El conteo inicial reportado (24) estaba equivocado. La validación contra el archivo real mostró **25** ítems con `defaultVariantKey`. Tras agregar `bed_size` a Colcha, Cobertor y Sábanas, el total es **28**.

---

## 2. Lista final de variantKeys únicos

| variantKey | Cantidad de ítems |
|------------|-------------------|
| bed_size   | 5 (Almohadas, Cama, Colcha, Cobertor, Sábanas) |
| material   | 17 |
| tipo       | 5 (Cuchara, Cuchillo, Plato, Ventilador, Mesa) |
| use        | 1 (Trapo) |

**Total:** 4 keys únicos.

---

## 3. Confirmación de cambios

- ✅ **tamañoCama eliminado** → unificado en `bed_size`
- ✅ **tamaño eliminado** → unificado en `bed_size`
- ✅ **uso reemplazado por use** (Trapo)
- ✅ **bed_size agregado a** Colcha, Cobertor, Sábanas (antes sin variante)

---

## 4. Opciones finales por grupo

### bed_size
- Individual
- Matrimonial
- Queen
- King

### material
- Barro, Cantera, Cerámica, MDF, Madera, Metal, Plástico, Tela, Vidrio  
- *(Acero → Metal)*

### use
- Limpiar
- Secar

### tipo (por ítem)
| Ítem     | Opciones                          |
|----------|-----------------------------------|
| Cuchara  | Cafetera, Sopera                  |
| Cuchillo | Cocina, Cubierto                  |
| Plato    | Extendido, Hondo                  |
| Ventilador | Pedestal, Piso, Torre          |
| Mesa     | Centro, Desayunadora, Esquinera, Lateral |

---

## 5. Validación final

- ✅ JSON válido
- ✅ Sin keys huérfanos
- ✅ Sin inconsistencias internas (líneas con variantKey coinciden con item.defaultVariantKey; variantValue está en defaultVariantOptions)
- ✅ Estructura del archivo preservada
- ✅ No se eliminaron ítems
