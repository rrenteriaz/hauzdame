# Reporte: Auto-allowlist por item para VariantGroup "material" (Opción A)

## Resumen

Se implementó el auto-allowlist para el grupo de variantes `material`, de modo que items como **Vaso** solo muestren opciones relevantes (Vidrio, Plástico) y no opciones irrelevantes (MDF, Tela, Madera, etc.) en la UI de edición de inventario.

## Archivos modificados

1. **`app/host/inventory/template-actions.ts`**
   - Backfill: al aplicar plantilla, para cada item con `defaultVariantKey === "material"` y `defaultVariantOptions`:
     - Normaliza opciones con `normalizeVariantValue` (mismo que `VariantOption.valueNormalized`)
     - Valida existencia en el grupo material (omite typos)
     - Si allowlist queda vacío tras validar → no se setea (dejar null)
   - Persiste `optionAllowlist` en `InventoryItemVariantGroup`:
     - **Create**: si hay allowlist validado, se incluye
     - **Update (MVP)**: solo setear si `optionAllowlist` está null o es array vacío (no pisar config futura)

2. **`app/host/inventory/actions.ts`**
   - `getInventoryItemVariantGroupsAction`: al construir `options` para UI:
     - Si `link.optionAllowlist` es array no vacío → filtrar `options` a solo las permitidas
     - Si null/undefined/[] → mostrar todas las opciones activas del grupo (comportamiento legacy)

## Criterio "no pisar allowlist existente"

**MVP**: Solo se setea `optionAllowlist` cuando:
- **Create**: Siempre que tengamos allowlist validado
- **Update**: Solo si el link actual tiene `optionAllowlist === null` o `optionAllowlist === []`

Así, si un usuario o proceso futuro configura manualmente un allowlist específico, no se sobreescribe al re-aplicar la plantilla.

## Casos de QA esperados

| Item | defaultVariantOptions (plantilla) | optionAllowlist esperado | Opciones visibles en UI |
|------|----------------------------------|--------------------------|--------------------------|
| Vaso | Vidrio, Plástico | ["vidrio","plastico"] | Solo Vidrio, Plástico (no MDF, Tela, Madera, etc.) |
| Tocador | Madera, MDF | ["madera","mdf"] | Solo Madera, MDF |
| Burro de planchar | Metal, Plástico | ["metal","plastico"] | Solo Metal, Plástico |
| Item con link material sin allowlist | - | null | Todas las opciones activas (comportamiento actual) |
| Item con typo en plantilla (ej. "Vidro") | Vidro | [] → no setear | Todas (fallback a no filtrar) |

## Pasos para QA manual

1. **Precondición**: Tenant con grupos canónicos (bed_size, material, use). Si no existen, aplicar plantilla una vez.
2. **Aplicar plantilla** a una propiedad vacía o con inventario existente.
3. **Editar item Vaso**: Abrir modal de edición → en variante Material debe verse solo "Vidrio" y "Plástico".
4. **Editar item Tocador**: Debe verse solo "Madera" y "MDF".
5. **Item sin allowlist**: Un item que tenga link a material pero sin `defaultVariantOptions` en plantilla (o con typo) debe ver todas las opciones.
