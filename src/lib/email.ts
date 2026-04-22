import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function wrapEmailTemplate(title: string, bodyHtml: string) {
  return `
  <div style="background:#0A0A0A;padding:24px;font-family:Arial,sans-serif;">
    <div style="max-width:640px;margin:0 auto;border:1px solid rgba(255,215,0,.28);border-radius:12px;overflow:hidden;background:#111;">
      <div style="padding:16px 20px;border-bottom:1px solid rgba(255,215,0,.2);">
        <div style="color:#FFD700;font-size:18px;font-weight:700;">TanTech LLC — Archway Compliance Platform</div>
      </div>
      <div style="padding:20px;">
        <h2 style="margin:0 0 14px;color:#FFD700;font-size:20px;">${title}</h2>
        <div style="color:#FFFFFF;line-height:1.6;font-size:14px;">${bodyHtml}</div>
      </div>
    </div>
  </div>`;
}

export async function sendComplianceEmail({
  to,
  subject,
  heading,
  html,
}: {
  to: string | string[];
  subject: string;
  heading: string;
  html: string;
}) {
  if (!resend) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  if (!process.env.ALERT_FROM_EMAIL) {
    throw new Error("ALERT_FROM_EMAIL is not configured");
  }

  await resend.emails.send({
    from: process.env.ALERT_FROM_EMAIL,
    to,
    subject,
    html: wrapEmailTemplate(heading, html),
  });
}
