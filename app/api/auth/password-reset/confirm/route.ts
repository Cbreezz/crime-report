import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  passwordFingerprint,
  passwordResetConfigured,
  readPasswordResetToken,
} from "@/lib/password-reset";

export const runtime = "nodejs";

const INVALID_TOKEN =
  "This reset code is invalid or has expired. Request a new one.";

export async function POST(request: Request) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor?.split(",")[0]?.trim() || "unknown";
    if (!consumeRateLimit(`password-reset-confirm:${clientIp}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    if (!passwordResetConfigured()) {
      return NextResponse.json(
        { error: "Password reset is not available right now." },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => null);
    const token = body && typeof body.token === "string" ? body.token.trim() : "";
    const password = body && typeof body.password === "string" ? body.password : "";

    if (!token || !password) {
      return NextResponse.json(
        { error: "Enter the reset code and a new password." },
        { status: 400 }
      );
    }

    if (
      password.length < 8 ||
      password.length > 72 ||
      !/[A-Za-z]/.test(password) ||
      !/\d/.test(password)
    ) {
      return NextResponse.json(
        { error: "Use at least 8 characters with a letter and a number." },
        { status: 400 }
      );
    }

    const claims = readPasswordResetToken(token);
    if (!claims) {
      return NextResponse.json({ error: INVALID_TOKEN }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: claims.userId },
    });

    if (
      !user ||
      passwordFingerprint(user.password) !== claims.passwordFingerprint
    ) {
      return NextResponse.json({ error: INVALID_TOKEN }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password reset confirm error:", error);
    return NextResponse.json(
      { error: "Unable to reset the password right now." },
      { status: 500 }
    );
  }
}
