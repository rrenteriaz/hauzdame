-- Agregar @updatedAt a TeamMembership.updatedAt
-- Esto permite que Prisma gestione automáticamente el campo updatedAt

-- En PostgreSQL, @updatedAt se maneja en el cliente de Prisma, no requiere cambios en la base de datos.
-- Sin embargo, si la columna updatedAt no tiene un valor por defecto y hay registros existentes,
-- necesitamos asegurar que todos tengan un valor inicial.

-- Actualizar registros existentes que puedan tener updatedAt NULL (aunque no debería pasar)
UPDATE "TeamMembership"
SET "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP)
WHERE "updatedAt" IS NULL;

-- Nota: @updatedAt es un decorador de Prisma que se maneja en el cliente.
-- No requiere cambios en el schema de la base de datos, pero esta migración
-- asegura que los registros existentes tengan un valor válido para updatedAt.

