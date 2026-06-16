// src/types/next-auth.d.ts
import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  /** What we store on the session object returned by useSession/getServerSession */
  interface Session extends DefaultSession {
    accessToken?: string;
    provider?: string;
    user: {
      id?: string;
      role?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    } & DefaultSession["user"];
  }

  /** Shape of the user returned by providers/authorize() before JWT is created */
  interface User extends DefaultUser {
    id?: string;
    role?: string;
  }
}

declare module "next-auth/jwt" {
  /** What we put into the JWT token in callbacks.jwt */
  interface JWT extends DefaultJWT {
    accessToken?: string;
    provider?: string;
    id?: string;
    role?: string;
    user?: {
      id?: string;
      role?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
