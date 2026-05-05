import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { D1Adapter } from "@auth/d1-adapter";
import { getDB } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth(async () => {
  const db = await getDB();
  return {
    adapter: D1Adapter(db),
    providers: [Google],
    session: { strategy: "database" },
    pages: { signIn: "/" },
    callbacks: {
      async session({ session, user }) {
        if (session.user) session.user.id = user.id;
        return session;
      },
    },
  };
});
