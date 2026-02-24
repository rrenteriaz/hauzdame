// lib/storage/index.ts
/**
 * Punto de entrada para storage providers
 * 
 * Para cambiar de Supabase a AWS en el futuro:
 * 1. Implementar AwsS3StorageProvider que implemente StorageProvider
 * 2. Cambiar la exportación default aquí
 * 3. Actualizar variables de entorno
 * 
 * La UI y lógica de negocio no requieren cambios.
 */

import { SupabaseStorageProvider } from "./supabaseStorage";
import type { StorageProvider } from "./types";

// Por ahora, usar Supabase
// Para cambiar a AWS: import { AwsS3StorageProvider } from "./awsS3Storage";
const provider: StorageProvider = new SupabaseStorageProvider();

export default provider;

// Exportar tipos para uso externo
export type { StorageProvider, PutPublicObjectParams, PutPublicObjectResult, DeleteObjectParams } from "./types";

