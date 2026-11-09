import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const TOKEN_VERSION = "v1";
export const MOBILE_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type MobileTokenPayload = {
  sub: number;
  exp: number;
  v: 1;
};

function signingKey() {
  const secret = process.env.MOBILE_AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  return crypto
    .createHash("sha256")
    .update(`safereport-mobile:${secret}`)
    .digest();
}

function sign(data: string, key: Buffer) {
  return crypto.createHmac("sha256", key).update(data).digest("base64url");
}

export function createMobileToken(userId: number, now = Date.now()): string | null {
  const key = signingKey();
  if (!key) return null;

  const payload: MobileTokenPayload = {
    sub: userId,
    exp: now + MOBILE_TOKEN_TTL_MS,
    v: 1,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const data = `${TOKEN_VERSION}.${body}`;
  return `${data}.${sign(data, key)}`;
}

export function verifyMobileToken(token: string, now = Date.now()): number | null {
  const key = signingKey();
  if (!key) return null;

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return null;

  const data = `${parts[0]}.${parts[1]}`;
  const expected = sign(data, key);
  if (expected.length !== parts[2].length) return null;
  if (
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts[2]))
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8")
    ) as MobileTokenPayload;
    if (payload.v !== 1 || !Number.isInteger(payload.sub) || payload.sub <= 0) {
      return null;
    }
    if (typeof payload.exp !== "number" || payload.exp <= now) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim() || null;
}

/**
 * Resolves the signed-in user from a mobile bearer token, falling back to a
 * NextAuth cookie session for browser clients.
 */
export async function getRequestUserId(request: Request): Promise<number | null> {
  const token = getBearerToken(request);
  if (token) return verifyMobileToken(token);

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const parsed = Number.parseInt(session.user.id, 10);
  return Number.isFinite(parsed) ? parsed : null;
}
