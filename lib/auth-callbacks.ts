// // lib/auth-callbacks.ts
// import bcrypt from "bcryptjs";
// import { randomBytes } from "crypto";
// import { db } from "@/lib/db";
// import { sendWelcomeEmail } from "@/lib/email";
// import { JWT } from "next-auth/jwt"; // Add this import
// import { Session } from "next-auth"; // Add this import

// // declare module "next-auth/jwt" {
// //   interface JWT {
// //     accessToken?: string;
// //     provider?: string;
// //   }
// // }

// // declare module "next-auth" {
// //   interface Session {
// //     accessToken?: string;
// //     provider?: string;
// //   }
// // }

// declare module "next-auth/jwt" {
//   interface JWT {
//     accessToken?: string | null;
//     provider?: string | null;
//   }
// }

// declare module "next-auth" {
//   interface Session {
//     accessToken?: string | null;
//     provider?: string | null;
//   }
// }


// function toDateFromEpochSeconds(v: unknown): Date | null {
//   const n = Number(v);
//   return Number.isFinite(n) ? new Date(n * 1000) : null;
// }

// export const callbacks = {
//   async signIn({ user, account, profile }: { user: any; account: any; profile: any }) {
//     if (!account || account.provider !== "facebook") return true;
//     if (!user?.email) {
//       return "/auth/error?reason=no_email_from_facebook";
//     }

//     try {
//       let existingUser = await db.user.findUnique({ where: { email: user.email } });

//       if (!existingUser) {
//         const tempPassword = randomBytes(8).toString("hex");
//         const hashed = await bcrypt.hash(tempPassword, 10);

//         existingUser = await db.user.create({
//           data: {
//             email: user.email,
//             name: user.name || profile?.name || "Facebook User",
//             password: hashed,
//             emailVerified: new Date(),
//           },
//         });

//         console.log(`[Auth] New user: ${existingUser.email} | tempPassword: ${tempPassword}`);

//         await sendWelcomeEmail({
//           email: existingUser.email!,
//           name: existingUser.name ?? "User",
//           tempPassword,
//         });
//       }

//       const a = account as any;
//       await db.account.upsert({
//         where: {
//           provider_providerAccountId: {
//             provider: account.provider,
//             providerAccountId: account.providerAccountId,
//           },
//         },
//         create: {
//           userId: existingUser.id,
//           type: account.type,
//           provider: account.provider,
//           providerAccountId: account.providerAccountId,
//           accessToken: a.access_token ?? null,
//           refreshToken: a.refresh_token ?? null,
//           expiresAt: toDateFromEpochSeconds(a.expires_at),
//           tokenType: a.token_type ?? null,
//           scope: a.scope ?? null,
//           idToken: a.id_token ?? null,
//           sessionState: a.session_state ?? null,
//         },
//         update: {
//           userId: existingUser.id,
//           accessToken: a.access_token ?? null,
//           refreshToken: a.refresh_token ?? null,
//           expiresAt: toDateFromEpochSeconds(a.expires_at),
//           tokenType: a.token_type ?? null,
//           scope: a.scope ?? null,
//           idToken: a.id_token ?? null,
//           sessionState: a.session_state ?? null,
//         },
//       });

//       return true;
//     } catch (err) {
//       console.error("Error in Facebook signIn:", err);
//       return "/auth/error?reason=sign_in_failed";
//     }
//   },
//   async jwt({ token, account }: { token: JWT; account: any }) {
//     if (account && (account as any).access_token) {
//       token.accessToken = (account as any).access_token;
//       token.provider = account.provider;
//     }
//     return token;
//   },
//   async session({ session, token }: { session: Session; token: JWT }) {
//     (session as any).accessToken = token.accessToken;
//     (session as any).provider = token.provider;
//     return session;
//   },
//   async redirect({ baseUrl }: { baseUrl: string }) {
//     return new URL("/dashboard", baseUrl).toString();
//   },
// };
