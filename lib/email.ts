// lib/email.ts
import { Resend } from "resend";

const NODE_ENV = process.env.NODE_ENV ?? "development";
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAIL_FROM = process.env.MAIL_FROM ?? "welcome@yourdomain.com"; // use a verified domain
const MAIL_REPLY_TO = process.env.MAIL_REPLY_TO; // optional

// Instantiate Resend only if key exists to avoid build-time errors
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export interface WelcomeEmailProps {
  email: string;
  name: string;
  tempPassword: string;
}

export type SendResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

export async function sendWelcomeEmail({
  email,
  name,
  tempPassword,
}: WelcomeEmailProps): Promise<SendResult> {
  // Dev-friendly console output (avoid logging the temp password in production)
  if (NODE_ENV !== "production") {
    console.log("[email] To:", email);
    console.log("[email] Name:", name);
    console.log("[email] Temp password:", tempPassword);
  } else {
    console.log(`[email] Sending welcome email to ${email}`);
  }

  if (!resend) {
    const msg = "RESEND_API_KEY is missing; email not sent.";
    console.error(msg);
    // In dev, treat this as a soft success so your flow isn’t blocked
    return NODE_ENV === "development" ? { ok: true } : { ok: false, error: msg };
  }

  try {
    const subject = "Welcome to Our Service!";
    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
        <h1 style="margin:0 0 12px">Welcome, ${escapeHtml(name)}!</h1>
        <p style="margin:0 0 12px">Your account has been successfully created.</p>
        <p style="margin:0 0 12px">Here are your temporary login details:</p>
        <p style="margin:0 0 8px"><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p style="margin:0 0 16px"><strong>Temporary Password:</strong> ${escapeHtml(tempPassword)}</p>
        <p style="margin:0 0 12px">For security, please change your password after logging in.</p>
        <p style="margin:24px 0 0; font-size:12px; color:#666">If you didn’t request this, please ignore this email or contact support.</p>
      </div>
    `.trim();

    const text =
      `Welcome, ${name}!\n\n` +
      `Your account has been created.\n\n` +
      `Email: ${email}\n` +
      `Temporary Password: ${tempPassword}\n\n` +
      `Please change your password after logging in.\n`;

    const { data, error } = await resend.emails.send({
      from: MAIL_FROM,
      to: email,
      subject,
      html,
      text, // text fallback improves deliverability
      // FIX: use camelCase `replyTo` (string | string[])
      ...(MAIL_REPLY_TO ? { replyTo: MAIL_REPLY_TO } : {}),
      tags: [{ name: "type", value: "welcome" }],
    });

    if (error) {
      console.error("Resend error:", error);
      return { ok: false, error: (error as any)?.message ?? "Unknown Resend error" };
    }

    return { ok: true, id: data?.id };
  } catch (err: any) {
    const message = err?.message ?? String(err);
    console.error("Error sending welcome email:", message);
    return { ok: false, error: message };
  }
}

export interface CustomPlanRequestProps {
  name: string;
  email: string;
  mobileNumber: string | null;
  country: string | null;
  agencyName: string | null;
  website: string | null;
  notes: string | null;
  planName: string;
}

export async function sendCustomPlanRequestEmail(
  props: CustomPlanRequestProps
): Promise<SendResult> {
  const { name, email, mobileNumber, country, agencyName, website, notes, planName } = props;

  if (NODE_ENV !== "production") {
    console.log("[email] Custom plan request from:", email);
    console.log("[email] Name:", name);
    console.log("[email] Plan:", planName);
  }

  if (!resend) {
    const msg = "RESEND_API_KEY is missing; email not sent.";
    console.error(msg);
    return NODE_ENV === "development" ? { ok: true } : { ok: false, error: msg };
  }

  try {
    const subject = `Custom Plan Request from ${name}`;
    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
        <h1 style="margin:0 0 12px">Custom Plan Request</h1>
        <table style="border-collapse:collapse; width:100%; max-width:600px;">
          <tr><td style="padding:8px 12px; font-weight:600;">Name</td><td style="padding:8px 12px;">${escapeHtml(name)}</td></tr>
          <tr><td style="padding:8px 12px; font-weight:600;">Email</td><td style="padding:8px 12px;">${escapeHtml(email)}</td></tr>
          <tr><td style="padding:8px 12px; font-weight:600;">Mobile</td><td style="padding:8px 12px;">${escapeHtml(mobileNumber ?? "")}</td></tr>
          <tr><td style="padding:8px 12px; font-weight:600;">Country</td><td style="padding:8px 12px;">${escapeHtml(country ?? "")}</td></tr>
          <tr><td style="padding:8px 12px; font-weight:600;">Agency</td><td style="padding:8px 12px;">${escapeHtml(agencyName ?? "")}</td></tr>
          <tr><td style="padding:8px 12px; font-weight:600;">Website</td><td style="padding:8px 12px;">${escapeHtml(website ?? "")}</td></tr>
          <tr><td style="padding:8px 12px; font-weight:600;">Plan</td><td style="padding:8px 12px;">${escapeHtml(planName)}</td></tr>
          <tr><td style="padding:8px 12px; font-weight:600;">Notes</td><td style="padding:8px 12px;">${escapeHtml(notes ?? "")}</td></tr>
        </table>
      </div>
    `.trim();

    const { data, error } = await resend.emails.send({
      from: MAIL_FROM,
      to: MAIL_FROM,
      replyTo: email,
      subject,
      html,
      tags: [{ name: "type", value: "custom-plan-request" }],
    });

    if (error) {
      console.error("Resend error:", error);
      return { ok: false, error: (error as any)?.message ?? "Unknown Resend error" };
    }

    return { ok: true, id: data?.id };
  } catch (err: any) {
    const message = err?.message ?? String(err);
    console.error("Error sending custom plan request email:", message);
    return { ok: false, error: message };
  }
}

/** Basic HTML escape to avoid accidental HTML injection in the email body. */
function escapeHtml(input: string) {
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
