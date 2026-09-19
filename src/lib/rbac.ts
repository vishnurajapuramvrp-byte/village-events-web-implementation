import { Role } from "@/lib/enums";

export type Permission =
  | "viewFinance"
  | "writeFinance"
  | "writeEvents"
  | "writePeople"
  | "viewAudit"
  | "manageUsers";

const matrix: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    "viewFinance",
    "writeFinance",
    "writeEvents",
    "writePeople",
    "viewAudit",
    "manageUsers",
  ],
  [Role.TREASURER]: ["viewFinance", "writeFinance", "writeEvents", "writePeople", "viewAudit"],
  [Role.COMMITTEE_MEMBER]: ["viewFinance", "writeEvents", "writePeople"],
  [Role.VIEWER]: ["viewFinance"],
  [Role.RECIPIENT]: [],
};

export function can(role: Role | string, permission: Permission): boolean {
  return (matrix[role as Role] ?? []).includes(permission);
}

export function assertCan(role: Role | string, permission: Permission) {
  if (!can(role, permission)) {
    throw new Error("You do not have permission to do that.");
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
