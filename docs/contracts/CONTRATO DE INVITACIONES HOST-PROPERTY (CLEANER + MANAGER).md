HAUSDAME — CONTRATO DE INVITACIONES HOST-PROPERTY
(LEY DEL SISTEMA)

VERSIÓN: 1.0
ESTADO: ACTIVO — OBLIGATORIO
ALCANCE: Invitaciones por propiedad en tenants HOST

══════════════════════════════════════════════
0) PROPÓSITO
══════════════════════════════════════════════
Define el flujo y reglas para invitar usuarios a operar
una propiedad en el mundo HOST, sin mezclarse con Services.

══════════════════════════════════════════════
1) ENTIDAD CANÓNICA
══════════════════════════════════════════════
Las invitaciones HOST se modelan como PropertyInvite,
independientes de TeamInvite.

══════════════════════════════════════════════
2) SCOPE DE INVITACIÓN
══════════════════════════════════════════════
- La invitación SIEMPRE pertenece a una propiedad (propertyId)
- El acceso resultante se expresa en PropertyMemberAccess
  usando userId (no teamMembershipId)

══════════════════════════════════════════════
3) ROLES DE ACCESO
══════════════════════════════════════════════
- PropertyAccessRole:
  - CLEANER
  - MANAGER

══════════════════════════════════════════════
4) ACEPTACIÓN (CLAIM)
══════════════════════════════════════════════
Al aceptar la invitación:

A) Si el invitado es CLEANER:
- Se asegura PropertyMemberAccess(userId, role=CLEANER)
- status = ACTIVE (reactivar si estaba REMOVED)

B) Si el invitado es HOST (OWNER/ADMIN/MANAGER):
- Se asegura PropertyMemberAccess(userId, role=MANAGER)
- status = ACTIVE (reactivar si estaba REMOVED)

══════════════════════════════════════════════
5) IDEMPOTENCIA
══════════════════════════════════════════════
- Repetir el claim NO duplica registros
- Si ya existe access REMOVED, se reactiva
- Si ya fue CLAIMED por el mismo usuario, es OK
- Si fue CLAIMED por otro usuario, 409

══════════════════════════════════════════════
6) SEGURIDAD
══════════════════════════════════════════════
- Este flujo NO toca TeamInvite ni TeamMembership
- Hosts no pueden crear ni reclamar TeamInvite
- Cleaners no pueden reclamar PropertyInvite con role=MANAGER

══════════════════════════════════════════════
7) CHECKLIST OBLIGATORIO
══════════════════════════════════════════════
- [ ] PropertyInvite es independiente de TeamInvite
- [ ] Claim idempotente (sin duplicados)
- [ ] Acceso por userId (no teamMembershipId)
- [ ] Revocados/expirados no se reclaman

