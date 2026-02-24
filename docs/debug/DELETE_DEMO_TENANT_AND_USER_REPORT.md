# Reporte de Eliminación: Demo Tenant y Usuario

**Fecha:** 2026-01-26T23:15:42.633Z  
**Modo:** APPLY (Borrado ejecutado)  
**Force:** Sí

---

## 📋 Datos Objetivo

### Usuario
- **ID:** `cmkrezj830001boo75u6nflgz`
- **Email:** `cleaner2@hausdame.test`
- **Role:** `CLEANER`
- **Tenant ID:** `cmkreziw50000boo7oi3t9cuc`
- **Created At:** `2026-01-23T21:50:16.083Z`
- **Es Demo:** ✅ Sí

### Tenant
- **ID:** `cmkreziw50000boo7oi3t9cuc`
- **Name:** `Hausdame Demo`
- **Slug:** `hausdame-demo`
- **Created At:** `2026-01-23T21:50:15.652Z`
- **Es Demo:** ✅ Sí

### Coherencia
- **user.tenantId === TENANT_ID:** ✅ Sí


---

## 📊 Referencias Encontradas

### Referencias CRÍTICAS (Bloquean borrado)

✅ **Ninguna referencia crítica encontrada.**

### Referencias NO CRÍTICAS

- **user**: 1 (Users en tenant)
- **team**: 1 (Teams en tenant)
- **teamMembership**: 1 (TeamMemberships en tenant)
- **workGroupExecutor**: 1 (WorkGroupExecutors (services))
- **teamMembership**: 1 (TeamMemberships del usuario)
- **cleanerProfile**: 1 (CleanerProfile del usuario)

---

## 📋 Tabla Completa de Referencias

| Model | Filter | Count | Notes | Critical |
|-------|--------|-------|-------|----------|
| user | {"tenantId":"cmkreziw50000boo7oi3t9cuc"} | 1 | Users en tenant | No |
| team | {"tenantId":"cmkreziw50000boo7oi3t9cuc"} | 1 | Teams en tenant | No |
| teamMember | {"tenantId":"cmkreziw50000boo7oi3t9cuc"} | 0 | TeamMembers en tenant | No |
| teamMembership | {"teamId":{"in":["cmkrezy8j00011oo7b3zoiizo"]}} | 1 | TeamMemberships en tenant | No |
| property | {"tenantId":"cmkreziw50000boo7oi3t9cuc"} | 0 | Properties en tenant | ⚠️ Sí |
| reservation | {"tenantId":"cmkreziw50000boo7oi3t9cuc"} | 0 | Reservations en tenant | ⚠️ Sí |
| cleaning | {"tenantId":"cmkreziw50000boo7oi3t9cuc"} | 0 | Cleanings en tenant | ⚠️ Sí |
| hostWorkGroup | {"tenantId":"cmkreziw50000boo7oi3t9cuc"} | 0 | HostWorkGroups en tenant | No |
| hostWorkGroupProperty | {"tenantId":"cmkreziw50000boo7oi3t9cuc"} | 0 | HostWorkGroupProperties en tenant | No |
| workGroupExecutor | {"hostTenantId":"cmkreziw50000boo7oi3t9cuc"} | 0 | WorkGroupExecutors (host) | No |
| workGroupExecutor | {"servicesTenantId":"cmkreziw50000boo7oi3t9cuc"} | 1 | WorkGroupExecutors (services) | No |
| hostWorkGroupInvite | {"tenantId":"cmkreziw50000boo7oi3t9cuc"} | 0 | HostWorkGroupInvites en tenant | No |
| chatThread | {"tenantId":"cmkreziw50000boo7oi3t9cuc"} | 0 | ChatThreads en tenant | ⚠️ Sí |
| chatMessage | {"tenantId":"cmkreziw50000boo7oi3t9cuc"} | 0 | ChatMessages en tenant | ⚠️ Sí |
| chatParticipant | threadId in [] | 0 | ChatParticipants en tenant (no threads) | No |
| propertyInvite | {"tenantId":"cmkreziw50000boo7oi3t9cuc"} | 0 | PropertyInvites en tenant | No |
| propertyApplication | {"tenantId":"cmkreziw50000boo7oi3t9cuc"} | 0 | PropertyApplications en tenant | No |
| propertyOpening | {"tenantId":"cmkreziw50000boo7oi3t9cuc"} | 0 | PropertyOpenings en tenant | No |
| asset | {"tenantId":"cmkreziw50000boo7oi3t9cuc"} | 0 | Assets en tenant | No |
| cleaningMedia | {"tenantId":"cmkreziw50000boo7oi3t9cuc"} | 0 | CleaningMedia en tenant | No |
| cleaningAssignee | {"tenantId":"cmkreziw50000boo7oi3t9cuc"} | 0 | CleaningAssignees en tenant | No |
| cleaningView | {"tenantId":"cmkreziw50000boo7oi3t9cuc"} | 0 | CleaningViews en tenant | No |
| inventoryItem | {"tenantId":"cmkreziw50000boo7oi3t9cuc"} | 0 | InventoryItems en tenant | No |
| inventoryLine | {"tenantId":"cmkreziw50000boo7oi3t9cuc"} | 0 | InventoryLines en tenant | No |
| inventoryReview | {"tenantId":"cmkreziw50000boo7oi3t9cuc"} | 0 | InventoryReviews en tenant | No |
| inventoryReport | {"tenantId":"cmkreziw50000boo7oi3t9cuc"} | 0 | InventoryReports en tenant | No |
| lock | {"tenantId":"cmkreziw50000boo7oi3t9cuc"} | 0 | Locks en tenant | No |
| lockCode | {"tenantId":"cmkreziw50000boo7oi3t9cuc"} | 0 | LockCodes en tenant | No |
| metricEvent | {"tenantId":"cmkreziw50000boo7oi3t9cuc"} | 0 | MetricEvents en tenant | No |
| teamMembership | {"userId":"cmkrezj830001boo75u6nflgz"} | 1 | TeamMemberships del usuario | No |
| cleaning | {"assignedToId":"cmkrezj830001boo75u6nflgz"} | 0 | Cleanings asignadas al usuario | ⚠️ Sí |
| cleaning | {"assignedMemberId":"cmkrezj830001boo75u6nflgz"} | 0 | Cleanings asignadas (memberId) | ⚠️ Sí |
| chatParticipant | {"userId":"cmkrezj830001boo75u6nflgz"} | 0 | ChatParticipants del usuario | No |
| chatMessage | {"senderUserId":"cmkrezj830001boo75u6nflgz"} | 0 | ChatMessages del usuario | ⚠️ Sí |
| property | {"userId":"cmkrezj830001boo75u6nflgz"} | 0 | Properties del usuario | ⚠️ Sí |
| propertyAdmin | {"userId":"cmkrezj830001boo75u6nflgz"} | 0 | PropertyAdmins del usuario | No |
| propertyCleaner | {"userId":"cmkrezj830001boo75u6nflgz"} | 0 | PropertyCleaners del usuario | No |
| propertyHandyman | {"userId":"cmkrezj830001boo75u6nflgz"} | 0 | PropertyHandymen del usuario | No |
| propertyInvite | {"createdByUserId":"cmkrezj830001boo75u6nflgz"} | 0 | PropertyInvites creadas por usuario | No |
| propertyInvite | {"claimedByUserId":"cmkrezj830001boo75u6nflgz"} | 0 | PropertyInvites reclamadas por usuario | No |
| propertyApplication | {"applicantUserId":"cmkrezj830001boo75u6nflgz"} | 0 | PropertyApplications del usuario | No |
| propertyOpening | {"createdByUserId":"cmkrezj830001boo75u6nflgz"} | 0 | PropertyOpenings creadas por usuario | No |
| hostWorkGroupInvite | {"createdByUserId":"cmkrezj830001boo75u6nflgz"} | 0 | HostWorkGroupInvites creadas por usuario | No |
| hostWorkGroupInvite | {"claimedByUserId":"cmkrezj830001boo75u6nflgz"} | 0 | HostWorkGroupInvites reclamadas por usuario | No |
| teamInvite | {"createdByUserId":"cmkrezj830001boo75u6nflgz"} | 0 | TeamInvites creadas por usuario | No |
| teamInvite | {"claimedByUserId":"cmkrezj830001boo75u6nflgz"} | 0 | TeamInvites reclamadas por usuario | No |
| team | {"inactivatedByUserId":"cmkrezj830001boo75u6nflgz" | 0 | Teams inactivados por usuario | No |
| teamMember | {"userId":"cmkrezj830001boo75u6nflgz"} | 0 | TeamMembers del usuario | No |
| cleanerProfile | {"userId":"cmkrezj830001boo75u6nflgz"} | 1 | CleanerProfile del usuario | No |
| cleanerReview | {"cleanerUserId":"cmkrezj830001boo75u6nflgz"} | 0 | CleanerReviews (como cleaner) | No |
| cleanerReview | {"reviewerUserId":"cmkrezj830001boo75u6nflgz"} | 0 | CleanerReviews (como reviewer) | No |
| inventoryReview | {"reviewedByUserId":"cmkrezj830001boo75u6nflgz"} | 0 | InventoryReviews revisadas por usuario | No |
| inventoryReport | {"createdByUserId":"cmkrezj830001boo75u6nflgz"} | 0 | InventoryReports creadas por usuario | No |
| inventoryReport | {"resolvedByUserId":"cmkrezj830001boo75u6nflgz"} | 0 | InventoryReports resueltas por usuario | No |
| asset | {"createdByUserId":"cmkrezj830001boo75u6nflgz"} | 0 | Assets creados por usuario | No |
| cleaningVerificationDocument | {"reviewedByUserId":"cmkrezj830001boo75u6nflgz"} | N/A | N/A (Cannot read properties of undefined (reading 'count')) | No |

---

## ✅ Decisión Final

**Estado:** ✅ **SAFE TO DELETE**

### ✅ Borrado Ejecutado

El borrado se ejecutó exitosamente en modo APPLY.

---

## ⚠️ Advertencias





---

**Generado por:** `scripts/debug/delete-demo-tenant-and-user.ts`  
**Database:** ep-green-base-a4mtrkyj.us-east-1.aws.neon.tech / neondb
