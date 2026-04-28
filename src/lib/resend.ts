import { Resend } from "resend";

// Initialize Resend only if API key is present (for build time)
export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "noreply@archway.com";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resend) {
    throw new Error("Resend API key is not configured");
  }

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  });
}
