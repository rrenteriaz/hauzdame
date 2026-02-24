# Seed Conceptual — Catálogo de Ítems Genéricos V1

**Versión:** 1.0  
**Fecha:** YYYY-MM-DD  
**Estado:** Conceptual (no ejecutable)  
**Contrato:** `docs/contracts/CATALOG_ITEMS_V1.md`

---

## ⚠️ NOTA CRÍTICA — Seed Congelado V1

**Este seed corresponde a CATALOG_ITEMS_V1 y NO debe ampliarse sin versión nueva del contrato.**

Cualquier cambio al seed (agregar items, modificar variantes, cambiar nombres) requiere:
1. Crear una nueva versión del contrato (V2, V3, etc.)
2. Crear un nuevo seed para esa versión
3. Mantener este seed V1 intacto como referencia histórica

**NO modificar este seed directamente.**

---

## Propósito

Este documento define el seed inicial conceptual para el Catálogo de Ítems Genéricos V1. El seed se compone de:

1. **Items de la plantilla base actual** (sin variantes, tamaños, sets, cantidades, notas)
2. **Items adicionales validados** (lista delta)

---

## Fuentes del seed

### Fuente 1: Plantilla base actual

Items genéricos extraídos de la plantilla base vigente del repositorio (plantilla versionada de inventario), ignorando:
- Variantes embebidas en el nombre
- Tamaños específicos
- Sets (ej: "Sofá 3 piezas")
- Cantidades
- Notas específicas

### Fuente 2: Lista delta adicional

Items genéricos adicionales validados:

1. Congelador
2. Enfriador de vino / cava
3. Máquina de hielo
4. Freidora de aire
5. Extensor WiFi / mesh
6. Caja fuerte
7. Sofá cama
8. Centro de lavado
9. Aspiradora
10. Detector de monóxido de carbono
11. Kit de emergencia
12. Asador / parrilla
13. Camastro / tumbona
14. Cama para mascota
15. Transportadora para mascota
16. Monitor
17. Soporte para laptop

---

## Lista completa de CatalogItem V1

### FURNITURE_EQUIPMENT

**Items de plantilla:**
1. Burro de planchar
2. Cama (con variantConfig: `bed_size` - Individual/Matrimonial/Queen/King — **ACTIVA en V1**)
3. Colchón (con variantConfig: `bed_size` - Individual/Matrimonial/Queen/King — **ACTIVA en V1**)
4. Escalera
5. Lavadora
6. Licuadora
7. Mesa
8. Microondas
9. Mueble de TV
10. Perchero
11. Plancha
12. Refrigerador
13. Secadora
14. Sofá
15. Soporte de equipaje
16. Soporte de TV
17. Televisor
18. Tocador
19. Ventilador

**NOTA:** "Cama" es un CatalogItem genérico. El tamaño se maneja mediante la variante `bed_size`. No deben existir CatalogItems como "Cama Queen", "Cama King", etc.

**Items adicionales:**
20. Asador / parrilla
21. Aspiradora
22. Caja fuerte
23. Cama para mascota
24. Camastro / tumbona
25. Centro de lavado
26. Congelador
27. Detector de monóxido de carbono
28. Enfriador de vino / cava
29. Extensor WiFi / mesh
30. Freidora de aire
31. Kit de emergencia
32. Máquina de hielo
33. Monitor
34. Sofá cama
35. Soporte para laptop
36. Transportadora para mascota

### LINENS

1. Almohadas (con variantConfig: `bed_size` - Individual/Matrimonial — **ACTIVA en V1**)
2. Cobertor
3. Colcha
4. Sábanas
5. Toalla de cuerpo
6. Toalla de manos
7. Toalla de pies
8. Toalla de piso

### TABLEWARE_UTENSILS

1. Cazuela
2. Copa
3. Cuchara
4. Cucharón
5. Cuchillo
6. Olla
7. Plato
8. Sartén
9. Taza
10. Tenedor
11. Vaso

### DECOR

1. Base de maceta
2. Comedor
3. Corbatín auto
4. Cortina
5. Cuadro Decorativo
6. Espejo
7. Maceta
8. Silla

### KITCHEN_ACCESSORIES

1. Bote de basura
2. Cafetera
3. Coladera (variante `material` postergada a V2 — NO activa en V1)
4. Comal
5. Dispensador de aceite
6. Escurridor
7. Exprimidor
8. Frascos (variante `material` postergada a V2 — NO activa en V1)
9. Jarra
10. Mantel individual
11. Pala
12. Servilletero
13. Tabla de picar
14. Tapa de cazuela
15. Tijera
16. Tortillero
17. Trapo

### KEYS_ACCESS

1. Chapa electrónica

---

## Estructura JSON conceptual

```json
{
  "metadata": {
    "version": "1.0",
    "description": "Seed conceptual del Catálogo de Ítems Genéricos V1",
    "createdAt": "YYYY-MM-DD",
    "source": {
      "template": "Plantilla base vigente del repositorio (plantilla versionada de inventario)",
      "delta": "Lista adicional validada"
    }
  },
  "items": [
    {
      "name": "Colchón",
      "category": "FURNITURE_EQUIPMENT",
      "variantConfig": {
        "variantKey": "bed_size",
        "variantLabel": "Tamaño de cama",
        "variantOptions": [
          { "value": "individual", "label": "Individual" },
          { "value": "matrimonial", "label": "Matrimonial" },
          { "value": "queen", "label": "Queen" },
          { "value": "king", "label": "King" }
        ]
      },
      "_note": "Variante ACTIVA en V1"
    },
    {
      "name": "Almohadas",
      "category": "LINENS",
      "variantConfig": {
        "variantKey": "bed_size",
        "variantLabel": "Tamaño de cama",
        "variantOptions": [
          { "value": "individual", "label": "Individual" },
          { "value": "matrimonial", "label": "Matrimonial" }
        ]
      },
      "_note": "Variante ACTIVA en V1"
    },
    {
      "name": "Cama",
      "category": "FURNITURE_EQUIPMENT",
      "variantConfig": {
        "variantKey": "bed_size",
        "variantLabel": "Tamaño de cama",
        "variantOptions": [
          { "value": "individual", "label": "Individual" },
          { "value": "matrimonial", "label": "Matrimonial" },
          { "value": "queen", "label": "Queen" },
          { "value": "king", "label": "King" }
        ]
      },
      "_note": "Variante ACTIVA en V1. 'Cama' es genérico; no crear 'Cama Queen', etc."
    },
    {
      "name": "Coladera",
      "category": "KITCHEN_ACCESSORIES",
      "variantConfig": null,
      "_note": "Variante 'material' postergada a V2 — NO activa en V1"
    },
    {
      "name": "Frascos",
      "category": "KITCHEN_ACCESSORIES",
      "variantConfig": null,
      "_note": "Variante 'material' postergada a V2 — NO activa en V1"
    },
    {
      "name": "Refrigerador",
      "category": "FURNITURE_EQUIPMENT",
      "variantConfig": null
    },
    {
      "name": "Congelador",
      "category": "FURNITURE_EQUIPMENT",
      "variantConfig": null
    }
  ]
}
```

**NOTA:** El JSON anterior muestra ejemplos representativos. La lista completa incluye todos los ítems documentados en las secciones anteriores.

---

## Notas importantes

### Variantes V1 vs V2

**Variantes ACTIVAS en V1:**
- `bed_size` (tamaño de cama) — Única variante soportada en V1
  - Items con esta variante: "Almohadas", "Cama", "Colchón"

**Variantes POSTERGADAS a V2 (NO activas en V1):**
- `material` (ej: Acero, Plástico, Vidrio) — Items: "Coladera", "Frascos"
- `tipo` (ej: Tipo de mueble, Tipo de utensilio)
- `composición` (ej: Materiales compuestos)

**Razón:** Las variantes de material/tipo son más débiles y pueden generar inconsistencia. Se postergarán hasta V2 cuando se defina un modelo más robusto.

**IMPORTANTE:** Las variantes se preservan en el seed conceptual mediante `variantConfig`, pero **NO** están embebidas en el nombre.

### Items adicionales

Los items de la lista delta se agregan al seed sin variantes iniciales. Las variantes pueden agregarse en versiones futuras si es necesario.

### Categorización

- **Asador / parrilla:** `FURNITURE_EQUIPMENT` (equipamiento exterior)
- **Caja fuerte:** `FURNITURE_EQUIPMENT` (equipamiento de seguridad)
- **Detector de monóxido de carbono:** `FURNITURE_EQUIPMENT` (equipamiento de seguridad)
- **Enfriador de vino / cava:** `FURNITURE_EQUIPMENT` (equipamiento)
- **Extensor WiFi / mesh:** `FURNITURE_EQUIPMENT` (equipamiento tecnológico)
- **Freidora de aire:** `FURNITURE_EQUIPMENT` (equipamiento de cocina)
- **Kit de emergencia:** `FURNITURE_EQUIPMENT` (equipamiento de seguridad)
- **Máquina de hielo:** `FURNITURE_EQUIPMENT` (equipamiento)
- **Monitor:** `FURNITURE_EQUIPMENT` (equipamiento tecnológico)

---

## Total de items

- **Items de plantilla (en este seed):** 64
- **Items adicionales:** 17
- **Total:** 81 items genéricos

**Desglose por categoría:**
- `FURNITURE_EQUIPMENT`: 36 items (19 de plantilla + 17 adicionales)
- `LINENS`: 8 items
- `TABLEWARE_UTENSILS`: 11 items
- `DECOR`: 8 items
- `KITCHEN_ACCESSORIES`: 17 items
- `KEYS_ACCESS`: 1 item

**NOTA:** El número "63" mencionado en versiones anteriores se refería a la plantilla base completa. Este seed incluye 64 items de plantilla más 17 adicionales, totalizando 81 items en la lista completa.

---

## Validaciones

- [ ] Todos los nombres son genéricos (sin variantes, marcas, modelos, tamaños específicos)
- [ ] No hay duplicados semánticos (ej: "Colchón" y "colchon")
- [ ] La unicidad se determina por `(tenantId, nameNormalized)`, independiente de categoría
- [ ] No hay items que solo se diferencien por categoría
- [ ] Las categorías son válidas según `InventoryCategory`
- [ ] Solo se usa la variante `bed_size` en V1 (items: "Almohadas", "Cama", "Colchón")
- [ ] Variantes de material/tipo están documentadas como postergadas a V2
- [ ] No se incluyen consumibles (pertenecen al Catálogo Operativo)
- [ ] No se incluyen amenidades (pertenecen al Catálogo Operativo)
- [ ] No se incluyen señalización/documentos (pertenecen al Catálogo Operativo)

---

**Versión del seed:** 1.0  
**Fecha:** YYYY-MM-DD  
**Estado:** Conceptual

