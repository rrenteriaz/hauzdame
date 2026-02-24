-- Normalizar nombres duplicados de equipos por tenant antes de crear el constraint único
-- Para cada grupo de equipos con el mismo tenantId+name, renombrar los duplicados:
--   - El primero (por createdAt asc) mantiene el nombre original
--   - Los demás se renombran: name -> `${name} (2)`, `${name} (3)`, etc.

DO $$
DECLARE
  duplicate_group RECORD;
  team_record RECORD;
  counter INTEGER;
  new_name TEXT;
  base_name TEXT;
  current_tenant_id TEXT;
  current_name TEXT;
BEGIN
  -- Iterar sobre cada grupo de duplicados (tenantId, name)
  FOR duplicate_group IN
    SELECT 
      "tenantId",
      "name",
      COUNT(*) as duplicate_count
    FROM "Team"
    GROUP BY "tenantId", "name"
    HAVING COUNT(*) > 1
    ORDER BY "tenantId", "name"
  LOOP
    current_tenant_id := duplicate_group."tenantId";
    current_name := duplicate_group."name";
    counter := 2;
    
    -- Para cada equipo duplicado (excepto el primero, ordenado por createdAt asc)
    FOR team_record IN
      SELECT 
        id,
        "tenantId",
        "name",
        "createdAt"
      FROM "Team"
      WHERE "tenantId" = current_tenant_id
        AND "name" = current_name
      ORDER BY "createdAt" ASC
      OFFSET 1  -- Saltar el primero (mantiene el nombre original)
    LOOP
      base_name := team_record."name";
      counter := 2;
      
      -- Generar nuevo nombre: `${name} (2)`, `${name} (3)`, etc.
      -- Verificar que el nuevo nombre no exista ya (por si acaso)
      LOOP
        new_name := base_name || ' (' || counter::TEXT || ')';
        
        -- Verificar si el nuevo nombre ya existe para este tenant
        IF NOT EXISTS (
          SELECT 1 FROM "Team"
          WHERE "tenantId" = current_tenant_id
            AND "name" = new_name
        ) THEN
          -- Renombrar el equipo
          UPDATE "Team"
          SET "name" = new_name,
              "updatedAt" = CURRENT_TIMESTAMP
          WHERE id = team_record.id;
          
          EXIT; -- Salir del loop interno cuando encontramos un nombre disponible
        END IF;
        
        counter := counter + 1;
        
        -- Protección contra loop infinito (máximo 1000 intentos)
        IF counter > 1000 THEN
          RAISE EXCEPTION 'No se pudo generar un nombre único después de 1000 intentos para equipo %', team_record.id;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- Crear el constraint único después de normalizar duplicados
CREATE UNIQUE INDEX IF NOT EXISTS "Team_tenantId_name_key" ON "Team"("tenantId", "name");

