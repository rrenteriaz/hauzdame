# SEED DEV USERS - Guía de Uso

## 📋 Descripción

Script para crear/actualizar usuarios de prueba en desarrollo. Útil para testing del sistema de autenticación y permisos.

## ⚠️ IMPORTANTE

**NO usar en producción.** Este script está diseñado solo para desarrollo.

## 🔧 Requisitos Previos

1. **Variables de entorno:**
   - `DATABASE_URL` debe estar definida en `.env` o `.env.local`
   - Next.js carga automáticamente estos archivos, pero `tsx` (usado para scripts) NO
   - Por eso el script carga manualmente con `dotenv`

2. **Prisma Client generado:**
   ```bash
   npx prisma generate
   ```

3. **Base de datos accesible:**
   - La base de datos debe estar corriendo y accesible con `DATABASE_URL`

## 🚀 Uso

### Comando rápido

```bash
npm run seed:dev
```

### O ejecutar directamente

```bash
npx tsx scripts/seed-dev-users.ts
```

## 👥 Usuarios Generados

El script crea/actualiza usuarios para un tenant específico con los siguientes roles:

### Patrón de emails:
- `owner1@hausdame.test` (rol: OWNER) - 1 usuario
- `admin1@hausdame.test` (rol: ADMIN) - 2 usuarios
- `admin2@hausdame.test` (rol: ADMIN)
- `cleaner1@hausdame.test` (rol: CLEANER) - 8 usuarios
- `cleaner2@hausdame.test` (rol: CLEANER)
- ... hasta `cleaner8@hausdame.test`

**Nota:** El script solo crea roles OWNER, ADMIN y CLEANER. El schema también soporta HANDYMAN pero no se crea en este seed.

### Contraseña por defecto:
- **Password:** `Test123456` (constante `DEFAULT_PASSWORD` en el script)
- ⚠️ **SOLO PARA DESARROLLO** - Cambiar en producción

## 🔍 Diagnóstico

Si el script falla, verifica:

1. **DATABASE_URL no definida:**
   ```
   ❌ Error: DATABASE_URL no está definido.
      Crea .env o .env.local con DATABASE_URL antes de correr el seed.
   ```
   - **Solución:** Crear `.env` o `.env.local` con `DATABASE_URL=...`

2. **PrismaClient initialization error:**
   - Verifica que `DATABASE_URL` tenga un formato válido
   - Verifica que la base de datos esté accesible
   - Ejecuta `npx prisma generate` si no lo has hecho

3. **El script muestra información de diagnóstico:**
   - En desarrollo, muestra si `DATABASE_URL` existe (sin mostrar el valor completo)
   - Muestra `NODE_ENV` y longitud de `DATABASE_URL`

## 📝 Notas Técnicas

### Carga de Variables de Entorno

- **Next.js:** Carga automáticamente `.env.local`, `.env`, `.env.production`, etc.
- **tsx/Node scripts:** NO cargan automáticamente `.env`
- **Solución:** El script carga manualmente con `dotenv`:
  - Prioridad: `.env.local` > `.env`
  - Solo carga si el archivo existe

### PrismaClient

- Se crea con `datasourceUrl` explícito para mayor claridad
- Validación antes de crear el cliente para fallar rápido si falta `DATABASE_URL`

### Seguridad

- El script NO imprime valores completos de `DATABASE_URL` en logs
- Solo muestra si existe (boolean) y longitud
- Usa `dotenv` solo para scripts, no afecta runtime de Next.js

## 🔄 Actualización de Usuarios

El script usa `upsert` (update or insert):
- Si el usuario existe (por email), actualiza la contraseña
- Si no existe, crea uno nuevo
- Útil para resetear contraseñas en desarrollo

## 📦 Dependencias

- `dotenv` - Carga de variables de entorno (devDependency)
- `tsx` - Ejecución de TypeScript (devDependency)
- `bcryptjs` - Hashing de contraseñas
- `@prisma/client` - Cliente de Prisma

## 🐛 Troubleshooting

### Error: "Cannot find module 'dotenv'"
```bash
npm install --save-dev dotenv
```

### Error: "Cannot find module 'tsx'"
```bash
npm install --save-dev tsx
```

### Error: "PrismaClient needs to be constructed with a non-empty, valid PrismaClientOptions"
- Verifica que `DATABASE_URL` esté definida en `.env` o `.env.local`
- Verifica que el formato de `DATABASE_URL` sea correcto
- Ejecuta `npx prisma generate`

### Error: "P1001: Can't reach database server"
- Verifica que la base de datos esté corriendo
- Verifica que `DATABASE_URL` tenga las credenciales correctas
- Verifica conectividad de red

## 📚 Ver También

- `AUTH_IMPLEMENTACION_RESUMEN.md` - Sistema de autenticación
- `lib/auth/password.ts` - Funciones de hash de contraseñas
- `app/api/auth/login/route.ts` - Endpoint de login

