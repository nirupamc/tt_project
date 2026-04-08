import { Resend } from "resend";

// Initialize Resend only if API key is present (for build time)
export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "noreply@archway.com";
