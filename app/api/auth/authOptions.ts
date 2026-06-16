// app/api/auth/authOptions.ts

import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    // keep your current providers here
    // example:
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
};
