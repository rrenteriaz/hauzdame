# Signup sin invitacion (modo pruebas)

Este flujo crea usuarios sin token de invitacion y permite elegir el ecosistema:
- Services (Cleaner)
- Host

## Tablas que se crean

### Ecosistema Services
- `User` con `role=CLEANER` y `tenantId` nuevo
- `Tenant` (nombre "Services - <nombre>" y `slug` unico)
- `Team` ("Mi equipo")
- `TeamMembership` (role=CLEANER, status=ACTIVE)
- `CleanerProfile` (con `fullName` si hay nombre)

### Ecosistema Host
- `User` con `role=OWNER` y `tenantId` nuevo
- `Tenant` (nombre "Host - <nombre>" y `slug` unico)

## Debug payload (solo development)

La respuesta de `POST /api/auth/signup` incluye:
```
{
  "debug": {
    "createdUserId": "...",
    "createdTenantId": "...",
    "createdTeamId": "...",
    "createdMembershipId": "...",
    "createdProfiles": {
      "cleanerProfileId": "..."
    }
  }
}
```

## Eventos (MetricEvent)

Se registran eventos por tenant:
- `USER_SIGNUP`
- `TENANT_BOOTSTRAP_CREATED`
- `TEAM_CREATED` (solo Services)

Payload incluye `ecosystem` e IDs relevantes.

## Verificacion rapida (script)

```
node scripts/inspectSignup.mjs --email usuario@ejemplo.com
```

Salida:
- `User` (id, role, tenantId)
- `Tenants` asociados
- `TeamMemberships` y sus teams

## Notas / guardrails

- El bootstrap de tenant es explicito en signup, no se crea en middleware/login.
- No se crean tenants demo. El nombre incluye el nombre o email del usuario.
- TODO: revisar politica de borrado de tenant vs user (no tocar migraciones aqui).

