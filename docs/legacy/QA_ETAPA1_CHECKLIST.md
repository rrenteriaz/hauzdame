# QA ETAPA 1 - CHECKLIST MANUAL

## 📋 OBJETIVO
Verificar que todas las funcionalidades de la ETAPA 1 funcionan correctamente antes del lanzamiento beta.

## 🔧 PREPARACIÓN
1. Dos navegadores diferentes (o ventana incógnito)
2. Dos usuarios de prueba:
   - Host: OWNER o ADMIN
   - Cleaner: CLEANER
3. Una propiedad de prueba (Host)
4. Chrome DevTools abierto

---

## ✅ CASOS DE PRUEBA

### 1. MARKETPLACE - APLICACIONES MÚLTIPLES

**Objetivo:** Verificar que dos cleaners pueden aplicar a la misma opening y el host puede aceptar/rechazar correctamente.

**Pasos:**
1. **Host:** Crear opening ACTIVE para una propiedad
2. **Cleaner A:** Aplicar a la opening → Verificar que se crea thread
3. **Cleaner B:** Aplicar a la misma opening → Verificar que se crea thread diferente
4. **Host:** Ver aplicaciones en `/host/properties/[id]/applications`
   - Verificar que ambas aplicaciones aparecen como PENDING
5. **Host:** Aceptar aplicación de Cleaner A
   - Verificar que se crea PropertyCleaner
   - Verificar que thread se activa
   - Verificar que navega al chat
6. **Host:** Rechazar aplicación de Cleaner B
   - Verificar que aplicación queda como REJECTED
   - Verificar que thread NO se activa

**Resultado esperado:**
- ✅ Dos aplicaciones PENDING visibles
- ✅ Aceptar una → PropertyCleaner creado, thread activo
- ✅ Rechazar otra → Estado REJECTED, thread NO activo
- ✅ No hay duplicados ni conflictos

---

### 2. OPENINGS - GARANTÍA 1 ACTIVE

**Objetivo:** Verificar que nunca pueden existir dos openings ACTIVE simultáneas para una propiedad.

**Pasos:**
1. **Host:** Crear opening ACTIVE para propiedad A
2. **Host:** Intentar crear otra opening ACTIVE para la misma propiedad
   - Resultado: Error "Ya existe una bandera activa"
3. **Host:** Pausar la opening (status PAUSED)
4. **Host:** Crear nueva opening ACTIVE para la misma propiedad
   - Resultado: ✅ Debe permitirse

**Resultado esperado:**
- ✅ Error al intentar crear segunda ACTIVE
- ✅ Solo 1 ACTIVE por propiedad en cualquier momento
- ✅ PAUSED/CLOSED no bloquean crear nueva ACTIVE

---

### 3. CHAT - OFFLINE & SYNC

**Objetivo:** Verificar que los mensajes offline se sincronizan correctamente sin duplicados.

**Pasos:**
1. **Cleaner:** Abrir thread con Host
2. **Cleaner:** Activar Offline (DevTools → Network → Offline)
3. **Cleaner:** Enviar 5 mensajes de texto
   - Verificar que aparecen con badge "⏳ Pendiente"
4. **Cleaner:** Verificar en IndexedDB (DevTools → Application → IndexedDB)
   - Verificar que mensajes están en outbox
5. **Cleaner:** Reconectar (DevTools → Network → Online)
6. **Cleaner:** Esperar máximo 10 segundos
   - Verificar que mensajes se envían automáticamente
   - Verificar que badges "Pendiente" desaparecen
7. **Host:** Verificar que mensajes aparecen en orden correcto
8. **Cleaner:** Recargar página
   - Verificar que mensajes aparecen solo una vez (no duplicados)

**Resultado esperado:**
- ✅ Mensajes aparecen inmediatamente con "Pendiente"
- ✅ Se guardan en outbox (IndexedDB)
- ✅ Al reconectar, se envían automáticamente
- ✅ Orden correcto (sin duplicados)
- ✅ Badges desaparecen cuando se envían

---

### 4. CHAT - PAGINACIÓN DE MENSAJES

**Objetivo:** Verificar que se pueden cargar mensajes antiguos.

**Pasos:**
1. **Preparación:** Crear thread con más de 30 mensajes (o usar thread existente)
2. **Usuario:** Abrir thread
   - Verificar que se cargan los 30 más recientes
3. **Usuario:** Hacer scroll hasta arriba
   - Verificar que aparece botón "Cargar mensajes anteriores" (si hay más)
4. **Usuario:** Click en "Cargar mensajes anteriores"
   - Verificar que se cargan 30 mensajes más antiguos
   - Verificar que scroll NO salta (permanece estable)
5. **Usuario:** Repetir hasta llegar al inicio
   - Verificar que botón desaparece cuando no hay más

**Resultado esperado:**
- ✅ Carga 30 mensajes iniciales
- ✅ Botón aparece si hay más mensajes
- ✅ Carga mensajes anteriores sin duplicados
- ✅ Scroll estable (no salta)
- ✅ Botón desaparece cuando no hay más

---

### 5. CHAT - RATE LIMIT

**Objetivo:** Verificar que el rate limit funciona para prevenir spam.

**Pasos:**
1. **Usuario:** Abrir thread
2. **Usuario:** Enviar 20 mensajes rápidamente (en menos de 1 minuto)
3. **Usuario:** Intentar enviar mensaje 21
   - Resultado: Error 429 "Estás enviando mensajes muy rápido"

**Resultado esperado:**
- ✅ Primeros 20 mensajes se envían correctamente
- ✅ Mensaje 21 → Error 429 con mensaje claro
- ✅ Después de 1 minuto, puede enviar de nuevo

---

### 6. IMÁGENES - UPLOAD & VISUALIZACIÓN

**Objetivo:** Verificar que las imágenes se suben y visualizan correctamente.

**Pasos:**
1. **Usuario:** Abrir thread
2. **Usuario:** Subir imagen JPG (< 8MB)
   - Verificar preview "Subiendo..."
   - Verificar que aparece en el thread
3. **Usuario:** Click en imagen
   - Verificar que modal fullscreen se abre
   - Verificar que imagen se muestra correctamente
4. **Usuario:** Cerrar modal y recargar página
   - Verificar que imagen sigue visible
5. **Usuario:** Abrir imagen de nuevo (después de 30+ minutos para probar expiración)
   - Verificar que signed URL se renueva

**Validaciones adicionales:**
- ❌ Intentar subir imagen > 8MB → Error claro
- ❌ Intentar subir archivo que no es imagen (PDF, TXT) → Error claro
- ❌ Intentar subir imagen offline → Aviso "Se requiere conexión"

**Resultado esperado:**
- ✅ Upload funciona correctamente
- ✅ Preview durante upload
- ✅ Imagen aparece en thread
- ✅ Modal fullscreen funciona
- ✅ Imagen persiste tras recarga
- ✅ Validaciones funcionan (tamaño, tipo, offline)

---

### 7. IMÁGENES - RATE LIMIT

**Objetivo:** Verificar que el rate limit de uploads funciona.

**Pasos:**
1. **Usuario:** Subir 10 imágenes (en menos de 5 minutos)
2. **Usuario:** Intentar subir imagen 11
   - Resultado: Error 429 "Has subido muchas imágenes recientemente"

**Resultado esperado:**
- ✅ Primeras 10 imágenes se suben correctamente
- ✅ Imagen 11 → Error 429 con mensaje claro
- ✅ Después de 5 minutos, puede subir de nuevo

---

### 8. SEGURIDAD - PERMISOS

**Objetivo:** Verificar que los permisos funcionan correctamente (multi-tenant, acceso a threads/assets).

**Pasos:**

#### 8.1. Thread sin acceso
1. **Usuario A:** Obtener threadId de un thread al que NO tiene acceso
2. **Usuario A:** Intentar GET `/api/chat/threads/[threadId]/messages`
   - Resultado: Error 403 "No tienes acceso a este thread"
3. **Usuario A:** Intentar POST `/api/chat/threads/[threadId]/messages`
   - Resultado: Error 403 "No tienes acceso a este thread"

#### 8.2. Asset sin acceso
1. **Usuario A:** Obtener assetId de una imagen de un thread al que NO tiene acceso
2. **Usuario A:** Intentar GET `/api/assets/[assetId]/signed`
   - Resultado: Error 403 "No tienes acceso a este asset"

#### 8.3. Opening sin permisos
1. **Cleaner:** Intentar crear opening (POST `/api/openings`)
   - Resultado: Error 403 "No tienes permisos"
2. **Usuario sin acceso a propiedad:** Intentar crear opening
   - Resultado: Error 403 "No tienes permisos"

#### 8.4. Application sin permisos
1. **Host:** Intentar aplicar a opening (POST `/api/applications`)
   - Resultado: Error 403 "Solo cleaners pueden aplicar"

**Resultado esperado:**
- ✅ Todos los endpoints retornan 403 cuando no hay acceso
- ✅ Mensajes de error claros
- ✅ No hay leaks de datos (no se ve información privada)

---

### 9. MULTI-TENANT - AISLAMIENTO

**Objetivo:** Verificar que los tenants están correctamente aislados.

**Pasos:**
1. **Usuario Tenant A:** Listar threads (GET `/api/chat/threads`)
   - Verificar que solo ve threads de Tenant A
2. **Usuario Tenant A:** Listar openings (GET `/api/openings`)
   - Verificar que solo ve openings de Tenant A
3. **Usuario Tenant A:** Intentar acceder a thread de Tenant B (usando threadId real)
   - Resultado: Error 403 o thread no encontrado

**Resultado esperado:**
- ✅ Solo se ven datos del propio tenant
- ✅ No hay leaks entre tenants
- ✅ Validaciones de tenantId funcionan

---

### 10. REALTIME - ACTUALIZACIÓN AUTOMÁTICA

**Objetivo:** Verificar que los mensajes se actualizan en tiempo real.

**Pasos:**
1. **Sesión A (Host):** Abrir thread
2. **Sesión B (Cleaner):** Abrir mismo thread
3. **Sesión B:** Enviar mensaje de texto
   - **Sesión A:** Verificar que mensaje aparece automáticamente (sin recargar)
4. **Sesión A:** Enviar mensaje de texto
   - **Sesión B:** Verificar que mensaje aparece automáticamente
5. **Sesión A:** Subir imagen
   - **Sesión B:** Verificar que imagen aparece automáticamente

**Inbox:**
1. **Sesión A:** Estar en inbox (`/host/messages`)
2. **Sesión B:** Enviar mensaje en un thread
   - **Sesión A:** Verificar que thread sube arriba con preview actualizado

**Resultado esperado:**
- ✅ Mensajes aparecen automáticamente en ambas sesiones
- ✅ No requiere recargar página
- ✅ Inbox se actualiza automáticamente
- ✅ Sin duplicados

---

### 11. OPENINGS - ESTADOS Y TRANSICIONES

**Objetivo:** Verificar que los estados de openings funcionan correctamente.

**Pasos:**
1. **Host:** Crear opening ACTIVE
2. **Cleaner:** Verificar que aparece en marketplace
3. **Host:** Pausar opening (PAUSED)
   - **Cleaner:** Verificar que NO aparece en marketplace
4. **Host:** Activar opening de nuevo (si es posible) o crear nueva
5. **Host:** Cerrar opening (CLOSED)
   - **Cleaner:** Verificar que NO aparece en marketplace
   - **Host:** Verificar que applications PENDING siguen visibles

**Resultado esperado:**
- ✅ Solo ACTIVE aparecen en marketplace
- ✅ PAUSED/CLOSED no aparecen
- ✅ Applications siguen accesibles para Host

---

### 12. OFFLINE - PURGA Y CACHE

**Objetivo:** Verificar que el cache offline funciona y se purga correctamente.

**Pasos:**
1. **Usuario:** Enviar varios mensajes (más de 15 días de antigüedad simulada)
2. **Usuario:** Verificar en IndexedDB que mensajes están en cache
3. **Usuario:** Iniciar app (simular inicio)
   - Verificar que mensajes antiguos se purgan
   - Verificar que mensajes recientes permanecen

**Resultado esperado:**
- ✅ Cache funciona correctamente
- ✅ Mensajes > 15 días se purgan
- ✅ Mensajes recientes permanecen

---

## 📝 NOTAS ADICIONALES

### Errores comunes a verificar:
- ❌ No hay duplicados de mensajes
- ❌ No hay race conditions en openings
- ❌ No hay leaks de memoria (subscripciones Realtime)
- ❌ No hay loops infinitos en sync
- ❌ No hay datos privados expuestos

### Performance:
- ⚡ Paginación funciona sin lag
- ⚡ Realtime actualiza rápidamente (< 1 segundo)
- ⚡ Upload de imágenes < 8MB es razonable

### UX:
- 🎨 Mensajes de error son claros
- 🎨 Estados de carga son visibles
- 🎨 Badges de estado funcionan correctamente

---

## ✅ CRITERIOS DE ACEPTACIÓN

**Pasar a Beta si:**
- ✅ Todos los casos de prueba pasan
- ✅ No hay errores críticos en consola
- ✅ Performance es aceptable
- ✅ Seguridad verificada (permisos funcionan)

**NO pasar a Beta si:**
- ❌ Hay duplicados de mensajes
- ❌ Hay race conditions (múltiples openings ACTIVE)
- ❌ Hay leaks de datos entre tenants
- ❌ Hay errores críticos sin manejar

