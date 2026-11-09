import { beforeAll, describe, expect, it } from "vitest";
import {
  createPasswordResetToken,
  passwordFingerprint,
  PASSWORD_RESET_TTL_MS,
  readPasswordResetToken,
} from "./password-reset";

const PASSWORD_HASH = "$2a$10$examplehashvalueexamplehashvalue";

beforeAll(() => {
  process.env.NEXTAUTH_SECRET = "test-reset-secret";
});

describe("password reset tokens", () => {
  it("round-trips the user and password fingerprint", () => {
    const token = createPasswordResetToken(7, PASSWORD_HASH);
    expect(token).not.toBeNull();

    expect(readPasswordResetToken(token!)).toEqual({
      userId: 7,
      passwordFingerprint: passwordFingerprint(PASSWORD_HASH),
    });
  });

  it("rejects an expired token", () => {
    const token = createPasswordResetToken(7, PASSWORD_HASH, 1_000)!;
    expect(readPasswordResetToken(token, 1_000 + PASSWORD_RESET_TTL_MS)).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const token = createPasswordResetToken(7, PASSWORD_HASH)!;
    const tampered = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;
    expect(readPasswordResetToken(tampered)).toBeNull();
  });

  it("rejects a re-signed payload with a changed user", () => {
    const token = createPasswordResetToken(7, PASSWORD_HASH)!;
    const [, , signature] = token.split(".");
    const payload = Buffer.from(
      JSON.stringify({
        sub: 8,
        exp: Date.now() + PASSWORD_RESET_TTL_MS,
        pw: passwordFingerprint(PASSWORD_HASH),
        v: 1,
      })
    ).toString("base64url");

    expect(readPasswordResetToken(`v1.${payload}.${signature}`)).toBeNull();
  });

  it("stops matching once the password hash changes", () => {
    const token = createPasswordResetToken(7, PASSWORD_HASH)!;
    const claims = readPasswordResetToken(token)!;

    expect(claims.passwordFingerprint).not.toBe(
      passwordFingerprint("$2a$10$differenthashafterreset")
    );
  });

  it("cannot issue tokens without a signing secret", () => {
    const original = process.env.NEXTAUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.PASSWORD_RESET_SECRET;

    expect(createPasswordResetToken(1, PASSWORD_HASH)).toBeNull();

    process.env.NEXTAUTH_SECRET = original;
  });
});
