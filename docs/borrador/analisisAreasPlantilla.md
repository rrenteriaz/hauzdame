# Análisis de Áreas: Plantilla vs Aplicación

**Fecha:** 2025-01-15  
**Objetivo:** Comparar las áreas usadas en la plantilla canónica de inventario contra las áreas definidas por defecto en la aplicación Hausdame.

---

## PASO 1 — ÁREAS EN LA PLANTILLA

### Lista de áreas únicas (extraídas de `plantillaInventario.json`)

| Área | Frecuencia | Observaciones |
|------|------------|---------------|
| Cocina | 43 líneas | ✅ Coincide exactamente |
| Sala | 31 líneas | ✅ Coincide exactamente |
| RP | 16 líneas | ⚠️ Abreviación (Recámara Principal) |
| R2 | 10 líneas | ⚠️ Abreviación (Recámara 2) |
| Comedor | 9 líneas | ✅ Coincide exactamente |
| Lavandería | 7 líneas | ✅ Coincide exactamente |
| Baño 2 | 3 líneas | ⚠️ Variante numerada |
| Recamara 1 | 1 línea | ⚠️ Sin tilde (debería ser "Recámara 1") |
| Recamara 2 | 1 línea | ⚠️ Sin tilde (debería ser "Recámara 2") |
| Jardín | 1 línea | ✅ Coincide exactamente |

**Total:** 10 áreas únicas, 122 líneas de inventario

---

## PASO 2 — ÁREAS CANÓNICAS EN LA APLICACIÓN

### Fuente de verdad: `lib/inventory-suggestions.ts`

**Constante:** `AREA_SUGGESTIONS` (líneas 261-275)

```typescript
export const AREA_SUGGESTIONS = [
  "Cocina",
  "Baño",
  "Recámara 1",
  "Recámara 2",
  "Recámara 3",
  "Sala",
  "Comedor",
  "Lavandería",
  "Bodega",
  "Patio",
  "Jardín",
  "Cochera",
  "Área común",
];
```

**Total:** 13 áreas canónicas sugeridas

### Observaciones técnicas

1. **Campo de texto libre:** El campo `area` en `InventoryLine` es de tipo `String` (no enum), por lo que el usuario puede escribir cualquier valor.

2. **Normalización:** Las áreas se normalizan con `normalizeName()` para búsquedas (`areaNormalized`), pero el valor original se mantiene en `area`.

3. **Sugerencias en UI:** Las áreas sugeridas aparecen en el modal `AddInventoryItemModal.tsx` como opciones, pero el usuario puede escribir libremente.

4. **Áreas existentes:** La función `getExistingAreas()` obtiene áreas únicas ya usadas en la propiedad para sugerirlas.

---

## PASO 3 — COMPARACIÓN Y CLASIFICACIÓN

### Clasificación de áreas de la plantilla

| Área Plantilla | Clasificación | Área Canónica | Justificación |
|----------------|---------------|---------------|---------------|
| Cocina | **A** Coincide exactamente | Cocina | ✅ Nombre idéntico |
| Sala | **A** Coincide exactamente | Sala | ✅ Nombre idéntico |
| Comedor | **A** Coincide exactamente | Comedor | ✅ Nombre idéntico |
| Lavandería | **A** Coincide exactamente | Lavandería | ✅ Nombre idéntico |
| Jardín | **A** Coincide exactamente | Jardín | ✅ Nombre idéntico |
| RP | **B** Alias claro | Recámara 1 | ⚠️ Abreviación común de "Recámara Principal" |
| R2 | **B** Alias claro | Recámara 2 | ⚠️ Abreviación común de "Recámara 2" |
| Baño 2 | **B** Variante numerada | Baño | ⚠️ Variante numerada (no existe "Baño 2" en canónicas) |
| Recamara 1 | **B** Sin tilde | Recámara 1 | ⚠️ Falta tilde en "Recámara" |
| Recamara 2 | **B** Sin tilde | Recámara 2 | ⚠️ Falta tilde en "Recámara" |

### Áreas canónicas NO usadas en la plantilla

| Área Canónica | Estado |
|---------------|--------|
| Baño | ❌ No aparece (solo "Baño 2") |
| Recámara 3 | ❌ No aparece |
| Bodega | ❌ No aparece |
| Patio | ❌ No aparece |
| Cochera | ❌ No aparece |
| Área común | ❌ No aparece |

---

## PASO 4 — PROPUESTAS DE DECISIÓN

### Tabla de decisiones propuestas

| Área Original (Plantilla) | Área Destino | Tipo de Acción | Justificación |
|---------------------------|--------------|----------------|---------------|
| RP | Recámara 1 | **Renombrar plantilla** | "RP" es abreviación no estándar. "Recámara 1" es el nombre canónico que ve el usuario. |
| R2 | Recámara 2 | **Renombrar plantilla** | "R2" es abreviación no estándar. "Recámara 2" es el nombre canónico. |
| Baño 2 | Baño | **Renombrar plantilla** | La app no tiene áreas numeradas para baños. Si se necesita distinguir múltiples baños, debería ser "Baño" genérico o agregar soporte para áreas numeradas. |
| Recamara 1 | Recámara 1 | **Renombrar plantilla** | Corregir ortografía: falta tilde en "Recámara". |
| Recamara 2 | Recámara 2 | **Renombrar plantilla** | Corregir ortografía: falta tilde en "Recámara". |

### Decisiones adicionales

#### Áreas canónicas no usadas
- **No acción requerida:** Las áreas canónicas no usadas en la plantilla (Bodega, Patio, Cochera, Área común, Recámara 3) no requieren cambios. La plantilla es un starter template y no necesita cubrir todas las áreas posibles.

#### Área "Baño 2" vs "Baño"
- **Decisión pendiente:** La plantilla usa "Baño 2" pero la app solo tiene "Baño" como área canónica. Opciones:
  1. **Renombrar a "Baño"** (recomendado): Simplifica y alinea con la app.
  2. **Agregar "Baño 2" a canónicas**: Solo si la app necesita soportar múltiples baños numerados.

---

## CONCLUSIÓN Y RECOMENDACIÓN

### Recomendación principal

**"La plantilla debe alinearse 100% a las áreas canónicas de la aplicación"**

### Justificación

1. **Consistencia UX:** Los usuarios ven las áreas canónicas en el modal. Si la plantilla usa abreviaciones o variantes, generará confusión.

2. **Búsquedas y filtros:** Aunque el campo es texto libre, las búsquedas usan `areaNormalized`. Áreas diferentes pero semánticamente iguales (ej: "RP" vs "Recámara 1") no se encontrarán juntas.

3. **Sugerencias automáticas:** La función `getAllowedCategoriesForArea()` usa normalización que reconoce variantes, pero es mejor usar nombres canónicos desde el inicio.

4. **Mantenibilidad:** Usar nombres estándar facilita futuras migraciones, reportes y análisis.

### Acciones propuestas (orden de prioridad)

#### Prioridad ALTA (debe aplicarse)
1. ✅ Renombrar "RP" → "Recámara 1" (16 líneas)
2. ✅ Renombrar "R2" → "Recámara 2" (10 líneas)
3. ✅ Corregir "Recamara 1" → "Recámara 1" (1 línea)
4. ✅ Corregir "Recamara 2" → "Recámara 2" (1 línea)

#### Prioridad MEDIA (recomendado)
5. ⚠️ Renombrar "Baño 2" → "Baño" (3 líneas)
   - **Nota:** Requiere decisión sobre si la app debe soportar baños numerados.

### Impacto

- **Líneas afectadas:** 31 líneas (25.4% del total)
- **Áreas afectadas:** 5 áreas únicas (50% del total)
- **Riesgo:** Bajo (solo cambio de strings, sin impacto en lógica)

### Validación post-cambio

Después de aplicar los cambios, validar:
- [ ] Todas las áreas de la plantilla coinciden exactamente con `AREA_SUGGESTIONS`
- [ ] No hay abreviaciones ni variantes ortográficas
- [ ] El JSON sigue siendo válido
- [ ] Las búsquedas por área funcionan correctamente

---

## NOTAS TÉCNICAS

### Normalización actual

La función `normalizeName()` en `lib/inventory-normalize.ts`:
- Convierte a minúsculas
- Trim de espacios
- Colapsa múltiples espacios

**Ejemplo:**
- "Recámara 1" → `"recámara 1"`
- "RP" → `"rp"`
- "Baño 2" → `"baño 2"`

**Conclusión:** "RP" y "Recámara 1" NO se normalizan al mismo valor, por lo que no se encontrarán juntas en búsquedas.

### Mapeo automático (NO recomendado)

Aunque técnicamente se podría crear un mapeo automático (ej: `RP → Recámara 1`), **NO se recomienda** porque:
1. Añade complejidad innecesaria
2. Oculta inconsistencias en lugar de corregirlas
3. La plantilla debe ser fuente de verdad clara y explícita

---

## ARCHIVOS DE REFERENCIA

- **Plantilla:** `docs/borrador/plantillaInventario.json`
- **Áreas canónicas:** `lib/inventory-suggestions.ts` (línea 261)
- **Normalización:** `lib/inventory-normalize.ts`
- **Schema:** `prisma/schema.prisma` (campo `area` en `InventoryLine`)

---

**Estado:** ✅ Análisis completo, listo para aplicar cambios.

