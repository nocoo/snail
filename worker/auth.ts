import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from "jose";
import { HttpError } from "./http";

export interface Identity {
  subject: string;
  libraryId: string;
  email: string;
}
type AccessConfig = { ACCESS_TEAM_DOMAIN: string; ACCESS_AUD: string };
const keysets = new Map<string, JWTVerifyGetKey>();

export async function digest(value: string | Uint8Array): Promise<string> {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : Uint8Array.from(value);
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function randomToken(prefix: string): string {
  return `${prefix}_${Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export async function verifyIdentity(
  request: Request,
  config: AccessConfig,
  key?: CryptoKey,
): Promise<Identity> {
  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token || !config.ACCESS_TEAM_DOMAIN || !config.ACCESS_AUD)
    throw new HttpError(401, "authentication_required");
  try {
    let resolver = keysets.get(config.ACCESS_TEAM_DOMAIN);
    if (!resolver && !key) {
      resolver = createRemoteJWKSet(new URL("/cdn-cgi/access/certs", config.ACCESS_TEAM_DOMAIN), {
        timeoutDuration: 5_000,
      });
      keysets.set(config.ACCESS_TEAM_DOMAIN, resolver);
    }
    const { payload } = await jwtVerify(token, key ?? (resolver as JWTVerifyGetKey), {
      issuer: config.ACCESS_TEAM_DOMAIN,
      audience: config.ACCESS_AUD,
      algorithms: ["RS256"],
      requiredClaims: ["sub", "exp", "iat", "email"],
    });
    if (payload.type !== "app" || !payload.sub || typeof payload.email !== "string")
      throw new Error("Invalid claims");
    return {
      subject: payload.sub,
      email: payload.email,
      libraryId: await digest(`${config.ACCESS_TEAM_DOMAIN}:${payload.sub}`),
    };
  } catch {
    throw new HttpError(401, "authentication_required");
  }
}

export function enforceOrigin(request: Request, origin = new URL(request.url).origin) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  if (request.headers.get("origin") !== origin || request.headers.get("x-snail-request") !== "1")
    throw new HttpError(403, "csrf_rejected");
}
