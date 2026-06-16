// lib/auth-config.ts
import type { NextAuthOptions } from "next-auth";
import Facebook from "next-auth/providers/facebook";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import Admin from "@/models/Admin";
import { randomBytes } from "crypto";
import { sendWelcomeEmail } from "@/lib/email";

function toDateFromEpochSeconds(v: unknown): Date | null {
  const n = Number(v);
  return Number.isFinite(n) ? new Date(n * 1000) : null;
}

function generateTempPassword(length = 18) {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function isBcryptHash(v?: string | null) {
  return !!v && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(v);
}

export const authConfig = {
  // v4: no `trustHost`. Ensure NEXTAUTH_URL is set correctly.
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  session: { strategy: "jwt" as const },

  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        await connectDB();
        const user = await Admin.findOne({ email: credentials.email.toLowerCase() });
        // const user = await db.user.findUnique({
        //   where: { email: credentials.email },
        //   select: { id: true, email: true, name: true, image: true, password: true },
        // });
        if (!user) return null;

        // bcrypt -> compare
        // if (isBcryptHash(user.password)) {
        //   const ok = await bcrypt.compare(credentials.password, user.password!);
        //   return ok
        //     ? { id: user.id, email: user.email, name: user.name, image: user.image }
        //     : null;
        // }

        // legacy plain -> migrate on login
        // if (user.password && credentials.password === user.password) {
        //   const newHash = await bcrypt.hash(credentials.password, 10);
        //   await db.user.update({ where: { id: user.id }, data: { password: newHash } });
        //   return { id: user.id, email: user.email, name: user.name, image: user.image };
        // }

        return null;
      },
    }),

    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID as string,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET as string,
      authorization: {
        params: {
          scope:
            "email,pages_show_list,pages_read_engagement,instagram_basic,ads_read,business_management,instagram_manage_insights",
        },
      },
      profile(p: any) {
        return {
          id: String(p.id),
          name: p.name ?? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
          email: p.email ?? null,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account) return true;

      if (account.provider === "facebook") {
        if (!user?.email) return "/auth/error?reason=no_email_from_facebook";

        try {
          await connectDB();
          let existing = await Admin.findOne({ email: user.email });
          // let existing = await db.user.findUnique({ where: { email: user.email! } });

          // if (!existing) {
          //   const temp = generateTempPassword();
          //   const hash = await bcrypt.hash(temp, 10);

          //   existing = await db.user.create({
          //     data: {
          //       email: user.email!,
          //       name: user.name || (profile as any)?.name || "Facebook User",
          //       password: hash,
          //       emailVerified: new Date(),
          //       isAdmin: true
          //     },
          //   });

          //   console.log(
          //     `[Auth] New user via Facebook\nEmail: ${existing.email}\nTemp password: ${temp}`
          //   );

          //   await sendWelcomeEmail({
          //     email: existing.email!,
          //     name: existing.name ?? "User",
          //     tempPassword: temp,
          //   });
          // }

          // const a = account as any;
          // await db.account.upsert({
          //   where: {
          //     provider_providerAccountId: {
          //       provider: account.provider,
          //       providerAccountId: account.providerAccountId,
          //     },
          //   },
          //   create: {
          //     userId: existing.id,
          //     type: account.type,
          //     provider: account.provider,
          //     providerAccountId: account.providerAccountId,
          //     accessToken: a.access_token ?? null,
          //     refreshToken: a.refresh_token ?? null,
          //     expiresAt: toDateFromEpochSeconds(a.expires_at),
          //     tokenType: a.token_type ?? null,
          //     scope: a.scope ?? null,
          //     idToken: a.id_token ?? null,
          //     sessionState: a.session_state ?? null,
          //   },
          //   update: {
          //     userId: existing.id,
          //     accessToken: a.access_token ?? null,
          //     refreshToken: a.refresh_token ?? null,
          //     expiresAt: toDateFromEpochSeconds(a.expires_at),
          //     tokenType: a.token_type ?? null,
          //     scope: a.scope ?? null,
          //     idToken: a.id_token ?? null,
          //     sessionState: a.session_state ?? null,
          //   },
          // });

          return true;
        } catch (e) {
          console.error("FB signIn failed:", e);
          return "/auth/error?reason=sign_in_failed";
        }
      }

      return true;
    },

    async jwt({ token, account, user }) {
      if (user) {
        (token as any).user = {
          id: (user as any).id,
          name: user.name,
          email: user.email,
          image: (user as any).image ?? null,
        };
      }
      if (account && (account as any).access_token) {
        (token as any).accessToken = (account as any).access_token;
        (token as any).provider = account.provider;
      }
      return token;
    },

    async session({ session, token }) {
      (session as any).accessToken = (token as any).accessToken;
      (session as any).provider = (token as any).provider;
      if ((token as any).user) {
        session.user = (token as any).user;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const u = new URL(url);
        if (u.origin === baseUrl) return url;
      } catch {}
      return `${baseUrl}/en/admin`;
    },
  },
} satisfies NextAuthOptions;
