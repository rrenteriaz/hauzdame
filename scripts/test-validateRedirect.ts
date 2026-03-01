/**
 * Pruebas manuales ejecutables para validateRedirect.
 * Ejecutar: npx tsx scripts/test-validateRedirect.ts
 */
import {
  validateRedirect,
  AUTH_REDIRECT_PREFIXES,
} from "../lib/auth/validateRedirect";

const cases: Array<{
  input: string | undefined | null;
  prefixes?: string[];
  expected: string | null;
  desc: string;
}> = [
  { input: "/host/properties", expected: "/host/properties", desc: "ruta host válida" },
  { input: "/host/cleanings?foo=bar", expected: "/host/cleanings?foo=bar", desc: "ruta con query" },
  { input: "/cleaner", expected: "/cleaner", desc: "ruta cleaner" },
  { input: "/join/xyz", expected: "/join/xyz", desc: "ruta join" },
  { input: undefined, expected: null, desc: "undefined" },
  { input: null, expected: null, desc: "null" },
  { input: "", expected: null, desc: "string vacío" },
  { input: "   ", expected: null, desc: "solo espacios" },
  { input: "https://evil.com", expected: null, desc: "URL https" },
  { input: "http://phishing.com", expected: null, desc: "URL http" },
  { input: "//evil.com", expected: null, desc: "protocol-relative" },
  { input: "/unknown/path", expected: null, desc: "prefijo no permitido" },
  { input: "/x", expected: null, desc: "ruta corta no en prefijos" },
  { input: " /host/properties ", expected: "/host/properties", desc: "trim" },
  {
    input: "%2Fhost%2Fproperties",
    expected: "/host/properties",
    desc: "encoded (decoded)",
  },
];

let passed = 0;
let failed = 0;

for (const c of cases) {
  const result = validateRedirect(c.input, [...AUTH_REDIRECT_PREFIXES]);
  const ok = result === c.expected;
  if (ok) {
    passed++;
    console.log(`✓ ${c.desc}`);
  } else {
    failed++;
    console.log(`✗ ${c.desc}: expected ${c.expected}, got ${result}`);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
