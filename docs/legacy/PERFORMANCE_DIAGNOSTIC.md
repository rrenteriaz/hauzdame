# Diagnóstico de Performance - Checklist Toggle

## Problema identificado (análisis del código)

### CAUSA PRINCIPAL (confirmada en código)
1. **Cada click dispara server action + router.refresh() completo**
   - `ChecklistView.tsx` línea 132-142: `await toggleCleaningChecklistItem()` + `router.refresh()`
   - `checklist-actions.ts` línea 178: `revalidatePath()` adicional
   - **Resultado**: 2 re-renders completos del server component padre

2. **No hay optimistic UI**
   - El estado local NO se actualiza hasta que termina el server action
   - El usuario ve el delay completo (1-2s) antes de ver el cambio

3. **Cálculos en cada render**
   - `itemsByArea` se recalcula en cada render (líneas 58-69)
   - No hay memoización

## Mediciones rápidas (ejecutar ANTES de optimizar)

### 1. Medición de latencia del handler
Agregar en `ChecklistView.tsx` línea 132 (dentro del onClick):

```typescript
onClick={() => {
  console.time("toggle-click");
  console.time("toggle-server-action");
  
  startTransition(async () => {
    const beforeServer = performance.now();
    const result = await toggleCleaningChecklistItem(
      cleaningId,
      item.id,
      !item.isCompleted
    );
    const afterServer = performance.now();
    console.timeEnd("toggle-server-action");
    console.log(`Server action took: ${afterServer - beforeServer}ms`);
    
    if (result.success) {
      const beforeRefresh = performance.now();
      router.refresh();
      const afterRefresh = performance.now();
      console.log(`router.refresh() took: ${afterRefresh - beforeRefresh}ms`);
      console.timeEnd("toggle-click");
    }
  });
}}
```

### 2. Medición de re-renders
Agregar al inicio de `ChecklistView`:

```typescript
useEffect(() => {
  console.log("🔄 ChecklistView re-rendered", {
    itemsCount: items.length,
    timestamp: performance.now()
  });
});
```

### 3. Network tab
- Abrir Chrome DevTools > Network
- Filtrar por "fetch" o "xhr"
- Click en checkbox
- Verificar:
  - ¿Cuántos requests se disparan?
  - ¿Cuánto tarda cada uno?
  - ¿Hay requests duplicados?

## Solución propuesta (3 fases)

### FASE 1: Optimistic UI (cambio inmediato)
- Estado local por item (Map<itemId, isCompleted>)
- Actualizar UI instantáneamente
- Guardar en background
- Revertir si falla

### FASE 2: Evitar router.refresh() completo
- Usar `useOptimistic` de React 19 (si aplica)
- O actualizar solo el item específico sin re-render completo
- `revalidatePath` solo si es necesario

### FASE 3: Memoización y optimización
- Memoizar `itemsByArea`
- `React.memo` para items individuales
- Separar componente `ChecklistItemRow`

