// lib/auth/password.ts
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hashea una contraseña en texto plano usando bcrypt
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Verifica si una contraseña en texto plano coincide con el hash almacenado
 */
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

