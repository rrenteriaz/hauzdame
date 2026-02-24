import fs from "fs";
import path from "path";
import setCookieParser from "set-cookie-parser";

const BASE_URL = "http://localhost:3000";
const TOKENS_PATH = path.join("scripts", "qa", "qa-tokens.json");

type Session = {
  cookie: string;
};

function getSetCookieStrings(res: Response): string[] {
  const headersAny = res.headers as any;
  if (typeof headersAny.getSetCookie === "function") {
    const values = headersAny.getSetCookie();
    if (Array.isArray(values)) return values;
  }
  if (typeof headersAny.raw === "function") {
    const raw = headersAny.raw();
    if (raw && Array.isArray(raw["set-cookie"])) {
      return raw["set-cookie"];
    }
  }
  const header = res.headers.get("set-cookie");
  return header ? [header] : [];
}

function mergeCookies(existing: string, next: string[]): string {
  const store = new Map<string, string>();
  if (existing) {
    for (const part of existing.split(";")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const [name, ...rest] = trimmed.split("=");
      if (!name || rest.length === 0) continue;
      store.set(name, `${name}=${rest.join("=")}`);
    }
  }
  for (const cookie of next) {
    const pair = cookie.split(";")[0]?.trim();
    if (!pair || !pair.includes("=")) continue;
    const [name] = pair.split("=");
    if (name) {
      store.set(name, pair);
    }
  }
  return Array.from(store.values()).join("; ");
}

async function fetchWithCookie(
  input: string,
  init: RequestInit = {},
  session?: Session
) {
  const headers = new Headers(init.headers || {});
  if (session?.cookie) {
    headers.set("cookie", session.cookie);
  }
  const res = await fetch(input, { ...init, headers });
  const setCookieStrings = getSetCookieStrings(res);
  if (setCookieStrings.length > 0 && session) {
    const parsed = setCookieParser.parse(setCookieStrings);
    const cookiePairs = parsed.map((c: { name: string; value: string }) => `${c.name}=${c.value}`);
    session.cookie = mergeCookies(session.cookie, cookiePairs);
  }
  return res;
}

async function login(email: string, password: string): Promise<Session> {
  const session: Session = { cookie: "" };
  const res = await fetchWithCookie(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: email, password }),
  }, session);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(body)}`);
  }
  if (!session.cookie) {
    console.warn("[QA] Login ok pero no se recibieron cookies. Revisa /api/auth/login Set-Cookie.");
  }
  return session;
}

async function run() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("QA scripts no deben ejecutarse en producción.");
  }
  if (!fs.existsSync(TOKENS_PATH)) {
    throw new Error("qa-tokens.json no encontrado. Ejecuta create-qa-tokens.ts primero.");
  }
  const tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, "utf-8"));

  const hostSession = await login(tokens.users.host.email, tokens.qaPassword);
  const cleanerASession = await login(tokens.users.cleanerA.email, tokens.qaPassword);
  const cleanerBSession = await login(tokens.users.cleanerB.email, tokens.qaPassword);

  const results: Array<{ case: string; status: number; body: any }> = [];

  // A1: Host reclama TeamInvite
  {
    const res = await fetchWithCookie(
      `${BASE_URL}/api/invites/${tokens.service.teamInviteTokenSingle}/claim`,
      { method: "POST" },
      hostSession
    );
    results.push({ case: "A1 Host reclama TeamInvite", status: res.status, body: await res.json() });
  }

  // A2: Cleaner reclama TeamInvite válido
  {
    const res = await fetchWithCookie(
      `${BASE_URL}/api/invites/${tokens.service.teamInviteTokenSingle}/claim`,
      { method: "POST" },
      cleanerASession
    );
    results.push({ case: "A2 Cleaner reclama TeamInvite", status: res.status, body: await res.json() });
  }

  // A3: Carrera doble claim (Cleaner A vs Cleaner B)
  {
    const [resA, resB] = await Promise.all([
      fetchWithCookie(
        `${BASE_URL}/api/invites/${tokens.service.teamInviteTokenRace}/claim`,
        { method: "POST" },
        cleanerASession
      ),
      fetchWithCookie(
        `${BASE_URL}/api/invites/${tokens.service.teamInviteTokenRace}/claim`,
        { method: "POST" },
        cleanerBSession
      ),
    ]);
    results.push({
      case: "A3a Cleaner A race TeamInvite",
      status: resA.status,
      body: await resA.json(),
    });
    results.push({
      case: "A3b Cleaner B race TeamInvite",
      status: resB.status,
      body: await resB.json(),
    });
  }

  // B4: Cleaner reclama PropertyInvite (CLEANER)
  {
    const res = await fetchWithCookie(
      `${BASE_URL}/api/property-invites/${tokens.host.propertyInviteTokenCleaner}/claim`,
      { method: "POST" },
      cleanerASession
    );
    results.push({ case: "B4 Cleaner reclama PropertyInvite CLEANER", status: res.status, body: await res.json() });
  }

  // B5: Host reclama PropertyInvite (MANAGER)
  {
    const res = await fetchWithCookie(
      `${BASE_URL}/api/property-invites/${tokens.host.propertyInviteTokenManager}/claim`,
      { method: "POST" },
      hostSession
    );
    results.push({ case: "B5 Host reclama PropertyInvite MANAGER", status: res.status, body: await res.json() });
  }

  // B6: Idempotente (mismo usuario, mismo token)
  {
    const res = await fetchWithCookie(
      `${BASE_URL}/api/property-invites/${tokens.host.propertyInviteTokenCleaner}/claim`,
      { method: "POST" },
      cleanerASession
    );
    results.push({ case: "B6 Idempotencia PropertyInvite CLEANER", status: res.status, body: await res.json() });
  }

  console.log(JSON.stringify(results, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

