-- Agregar default cuid() al campo id de TeamInvite
-- Esto permite que Prisma genere automáticamente el ID al crear invitaciones

-- En PostgreSQL, no podemos agregar un DEFAULT directamente a una columna que ya existe
-- sin valores. Sin embargo, como cuid() se genera en la aplicación (Prisma), 
-- no necesitamos cambiar el schema de la base de datos.
-- El cambio en schema.prisma (@default(cuid())) es suficiente para que Prisma
-- genere el ID automáticamente en futuras creaciones.

-- Esta migración está vacía porque:
-- 1. Los registros existentes ya tienen IDs asignados
-- 2. Prisma generará el ID automáticamente en el cliente antes de insertar
-- 3. No necesitamos cambiar el schema de la base de datos

-- Nota: Si hubiera registros sin ID, necesitaríamos un backfill, pero como
-- el campo es @id (NOT NULL), todos los registros existentes ya tienen ID.

-- Esta migración solo marca el cambio en el historial de migraciones.

