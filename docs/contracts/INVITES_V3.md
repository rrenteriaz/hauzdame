# HAUSDAME — INVITES CONTRACT (TEAM + JOIN)

Este documento es la **única fuente de verdad** para:
- Invitaciones de equipo (Team scope: TL/Host).
- Pantalla pública de invitación (/join).

---

## 1) Entidad `TeamInvite` (campos relevantes)

- `id`
- `teamId`
- `token`
- `status` (`PENDING` | `CLAIMED` | `REVOKED`)
- `prefillName` (string | null)
- `message` (string | null) *(se genera en backend; UI puede mostrarlo read-only)*
- `createdAt`
- `expiresAt`
- `claimedAt` (Date | null)

> Nota: `EXPIRED` puede ser **estado efectivo** por fecha, aunque en DB siga como `PENDING` (lazy-expire).

---

## 2) Reglas de estado (estado efectivo)

### 2.1 Estados
- **PENDING**: utilizable hasta `expiresAt`.
- **EXPIRED** (efectivo): cuando `status === PENDING` y `expiresAt < now`.
- **REVOKED**: no utilizable.
- **CLAIMED**: ya aceptada.

### 2.2 Regla obligatoria de expiración (frontend/listados)
El frontend puede recalcular expiración para mostrar consistencia visual:

Si `status === PENDING` y `expiresAt < now` → status efectivo = `EXPIRED`.

Esto evita inconsistencias UI si la DB aún no cambió `status`.

---

## 3) Fuente de verdad (anti-inferencia)

### 3.1 `/join` (público)
El backend `GET /api/invites/[token]` es la **única fuente de verdad** para:
- `inviterName`
- `teamDisplayName`
- `status`
- `expiresAt`
- `message`

El frontend **consume**, NO deduce.

**Prohibido**:
- Inferir nombres desde strings (ej. parsear `message`)
- Cambiar permisos
- Alterar flujos de claim
- Mostrar acciones administrativas en /join

---

## 4) Endpoints — Team Scope (TL/Host)

### 4.1 GET `/api/teams/:teamId/invites`
- Retorna lista con:
  - `inviteLink`
  - `prefillName` (para label “Invitado: X”)
  - `status efectivo` (lazy-expire en UI/listado)
- Permisos:
  - Host del mismo tenant
  - Cleaner `TEAM_LEADER` con membership `ACTIVE`

### 4.2 POST `/api/teams/:teamId/invites`
Payload:
```json
{ "prefillName": "string|null", "expiresInDays": 7 }
