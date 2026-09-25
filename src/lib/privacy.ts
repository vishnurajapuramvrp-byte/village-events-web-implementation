import { Role } from "@/lib/enums";

const phoneAccessRoles = new Set<Role>([Role.ADMIN, Role.TREASURER, Role.COMMITTEE_MEMBER]);

export function canViewPhone(user: { role: Role | string; personId?: string | null }, personId?: string | null) {
  return phoneAccessRoles.has(user.role as Role) || Boolean(personId && user.personId === personId);
}

export function maskPhone(phone: string | null | undefined) {
  if (!phone) return "No phone";
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return "****";
  return `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
}
