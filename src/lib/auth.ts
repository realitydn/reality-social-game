import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { D1Adapter } from "@auth/d1-adapter";
import { getDB } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth(async () => {
  const db = await getDB();
  return {
    // Trust the proxied host header (Cloudflare in front of the custom domain).
    // Without this, Auth.js v5 rejects requests on any non-inferred host with
    // UntrustedHost — required for Google sign-in at app.realitydn.com.
    trustHost: true,
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
