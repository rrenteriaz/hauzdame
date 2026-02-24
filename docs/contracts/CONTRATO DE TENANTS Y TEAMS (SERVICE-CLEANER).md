HAUSDAME — CONTRATO DE PROVISIONING CLEANER / SERVICE
(LEY DEL SISTEMA)

VERSIÓN: 1.1
ESTADO: ACTIVO — OBLIGATORIO
ALCANCE: Creación, validez y limpieza de Teams y TeamMemberships
         para usuarios Cleaner (Service)

══════════════════════════════════════════════
0) PROPÓSITO
══════════════════════════════════════════════
Este contrato define las reglas FINALES y OBLIGATORIAS
para la creación (provisioning), existencia e idempotencia
de Teams y TeamMemberships de Cleaners (Service).

Cualquier Team o TeamMembership que viole este contrato
se considera CONTAMINACIÓN DE DATOS.

══════════════════════════════════════════════
1) TIPOS DE TENANT
══════════════════════════════════════════════
Existen dos categorías funcionales de tenants:

A) SERVICE (Orgánicos)
- Tenants creados automáticamente para Cleaners
- Ejemplo: services-kath, services-itzel
- Visibles y operativos para Cleaners (TL / SM)

B) NO-SERVICE (No orgánicos)
- Tenants de tipo:
  - HOST
  - OWNER
  - DEMO
  - TEST / MANUAL
- NO están destinados a operación de Cleaners

══════════════════════════════════════════════
2) REGLA CRÍTICA (INVARIANTE DEL SISTEMA)
══════════════════════════════════════════════
Un usuario Cleaner (TL o SM):

- SOLO puede tener TeamMembership ACTIVE
  en tenants de tipo SERVICE.

PROHIBIDO:
- Crear TeamMembership CLEANER o TEAM_LEADER
  en tenants NO-SERVICE.

Cualquier violación constituye contaminación
y debe limpiarse.

══════════════════════════════════════════════
3) PROVISIONING DE CLEANER (TEAM PROPIO)
══════════════════════════════════════════════
Al crear un usuario Cleaner en un tenant SERVICE:

Se debe crear EXACTAMENTE:
- 1 Team
- 1 TeamMembership:
  - role = TEAM_LEADER
  - status = ACTIVE

Reglas:
- El provisioning es IDEMPOTENTE.
- Si el Cleaner ya tiene un Team propio ACTIVE
  en ese tenant SERVICE:
  → NO se crea otro Team
  → NO se crea otra TeamMembership

══════════════════════════════════════════════
4) PROVISIONING POR INVITACIÓN (SM)
══════════════════════════════════════════════
Cuando un Cleaner acepta una invitación a un Team:

- Se crea UNA TeamMembership adicional:
  - role = CLEANER (SM)
  - status = ACTIVE
- El Team propio del invitado:
  - NO se modifica
  - NO se elimina
  - NO se fusiona

Reglas de seguridad (TeamInvite):
- Solo TL ACTIVE puede crear invitaciones
- Solo CLEANER puede reclamar invitaciones
- Solo aplica en tenants SERVICE
- Host/Owner/Admin NO pueden crear ni reclamar TeamInvite

══════════════════════════════════════════════
5) IDEMPOTENCIA (OBLIGATORIA)
══════════════════════════════════════════════
Toda lógica de provisioning debe cumplir:

- No crear Teams duplicados
- No crear múltiples TeamMembership ACTIVE
  con el mismo (userId, teamId)
- No crear Teams fuera de tenants SERVICE

La idempotencia es una regla de sistema,
NO una optimización.

══════════════════════════════════════════════
6) LIMPIEZA DE CONTAMINACIÓN
══════════════════════════════════════════════
Si existen TeamMembership ACTIVE de Cleaners
en tenants NO-SERVICE:

- Deben marcarse como REMOVED
- No deben eliminarse:
  - reservations
  - cleanings
  - properties

El script oficial de saneamiento es:
- cleanup-nonorganic-tenants.ts

══════════════════════════════════════════════
7) RELACIÓN CON OTROS CONTRATOS
══════════════════════════════════════════════
- Este contrato regula:
  - DÓNDE existen Teams
  - CUÁNDO se crean
  - CUÁNTOS pueden existir

- El contrato:
  TEAM_TL_CONTRACT.txt
  regula:
  - UI
  - Permisos
  - Comportamiento del detalle del Team

NO deben mezclarse responsabilidades.

══════════════════════════════════════════════
8) CHECKLIST OBLIGATORIO
══════════════════════════════════════════════
- [ ] Cleaner tiene solo 1 Team propio por tenant SERVICE
- [ ] No existen TeamMembership ACTIVE en tenants NO-SERVICE
- [ ] Provisioning es idempotente
- [ ] Invitaciones NO alteran Team propio
- [ ] Limpieza no afecta reservations ni properties
