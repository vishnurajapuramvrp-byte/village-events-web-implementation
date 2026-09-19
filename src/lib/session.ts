import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Role } from "@/lib/enums";
import { Permission, assertCan } from "@/lib/rbac";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: Role;
  villageId?: string | null;
  personId?: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user as SessionUser;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Sign in to continue.");
  return user;
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  assertCan(user.role, permission);
  if (permission !== "manageUsers" && !user.villageId) {
    throw new Error("Your account is not assigned to a village yet.");
  }
  return user;
}
