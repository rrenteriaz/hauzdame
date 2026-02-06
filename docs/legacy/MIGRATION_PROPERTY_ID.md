# Migración de Property.id: ID corto → cuid()

## FASE 0 - Inventario de referencias a Property.id

### Tablas que referencian Property.id:

1. **Reservation** (línea 252)
   - Campo: `propertyId String`
   - Relación: `property Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)`
   - Índices: `@@index([propertyId])`

2. **Cleaning** (línea 305)
   - Campo: `propertyId String`
   - Relación: `property Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)`
   - Índices: `@@index([propertyId])`

3. **Lock** (línea 365)
   - Campo: `propertyId String`
   - Relación: `property Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)`
   - Índices: `@@index([propertyId])`

4. **PropertyAdmin** (línea 194)
   - Campo: `propertyId String`
   - Relación: `property Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)`
   - Unique: `@@unique([propertyId, userId])`

5. **PropertyCleaner** (línea 211)
   - Campo: `propertyId String`
   - Relación: `property Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)`
   - Unique: `@@unique([propertyId, userId])`

6. **PropertyHandyman** (línea 228)
   - Campo: `propertyId String`
   - Relación: `property Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)`
   - Unique: `@@unique([propertyId, userId])`

7. **PropertyTeam** (línea 537)
   - Campo: `propertyId String`
   - Relación: `property Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)`
   - Unique: `@@unique([propertyId, teamId])`
   - Índices: `@@index([propertyId])`

8. **PropertyChecklistItem** (línea 582)
   - Campo: `propertyId String`
   - Relación: `property Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)`
   - Índices: `@@index([propertyId])`, `@@index([propertyId, isActive])`

**Total: 8 tablas dependientes**

---

## Plan de migración

### FASE 1: Nuevo ID paralelo en Property ✅
- [x] Agregar `idOld String? @unique` a Property
- [x] Agregar `newId String? @unique @default(cuid())` a Property
- [x] Crear migración: `20251216120000_phase1_add_property_id_migration_columns`
- [x] Script de backfill: `prisma/scripts/phase1_backfill_property_ids.js`
- [ ] **PENDIENTE**: Ejecutar migración y backfill
- [ ] Validar: no nulls, no duplicados

### FASE 2: Columnas nuevas de FK en tablas dependientes ✅
- [x] Agregar `propertyNewId String?` en cada tabla dependiente
- [x] Crear índices
- [x] Migración: `20251216130000_phase2_add_property_new_id_in_dependents`
- [x] Script de backfill: `prisma/scripts/phase2_backfill_property_new_id.js`
- [ ] **PENDIENTE**: Ejecutar migración y backfill
- [ ] Validar: no nulls (salvo huérfanos)

### FASE 3: Cambiar relaciones Prisma
- [ ] Actualizar schema.prisma para usar propertyNewId
- [ ] Actualizar código (queries, creates, where, joins)
- [ ] Validar: Prisma Studio, pantallas principales

### FASE 4: Switch PK
- [ ] Quitar FKs viejas
- [ ] Promover Property.newId como PK
- [ ] Renombrar columnas
- [ ] Renombrar propertyNewId -> propertyId en dependientes

### FASE 5: Cleanup
- [ ] Eliminar columnas legacy
- [ ] Remover referencias en código

