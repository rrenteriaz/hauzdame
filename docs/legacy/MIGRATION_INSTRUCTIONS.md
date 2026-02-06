# Instrucciones de Ejecución - Migración Property.id

## ⚠️ IMPORTANTE: Leer antes de ejecutar

Esta migración transforma el ID de Property de un ID corto (8 caracteres) a un ID profesional (cuid). Se realiza en 5 fases para garantizar seguridad y trazabilidad.

## Prerequisitos

1. **Backup de la base de datos** (OBLIGATORIO antes de FASE 1)
2. Instalar dependencia para generar cuid:
   ```bash
   npm install @paralleldrive/cuid2
   ```
3. Verificar que Prisma está configurado correctamente:
   ```bash
   npx prisma generate
   ```

## FASE 1: Nuevo ID paralelo en Property

### Paso 1: Aplicar migración
```bash
npx prisma migrate deploy
# O si estás en desarrollo:
npx prisma migrate dev --name phase1_add_property_id_migration_columns
```

### Paso 2: Ejecutar backfill
```bash
node prisma/scripts/phase1_backfill_property_ids.js
```

### Paso 3: Validar
- Verificar que no hay errores en la consola
- El script debe reportar: "✅ Validaciones pasadas"
- Verificar en Prisma Studio que todas las propiedades tienen `idOld` y `newId` poblados

## FASE 2: Columnas nuevas de FK en tablas dependientes

### Paso 1: Aplicar migración
```bash
npx prisma migrate deploy
# O si estás en desarrollo:
npx prisma migrate dev --name phase2_add_property_new_id_in_dependents
```

### Paso 2: Ejecutar backfill
```bash
node prisma/scripts/phase2_backfill_property_new_id.js
```

### Paso 3: Validar
- Verificar que no hay errores en la consola
- Revisar el resumen final que muestra cuántas filas tienen `propertyNewId` poblado
- Si hay "huérfanos" (filas con propertyId pero sin propertyNewId), investigar y corregir antes de continuar

## FASE 3: Cambiar relaciones Prisma

**⚠️ Esta fase requiere cambios en el código. NO ejecutar hasta que las Fases 1 y 2 estén completas y validadas.**

### Paso 1: Actualizar schema.prisma
- Cambiar todas las relaciones para usar `propertyNewId` en lugar de `propertyId`
- Mantener `propertyId` como campo legacy temporal

### Paso 2: Actualizar código
- Buscar todas las referencias a `propertyId` en queries, creates, where, joins
- Cambiar para usar `propertyNewId` donde corresponda
- Ejecutar: `npx prisma generate`

### Paso 3: Validar funcionalidad
- [ ] Prisma Studio abre Property sin errores
- [ ] `/host/properties` lista propiedades correctamente
- [ ] `/host/properties/[id]` muestra detalle correctamente
- [ ] iCal Sync crea reservas y limpiezas correctamente
- [ ] `/host/cleanings` calendario muestra limpiezas correctamente
- [ ] `/cleaner` ve limpiezas asignadas/disponibles correctamente

## FASE 4: Switch PK

**⚠️ Esta fase es CRÍTICA. Hacer backup antes de ejecutar.**

### Paso 1: Crear migración SQL controlada
- Quitar FKs viejas que apunten a Property.id (legacy)
- Hacer Property.newId NOT NULL
- Promover Property.newId como PK
- Renombrar columnas:
  - Property.id (legacy) -> legacyId
  - Property.newId -> id
- En tablas dependientes: renombrar propertyNewId -> propertyId

### Paso 2: Actualizar schema.prisma
- Reflejar los cambios de nombres de columnas
- Ejecutar: `npx prisma generate`

### Paso 3: Validar
- Repetir todas las validaciones de FASE 3
- Verificar que no hay FK constraint errors

## FASE 5: Cleanup

**⚠️ Solo ejecutar después de validar que todo funciona correctamente en producción.**

### Paso 1: Eliminar columnas legacy
- Eliminar Property.legacyId (si ya no se usa)
- Eliminar propertyIdOld en tablas dependientes (si existe)

### Paso 2: Remover referencias en código
- Buscar y eliminar cualquier referencia a campos legacy
- Limpiar comentarios y código muerto

## Checklist de Validación Final

- [ ] Prisma Studio abre Property sin errores
- [ ] `/host/properties` lista y detalle ok
- [ ] iCal Sync crea reservas y limpiezas ok
- [ ] `/host/cleanings` calendario muestra limpiezas ok
- [ ] `/cleaner` ve limpiezas asignadas/disponibles ok
- [ ] No hay registros con propertyId null donde no debería
- [ ] No hay FK constraint errors
- [ ] Todas las propiedades tienen IDs cuid (no IDs cortos)
- [ ] Todas las relaciones funcionan correctamente

## Rollback

Si necesitas hacer rollback en cualquier fase:

1. **FASE 1-2**: Las columnas nuevas son nullable, no afectan el funcionamiento actual
2. **FASE 3**: Revertir cambios en código y schema.prisma
3. **FASE 4**: Requiere restaurar desde backup (CRÍTICO)
4. **FASE 5**: Las columnas ya fueron eliminadas, requiere backup

## Soporte

Si encuentras problemas:
1. Revisar logs de los scripts de backfill
2. Verificar que todas las validaciones pasaron
3. Consultar MIGRATION_PROPERTY_ID.md para detalles técnicos
4. Hacer backup antes de cualquier cambio manual

