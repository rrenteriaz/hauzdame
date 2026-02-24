// app/api/resolve-maps-url/route.ts
import { NextRequest, NextResponse } from "next/server";

/**
 * Endpoint para resolver URLs cortas de Google Maps (maps.app.goo.gl, goo.gl)
 * siguiendo redirects hasta obtener la URL final.
 * 
 * IMPORTANTE:
 * - Máximo 3 redirects para evitar loops infinitos
 * - Solo acepta dominios permitidos de Google Maps
 * - Best-effort: no garantiza que la URL final contenga coordenadas
 */
const ALLOWED_DOMAINS = [
  "maps.app.goo.gl",
  "goo.gl",
  "google.com",
  "www.google.com",
  "maps.google.com",
];

function isValidDomain(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return ALLOWED_DOMAINS.some((domain) => hostname.includes(domain));
  } catch {
    return false;
  }
}

async function resolveRedirect(url: string, maxRedirects: number = 3): Promise<string | null> {
  if (maxRedirects <= 0) {
    return null; // Evitar loops infinitos
  }

  try {
    const response = await fetch(url, {
      method: "HEAD", // Solo headers, más eficiente
      redirect: "manual", // Manejar redirects manualmente
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Hausdame/1.0)",
      },
    });

    // Si hay redirect (301, 302, 307, 308)
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (location) {
        // Si location es relativa, convertir a absoluta
        const resolvedUrl = location.startsWith("http") 
          ? location 
          : new URL(location, url).toString();
        
        // Seguir el redirect recursivamente
        return resolveRedirect(resolvedUrl, maxRedirects - 1);
      }
    }

    // Si no hay redirect, retornar URL actual
    if (response.ok || response.status === 405) {
      // 405 Method Not Allowed es común con HEAD, intentar con GET
      try {
        const getResponse = await fetch(url, {
          method: "GET",
          redirect: "manual",
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; Hausdame/1.0)",
          },
        });
        
        if (getResponse.status >= 300 && getResponse.status < 400) {
          const location = getResponse.headers.get("location");
          if (location) {
            const resolvedUrl = location.startsWith("http") 
              ? location 
              : new URL(location, url).toString();
            return resolveRedirect(resolvedUrl, maxRedirects - 1);
          }
        }
        
        return url; // URL final sin redirects
      } catch {
        return url;
      }
    }

    return url;
  } catch (error: any) {
    console.error("[resolve-maps-url] Error:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string" || !url.trim()) {
      return NextResponse.json(
        { error: "URL requerida" },
        { status: 400 }
      );
    }

    // Validar que sea http/https
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return NextResponse.json(
        { error: "URL debe comenzar con http:// o https://" },
        { status: 400 }
      );
    }

    // Validar dominio permitido
    if (!isValidDomain(url)) {
      return NextResponse.json(
        { error: "Dominio no permitido. Solo se aceptan links de Google Maps." },
        { status: 400 }
      );
    }

    // Resolver redirects
    const resolvedUrl = await resolveRedirect(url.trim(), 3);

    if (!resolvedUrl) {
      return NextResponse.json(
        { error: "No se pudo resolver el link. Puede estar roto o requerir demasiados redirects." },
        { status: 500 }
      );
    }

    return NextResponse.json({ resolvedUrl });
  } catch (error: any) {
    console.error("[resolve-maps-url] Error:", error);
    return NextResponse.json(
      { error: "Error al resolver el link" },
      { status: 500 }
    );
  }
}

