# FASE 3 - Validación Manual Funcional

## Objetivo
Confirmar que toda la aplicación está usando `propertyIdNew` como FK principal, mientras mantiene compatibilidad con `propertyId` legacy.

---

## 1. `/host/properties` (Lista de Propiedades)

### Ruta exacta:
```
/host/properties
```

### Qué debe verse:
- Lista de todas las propiedades del tenant
- Cada propiedad muestra: nombre, alias corto (si existe), estado (activa/inactiva)
- No debe haber errores en consola
- La página carga sin problemas

### Señales de que usa `propertyIdNew`:
- ✅ La página carga correctamente (las queries de Property no usan FK, solo listan)
- ⚠️ **Indirecto**: Si hay errores aquí, puede indicar problemas en otras partes

---

## 2. `/host/properties/[id]` (Detalle de Propiedad)

### Ruta exacta (ejemplo):
```
/host/properties/cmj12345
```
*(Usa el ID legacy de una propiedad existente)*

### Qué debe verse:
- **Información de la propiedad**: Nombre, alias, dirección, horas check-in/out, grupo, email, iCal URL, notas, zona horaria
- **Equipos asignados**: Lista de equipos asignados a esta propiedad
- **Checklist de limpieza**: Resumen del checklist (áreas con items activos)
- **Historial de limpiezas**: Link con flecha a la derecha
- **Información adicional**: Link con flecha a la derecha
- **Botones**: Editar, Sincronizar iCal, Eliminar

### Señales de que usa `propertyIdNew`:
- ✅ **Equipos asignados se muestran**: La query `propertyTeam.findMany({ propertyIdNew: ... })` funciona
- ✅ **Checklist items se muestran**: La query `propertyChecklistItem.findMany({ propertyIdNew: ... })` funciona
- ✅ **Limpiezas se muestran**: La query `cleaning.findMany({ propertyIdNew: ... })` funciona
- ⚠️ Si alguno de estos no aparece, puede indicar que la query aún usa `propertyId` legacy

### Cómo verificar en consola del navegador:
```javascript
// Abre DevTools > Console y ejecuta:
// (No hay forma directa de verificar desde el frontend, pero si la página carga todo correctamente, está funcionando)
```

---

## 3. Botón "Sincronizar iCal" en una propiedad con `icalUrl`

### Ruta exacta:
```
/host/properties/cmj12345
```
*(Misma propiedad del paso 2, debe tener `icalUrl` configurado)*

### Pasos:
1. Hacer clic en el botón **"Sincronizar iCal"**
2. Esperar a que termine la sincronización (debe mostrar un mensaje de éxito/error)

### Qué debe pasar:
- Si hay reservas en el iCal:
  - Se crean/actualizan **Reservations** con `propertyIdNew` poblado
  - Se crean/actualizan **Cleanings** con `propertyIdNew` poblado
  - Las limpiezas aparecen en `/host/cleanings`

### Señales de que usa `propertyIdNew`:
- ✅ **Reservas se crean correctamente**: Verificar en Prisma Studio que `Reservation.propertyIdNew` tiene valor (no null)
- ✅ **Limpiezas se crean correctamente**: Verificar en Prisma Studio que `Cleaning.propertyIdNew` tiene valor (no null)
- ✅ **Limpiezas aparecen en calendario**: Ir a `/host/cleanings` y verificar que las nuevas limpiezas aparecen

### Verificación en Prisma Studio:
```sql
-- Verificar que las reservas tienen propertyIdNew
SELECT id, "propertyId", "propertyIdNew", "calendarUid", "startDate", "endDate"
FROM "Reservation"
WHERE "propertyId" = 'cmj12345'  -- ID legacy
ORDER BY "createdAt" DESC
LIMIT 5;

-- Verificar que las limpiezas tienen propertyIdNew
SELECT id, "propertyId", "propertyIdNew", "scheduledDate", status
FROM "Cleaning"
WHERE "propertyId" = 'cmj12345'  -- ID legacy
ORDER BY "createdAt" DESC
LIMIT 5;
```

**✅ Confirmación**: Si `propertyIdNew` tiene valores (no null) en las filas nuevas, está funcionando.

---

## 4. `/host/cleanings` (Calendario Mensual + Vista Diaria)

### Ruta exacta:
```
/host/cleanings
```

### Vista Mensual (por defecto):
- Calendario mensual con días
- Cada día muestra hasta 3 limpiezas con:
  - **Viñeta de color** (diferente por propiedad)
  - **Nombre corto de la propiedad** en negro
  - Estado de la limpieza (símbolo + color)

### Vista Diaria:
- Cambiar a vista "Día" usando el selector
- Lista de limpiezas del día seleccionado
- Cada limpieza muestra:
  - **Viñeta de color** (diferente por propiedad)
  - Nombre de propiedad
  - Hora programada
  - Estado
  - Botones de acción

### Señales de que usa `propertyIdNew`:
- ✅ **Limpiezas aparecen correctamente**: La query `cleaning.findMany({ include: { property: true } })` funciona porque la relación usa `propertyIdNew -> Property.newId`
- ✅ **Viñetas de color funcionan**: El mapeo de colores usa `propertyIdNew` para identificar propiedades
- ✅ **No hay errores en consola**: Las relaciones Prisma funcionan correctamente

### Cómo verificar:
- Si las limpiezas aparecen con sus propiedades correctas, la relación funciona
- Si hay errores de "property is null", puede indicar que la relación no está funcionando

---

## 5. `/cleaner?memberId=XXX` (Disponibles/Mías)

### Ruta exacta (ejemplo):
```
/cleaner?memberId=clx1234567890abcdef
```
*(Usa el ID de un TeamMember existente que pertenezca a un equipo asignado a una propiedad)*

### Qué debe verse:

#### Sección "Disponibles":
- Lista de limpiezas con `assignmentStatus = "OPEN"` y `assignedMemberId = null`
- Solo de propiedades asignadas a los equipos del miembro
- Cada limpieza muestra:
  - Nombre de propiedad
  - Fecha/hora programada
  - Estado
  - Botón **"Aceptar limpieza"**

#### Sección "Mías":
- Lista de limpiezas con `assignedMemberId = [memberId]`
- Cada limpieza muestra:
  - Nombre de propiedad
  - Fecha/hora programada
  - Estado
  - Link a detalle

### Señales de que usa `propertyIdNew`:
- ✅ **Limpiezas disponibles aparecen**: La query `cleaning.findMany({ propertyIdNew: { in: propertyNewIds } })` funciona
- ✅ **Al aceptar una limpieza**: Se actualiza correctamente (verificar en Prisma Studio que `Cleaning.propertyIdNew` tiene valor)
- ✅ **Limpiezas "Mías" aparecen**: La query funciona correctamente

### Verificación en Prisma Studio:
```sql
-- Verificar limpiezas disponibles para un miembro
-- (Esto requiere conocer los propertyNewIds de las propiedades asignadas a los equipos del miembro)
SELECT c.id, c."propertyId", c."propertyIdNew", c."assignmentStatus", c."assignedMemberId", c."scheduledDate"
FROM "Cleaning" c
WHERE c."assignmentStatus" = 'OPEN'
  AND c."assignedMemberId" IS NULL
  AND c."propertyIdNew" IS NOT NULL  -- Debe tener propertyIdNew
ORDER BY c."scheduledDate" ASC;
```

**✅ Confirmación**: Si las limpiezas tienen `propertyIdNew` no null y aparecen en la página, está funcionando.

---

## 6. Checklist por Propiedad y Checklist en Limpieza

### 6.1 Checklist por Propiedad (Host)

#### Ruta exacta:
```
/host/properties/cmj12345/checklist
```

#### Qué debe verse:
- Lista de áreas del checklist (Sala, Comedor, Cocina, etc.)
- Items activos por área
- Botones: "Agregar item", "Editar" (por área), "Copiar a otras propiedades"

#### Acciones a probar:
1. **Agregar un item nuevo**:
   - Clic en "Agregar item"
   - Seleccionar área (solo áreas sin items)
   - Ingresar título
   - Guardar
   - ✅ **Verificar**: El item aparece en la lista

2. **Editar un item existente**:
   - Clic en "Editar" en un área
   - Modificar título de un item
   - Guardar
   - ✅ **Verificar**: El cambio se refleja

3. **Eliminar un item**:
   - Clic en "Editar" en un área
   - Clic en "X" de un item
   - ✅ **Verificar**: El item desaparece

#### Señales de que usa `propertyIdNew`:
- ✅ **Items se crean correctamente**: Verificar en Prisma Studio que `PropertyChecklistItem.propertyIdNew` tiene valor
- ✅ **Items se actualizan correctamente**: Las queries usan `propertyIdNew` en el `where`
- ✅ **Items se eliminan correctamente**: Las queries usan `propertyIdNew` en el `where`

### 6.2 Checklist en Limpieza (Host)

#### Ruta exacta:
```
/host/cleanings/clx9876543210fedcba
```
*(Usa el ID de una limpieza existente)*

#### Qué debe verse:
- Checklist de la limpieza (snapshot del checklist de la propiedad al momento de crear la limpieza)
- Items agrupados por área
- Checkboxes para marcar items como completados
- Estado de cada item

#### Señales de que usa `propertyIdNew`:
- ✅ **Checklist aparece correctamente**: El snapshot se creó usando `propertyIdNew` cuando se creó la limpieza
- ✅ **Items se pueden marcar como completados**: Las queries funcionan correctamente

### 6.3 Checklist en Limpieza (Cleaner)

#### Ruta exacta:
```
/cleaner/cleanings/clx9876543210fedcba?memberId=clx1234567890abcdef
```

#### Qué debe verse:
- Mismo checklist que en la vista del host
- Checkboxes para marcar items como completados
- Botones: "Iniciar limpieza", "Completar limpieza"

#### Señales de que usa `propertyIdNew`:
- ✅ **Checklist aparece correctamente**: La limpieza se carga con su relación a Property usando `propertyIdNew`
- ✅ **No hay errores**: Las relaciones Prisma funcionan correctamente

---

## Verificación Final en Base de Datos

### Consultas SQL para confirmar que todo usa `propertyIdNew`:

```sql
-- 1. Verificar que todas las Reservations tienen propertyIdNew
SELECT 
  COUNT(*) as total,
  COUNT("propertyIdNew") as con_propertyIdNew,
  COUNT(*) - COUNT("propertyIdNew") as sin_propertyIdNew
FROM "Reservation"
WHERE "propertyId" IS NOT NULL;

-- 2. Verificar que todas las Cleanings tienen propertyIdNew
SELECT 
  COUNT(*) as total,
  COUNT("propertyIdNew") as con_propertyIdNew,
  COUNT(*) - COUNT("propertyIdNew") as sin_propertyIdNew
FROM "Cleaning"
WHERE "propertyId" IS NOT NULL;

-- 3. Verificar que todos los PropertyChecklistItems tienen propertyIdNew
SELECT 
  COUNT(*) as total,
  COUNT("propertyIdNew") as con_propertyIdNew,
  COUNT(*) - COUNT("propertyIdNew") as sin_propertyIdNew
FROM "PropertyChecklistItem"
WHERE "propertyId" IS NOT NULL;

-- 4. Verificar que todos los PropertyTeams tienen propertyIdNew
SELECT 
  COUNT(*) as total,
  COUNT("propertyIdNew") as con_propertyIdNew,
  COUNT(*) - COUNT("propertyIdNew") as sin_propertyIdNew
FROM "PropertyTeam"
WHERE "propertyId" IS NOT NULL;

-- 5. Verificar relaciones: Limpiezas que no tienen Property (huérfanas)
SELECT c.id, c."propertyId", c."propertyIdNew"
FROM "Cleaning" c
LEFT JOIN "Property" p ON p."newId" = c."propertyIdNew"
WHERE c."propertyIdNew" IS NOT NULL
  AND p.id IS NULL;

-- 6. Verificar relaciones: Reservas que no tienen Property (huérfanas)
SELECT r.id, r."propertyId", r."propertyIdNew"
FROM "Reservation" r
LEFT JOIN "Property" p ON p."newId" = r."propertyIdNew"
WHERE r."propertyIdNew" IS NOT NULL
  AND p.id IS NULL;
```

### Resultados esperados:
- ✅ Todas las filas nuevas (creadas después de FASE 3) deben tener `propertyIdNew` no null
- ✅ No debe haber filas huérfanas (sin Property correspondiente)
- ✅ Las relaciones Prisma deben funcionar (Property se carga correctamente en includes)

---

## Señales Claras de que Estamos Usando `propertyIdNew`

### 1. Al crear una nueva limpieza:
- **Acción**: Crear limpieza manual desde `/host/cleanings`
- **Verificación**: En Prisma Studio, la nueva `Cleaning` debe tener `propertyIdNew` poblado (no null)
- **Código**: `app/host/cleanings/actions.ts` → `createCleaning()` usa `propertyIdNew`

### 2. Al sincronizar iCal:
- **Acción**: Sincronizar iCal de una propiedad
- **Verificación**: Las nuevas `Reservation` y `Cleaning` deben tener `propertyIdNew` poblado
- **Código**: `app/host/properties/sync-ical.ts` usa `propertyIdNew` en creates

### 3. Al aceptar una limpieza como cleaner:
- **Acción**: Aceptar limpieza desde `/cleaner`
- **Verificación**: La `Cleaning` debe tener `propertyIdNew` (ya estaba poblado al crearse)
- **Código**: `app/cleaner/actions.ts` → `acceptCleaning()` no crea, solo actualiza

### 4. Al agregar un item al checklist:
- **Acción**: Agregar item al checklist de una propiedad
- **Verificación**: El nuevo `PropertyChecklistItem` debe tener `propertyIdNew` poblado
- **Código**: `app/host/properties/checklist-actions.ts` → `createChecklistItem()` usa `propertyIdNew`

### 5. Al asignar un equipo a una propiedad:
- **Acción**: Asignar equipo desde detalle de propiedad
- **Verificación**: El nuevo `PropertyTeam` debe tener `propertyIdNew` poblado
- **Código**: `app/host/properties/actions.ts` → `assignTeamToProperty()` usa `propertyIdNew`

### 6. Al cargar limpiezas en el calendario:
- **Acción**: Ver `/host/cleanings`
- **Verificación**: Las limpiezas aparecen con sus propiedades correctas
- **Código**: La relación `Cleaning.property -> Property` usa `propertyIdNew -> Property.newId`

---

## Checklist de Validación

Marca cada item cuando lo hayas verificado:

- [ ] `/host/properties` carga sin errores
- [ ] `/host/properties/[id]` muestra equipos, checklist y limpiezas
- [ ] Sincronizar iCal crea reservas y limpiezas con `propertyIdNew` poblado
- [ ] `/host/cleanings` muestra limpiezas con propiedades correctas
- [ ] `/cleaner` muestra limpiezas disponibles y "mías"
- [ ] Checklist de propiedad: crear, editar, eliminar items funciona
- [ ] Checklist en limpieza (host) se muestra correctamente
- [ ] Checklist en limpieza (cleaner) se muestra correctamente
- [ ] Consultas SQL confirman que todas las filas nuevas tienen `propertyIdNew`
- [ ] No hay filas huérfanas en la base de datos

---

## Notas Importantes

1. **Compatibilidad**: Los campos legacy (`propertyId`) se mantienen temporalmente. Las filas antiguas pueden tener `propertyIdNew = null`, pero las nuevas deben tenerlo poblado.

2. **Errores comunes**:
   - Si una página no carga: Verificar que las queries usan `propertyIdNew` en el `where`
   - Si las relaciones no funcionan: Verificar que `Property.newId` está poblado
   - Si hay errores de "property is null": Verificar que la relación Prisma está correcta

3. **Próximos pasos**: Una vez validado, proceder con FASE 4 (switch de PK).




