// v4-style route handler
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth"; // see v4 lib/auth.ts below

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; // Remove "authOptions" from this line in brackets // 24/11//2025

