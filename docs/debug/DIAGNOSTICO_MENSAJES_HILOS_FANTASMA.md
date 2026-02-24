# Diagnóstico: Mensajes muestra hilos aunque DB está vacía

**Fecha:** 2024  
**Estado:** Diagnóstico completado  
**Tipo:** Bug de cache offline (IndexedDB)

---

## 1. Reproducción / Observaciones

### Síntomas reportados:
- La página `/host/messages` muestra al menos 2 hilos (ej: "Cleaner1", preview "Prueba3", "Hola", badge "Pendiente", fechas "8 ene", "11 ene")
- En Prisma Studio, las tablas `ChatThread`, `ChatParticipant`, `ChatMessage` están vacías (0 rows)
- El problema aparece en distintos navegadores (no es cache del navegador específico)

### Comportamiento esperado:
- Si las tablas están vacías, la página debería mostrar "No tienes mensajes aún"

---

## 2. Hipótesis principales (ordenadas por probabilidad)

### 🎯 **Hipótesis 1: Cache offline (IndexedDB) persistiendo threads antiguos** (ALTA PROBABILIDAD)
**Evidencia encontrada:**
- El componente `MessagesInboxClient` carga threads desde IndexedDB al montar
- Si el cache tiene datos previos, los muestra aunque la DB esté vacía
- El cache se guarda automáticamente cuando hay threads del servidor

**Probabilidad:** 95%

### Hipótesis 2: App y Prisma Studio apuntan a bases de datos diferentes (MEDIA PROBABILIDAD)
**Evidencia encontrada:**
- La app usa `process.env.DATABASE_URL` desde `.env` o `.env.local`
- Prisma Studio puede usar una URL diferente si se ejecuta con `--schema` o variables de entorno distintas
- No se encontraron archivos `.env` en el repo (normal, están en `.gitignore`)

**Probabilidad:** 30%

### Hipótesis 3: Datos mock/hardcoded en el frontend (BAJA PROBABILIDAD)
**Evidencia encontrada:**
- No se encontraron strings "Cleaner1", "Prueba3", "Hola" hardcoded en el código
- No hay componentes de mock data para threads
- El componente `MessagesInboxClient` no tiene fallback con datos de ejemplo

**Probabilidad:** 5%

---

## 3. Evidencia encontrada en repo

### 3.1 Flujo de carga de threads

**Archivo:** `app/host/messages/page.tsx`
```typescript
export default async function HostMessagesPage() {
  const user = await requireHostUser();
  const threads = await listThreadsForUser(user.id);
  return <MessagesInboxClient initialThreads={threads} basePath="/host/messages" viewerUserId={user.id} />;
}
```

**Archivo:** `lib/chat/auth.ts` (líneas 84-172)
```typescript
export async function listThreadsForUser(viewerUserId: string) {
  const participantRecords = await prisma.chatParticipant.findMany({
    where: {
      userId: viewerUserId,
      leftAt: null,
    },
    select: { threadId: true },
  });

  const threadIds = participantRecords.map((p) => p.threadId);

  if (threadIds.length === 0) {
    return []; // ✅ Retorna array vacío si no hay participantes
  }

  const threads = await prisma.chatThread.findMany({
    where: { id: { in: threadIds } },
    // ... includes ...
  });

  return threads.map((thread) => ({
    ...thread,
    lastMessageAt: thread.lastMessageAt?.toISOString() || null,
    status: thread.status as string,
  }));
}
```

**Conclusión:** La función del servidor retorna `[]` si la DB está vacía. ✅ Correcto.

### 3.2 Componente cliente con cache offline

**Archivo:** `components/chat/MessagesInboxClient.tsx` (líneas 49-74)

**PROBLEMA ENCONTRADO:**

```typescript
export function MessagesInboxClient({
  initialThreads,  // ← Viene del servidor (vacío si DB está vacía)
  basePath,
  viewerUserId,
}: MessagesInboxClientProps) {
  const [threads, setThreads] = useState<Thread[]>(initialThreads);
  
  // ⚠️ CARGAR CACHE AL MONTAR
  useEffect(() => {
    const loadCache = async () => {
      try {
        const cached = await getCachedThreads(); // ← IndexedDB
        if (cached.length > 0) {
          const cachedThreads = cached.map((c) => c.snapshot);
          setThreads(cachedThreads); // ← SOBRESCRIBE initialThreads
        }
      } catch (error) {
        console.error("Error cargando cache:", error);
      }
    };

    loadCache();
  }, []);
```

**Análisis:**
1. El componente recibe `initialThreads` vacío del servidor (correcto)
2. **PERO** al montar, carga threads desde IndexedDB (`getCachedThreads()`)
3. Si el cache tiene threads guardados previamente, los muestra aunque la DB esté vacía
4. El cache se guarda automáticamente cuando hay threads del servidor (línea 90: `await saveThreads(newThreads)`)

### 3.3 Sistema de cache offline

**Archivo:** `lib/offline/chatCache.ts`

**Función `getCachedThreads()` (líneas 31-44):**
```typescript
export async function getCachedThreads(): Promise<ChatThread[]> {
  const db = await openChatDB(); // ← IndexedDB "hausdame_chat_v1"
  const tx = db.transaction("threads", "readonly");
  const index = tx.store.index("lastMessageAt");
  const threads = await index.getAll();
  await tx.done;
  return threads.sort((a, b) => {
    const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return timeB - timeA;
  });
}
```

**Función `saveThreads()` (líneas 9-26):**
```typescript
export async function saveThreads(threads: any[]): Promise<void> {
  const db = await openChatDB();
  const tx = db.transaction("threads", "readwrite");
  for (const thread of threads) {
    await tx.store.put({
      threadId: thread.id,
      tenantId: thread.tenantId || "",
      propertyId: thread.propertyId,
      status: thread.status,
      lastMessageAt: thread.lastMessageAt,
      updatedAt: new Date().toISOString(),
      snapshot: thread, // ← Guarda DTO completo
    });
  }
  await tx.done;
}
```

**Conclusión:** El cache persiste threads en IndexedDB (`hausdame_chat_v1`) y los carga al montar el componente, incluso si la DB está vacía.

### 3.4 Búsqueda de datos mock/hardcoded

**Comandos ejecutados:**
```bash
rg -n "Cleaner1|Prueba3|Ubicación y comodidad|Único Cómodo|Pendiente" app lib
# Resultado: No matches found

rg -n "mock|dummy|sample|placeholder" app lib -i
# Resultado: Solo placeholders de inputs, no datos mock de threads
```

**Conclusión:** No hay datos mock/hardcoded para threads. ✅

### 3.5 Verificación de configuración de DB

**Archivo:** `lib/prisma.ts`
```typescript
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL no está definida. Por favor, verifica tu archivo .env');
}

if (process.env.NODE_ENV === 'development') {
  console.log('DATABASE_URL encontrada:', connectionString.substring(0, 30) + '...');
}
```

**Archivo:** `prisma/schema.prisma`
```prisma
datasource db {
  provider = "postgresql"
}
```

**Conclusión:** La app usa `DATABASE_URL` de variables de entorno. No se encontraron diferencias explícitas entre app y Prisma Studio, pero **no se puede confirmar sin acceso a `.env`**.

---

## 4. Evidencia de runtime/config

### 4.1 Variables de entorno

**No se encontraron archivos `.env` o `.env.local` en el repo** (normal, están en `.gitignore`)

**Para verificar:**
- Comparar `DATABASE_URL` usado por la app vs Prisma Studio
- Verificar si hay `DIRECT_URL` o configuración de shadow DB

### 4.2 IndexedDB

**Nombre de la base de datos:** `hausdame_chat_v1`  
**Versión:** 1  
**Stores:**
- `threads` (key: `threadId`)
- `messages` (key: `id`)
- `outbox` (key: `clientMessageId`)
- `meta` (key: string)

**Cómo verificar en el navegador:**
1. Abrir DevTools → Application → IndexedDB → `hausdame_chat_v1` → `threads`
2. Verificar si hay registros guardados

---

## 5. Conclusión: causa más probable

### 🎯 **Causa raíz más probable: Cache offline (IndexedDB)**

**Explicación:**
1. El componente `MessagesInboxClient` carga threads desde IndexedDB al montar (líneas 59-74)
2. Si el usuario visitó la página anteriormente cuando había threads en la DB, esos threads se guardaron en IndexedDB
3. Cuando la DB se vacía (o se limpia), el cache local sigue teniendo los threads antiguos
4. El componente muestra los threads del cache aunque `initialThreads` del servidor esté vacío

**Flujo del bug:**
```
1. Usuario visita /host/messages cuando hay threads en DB
   → Servidor retorna threads
   → Componente guarda threads en IndexedDB (saveThreads)

2. DB se vacía (manual o por migración/reset)

3. Usuario visita /host/messages nuevamente
   → Servidor retorna [] (correcto)
   → Componente recibe initialThreads = []
   → PERO useEffect carga threads desde IndexedDB
   → Muestra threads antiguos del cache
```

### Causas alternativas

**Causa alternativa 1: App y Prisma Studio apuntan a DBs diferentes (30%)**
- Si la app usa `DATABASE_URL` de `.env.local` y Prisma Studio usa otra URL, verían datos diferentes
- **Prueba rápida:** Comparar `DATABASE_URL` en runtime de la app vs Prisma Studio

**Causa alternativa 2: Cache de Next.js (5%)**
- Si hay `revalidate` o `cache` configurado incorrectamente, podría servir datos antiguos
- **Evidencia:** No se encontró configuración de cache explícita en la página de mensajes

**Causa alternativa 3: Datos en otra tabla relacionada (5%)**
- Si los threads se están generando desde otra fuente (Applications, Invites) y no desde ChatThread
- **Evidencia:** La función `listThreadsForUser` solo consulta `ChatParticipant` y `ChatThread`, no otras tablas

---

## 6. Lista de pruebas rápidas (sin cambios)

### Prueba 1: Verificar IndexedDB en el navegador
**Comando:**
1. Abrir DevTools → Application → IndexedDB
2. Buscar `hausdame_chat_v1` → `threads`
3. Verificar si hay registros

**Resultado esperado si es el bug:**
- Debería haber registros en `threads` con `threadId`, `snapshot`, etc.
- Los `snapshot` deberían contener los datos de los threads visibles

### Prueba 2: Limpiar IndexedDB y recargar
**Comando:**
1. DevTools → Application → IndexedDB → `hausdame_chat_v1` → Delete database
2. Recargar `/host/messages`

**Resultado esperado si es el bug:**
- Después de limpiar IndexedDB, la página debería mostrar "No tienes mensajes aún"

### Prueba 3: Comparar DATABASE_URL
**Comando:**
```bash
# En la app (runtime)
console.log(process.env.DATABASE_URL?.substring(0, 50))

# En Prisma Studio
# Verificar qué URL usa Prisma Studio (puede estar en .env o config)
```

**Resultado esperado:**
- Deberían ser idénticas (mismo host, mismo database name)

### Prueba 4: Verificar logs del servidor
**Comando:**
- Revisar logs de `listThreadsForUser` cuando se carga `/host/messages`
- Verificar si retorna `[]` o tiene threads

**Resultado esperado si es el bug:**
- El servidor debería retornar `[]` (correcto)
- Pero el cliente muestra threads del cache

### Prueba 5: Verificar flujo completo
**Comando:**
1. Abrir Network tab en DevTools
2. Cargar `/host/messages`
3. Verificar llamada a `/api/chat/threads` (si existe)
4. Verificar respuesta del servidor

**Resultado esperado:**
- Si hay llamada a `/api/chat/threads`, debería retornar `{ threads: [] }`
- Pero el componente muestra threads del cache local

---

## 7. Archivos clave involucrados

1. `components/chat/MessagesInboxClient.tsx` (líneas 59-74) - Carga cache al montar
2. `lib/offline/chatCache.ts` - Funciones de cache (getCachedThreads, saveThreads)
3. `lib/offline/db.ts` - Configuración de IndexedDB
4. `app/host/messages/page.tsx` - Página servidor que pasa initialThreads
5. `lib/chat/auth.ts` - Función `listThreadsForUser` (correcta, retorna [] si DB vacía)

---

## 8. Recomendaciones (sin implementar)

### Solución propuesta (para futuro fix):
1. **Priorizar datos del servidor sobre cache:**
   - Solo usar cache si `initialThreads` está vacío Y estamos offline
   - Si estamos online y el servidor retorna `[]`, limpiar el cache

2. **Agregar validación de timestamp:**
   - Comparar `updatedAt` del cache vs `updatedAt` del servidor
   - Si el servidor tiene datos más recientes, usar servidor

3. **Agregar opción de "limpiar cache":**
   - Permitir al usuario limpiar el cache manualmente si ve datos inconsistentes

---

**Fin del diagnóstico**

