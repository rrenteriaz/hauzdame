# Casos de prueba: validación del parámetro redirect (P1)

Validación del parámetro `redirect` en `/api/auth/login` y `/api/auth/signup` para prevenir open redirects.

## Reglas de validación

- Solo acepta rutas internas (empiezan con `/`)
- Rechaza URLs absolutas (`http://`, `https://`)
- Rechaza URLs protocol-relative (`//evil.com`)
- Restringe a prefijos permitidos: `/host`, `/cleaner`, `/join`, `/login`, `/signup`, `/app`, `/handy`
- Si es inválido: usa default seguro (login: según rol; signup: según ecosystem)

## Casos manuales para login

| Caso | `redirect` | Resultado esperado |
|------|------------|--------------------|
| 1 | `"/host/properties"` | Redirige a `/host/properties` |
| 2 | `"/host/hoy"` | Redirige a `/host/hoy` |
| 3 | `"/host/cleanings?foo=bar"` | Redirige a `/host/cleanings?foo=bar` |
| 4 | `"/cleaner"` | Redirige a `/cleaner` |
| 5 | `"/join/xyz"` | Redirige a `/join/xyz` |
| 6 | `undefined` o ausente | Default: CLEANER → `/cleaner`, HOST → `/host/properties` |
| 7 | `"https://evil.com"` | Default seguro |
| 8 | `"//evil.com"` | Default seguro |
| 9 | `"http://phishing.com"` | Default seguro |
| 10 | `"/../../etc/passwd"` | Aceptado si cumple prefijo (path interno), o rechazado si no matchea — en la práctica `/../../etc/passwd` no empieza con prefijos permitidos |
| 11 | `"/unknown/path"` | Default seguro (no está en prefijos) |
| 12 | `""` | Default seguro |
| 13 | `"/host/properties"` (encoded: `%2Fhost%2Fproperties`) | Redirige a `/host/properties` |

## Casos manuales para signup

| Caso | `redirect` | `ecosystem` | Resultado esperado |
|------|------------|-------------|--------------------|
| 1 | `"/host/properties"` | host | Redirige a `/host/properties` |
| 2 | `"/cleaner"` | services | Redirige a `/cleaner` |
| 3 | `undefined` | host | Redirige a `/host/properties` |
| 4 | `undefined` | services | Redirige a `/cleaner` |
| 5 | `"https://evil.com"` | host | Redirige a `/host/properties` |
| 6 | `"//evil.com"` | services | Redirige a `/cleaner` |
| 7 | `"/unknown"` | host | Redirige a `/host/properties` |

## Cómo probar manualmente

### Login (POST /api/auth/login)

```bash
# Caso válido
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"tu@email.com","password":"xxx","redirect":"/host/cleanings"}'

# Caso inválido (URL externa) - debe devolver redirectTo=/host/properties o /cleaner según rol
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"tu@email.com","password":"xxx","redirect":"https://evil.com"}'
```

### Signup (POST /api/auth/signup)

```bash
# Caso válido
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"nuevo@test.com","password":"123456","name":"Test","ecosystem":"host","redirect":"/host/hoy"}'

# Caso inválido - debe devolver redirectTo=/host/properties o /cleaner según ecosystem
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"nuevo@test.com","password":"123456","name":"Test","ecosystem":"host","redirect":"//evil.com"}'
```

## Tests ejecutables

```bash
npx tsx scripts/test-validateRedirect.ts
```

## Frontend ignora redirectParam para navegar

**Importante:** El frontend NUNCA usa el valor del query param `redirect` para decidir la redirección tras login/signup. Solo confía en `data.redirectTo` devuelto por el API (ya validado en backend).

| Caso | URL | Comportamiento esperado |
|------|-----|-------------------------|
| 1 | `/login?redirect=https://evil.com` → login exitoso | Redirige a `data.redirectTo` (ej. `/host/properties`), NO a evil.com |
| 2 | `/signup?redirect=//evil.com` → signup exitoso | Redirige a `data.redirectTo` (ej. `/host/properties` o `/cleaner`) |
| 3 | `/login?redirect=/host/hoy` → login exitoso | API valida y devuelve `/host/hoy`; frontend usa `data.redirectTo` |
| 4 | Link "Crear cuenta" con `redirect=https://evil.com` | No se propaga; `safeRedirectParam` es null, el link va a `/signup` sin query |
| 5 | Link "Iniciar sesión" con `redirect=/join/xyz` | Se propaga solo si `validateRedirect` lo acepta; href incluye redirect |

Para los links entre login↔signup: se usa `validateRedirect(redirectParam)`; si es inválido no se incluye `redirect` en la URL del link.

## Implementación

- `lib/auth/validateRedirect.ts`: función `validateRedirect(input, allowedPrefixes?)`
- `app/api/auth/login/route.ts`: usa `validateRedirect(redirect, AUTH_REDIRECT_PREFIXES)`
- `app/api/auth/signup/route.ts`: usa `validateRedirect(redirect, AUTH_REDIRECT_PREFIXES)`
- El resultado de `claimInvite` también se valida antes de usarse como `redirectTo`
- **Frontend:** `app/login/LoginClient.tsx` y `app/signup/SignupClient.tsx` usan solo `data.redirectTo` para navegar; sanitizan `redirectParam` con `validateRedirect` antes de propagarlo en links
- **Cleaner:** `app/cleaner/cleanings/[id]/inventory/page.tsx` y `inventory-review/page.tsx` validan `returnTo` con `validateRedirect(input, ["/cleaner"])`
