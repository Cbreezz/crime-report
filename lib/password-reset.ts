import crypto from "crypto";

const TOKEN_VERSION = "v1";
export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

export type PasswordResetClaims = {
  userId: number;
  passwordFingerprint: string;
};

function signingKey(): Buffer | null {
  const secret =
    process.env.PASSWORD_RESET_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  return crypto
    .createHash("sha256")
    .update(`safereport-password-reset:${secret}`)
    .digest();
}

function sign(data: string, key: Buffer) {
  return crypto.createHmac("sha256", key).update(data).digest("base64url");
}

/**
 * Binds the token to the current password hash so a token stops working as
 * soon as it is redeemed once.
 */
export function passwordFingerprint(passwordHash: string): string {
  return crypto.createHash("sha256").update(passwordHash).digest("base64url");
}

export function createPasswordResetToken(
  userId: number,
  passwordHash: string,
  now = Date.now()
): string | null {
  const key = signingKey();
  if (!key) return null;

  const payload = {
    sub: userId,
    exp: now + PASSWORD_RESET_TTL_MS,
    pw: passwordFingerprint(passwordHash),
    v: 1,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const data = `${TOKEN_VERSION}.${body}`;
  return `${data}.${sign(data, key)}`;
}

export function readPasswordResetToken(
  token: string,
  now = Date.now()
): PasswordResetClaims | null {
  const key = signingKey();
  if (!key) return null;

  const parts = token.trim().split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return null;

  const data = `${parts[0]}.${parts[1]}`;
  const expected = sign(data, key);
  if (expected.length !== parts[2].length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts[2]))) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8")
    ) as { sub?: unknown; exp?: unknown; pw?: unknown; v?: unknown };

    if (
      payload.v !== 1 ||
      !Number.isInteger(payload.sub) ||
      typeof payload.sub !== "number" ||
      payload.sub <= 0 ||
      typeof payload.exp !== "number" ||
      payload.exp <= now ||
      typeof payload.pw !== "string"
    ) {
      return null;
    }

    return { userId: payload.sub, passwordFingerprint: payload.pw };
  } catch {
    return null;
  }
}

export function passwordResetConfigured(): boolean {
  return signingKey() !== null;
}
