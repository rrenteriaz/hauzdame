// lib/storage/supabaseStorage.ts
/**
 * Implementación de StorageProvider usando Supabase Storage
 */

import { createClient } from "@supabase/supabase-js";
import type { StorageProvider, PutPublicObjectParams, PutPublicObjectResult, DeleteObjectParams } from "./types";

// Server-only: no usar NEXT_PUBLIC_ para credenciales sensibles
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("[SupabaseStorage] Missing environment variables. Upload functionality will not work.");
}

/**
 * Crea un cliente de Supabase con permisos de service role (si está disponible)
 * o anon key (para acceso público)
 */
function getSupabaseClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (server-only, do not use NEXT_PUBLIC_)");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export class SupabaseStorageProvider implements StorageProvider {
  async putPublicObject(params: PutPublicObjectParams): Promise<PutPublicObjectResult> {
    const { bucket, key, contentType, buffer } = params;
    const supabase = getSupabaseClient();

    // Subir archivo al bucket
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(key, buffer, {
        contentType,
        upsert: false, // No sobrescribir si existe
      });

    if (error) {
      throw new Error(`Failed to upload to Supabase: ${error.message}`);
    }

    // Obtener URL pública
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(key);

    if (!publicUrlData?.publicUrl) {
      throw new Error("Failed to get public URL from Supabase");
    }

    return {
      publicUrl: publicUrlData.publicUrl,
    };
  }

  async deleteObject(params: DeleteObjectParams): Promise<void> {
    const { bucket, key } = params;
    const supabase = getSupabaseClient();

    const { error } = await supabase.storage
      .from(bucket)
      .remove([key]);

    if (error) {
      // No lanzar error si el archivo no existe (idempotente)
      console.warn(`Failed to delete from Supabase (may not exist): ${error.message}`);
    }
  }
}

