import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

function readAccessToken(req: Request) {
  const header = req.headers.get("authorization") || "";
  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }

  const { searchParams } = new URL(req.url);
  return searchParams.get("access_token") || searchParams.get("token");
}

export async function GET(req: Request) {
  try {
    const configuredToken = process.env.USER_API_TOKEN || process.env.API_ACCESS_TOKEN;
    if (!configuredToken) {
      return NextResponse.json(
        { ok: false, error: "USER_API_TOKEN is not configured" },
        { status: 500 }
      );
    }

    const providedToken = readAccessToken(req);
    if (!providedToken || providedToken !== configuredToken) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const email = searchParams.get("email");

    await connectDB();

    if (!id && !email) {
      const users = await User.find({})
        .select({ _id: 1, name: 1 })
        .sort({ createdAt: -1 })
        .lean();

      return NextResponse.json({
        ok: true,
        users: users.map((u) => ({ id: String(u._id), name: u.name || null })),
        count: users.length,
      });
    }

    if (id && !isValidObjectId(id)) {
      return NextResponse.json({ ok: false, error: "Invalid user id" }, { status: 400 });
    }

    const user = await User.findOne(
      id ? { _id: id } : { email: email?.toLowerCase() }
    )
      .select("-password -sessions")
      .lean();

    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    const safeUser = {
      id: String(user._id),
      name: user.name || null,
      email: user.email || null,
      image: user.image || null,
      isAdmin: !!user.isAdmin,
      client_id: user.client_id || null,
      contact_id: user.contact_id || null,
      ERP_token: user.ERP_token || null,
      mainPage: user.mainPage ? String(user.mainPage) : null,
      mainInstagram: user.mainInstagram ? String(user.mainInstagram) : null,
      mainAd: user.mainAd ? String(user.mainAd) : null,
      mainGoogleAd: user.mainGoogleAd ? String(user.mainGoogleAd) : null,
      mainSEOsites: user.mainSEOsites ? String(user.mainSEOsites) : null,
      googleSearchConsoleAccounts: Array.isArray(user.googleSearchConsoleAccounts)
        ? user.googleSearchConsoleAccounts.map(String)
        : [],
      googleAdsAccounts: Array.isArray(user.googleAdsAccounts)
        ? user.googleAdsAccounts.map(String)
        : [],
      campaigns: Array.isArray(user.campaigns) ? user.campaigns.map(String) : [],
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
      updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : null,
    };

    return NextResponse.json({ ok: true, user: safeUser });
  } catch (error) {
    console.error("[Users API] Failed to fetch user", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const configuredToken = process.env.USER_API_TOKEN || process.env.API_ACCESS_TOKEN;
    if (!configuredToken) {
      return NextResponse.json(
        { ok: false, error: "USER_API_TOKEN is not configured" },
        { status: 500 }
      );
    }

    const providedToken = readAccessToken(req);
    if (!providedToken || providedToken !== configuredToken) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const client_id = typeof body.client_id === "string" ? body.client_id.trim() : "";
    const contact_id = typeof body.contact_id === "string" ? body.contact_id.trim() : "";
    const ERP_token = typeof body.ERP_token === "string" ? body.ERP_token.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!client_id || !contact_id || !ERP_token || !name || !email) {
      return NextResponse.json(
        {
          ok: false,
          error: "client_id, contact_id, ERP_token, name, and email are required",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      const updated = await User.findByIdAndUpdate(
        existing._id,
        {
          $set: {
            name,
            client_id,
            contact_id,
            ERP_token,
          },
        },
        { new: true }
      ).lean();

      if (!updated) {
        return NextResponse.json(
          { ok: false, error: "Failed to update user" },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          user: {
            id: String(updated._id),
            name: updated.name || null,
            email: updated.email || null,
            client_id: updated.client_id || null,
            contact_id: updated.contact_id || null,
            ERP_token: updated.ERP_token || null,
          },
          updated: true,
        },
        { status: 200 }
      );
    }

    const user = await User.create({ name, email, client_id, contact_id, ERP_token });

    return NextResponse.json(
      {
        ok: true,
        user: {
          id: String(user._id),
          name: user.name || null,
          email: user.email || null,
          client_id: user.client_id || null,
          contact_id: user.contact_id || null,
          ERP_token: user.ERP_token || null,
        },
        created: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Users API] Failed to create user", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
