# Reglas de Seguridad para Scripts de Seed (Safe Seeding Rules)

**Versión:** 2.0  
**Fecha:** 2025-01-XX  
**Propósito:** Prevenir creación accidental de datos demo en producción o duplicados

---

## 🚨 Problema que Resuelve

Los scripts `seed-dev-users.ts` y `check-and-fix-user.ts` pueden crear accidentalmente:
- Tenant "Hausdame Demo" (slug: "hausdame-demo")
- Usuarios duplicados (mismo email en diferentes tenants)

Esto ocurrió por ejecución manual sin precauciones. Este documento explica las protecciones implementadas.

---

## 🛡️ Protecciones Implementadas

### 1. `scripts/seed-dev-users.ts`

#### Guard 1: Variable de Entorno Obligatoria para Demo
**Requisito:** `ALLOW_DEMO_SEED=1` debe estar definida

**Sin esta variable:**
```bash
npx tsx scripts/seed-dev-users.ts
# ❌ Error: Refusing to run seed-dev-users.ts without ALLOW_DEMO_SEED=1
```

**Con esta variable:**
```bash
ALLOW_DEMO_SEED=1 ALLOW_SEED_WRITES=1 npx tsx scripts/seed-dev-users.ts --create-demo
# ✅ Permite ejecución
```

---

#### Guard 2: No Ejecutar en Producción
**Requisito:** `NODE_ENV !== "production"`

**Si NODE_ENV=production:**
```bash
NODE_ENV=production ALLOW_DEMO_SEED=1 ALLOW_SEED_WRITES=1 npx tsx scripts/seed-dev-users.ts
# ❌ Error: This script cannot run in production
```

---

#### Guard 3: Requerir ALLOW_SEED_WRITES para Escribir
**Requisito:** `ALLOW_SEED_WRITES=1` debe estar definida para cualquier operación de escritura

**Este guard reemplaza la heurística anterior de validación de DATABASE_URL** (que bloqueaba Neon DEV).

**Sin esta variable:**
```bash
ALLOW_DEMO_SEED=1 npx tsx scripts/seed-dev-users.ts --create-demo
# ❌ Error: Refusing to run because ALLOW_SEED_WRITES=1 is required to write to DB.
```

**Con esta variable:**
```bash
ALLOW_DEMO_SEED=1 ALLOW_SEED_WRITES=1 npx tsx scripts/seed-dev-users.ts --create-demo
# ✅ Permite ejecución (funciona con Neon DEV)
```

**Ventajas:**
- ✅ No bloquea Neon DEV (neon.tech ya no es rechazado automáticamente)
- ✅ Requiere confirmación explícita para escribir
- ✅ Compatible con cualquier base de datos de desarrollo

---

#### Guard 4: Flag `--create-demo` Obligatorio
**Requisito:** Si el tenant demo no existe, se requiere `--create-demo`

**Sin flag:**
```bash
ALLOW_DEMO_SEED=1 ALLOW_SEED_WRITES=1 npx tsx scripts/seed-dev-users.ts
# ❌ Error: Demo tenant missing. Re-run with --create-demo if you really want to create it.
```

**Con flag:**
```bash
ALLOW_DEMO_SEED=1 ALLOW_SEED_WRITES=1 npx tsx scripts/seed-dev-users.ts --create-demo
# ✅ Crea tenant si no existe
```

---

#### Guard 5: Protección Anti-Duplicados
**Requisito:** Si un email existe en otro tenant, aborta por defecto

**Comportamiento:**
- Busca TODOS los usuarios con el email antes de crear/actualizar
- Si encuentra usuarios en tenants diferentes → ❌ Aborta
- Con `--force` → ⚠️ Permite continuar (no recomendado)

**Ejemplo:**
```bash
ALLOW_DEMO_SEED=1 ALLOW_SEED_WRITES=1 npx tsx scripts/seed-dev-users.ts --create-demo
# Si cleaner2@hausdame.test existe en tenant "services-licha"
# ❌ Error: Cannot create/update user "cleaner2@hausdame.test": email exists in different tenant
```

**Con force:**
```bash
ALLOW_DEMO_SEED=1 ALLOW_SEED_WRITES=1 npx tsx scripts/seed-dev-users.ts --create-demo --force
# ⚠️  FORCE MODE: Proceeding despite duplicate email
# ⚠️  WARNING: This may create a duplicate user in tenant ...
```

---

#### Guard 6: NO Upsert Global por Email
**Requisito:** Nunca usar `upsert({ where: { email }})` que pueda mover usuarios entre tenants

**Implementación:**
- Busca usuario SOLO dentro del tenant objetivo: `findFirst({ where: { email, tenantId }})`
- Si existe en el tenant objetivo → `update` por `id`
- Si no existe → `create` con `tenantId` específico
- Con `--force` y duplicados: solo crea nuevo usuario (no actualiza el existente en otro tenant)

**Ventajas:**
- ✅ No puede mover usuarios entre tenants accidentalmente
- ✅ Operaciones explícitas por tenant
- ✅ Más seguro y predecible

---

#### Guard 7: Buscar Tenant Demo por Slug (Canónico)
**Requisito:** El tenant demo se identifica por `slug: "hausdame-demo"`, no por `name`

**Implementación:**
- Constantes: `DEMO_TENANT_SLUG = "hausdame-demo"`, `DEMO_TENANT_NAME = "Hausdame Demo"`
- Búsqueda: `findUnique({ where: { slug: DEMO_TENANT_SLUG }})`
- Si se encuentra tenant con slug correcto pero name diferente → ⚠️ Warning (no cambia automáticamente)

**Ventajas:**
- ✅ Slug es único e inmutable
- ✅ Name puede cambiar sin afectar la búsqueda
- ✅ Más robusto y canónico

---

### 2. `scripts/check-and-fix-user.ts`

#### Guard 1: Email Obligatorio
**Requisito:** Email debe ser proporcionado explícitamente

**Sin email:**
```bash
npx tsx scripts/check-and-fix-user.ts
# ❌ Error: Email is required
# Muestra usage y ejemplos
```

**Con email:**
```bash
ALLOW_SEED_WRITES=1 npx tsx scripts/check-and-fix-user.ts cleaner2@hausdame.test
# ✅ Ejecuta (solo lectura si el usuario existe y la contraseña es correcta)
```

---

#### Guard 2: Requerir ALLOW_SEED_WRITES para Escribir
**Requisito:** `ALLOW_SEED_WRITES=1` debe estar definida para crear/actualizar usuarios

**Sin esta variable (solo lectura):**
```bash
npx tsx scripts/check-and-fix-user.ts cleaner2@hausdame.test
# ✅ Permite verificar usuario (solo lectura)
# ❌ Aborta si necesita crear o actualizar contraseña
```

**Con esta variable:**
```bash
ALLOW_SEED_WRITES=1 npx tsx scripts/check-and-fix-user.ts cleaner2@hausdame.test
# ✅ Permite crear/actualizar usuarios
```

---

#### Guard 3: No Crear Tenant Demo Automáticamente
**Requisito:** Si el tenant demo no existe, aborta por defecto

**Sin flag:**
```bash
ALLOW_SEED_WRITES=1 npx tsx scripts/check-and-fix-user.ts cleaner2@hausdame.test
# Si tenant demo no existe:
# ❌ Error: Demo tenant 'hausdame-demo' does not exist.
#    This script will NOT create it automatically.
```

**Con flag (requiere ALLOW_DEMO_SEED=1):**
```bash
ALLOW_DEMO_SEED=1 ALLOW_SEED_WRITES=1 npx tsx scripts/check-and-fix-user.ts cleaner2@hausdame.test --create-demo
# ✅ Crea tenant si no existe
```

---

#### Guard 4: Protección Anti-Duplicados
**Requisito:** Si el email existe en múltiples tenants, aborta por defecto

**Comportamiento:**
- Busca TODOS los usuarios con el email
- Si encuentra múltiples usuarios → ❌ Aborta y lista todos
- Con `--force` → ⚠️ Permite continuar (no recomendado)

**Ejemplo:**
```bash
ALLOW_SEED_WRITES=1 npx tsx scripts/check-and-fix-user.ts cleaner2@hausdame.test
# Si existe en 2 tenants:
# ⚠️  DUPLICADO DETECTADO: Email "cleaner2@hausdame.test" existe en 2 usuarios:
#   - Usuario abc123 en tenant: Services - Licha (services-licha)
#   - Usuario def456 en tenant: Hausdame Demo (hausdame-demo)
# ❌ Error: Cannot proceed with duplicate emails.
```

---

#### Guard 5: NO Update por Email Global
**Requisito:** Nunca usar `update({ where: { email }})` que pueda afectar usuarios en otros tenants

**Implementación:**
- Si necesita actualizar contraseña → usa `update({ where: { id: user.id }})`
- Solo actualiza el usuario específico encontrado en el tenant objetivo
- No puede afectar usuarios en otros tenants

---

#### Guard 6: Buscar Tenant Demo por Slug
**Requisito:** Igual que `seed-dev-users.ts`, busca por `slug: "hausdame-demo"`

---

## 📋 Cómo Ejecutar de Forma Intencional

### Ejecutar Seed de Usuarios Dev

**Comando completo (crear tenant demo):**
```bash
ALLOW_DEMO_SEED=1 ALLOW_SEED_WRITES=1 npx tsx scripts/seed-dev-users.ts --create-demo
```

**Si el tenant ya existe:**
```bash
ALLOW_DEMO_SEED=1 ALLOW_SEED_WRITES=1 npx tsx scripts/seed-dev-users.ts
```

**Con force (si hay duplicados):**
```bash
ALLOW_DEMO_SEED=1 ALLOW_SEED_WRITES=1 npx tsx scripts/seed-dev-users.ts --create-demo --force
```

**Con host permitido (opcional):**
```bash
ALLOW_DEMO_SEED=1 ALLOW_SEED_WRITES=1 SEED_ALLOWED_DB_HOST=ep-xxx.neon.tech npx tsx scripts/seed-dev-users.ts --create-demo
```

---

### Verificar/Crear Usuario Específico

**Solo lectura (verificar usuario):**
```bash
npx tsx scripts/check-and-fix-user.ts cleaner2@hausdame.test
```

**Con password personalizado (requiere escritura):**
```bash
ALLOW_SEED_WRITES=1 npx tsx scripts/check-and-fix-user.ts cleaner2@hausdame.test MyPassword123
```

**Con flags:**
```bash
ALLOW_SEED_WRITES=1 npx tsx scripts/check-and-fix-user.ts --email=cleaner2@hausdame.test --password=Test123456
```

**Crear tenant demo si falta:**
```bash
ALLOW_DEMO_SEED=1 ALLOW_SEED_WRITES=1 npx tsx scripts/check-and-fix-user.ts cleaner2@hausdame.test --create-demo
```

---

## ⚠️ Advertencias Importantes

### Nunca Correr en Producción

**Estos scripts están diseñados SOLO para desarrollo:**
- ❌ NO correr en producción
- ❌ NO correr apuntando a BD de producción
- ❌ NO correr sin leer este documento primero

**Si necesitas crear usuarios en producción:**
- Usar la UI de la aplicación
- Usar scripts específicos de producción (si existen)
- NO usar estos scripts de desarrollo

---

### Flag `--force` es Peligroso

**El flag `--force` permite:**
- Crear usuarios aunque existan duplicados en otros tenants
- Esto puede crear múltiples usuarios con el mismo email en diferentes tenants

**Riesgos:**
- Puede crear inconsistencias de datos
- Puede violar constraints de negocio
- Puede causar confusión en la aplicación

**Recomendación:** Solo usar `--force` si entiendes completamente las consecuencias.

---

### Neon DEV es Soportado

**Anteriormente:** La heurística bloqueaba `neon.tech` automáticamente.

**Ahora:** Neon DEV es soportado siempre que uses `ALLOW_SEED_WRITES=1`.

**Ejemplo:**
```bash
# Funciona con Neon DEV
ALLOW_DEMO_SEED=1 ALLOW_SEED_WRITES=1 npx tsx scripts/seed-dev-users.ts --create-demo
```

---

## 🔍 Logs y Auditoría

Ambos scripts ahora muestran:

1. **Información de inicio:**
   - Nombre del script
   - NODE_ENV
   - Database fingerprint (host, database name)
   - DATABASE_URL sanitizada (sin password)
   - Flags detectados (--create-demo, --force)
   - Environment gates (ALLOW_DEMO_SEED, ALLOW_SEED_WRITES)

2. **Plan de acciones:**
   - Qué tenant se creará (si aplica)
   - Qué usuarios se crearán/actualizarán
   - Operaciones específicas (create vs update)

3. **Resultados:**
   - Usuarios creados/actualizados exitosamente
   - Errores encontrados
   - Warnings sobre duplicados o inconsistencias

**Ejemplo de salida:**
```
================================================================================
SEED DEV USERS - Modo Seguro
================================================================================
Script: seed-dev-users.ts
NODE_ENV: development
Database fingerprint:
  Host: ep-xxx.neon.tech
  Database: dbname
  Full URL (sanitized): postgresql://user:***@ep-xxx.neon.tech/dbname
Flags:
  --create-demo: ✅ YES
  --force: ❌ NO
Environment gates:
  ALLOW_DEMO_SEED: ✅ YES
  ALLOW_SEED_WRITES: ✅ YES
================================================================================

📝 PLAN: Creating demo tenant 'Hausdame Demo' (slug: 'hausdame-demo')...
✅ Tenant created: Hausdame Demo (abc123, slug: hausdame-demo)

📝 PLAN: Creating/updating users:
  - owner1@hausdame.test (OWNER)
  - admin1@hausdame.test (ADMIN)
  ...
```

---

## 🧪 Pruebas Manuales

### Test 1: Sin Variable de Entorno ALLOW_DEMO_SEED
```bash
npx tsx scripts/seed-dev-users.ts
# Esperado: ❌ Error explicando ALLOW_DEMO_SEED=1 requerido
```

---

### Test 2: Sin Variable de Entorno ALLOW_SEED_WRITES
```bash
ALLOW_DEMO_SEED=1 npx tsx scripts/seed-dev-users.ts --create-demo
# Esperado: ❌ Error explicando ALLOW_SEED_WRITES=1 requerido para escribir
```

---

### Test 3: Sin Email en check-and-fix-user
```bash
npx tsx scripts/check-and-fix-user.ts
# Esperado: ❌ Error mostrando usage
```

---

### Test 4: Sin --create-demo cuando falta tenant
```bash
ALLOW_DEMO_SEED=1 ALLOW_SEED_WRITES=1 npx tsx scripts/seed-dev-users.ts
# Si tenant demo no existe:
# Esperado: ❌ Error pidiendo --create-demo
```

---

### Test 5: Con Email Duplicado
```bash
ALLOW_DEMO_SEED=1 ALLOW_SEED_WRITES=1 npx tsx scripts/seed-dev-users.ts --create-demo
# Si cleaner2@hausdame.test existe en otro tenant:
# Esperado: ❌ Error listando duplicados y pidiendo --force
```

---

### Test 6: Verificar que NO existe upsert por email
```bash
grep -n "upsert.*email" scripts/seed-dev-users.ts
# Esperado: No debe encontrar upsert({ where: { email }})
```

---

## 📚 Referencias

- `scripts/seed-dev-users.ts` - Script principal de seed
- `scripts/check-and-fix-user.ts` - Script de verificación/creación de usuario
- `docs/debug/DEBUG_DEMO_TENANT_REAPPEAR.md` - Diagnóstico del problema original

---

## 🔄 Cambios de Versión 1.0 → 2.0

### Cambios Principales

1. **Reemplazado Guard 3 (heurística DATABASE_URL):**
   - ❌ Eliminado: Bloqueo automático de `neon.tech` y `pooler`
   - ✅ Agregado: `ALLOW_SEED_WRITES=1` requerido para escribir
   - ✅ Ventaja: Soporta Neon DEV sin bloqueos falsos

2. **Eliminado upsert global por email:**
   - ❌ Eliminado: `upsert({ where: { email }})`
   - ✅ Agregado: Búsqueda por `email + tenantId`, luego `update` por `id` o `create`
   - ✅ Ventaja: No puede mover usuarios entre tenants

3. **Búsqueda por slug (canónico):**
   - ❌ Eliminado: Búsqueda por `name: "Hausdame Demo"`
   - ✅ Agregado: Búsqueda por `slug: "hausdame-demo"`
   - ✅ Ventaja: Más robusto y canónico

4. **ALLOW_SEED_WRITES en check-and-fix-user:**
   - ✅ Agregado: Guard para crear/actualizar usuarios
   - ✅ Ventaja: Consistencia con seed-dev-users.ts

---

**Última actualización:** 2025-01-XX (v2.0)
