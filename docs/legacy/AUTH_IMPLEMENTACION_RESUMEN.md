# AUTENTICACIÓN REAL - RESUMEN DE IMPLEMENTACIÓN

## ✅ CAMBIOS IMPLEMENTADOS

### 1. Estructura de Autenticación (`lib/auth/`)
- ✅ `password.ts` - Hash y verificación con bcrypt
- ✅ `session.ts` - Gestión de sesiones con cookies httpOnly/secure
- ✅ `requireUser.ts` - Helpers para requerir usuario autenticado
- ✅ `guards.ts` - Validaciones de permisos (canAccessProperty, canAccessThread, etc.)
- ✅ `rateLimit.ts` - Rate limiting en memoria (10 intentos / 15 min)

### 2. Rutas de Autenticación
- ✅ `app/login/page.tsx` - Página de login
- ✅ `app/api/auth/login/route.ts` - Endpoint de login
- ✅ `app/api/auth/logout/route.ts` - Endpoint de logout
- ✅ `app/api/auth/me/route.ts` - Obtener usuario actual

### 3. Middleware
- ✅ `middleware.ts` - Protege rutas `/host/**` y `/cleaner/**`
- ✅ Redirige a `/login` si no hay sesión

### 4. Endpoints Refactorizados
Todos los endpoints ahora usan `requireUser()` en lugar de `userId` del cliente:
- ✅ `/api/openings` - POST y PATCH
- ✅ `/api/applications` - POST y PATCH
- ✅ `/api/chat/threads` - GET
- ✅ `/api/chat/threads/[threadId]/messages` - GET y POST

### 5. Páginas Actualizadas
- ✅ `app/host/messages/page.tsx` - Usa `requireUser()`
- ✅ `app/host/messages/[threadId]/page.tsx` - Valida acceso con `canAccessThread()`
- ✅ `app/cleaner/messages/page.tsx` - Usa `requireUser()`
- ✅ `app/cleaner/messages/[threadId]/page.tsx` - Valida acceso con `canAccessThread()`
- ✅ `components/chat/ChatThreadView.tsx` - Obtiene userId desde `/api/auth/me`

## 🔒 SEGURIDAD

### Checklist de Seguridad
- ✅ No se confía en `userId` enviado por el cliente
- ✅ Sesiones con cookies httpOnly (no accesibles desde JS)
- ✅ Cookies secure en producción (solo HTTPS)
- ✅ Cookies sameSite=lax para protección CSRF
- ✅ Rate limiting en login (10 intentos / 15 min)
- ✅ Validación de permisos en cada endpoint
- ✅ Multi-tenant: validación de `tenantId` en todas las queries
- ✅ Guards de permisos: solo usuarios autorizados pueden realizar acciones

### Permisos Implementados
- ✅ **Openings**: Solo OWNER/ADMIN con acceso a la propiedad
- ✅ **Applications apply**: Solo CLEANER
- ✅ **Applications accept/reject**: Solo OWNER/ADMIN con acceso a la propiedad
- ✅ **Chat threads**: Solo participantes del thread
- ✅ **Chat messages**: Solo participantes del thread

## 📦 DEPENDENCIAS AGREGADAS
- `bcryptjs` - Hash de contraseñas
- `@types/bcryptjs` - Tipos TypeScript

## 🧪 CÓMO PROBAR MANUALMENTE

### 1. Preparar Usuario de Prueba
```sql
-- En la base de datos, crear un usuario con contraseña hasheada
-- O usar un script para crear usuario con contraseña "test123"
```

O usar el endpoint de inicialización si existe, o crear manualmente:
```typescript
// Script temporal para crear usuario (ejecutar una vez)
import { hashPassword } from "@/lib/auth/password";
import prisma from "@/lib/prisma";

const password = await hashPassword("test123");
await prisma.user.create({
  data: {
    email: "test@hausdame.local",
    hashedPassword: password,
    role: "OWNER",
    tenantId: "tu-tenant-id",
  },
});
```

### 2. Probar Login
1. Ir a `http://localhost:3000/login`
2. Ingresar email y contraseña
3. Verificar que redirige a `/host` (o según rol)
4. Verificar que la cookie `hausdame_session` se crea (en DevTools > Application > Cookies)

### 3. Probar Protección de Rutas
1. **Sin sesión:**
   - Abrir ventana incógnito
   - Ir a `http://localhost:3000/host/messages`
   - Debe redirigir a `/login?redirect=/host/messages`

2. **Con sesión:**
   - Después de login, ir a `/host/messages`
   - Debe mostrar la página sin redirigir

### 4. Probar Endpoints API
1. **Sin sesión:**
   ```bash
   curl -X POST http://localhost:3000/api/openings \
     -H "Content-Type: application/json" \
     -d '{"propertyId": "test"}'
   ```
   - Debe retornar 401 o redirigir

2. **Con sesión:**
   - Hacer login desde el navegador
   - Copiar la cookie `hausdame_session`
   - Hacer request con la cookie:
   ```bash
   curl -X POST http://localhost:3000/api/openings \
     -H "Content-Type: application/json" \
     -H "Cookie: hausdame_session=..." \
     -d '{"propertyId": "test"}'
   ```
   - Debe funcionar si tienes permisos

### 5. Probar Permisos
1. **Cleaner no puede crear openings:**
   - Login como CLEANER
   - Intentar crear opening
   - Debe retornar 403

2. **Host no puede aplicar a openings:**
   - Login como OWNER/ADMIN
   - Intentar aplicar a opening
   - Debe retornar 403

3. **Usuario no participante no puede ver thread:**
   - Login como usuario A
   - Intentar acceder a thread donde solo participa usuario B
   - Debe redirigir o retornar 403

### 6. Probar Rate Limiting
1. Intentar login con credenciales incorrectas 11 veces
2. En el intento 11, debe retornar 429 (Too Many Requests)
3. Esperar 15 minutos o cambiar IP/identifier

### 7. Probar Logout
1. Después de login, ir a `/api/auth/logout` (POST)
2. Verificar que la cookie se elimina
3. Intentar acceder a `/host/messages`
4. Debe redirigir a `/login`

## ⚠️ NOTAS IMPORTANTES

### Desarrollo vs Producción
- **Desarrollo**: Cookies `secure=false` (permite HTTP)
- **Producción**: Cookies `secure=true` (solo HTTPS)

### Teléfono en Login
El modelo `User` actualmente solo tiene `email`. Si necesitas login por teléfono:
1. Agregar campo `phone` al modelo User en Prisma
2. Actualizar `app/api/auth/login/route.ts` para buscar por email O phone

### OTP
OTP queda como TODO futuro. Actualmente solo se usa email/teléfono + contraseña.

## 🚀 PRÓXIMOS PASOS

1. **Migración Prisma** (si se agregó campo phone):
   ```bash
   npx prisma migrate dev --name add_user_phone
   npx prisma generate
   ```

2. **Crear usuarios de prueba** con contraseñas hasheadas

3. **Probar flujo completo** de marketplace + chat con autenticación

4. **Implementar OTP** (opcional, futuro)

