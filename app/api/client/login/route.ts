import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Plan from "@/models/Plan";
import Subscription from "@/models/Subscription";
import { resolveClientIdentifiers } from "@/lib/client-identifiers";
import {
  encodeClientSessionToken,
  getClientSessionCookieNames,
  getClientSessionCookieOptions,
  getPreferredClientSessionCookieName,
} from "@/lib/client-auth";

function isBcryptHash(value: string | null | undefined) {
  return typeof value === "string" && /^\$2[aby]\$\d{2}\$/.test(value);
}

async function verifyPassword(input: string, stored: string | null | undefined) {
  if (!stored) return false;
  if (isBcryptHash(stored)) return bcrypt.compare(input, stored);
  return stored === input;
}

async function migrateUserPasswordIfNeeded(
  userId: string,
  password: string,
  stored: string | null | undefined
) {
  if (!stored || isBcryptHash(stored)) return;

  const hashedPassword = await bcrypt.hash(password, 10);
  await User.findByIdAndUpdate(userId, { password: hashedPassword }).catch(() => null);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const keepSignedIn = body?.keepSignedIn === true;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    await connectDB();

    // Ensure models are registered (especially in Next.js dev mode)
    const _forceModels = [User, Subscription, Plan];

    // Populate activeSubscription and planId
    const user = await User.findOne({ email, isAdmin: false })
      .select({
        _id: 1,
        email: 1,
        name: 1,
        password: 1,
        image: 1,
        client_id: 1,
        contact_id: 1,
        ERP_token: 1,
        role: 1,
        activeSubscription: 1,
      })
      .populate({
        path: 'activeSubscription',
        populate: { path: 'planId' }
      })
      .lean();

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    await migrateUserPasswordIfNeeded(String(user._id), password, user.password);

    const userRole = user.role || "client";
    const requestedLoginMode = body?.loginMode;

    if (userRole !== "client" && userRole !== "user") {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    if (requestedLoginMode && requestedLoginMode !== "user" && requestedLoginMode !== "client") {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const identifiers = await resolveClientIdentifiers({
      clientId: user.client_id,
      contactId: user.contact_id,
      isAdmin: false,
    });

    if (
      identifiers.client_id !== (user.client_id ?? null) ||
      identifiers.contact_id !== (user.contact_id ?? null) ||
      user.ERP_token
    ) {
      await User.findByIdAndUpdate(String(user._id), identifiers).catch(() => null);
    }

    const plan = (user as any)?.activeSubscription?.planId;
    const canResell = plan?.canResell || false;
    const planName = plan?.name || "No Active Plan";

    const token = await encodeClientSessionToken({
      id: String(user._id),
      name: user.name ?? null,
      email: user.email ?? null,
      image: typeof user.image === "string" ? user.image : null,
      role: userRole,
      canResell: canResell,
      planName: planName,
    });

    const response = NextResponse.json({
      user: {
        id: String(user._id),
        name: user.name ?? null,
        email: user.email ?? null,
        role: userRole,
        canResell: canResell,
        planName: planName,
      },
    });

    const cookieOptions = getClientSessionCookieOptions(keepSignedIn);
    const preferredCookieName = getPreferredClientSessionCookieName(userRole);

    response.cookies.set(preferredCookieName, token, cookieOptions);

    return response;
  } catch (error) {
    console.error("[client-login]", error);
    return NextResponse.json({ error: "Unable to sign in right now." }, { status: 500 });
  }
}
