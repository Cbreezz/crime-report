import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createMobileToken } from "@/lib/mobile-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor?.split(",")[0]?.trim() || "unknown";
    if (!consumeRateLimit(`mobile-login:${clientIp}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many sign-in attempts. Please try again later." },
        { status: 429 }
      );
    }

    const { email, password } = await request.json();

    if (typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Please enter an email and password" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Email or password is incorrect" },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Email or password is incorrect" },
        { status: 401 }
      );
    }

    const token = createMobileToken(user.id);
    if (!token) {
      console.error("MOBILE_AUTH_SECRET or NEXTAUTH_SECRET is not configured");
      return NextResponse.json(
        { error: "Mobile sign-in is not configured" },
        { status: 503 }
      );
    }

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Mobile login error:", error);
    return NextResponse.json(
      { error: "Unable to sign in right now" },
      { status: 500 }
    );
  }
}
