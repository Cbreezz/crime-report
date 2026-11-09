import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPasswordResetToken,
  PASSWORD_RESET_TTL_MS,
  passwordFingerprint,
} from "./password-reset";

const { prismaMock, hashMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  hashMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: prismaMock }));
vi.mock("@/lib/rate-limit", () => ({
  consumeRateLimit: () => true,
}));
vi.mock("bcryptjs", () => ({
  default: { hash: hashMock },
}));

import { POST } from "@/app/api/auth/password-reset/confirm/route";

process.env.NEXTAUTH_SECRET = "route-test-secret";

function submit(body: unknown) {
  return POST(
    new Request("http://localhost/api/auth/password-reset/confirm", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "127.0.0.1",
      },
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  prismaMock.user.findUnique.mockReset();
  prismaMock.user.update.mockReset();
  hashMock.mockReset();
  hashMock.mockResolvedValue("hashed:new-password");
  prismaMock.user.update.mockResolvedValue({});
});

describe("POST /api/auth/password-reset/confirm", () => {
  it("updates the password for a fresh token", async () => {
    const token = createPasswordResetToken(7, "current-hash")!;
    prismaMock.user.findUnique.mockResolvedValue({ id: 7, password: "current-hash" });

    const response = await submit({ token, password: "newpassword1" });

    expect(response.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { password: "hashed:new-password" },
    });
  });

  it("rejects a token that was already used", async () => {
    const token = createPasswordResetToken(7, "current-hash")!;
    prismaMock.user.findUnique.mockResolvedValue({ id: 7, password: "changed-hash" });

    const response = await submit({ token, password: "newpassword1" });

    expect(response.status).toBe(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("rejects an expired token", async () => {
    const token = createPasswordResetToken(7, "current-hash", 1_000)!;
    prismaMock.user.findUnique.mockResolvedValue({ id: 7, password: "current-hash" });

    const response = await submit({ token, password: "newpassword1" });

    expect(response.status).toBe(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("rejects a weak password before touching the database", async () => {
    const token = createPasswordResetToken(7, "current-hash")!;

    const response = await submit({ token, password: "short" });

    expect(response.status).toBe(400);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a missing token", async () => {
    const response = await submit({ password: "newpassword1" });

    expect(response.status).toBe(400);
  });

  it("does not accept a token issued for a different password fingerprint", async () => {
    const token = createPasswordResetToken(7, "other-user-hash")!;
    prismaMock.user.findUnique.mockResolvedValue({ id: 7, password: "current-hash" });

    const response = await submit({ token, password: "newpassword1" });

    expect(response.status).toBe(400);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("keeps the fingerprint stable for the same hash", () => {
    expect(passwordFingerprint("same")).toBe(passwordFingerprint("same"));
    expect(PASSWORD_RESET_TTL_MS).toBe(30 * 60 * 1000);
  });
});
