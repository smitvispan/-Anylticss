// lib/email.ts
import { Resend } from "resend";

const NODE_ENV = process.env.NODE_ENV ?? "development";
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RAW_MAIL_FROM = process.env.MAIL_FROM?.trim();
const MAIL_REPLY_TO = process.env.MAIL_REPLY_TO; // optional
const DEV_MAIL_FROM = "onboarding@resend.dev";

function resolveMailFrom() {
  if (!RAW_MAIL_FROM) {
    return NODE_ENV === "production" ? "welcome@yourdomain.com" : DEV_MAIL_FROM;
  }

  const domain = RAW_MAIL_FROM.split("@")[1]?.toLowerCase() || "";
  if (NODE_ENV !== "production" && (domain === "gmail.com" || domain === "yourdomain.com")) {
    return DEV_MAIL_FROM;
  }

  return RAW_MAIL_FROM;
}

const MAIL_FROM = resolveMailFrom();

// Instantiate Resend only if key exists to avoid build-time errors
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

function isUnverifiedDomainError(message: string) {
  return /domain is not verified/i.test(message);
}

function isTestingRecipientRestrictionError(message: string) {
  return /only send testing emails to your own email address/i.test(message);
}

export interface WelcomeEmailProps {
  email: string;
  name: string;
  tempPassword: string;
}

export interface CustomPlanRequestProps {
  name: string;
  email: string;
  mobileNumber?: string | null;
  country?: string | null;
  agencyName?: string | null;
  website?: string | null;
  notes?: string | null;
  planName?: string | null;
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

export async function sendCustomPlanRequestEmail({
  name,
  email,
  mobileNumber,
  country,
  agencyName,
  website,
  notes,
  planName,
}: CustomPlanRequestProps): Promise<SendResult> {
  const recipient =
    process.env.CUSTOM_PLAN_REQUEST_TO ||
    "smit.vispn@gmail.com";

  const summary = [
    `Plan: ${planName || "Own Plan"}`,
    `Country: ${country || "Not provided"}`,
    `Mobile: ${mobileNumber || "Not provided"}`,
    `Agency: ${agencyName || "Not provided"}`,
    `Website: ${website || "Not provided"}`,
  ].join("\n");

  if (NODE_ENV !== "production") {
    console.log("[custom-plan] Request received");
    console.log("[custom-plan] From:", email);
    console.log(summary);
    if (notes) console.log("[custom-plan] Notes:", notes);
  }

  if (!resend) {
    const msg = "RESEND_API_KEY is missing; custom plan email not sent.";
    console.error(msg);
    return NODE_ENV === "development" ? { ok: true } : { ok: false, error: msg };
  }

  try {
    const subject = `${planName || "Own Plan"} request from ${name}`;
    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
        <h1 style="margin:0 0 12px">${escapeHtml(planName || "Own Plan")} Request</h1>
        <p style="margin:0 0 8px"><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p style="margin:0 0 8px"><strong>Contact Email:</strong> ${escapeHtml(email)}</p>
        <p style="margin:0 0 8px"><strong>Mobile Number:</strong> ${escapeHtml(mobileNumber || "Not provided")}</p>
        <p style="margin:0 0 8px"><strong>Country:</strong> ${escapeHtml(country || "Not provided")}</p>
        <p style="margin:0 0 8px"><strong>Agency:</strong> ${escapeHtml(agencyName || "Not provided")}</p>
        <p style="margin:0 0 8px"><strong>Website:</strong> ${escapeHtml(website || "Not provided")}</p>
        <p style="margin:16px 0 8px"><strong>Requirements</strong></p>
        <p style="margin:0; white-space:pre-wrap">${escapeHtml(notes || "Not provided")}</p>
      </div>
    `.trim();

    const text =
      `${planName || "Own Plan"} Request\n\n` +
      `Name: ${name}\n` +
      `Contact Email: ${email}\n` +
      `Mobile Number: ${mobileNumber || "Not provided"}\n` +
      `Country: ${country || "Not provided"}\n` +
      `Agency: ${agencyName || "Not provided"}\n` +
      `Website: ${website || "Not provided"}\n` +
      `\n` +
      `Requirements:\n${notes || "Not provided"}\n`;

    const { data, error } = await resend.emails.send({
      from: MAIL_FROM,
      to: recipient,
      subject,
      html,
      text,
      replyTo: email,
      tags: [{ name: "type", value: "custom-plan-request" }],
    });

    if (error) {
      console.error("Resend error:", error);
      const message = (error as any)?.message ?? "Unknown Resend error";
      if (
        NODE_ENV !== "production" &&
        (isUnverifiedDomainError(message) || isTestingRecipientRestrictionError(message))
      ) {
        console.warn("[custom-plan] Resend sandbox restriction in development, returning soft success.");
        return { ok: true };
      }
      return { ok: false, error: message };
    }

    return { ok: true, id: data?.id };
  } catch (err: any) {
    const message = err?.message ?? String(err);
    console.error("Error sending custom plan request email:", message);
    if (
      NODE_ENV !== "production" &&
      (isUnverifiedDomainError(message) || isTestingRecipientRestrictionError(message))
    ) {
      console.warn("[custom-plan] Resend sandbox restriction in development, returning soft success.");
      return { ok: true };
    }
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
