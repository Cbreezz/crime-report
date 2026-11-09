import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  createPasswordResetToken,
  passwordResetConfigured,
} from "@/lib/password-reset";
import { emailDeliveryConfigured, sendEmail } from "@/lib/email";

export const runtime = "nodejs";

const GENERIC_RESPONSE = {
  success: true,
  message: "If that email is registered, a reset link is on its way.",
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

export async function POST(request: Request) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor?.split(",")[0]?.trim() || "unknown";
    if (!consumeRateLimit(`password-reset:${clientIp}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many reset requests. Please try again later." },
        { status: 429 }
      );
    }

    if (!passwordResetConfigured() || !emailDeliveryConfigured()) {
      console.error(
        "Password reset requires NEXTAUTH_SECRET (or PASSWORD_RESET_SECRET) and email configuration"
      );
      return NextResponse.json(
        { error: "Password reset is not available right now." },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => null);
    const email =
      body && typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = createPasswordResetToken(user.id, user.password);
      if (token) {
        const link = `safereport://reset-password?token=${encodeURIComponent(
          token
        )}`;
        const name = escapeHtml(user.name);

        await sendEmail({
          to: user.email,
          subject: "Reset your SafeReport password",
          text: `Hi ${user.name},\n\nWe received a request to reset your SafeReport password.\n\nOpen the app with this link:\n${link}\n\nOr paste this code into the reset screen:\n${token}\n\nThis code expires in 30 minutes. If you did not request a reset, you can ignore this email.`,
          html: `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#09090b;color:#e4e4e7;padding:32px;border-radius:16px">
  <h1 style="margin:0 0 16px;font-size:20px;color:#ffffff">Reset your SafeReport password</h1>
  <p style="margin:0 0 16px;line-height:1.5">Hi ${name}, we received a request to reset your password. This code expires in 30 minutes.</p>
  <p style="margin:0 0 24px">
    <a href="${link}" style="display:inline-block;background:#38bdf8;color:#09090b;font-weight:600;padding:12px 20px;border-radius:10px;text-decoration:none">Open SafeReport</a>
  </p>
  <p style="margin:0 0 8px;line-height:1.5">If the button does not work, open the app and paste this code:</p>
  <p style="margin:0 0 24px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;word-break:break-all;color:#7dd3fc">${token}</p>
  <p style="margin:0;color:#a1a1aa;font-size:13px;line-height:1.5">If you did not request a reset, you can ignore this email. Your password stays unchanged.</p>
</div>`,
        });
      }
    }

    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json(
      { error: "Unable to start a password reset right now." },
      { status: 500 }
    );
  }
}
