import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { Role } from "@/lib/enums";
import { isDesignatedAdmin, isGmailAddress } from "@/lib/gmail";
import { prisma } from "@/lib/prisma";
import { normalizeMobile } from "@/lib/user-identity";

if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
}

export function demoLoginEnabled() {
  return process.env.ENABLE_DEMO_LOGIN === "true";
}

export function googleLoginEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

async function firstVillageId() {
  const village = await prisma.village.findFirst({ orderBy: { createdAt: "asc" } });
  return village?.id ?? null;
}

function roleForEmail(email: string) {
  return isDesignatedAdmin(email) ? Role.ADMIN : Role.VIEWER;
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

providers.push(
  Credentials({
    name: "Password login",
    credentials: {
      identifier: { label: "Email or mobile number", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const identifier = credentials?.identifier?.trim() ?? "";
      const password = credentials?.password ?? "";
      if (!identifier || !password) return null;
      const email = identifier.toLowerCase();
      const mobile = normalizeMobile(identifier);
      const user = identifier.includes("@")
        ? await prisma.user.findUnique({ where: { email } })
        : mobile
          ? await prisma.user.findUnique({ where: { mobile } })
          : null;
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

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  useSecureCookies: process.env.NODE_ENV === "production",
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/" },
  providers,
  events: {
    async createUser({ user }) {
      const email = user.email?.toLowerCase() ?? "";
      const villageId = await firstVillageId();
      await prisma.user.update({
        where: { id: user.id },
        data: { villageId, role: roleForEmail(email) },
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
          token.mustChangePassword = dbUser.mustChangePassword;
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
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
      }
      return session;
    },
  },
};
