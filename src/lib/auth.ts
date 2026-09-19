import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { Role } from "@/lib/enums";
import { prisma } from "@/lib/prisma";

function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

async function firstVillageId() {
  const village = await prisma.village.findFirst({ orderBy: { createdAt: "asc" } });
  return village?.id ?? null;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
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
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user?.id) token.sub = user.id;
      if (account?.provider === "google" && token.email) {
        const existing = await prisma.user.findUnique({ where: { email: token.email } });
        if (existing) {
          const updates: { role?: string; villageId?: string | null } = {};
          if (adminEmails().includes(token.email.toLowerCase()) && existing.role !== Role.ADMIN) {
            updates.role = Role.ADMIN;
          }
          if (!existing.villageId) updates.villageId = await firstVillageId();
          if (Object.keys(updates).length) {
            await prisma.user.update({ where: { id: existing.id }, data: updates });
          }
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
