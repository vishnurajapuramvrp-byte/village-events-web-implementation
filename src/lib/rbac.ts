import { Role } from "@/lib/enums";
import { AppError } from "@/lib/http-error";

export type Permission =
  | "viewFinance"
  | "viewReminders"
  | "writeFinance"
  | "writeEvents"
  | "writePeople"
  | "viewAudit"
  | "manageUsers";

const matrix: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    "viewFinance",
    "viewReminders",
    "writeFinance",
    "writeEvents",
    "writePeople",
    "viewAudit",
    "manageUsers",
  ],
  [Role.TREASURER]: ["viewFinance", "viewReminders", "writeFinance", "writeEvents", "writePeople", "viewAudit"],
  [Role.COMMITTEE_MEMBER]: ["viewFinance", "viewReminders", "writeEvents", "writePeople"],
  [Role.VIEWER]: ["viewFinance"],
  [Role.RECIPIENT]: [],
};

export function can(role: Role | string, permission: Permission): boolean {
  return (matrix[role as Role] ?? []).includes(permission);
}

export function assertCan(role: Role | string, permission: Permission) {
  if (!can(role, permission)) {
    throw new AppError("You do not have permission to do that.", 403);
  }
}

export function roleLabel(role: Role | string): string {
  const labels: Record<string, string> = {
    ADMIN: "Admin",
    TREASURER: "Treasurer",
    COMMITTEE_MEMBER: "Committee member",
    VIEWER: "Viewer",
    RECIPIENT: "Recipient",
  };
  return labels[role] ?? role;
}
