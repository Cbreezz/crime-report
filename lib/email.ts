type EmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export function emailDeliveryConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.PASSWORD_RESET_FROM);
}

/**
 * Sends transactional mail through Resend's HTTPS API. Kept dependency-free so
 * the API route stays lightweight on Vercel.
 */
export async function sendEmail(input: EmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.PASSWORD_RESET_FROM;
  if (!apiKey || !from) {
    console.error(
      "RESEND_API_KEY and PASSWORD_RESET_FROM must be configured to send password reset email"
    );
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!response.ok) {
      console.error(
        "Resend rejected the password reset email:",
        response.status,
        await response.text().catch(() => "")
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("Password reset email failed:", error);
    return false;
  }
}
