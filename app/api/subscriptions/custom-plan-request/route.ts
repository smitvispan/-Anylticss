import { NextResponse } from "next/server";
import { sendCustomPlanRequestEmail } from "@/lib/email";

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = asText(body?.name);
    const email = asText(body?.contactEmail || body?.email).toLowerCase();
    const mobileNumber = asText(body?.mobileNumber) || null;
    const country = asText(body?.country) || null;
    const agencyName = asText(body?.agencyName) || null;
    const website = asText(body?.website) || null;
    const notes = asText(body?.notes) || null;
    const planName = asText(body?.planName) || "Own Plan";

    if (!name || !email || !mobileNumber || !country) {
      return NextResponse.json(
        { ok: false, error: "Name, contact email, mobile number, and country are required." },
        { status: 400 }
      );
    }

    const result = await sendCustomPlanRequestEmail({
      name,
      email,
      mobileNumber,
      country,
      agencyName,
      website,
      notes,
      planName,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || "Unable to send request." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Internal error" },
      { status: 500 }
    );
  }
}
