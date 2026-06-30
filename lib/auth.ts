import NextAuth, { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Facebook from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";

import { resolveClientIdentifiers } from "@/lib/client-identifiers";
import connectDB from "@/lib/mongodb";
import Admin from "@/models/Admin";
import User from "@/models/User";

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

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  session: { strategy: "jwt" },

  providers: [
    Credentials({
      name: "Email Login",
      credentials: {
        email: { label: "Email" },
        password: { label: "Password", type: "password" },
        loginMode: { label: "Login Mode" },
      },

      async authorize(credentials) {
        await connectDB();

        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.toLowerCase().trim();
        const password = credentials.password;
        const loginMode =
          ["admin", "user"].includes(credentials.loginMode)
            ? credentials.loginMode
            : null;

        const admin = await Admin.findOne({ email }).lean();
        if (admin) {
          if (loginMode !== "admin") {
            return null;
          }
          const isValidAdminPassword = await verifyPassword(password, admin.password);
          if (isValidAdminPassword) {
            return {
              id: String(admin._id),
              email: admin.email,
              role: admin.role || "admin",
            };
          }
        }

        const user = await User.findOne({ email, isAdmin: false })
          .select({ _id: 1, email: 1, name: 1, password: 1, client_id: 1, contact_id: 1, ERP_token: 1, role: 1 })
          .lean();

        if (!user) {
          return null;
        }

        const userRole = user.role || "client";

        if (userRole !== "user") {
          return null;
        }

        if (loginMode !== userRole) {
          return null;
        }

        const isValidUserPassword = await verifyPassword(password, user.password);
        if (!isValidUserPassword) {
          return null;
        }

        await migrateUserPasswordIfNeeded(String(user._id), password, user.password);
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

        return {
          id: String(user._id),
          email: user.email,
          name: user.name ?? undefined,
          role: userRole,
        };
      },
    }),

    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
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

    GoogleProvider({
      clientId: process.env.GOOGLE_ADS_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/webmasters.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = (user as any).id ?? token.sub;
        token.name = user.name;
        token.email = user.email;
        token.role = (user as any).role ?? "admin";
      }

      if (account) {
        token.provider = account.provider;
      }

      return token;
    },

    async session({ session, token }) {
      const tokenData = token as Record<string, any>;
      (session as any).user = {
        ...(session.user || {}),
        id: tokenData.id as string | undefined,
        name: tokenData.name as string | undefined,
        email: tokenData.email as string | undefined,
        role: tokenData.role as string | undefined,
      };

      session.provider = tokenData.provider ?? null;
      session.accessToken = tokenData.accessToken ?? null;

      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return baseUrl + url;
      try {
        const u = new URL(url);
        if (u.origin === baseUrl) return url;
      } catch { }
      return `${baseUrl}/en/admin`;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
export const auth = () => getServerSession(authOptions);
