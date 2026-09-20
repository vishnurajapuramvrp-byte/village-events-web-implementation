export function isGmailAddress(email: string) {
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith("@gmail.com") || normalized.endsWith("@googlemail.com");
}

export function designatedAdminEmails() {
  const values = [process.env.ADMIN_EMAIL, process.env.ADMIN_EMAILS]
    .filter(Boolean)
    .flatMap((item) => (item ?? "").split(","))
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item && isGmailAddress(item));
  return Array.from(new Set(values));
}

export function isDesignatedAdmin(email: string) {
  return designatedAdminEmails().includes(email.trim().toLowerCase());
}
