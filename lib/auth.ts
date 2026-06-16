import NextAuth, { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Facebook from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

import connectDB from "@/lib/mongodb";
import Admin from "@/models/Admin";

import { getServerSession } from "next-auth";

function toDateFromEpochSeconds(v: unknown): Date | null {
  const n = Number(v);
  return Number.isFinite(n) ? new Date(n * 1000) : null;
}

function generateTempPassword(length = 18) {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++)
    out += alphabet[bytes[i] % alphabet.length];
  return out;
}

// ----------------------------------------------------------------------------
// AUTH OPTIONS
// ----------------------------------------------------------------------------

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  session: { strategy: "jwt" },

  providers: [
    Credentials({
      name: "Admin Login",
      credentials: {
        email: { label: "Email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
      console.log("🔥 AUTHORIZE STARTED at:", new Date().toISOString());
      console.log("Credentials:", credentials);
      
      try {
        await connectDB();
        console.log("✅ DB Connected");
        
        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Missing email or password");
          return null;
        }
        
        const admin = await Admin.findOne({ email: credentials.email.toLowerCase() });
        console.log("Admin found:", admin ? "Yes" : "No");
        
        if (!admin) {
          console.log("❌ Admin not found for email:", credentials.email);
          return null;
        }
        
        console.log("🔐 Comparing password...");
        const isValid = await bcrypt.compare(credentials.password, admin.password);
        console.log("Password valid:", isValid);
        
        if (!isValid) {
          console.log("❌ Invalid password");
          return null;
        }
        
        console.log("✅ Login successful for:", admin.email);
        return {
          id: admin._id.toString(),
          email: admin.email,
          role: admin.role || "admin",
        };
      } catch (error) {
        console.error("🔥 Error in authorize:", error);
        return null;
      }
    },

      
    }),

    // ----------------------------------------------------------------------
    // ⭐ FACEBOOK LOGIN (Optional)
    // ----------------------------------------------------------------------
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

    // ----------------------------------------------------------------------
    // ⭐ GOOGLE LOGIN (Optional)
    // ----------------------------------------------------------------------
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

  // ----------------------------------------------------------------------------
  // CALLBACKS
  // ----------------------------------------------------------------------------
  callbacks: {
    // ----------------------------------------------------------------------
    // ✔ JWT CALLBACK → Store admin info
    // ----------------------------------------------------------------------
    async jwt({ token, user, account }) {
      if (user) {
        token.id = (user as any).id;
        token.email = user.email;
        token.role = (user as any).role ?? "admin";
      }

      // Store provider details if login is Facebook/Google
      if (account) {
        token.provider = account.provider;
        // token.accessToken = account.access_token ?? null;
      }

      return token;
    },


    // ----------------------------------------------------------------------
    // ✔ SESSION CALLBACK → expose admin
    // ----------------------------------------------------------------------
    async session({ session, token }) {
      const tokenData = token as Record<string, any>;
      (session as any).user = {
        ...(session.user || {}),
        id: tokenData.id as string | undefined,
        email: tokenData.email as string | undefined,
        role: tokenData.role as string | undefined,
      };

      // Attach provider-based fields
      session.provider = tokenData.provider ?? null;
      session.accessToken = tokenData.accessToken ?? null;

      return session;
    },



    // ----------------------------------------------------------------------
    // ✔ REDIRECT AFTER LOGIN
    // ----------------------------------------------------------------------
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return baseUrl + url;
      try {
        const u = new URL(url);
        if (u.origin === baseUrl) return url;
      } catch {}
      return baseUrl + "/en/admin";
    },
  },
};

// ----------------------------------------------------------------------------
// EXPORT HANDLER
// ----------------------------------------------------------------------------
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
export const auth = () => getServerSession(authOptions);
