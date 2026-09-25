import { DefaultSession } from "next-auth";
import { Role } from "@/lib/enums";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      villageId?: string | null;
      personId?: string | null;
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role | string;
    villageId?: string | null;
    personId?: string | null;
    mustChangePassword?: boolean;
  }
}
