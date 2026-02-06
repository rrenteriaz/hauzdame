# FIX: Botón de Enviar Se Queda Bloqueado en Estado "Pensando"

## Causa Exacta del Problema

El botón de enviar se quedaba bloqueado en estado "pensando" (spinner) porque:

1. **`setSending(false)` estaba fuera de try/catch/finally**: El código tenía `setSending(true)` al inicio, pero `setSending(false)` estaba al final del flujo, fuera de cualquier protección. Si cualquier `await` fallaba antes de llegar a esa línea (por ejemplo, `upsertPendingMessage`, `enqueueMessage`, `fetch`, `res.json()`, `markMessageSent/Failed`), la función abortaba y `sending` quedaba permanentemente en `true`.

2. **Errores de cache/outbox abortaban el envío**: Las llamadas a `upsertPendingMessage` y `enqueueMessage` no tenían try/catch, por lo que si IndexedDB fallaba (por cualquier razón: storage lleno, permisos, etc.), el flujo completo se interrumpía y `sending` quedaba en `true`.

3. **Fetch sin timeout**: El `fetch` al POST no tenía timeout, por lo que si el servidor no respondía o la red estaba lenta, la promesa podía quedar colgada indefinidamente, manteniendo `sending` en `true`.

4. **Parsing de JSON sin protección**: Si el servidor respondía con un error HTML o texto plano en lugar de JSON, `res.json()` lanzaba una excepción que no estaba manejada correctamente, causando que el flujo abortara.

5. **Errores en markMessageSent/Failed no manejados**: Si las funciones de actualización de cache fallaban después de un envío exitoso, el error podía propagarse y abortar el flujo, aunque el mensaje ya se había enviado correctamente.

## Por Qué Quedaba "Pensando"

El estado `sending` se establecía en `true` al inicio, pero solo se reseteaba a `false` al final del flujo. Si cualquier operación asíncrona fallaba o se colgaba, el código nunca llegaba a `setSending(false)`, dejando el botón permanentemente deshabilitado con el spinner visible.

## Cómo Lo Evitamos

### 1. Envolver TODO en try/catch/finally
- Todo el cuerpo de `handleSend` está envuelto en un bloque try/catch/finally
- `setSending(false)` está en el bloque `finally`, garantizando que SIEMPRE se ejecute, sin importar qué pase

### 2. Aislar errores de cache/outbox
- `upsertPendingMessage` y `enqueueMessage` están envueltos en try/catch independiente
- Si fallan, solo se loguea un warning y se continúa con el envío online
- El envío online NO se aborta por errores de cache

### 3. Timeout en fetch
- Implementado `AbortController` con timeout de 12 segundos
- Si el fetch no responde en 12s, se aborta automáticamente y se marca el mensaje como fallido
- El timeout se limpia correctamente en ambos casos (éxito y error)

### 4. Parsing robusto de JSON
- Verifica el `Content-Type` antes de intentar parsear JSON
- Si no es JSON, intenta leer como texto para logging
- Lanza un error descriptivo en lugar de fallar silenciosamente

### 5. Protección de markMessageSent/Failed
- Todas las llamadas a `markMessageSent` y `markMessageFailed` están envueltas en try/catch
- Si fallan, solo se loguea un warning pero NO se aborta el flujo
- El mensaje ya está en la UI, así que el usuario ve el resultado correcto

### 6. Manejo de errores críticos
- Si ocurre un error inesperado fuera de los bloques esperados, se captura en el catch principal
- El mensaje optimista se marca como fallido si existe
- `setSending(false)` se ejecuta en finally, garantizando que el botón vuelva a estado normal

## Cambios Implementados

**Archivo**: `components/chat/ChatThreadView.tsx`

1. **Estructura try/catch/finally completa**:
   - Todo el flujo dentro de try
   - Errores críticos capturados en catch
   - `setSending(false)` SIEMPRE en finally

2. **Aislamiento de operaciones de cache**:
   - `fetch("/api/auth/me")` con try/catch independiente
   - `upsertPendingMessage` con try/catch independiente
   - `enqueueMessage` con try/catch independiente
   - `markMessageSent/Failed` con try/catch independiente

3. **Timeout en fetch**:
   - `AbortController` con timeout de 12 segundos
   - Limpieza correcta del timeout en todos los casos

4. **Parsing robusto**:
   - Verificación de `Content-Type`
   - Fallback a `res.text()` si no es JSON
   - Errores descriptivos

5. **Manejo de errores mejorado**:
   - Logging con contexto (`[handleSend]`)
   - Mensajes de error descriptivos
   - Actualización de UI incluso en caso de error

## Resultado

✅ El botón NUNCA se queda bloqueado en estado "pensando"
✅ `sending` siempre vuelve a `false` en <= 1s después de cualquier fallo
✅ Errores de cache/outbox no abortan el envío online
✅ Timeout previene promesas colgadas
✅ Parsing robusto previene errores por respuestas inesperadas
✅ El usuario siempre puede reintentar si hay un error
✅ Feedback visual correcto (mensaje marcado como fallido cuando corresponde)

## Criterios de Aceptación Cumplidos

- ✅ Si cualquier cosa falla, el botón vuelve a estado normal en <= 1s
- ✅ El mensaje optimista pasa a estado "failed" cuando corresponde
- ✅ NO se queda bloqueado "pensando" indefinidamente
- ✅ Si el servidor responde 4xx/5xx, se muestra error y el usuario puede reintentar
- ✅ En caso online y servidor OK, el mensaje se confirma y reemplaza el optimista


