// app/api/geocode/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Endpoint de geocoding opt-in usando Nominatim (OpenStreetMap).
 * 
 * IMPORTANTE:
 * - Rate limit defensivo: solo 1 request por llamada, sin auto-reintentos.
 * - User-Agent requerido por Nominatim (usar identificador de la app).
 * - Timeout razonable para evitar bloqueos.
 * - Best-effort: no garantiza resultados.
 */
/**
 * Normaliza una dirección para geocoding:
 * - Trim
 * - Remover número interior (patrones comunes: "Int. X", "Int X", "#X", etc.)
 */
function normalizeAddress(address: string): string {
  let normalized = address.trim();
  
  // Remover número interior (patrones comunes)
  normalized = normalized.replace(/\s*(?:Int\.?|Interior|#)\s*\d+/gi, "").trim();
  normalized = normalized.replace(/\s*,\s*Int\.?\s*\d*/gi, "").trim();
  
  return normalized;
}

/**
 * Simplifica una dirección removiendo código postal (últimos números al final)
 */
function simplifyAddress(address: string): string {
  // Remover código postal al final (patrones: "CP 12345", "12345", etc.)
  let simplified = address.replace(/\s*(?:CP|C\.P\.?|Código Postal)\s*\d{4,5}.*$/gi, "").trim();
  simplified = simplified.replace(/\s+\d{4,5}(?:\s|$)/g, " ").trim();
  
  return simplified;
}

/**
 * Selecciona el mejor resultado de geocoding cuando hay múltiples opciones.
 * Prefiere resultados más específicos (que contengan número de calle o tipos más precisos).
 */
function selectBestResult(results: any[]): any {
  if (results.length === 0) return null;
  if (results.length === 1) return results[0];

  // Heurística simple: preferir resultados que contengan número de calle en display_name
  // o que tengan tipos/clases más específicos (house, building, etc.)
  const addressLower = results[0].display_name?.toLowerCase() || "";
  const hasStreetNumber = /\d+/.test(addressLower);

  // Buscar resultado con número de calle si existe
  if (hasStreetNumber) {
    for (const result of results) {
      const displayName = (result.display_name || "").toLowerCase();
      const type = (result.type || "").toLowerCase();
      const classType = (result.class || "").toLowerCase();
      
      // Preferir house, building, residential sobre place, city, etc.
      if (classType === "place" && (type === "house" || type === "building" || type === "residential")) {
        return result;
      }
      // Si tiene número en display_name, es más específico
      if (/\d+/.test(displayName)) {
        return result;
      }
    }
  }

  // Si no hay forma clara de distinguir, usar el primero (más relevante según Nominatim)
  return results[0];
}

async function geocodeWithNominatim(address: string, useMexico: boolean = false, isRetry: boolean = false): Promise<{ latitude: number; longitude: number; displayName: string } | null> {
  // Si useMexico es true y la dirección no contiene "México" o "Mexico", agregar ", México"
  let queryAddress = address;
  if (useMexico) {
    const lowerAddress = address.toLowerCase();
    if (!lowerAddress.includes("méxico") && !lowerAddress.includes("mexico")) {
      queryAddress = `${address}, México`;
    }
  }

  // NO usar encodeURIComponent manual - URLSearchParams lo hace automáticamente
  // Usar limit=3, accept-language=es, countrycodes=mx si useMexico
  const params = new URLSearchParams({
    format: "json",
    q: queryAddress, // String normal, URLSearchParams lo codifica
    limit: "3",
    addressdetails: "1",
    "accept-language": "es",
  });
  
  if (useMexico) {
    params.append("countrycodes", "mx");
  }

  const nominatimUrl = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  
  // Log mínimo (solo server) para debugging
  console.warn(`[geocode] ${isRetry ? "RETRY" : "PRIMARY"} query: ${queryAddress.substring(0, 100)}...`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(nominatimUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Hausdame/1.0 (https://hausdame.app; contact@hausdame.app)",
        "Accept": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    // Seleccionar mejor resultado si hay múltiples
    const result = selectBestResult(data);
    
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    if (isNaN(lat) || isNaN(lon)) {
      return null;
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return null;
    }

    return {
      latitude: lat,
      longitude: lon,
      displayName: result.display_name || address,
    };
  } catch (fetchError: any) {
    clearTimeout(timeoutId);
    if (fetchError.name === "AbortError") {
      throw new Error("TIMEOUT");
    }
    throw fetchError;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address || typeof address !== "string" || !address.trim()) {
      return NextResponse.json(
        { error: "Dirección requerida" },
        { status: 400 }
      );
    }

    // Validar que la dirección no sea demasiado larga
    if (address.length > 500) {
      return NextResponse.json(
        { error: "Dirección demasiado larga" },
        { status: 400 }
      );
    }

    // Normalizar dirección (trim + remover número interior)
    const normalizedAddress = normalizeAddress(address);
    
    if (!normalizedAddress) {
      return NextResponse.json(
        { error: "Dirección inválida después de normalización" },
        { status: 400 }
      );
    }

    // Intentar geocoding con dirección normalizada, usando México por defecto
    try {
      const result = await geocodeWithNominatim(normalizedAddress, true, false);
      if (result) {
        return NextResponse.json(result);
      }
    } catch (error: any) {
      if (error.message === "TIMEOUT") {
        return NextResponse.json(
          { error: "Tiempo de espera agotado. El servicio de geocoding puede estar lento. Intenta colocar el pin manualmente o usar tu ubicación actual." },
          { status: 504 }
        );
      }
      // Continuar con reintento simplificado
    }

    // Si falla (404 o sin resultados), reintentar UNA VEZ con versión simplificada (sin CP)
    const simplifiedAddress = simplifyAddress(normalizedAddress);
    
    if (simplifiedAddress !== normalizedAddress && simplifiedAddress.trim()) {
      try {
        const result = await geocodeWithNominatim(simplifiedAddress, true, true);
        if (result) {
          return NextResponse.json(result);
        }
      } catch (error: any) {
        if (error.message === "TIMEOUT") {
          return NextResponse.json(
            { error: "Tiempo de espera agotado. El servicio de geocoding puede estar lento. Intenta colocar el pin manualmente o usar tu ubicación actual." },
            { status: 504 }
          );
        }
      }
    }

    // Si ambos intentos fallan, retornar error explicativo
    return NextResponse.json(
      { 
        error: "No se encontró ubicación para esta dirección. El servicio de geocoding usado (OpenStreetMap) puede no tener todas las direcciones que Google Maps tiene. Coloca el pin manualmente en el mapa o usa tu ubicación actual." 
      },
      { status: 404 }
    );
  } catch (error: any) {
    console.error("[geocode] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener la ubicación. Coloca el pin manualmente o usa tu ubicación actual." },
      { status: 500 }
    );
  }
}

