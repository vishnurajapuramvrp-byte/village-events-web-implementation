import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { Role } from "@/lib/enums";
import { isDesignatedAdmin, isGmailAddress } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";

if (!process.env.NEXTAUTH_URL && process.env.VERCEL_URL) {
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
}

export function demoLoginEnabled() {
  if (process.env.ENABLE_DEMO_LOGIN === "true") return true;
  if (process.env.ENABLE_DEMO_LOGIN === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export function googleLoginEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

async function firstVillageId() {
  const village = await prisma.village.findFirst({ orderBy: { createdAt: "asc" } });
  return village?.id ?? null;
}

const providers: NextAuthOptions["providers"] = [];

if (googleLoginEnabled()) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  );
}

if (demoLoginEnabled()) {
  providers.push(
    Credentials({
      name: "Demo login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  useSecureCookies: process.env.NODE_ENV === "production",
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  pages: { signIn: "/" },
  providers,
  events: {
    async createUser({ user }) {
      const email = user.email?.toLowerCase() ?? "";
      const villageId = await firstVillageId();
      const role = isDesignatedAdmin(email) ? Role.ADMIN : Role.VIEWER;
      await prisma.user.update({
        where: { id: user.id },
        data: { villageId, role },
      });
    },
  },
  callbacks: {
    async signIn({ account, profile, user }) {
      if (account?.provider !== "google") return true;
      const email = (profile as { email?: string } | undefined)?.email ?? user.email ?? "";
      return isGmailAddress(email);
    },
    async jwt({ token, user, account }) {
      if (user?.id) token.sub = user.id;
      if (account?.provider === "google" && token.email) {
        const existing = await prisma.user.findUnique({ where: { email: token.email } });
        if (existing && !existing.villageId) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { villageId: await firstVillageId() },
          });
        }
      }

      if (token.sub) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.sub } });
        if (dbUser) {
          token.role = dbUser.role;
          token.villageId = dbUser.villageId;
          token.personId = dbUser.personId;
          token.name = dbUser.name;
          token.email = dbUser.email;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as Role) ?? Role.VIEWER;
        session.user.villageId = (token.villageId as string | null) ?? null;
        session.user.personId = (token.personId as string | null) ?? null;
      }
      return session;
    },
  },
};
