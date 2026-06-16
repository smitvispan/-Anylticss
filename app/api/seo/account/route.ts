import { NextResponse } from "next/server";
import { resolveGscAccountForUser } from "@/lib/syncSearchConsole";
import GoogleSearchConsoleAccount from "@/models/GoogleSearchConsoleAccount";
import connectDB from "@/lib/mongodb";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ ok: false, error: "userId is required" }, { status: 400 });
  }

  try {
    await connectDB();
    const { user, account } = await resolveGscAccountForUser(userId);
    if (!user || !account) {
      // Fallback: sometimes the passed id may be the GSC account id
      const fallbackAccount = await GoogleSearchConsoleAccount.findById(userId).lean();
      if (!fallbackAccount) {
        return NextResponse.json({ ok: false, error: "User or Search Console account not found" }, { status: 404 });
      }
      return NextResponse.json({
        ok: true,
        user: user ? { id: String(user._id), email: user.email } : undefined,
        account: {
          id: String(fallbackAccount._id),
          siteUrl: fallbackAccount.siteUrl,
          permissionLevel: fallbackAccount.permissionLevel,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      user: { id: String(user._id), email: user.email },
      account: {
        id: String(account._id),
        siteUrl: account.siteUrl,
        permissionLevel: account.permissionLevel,
      },
    });
  } catch (err: any) {
    console.error("[SEO account] error", err);
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}
