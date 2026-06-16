import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb"; // your MongoDB client configuration

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Fetch the user by email from your database
        const user = await fetchUserByEmail(credentials?.email);

        // Check if user exists and validate password
        if (user && (await bcrypt.compare(credentials?.password, user.password))) {
          return { id: user.id, email: user.email, name: user.name, accountId: user.accountId };
        }
        
        // Return null if authentication fails
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/auth/login", // Optional: redirect to custom login page
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.accountId = user.accountId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.accountId = token.accountId;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt", // Use JWT strategy for session
  },
  adapter: MongoDBAdapter(clientPromise), // Optional: Use MongoDB adapter if you are using MongoDB
};

export default NextAuth(authOptions);

// Helper function to fetch user by email
async function fetchUserByEmail(email: string) {
  const response = await fetch(`/api/users?email=${email}`);
  const user = await response.json();
  return user;
}