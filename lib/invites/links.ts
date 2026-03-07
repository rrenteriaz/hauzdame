/**
 * Utility for generating invitation links consistently across the application.
 * Respects the INVITES_V3 contract and centralizes APP_BASE_URL logic.
 */

/**
 * Gets the base URL for the application.
 * Priority:
 * 1. APP_BASE_URL (canonical)
 * 2. NEXT_PUBLIC_APP_URL (compatibility)
 * 3. window.location.origin (client-only fallback)
 * 4. http://localhost:8080 (development fallback)
 */
export function getBaseUrl(): string {
  // 1. Try canonical environment variable (most reliable)
  const appBaseUrl = process.env.APP_BASE_URL;
  if (appBaseUrl && appBaseUrl.trim() !== "") {
    return appBaseUrl.trim().replace(/\/$/, "");
  }

  // 2. Try public compatibility variable
  const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (publicAppUrl && publicAppUrl.trim() !== "") {
    return publicAppUrl.trim().replace(/\/$/, "");
  }

  // 3. Client-side fallback to current origin
  if (typeof window !== "undefined") {
    // Avoid returning "null" or empty origins
    if (window.location.origin && window.location.origin !== "null") {
      return window.location.origin;
    }
  }

  // 4. Production fail-fast
  // Railway often set NODE_ENV=production. Also check common Railway provider variables.
  const isProduction = 
    process.env.NODE_ENV === "production" || 
    !!process.env.RAILWAY_ENVIRONMENT || 
    !!process.env.RAILWAY_ENVIRONMENT_NAME ||
    !!process.env.RAILWAY_STATIC_URL;
  
  if (isProduction) {
    // Log the error for easier debugging in Railway logs
    if (typeof window === "undefined") {
      console.error("CRITICAL: APP_BASE_URL is not configured in production environment.", {
        NODE_ENV: process.env.NODE_ENV,
        RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
        RAILWAY_STATIC_URL: process.env.RAILWAY_STATIC_URL
      });
    }
    
    // We return a slightly more useful error link instead of throwing to prevent a full crash, 
    // but the link will obviously be an error indicator.
    return "https://ERROR_MISSING_APP_BASE_URL";
  }

  // 5. Development fallback
  return "http://localhost:8080";
}

export type InviteType = "team" | "property" | "workgroup";

/**
 * Constructs a full invitation link using the centralized base URL.
 */
export function getInviteLink(token: string, type: InviteType = "team"): string {
  const baseUrl = getBaseUrl();
  
  switch (type) {
    case "property":
      return `${baseUrl}/join?token=${token}&type=property`;
    case "workgroup":
      return `${baseUrl}/join/host?token=${token}`;
    case "team":
    default:
      return `${baseUrl}/join?token=${token}`;
  }
}
