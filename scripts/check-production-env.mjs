if (process.env.VERCEL_ENV !== "production") {
  process.exit(0);
}

const missing = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "ADMIN_EMAIL",
  "CRON_SECRET",
].filter((name) => !process.env[name]?.trim());

const postgresUrls = ["DATABASE_URL", "DIRECT_URL"].filter((name) => {
  const value = process.env[name]?.trim();
  return value && !/^postgres(?:ql)?:\/\//i.test(value);
});
const secretValues = ["NEXTAUTH_SECRET", "CRON_SECRET"].filter(
  (name) => process.env[name]?.trim() && process.env[name].trim().length < 32,
);
const adminEmail = process.env.ADMIN_EMAIL?.trim() ?? "";
const invalidAdminEmail =
  Boolean(adminEmail) && !/^[^@\s]+@(?:gmail|googlemail)\.com$/i.test(adminEmail);
const authUrl = process.env.NEXTAUTH_URL?.trim() ?? "";
function isCanonicalHttpsUrl(value) {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return url.protocol === "https:" && url.pathname === "/" && !url.search && !url.hash;
}
const invalidAuthUrl = Boolean(authUrl) && !isCanonicalHttpsUrl(authUrl);

const problems = [
  ...missing.map((name) => `${name} is required`),
  ...postgresUrls.map((name) => `${name} must be a PostgreSQL URL`),
  ...secretValues.map((name) => `${name} must be at least 32 characters`),
  ...(invalidAdminEmail ? ["ADMIN_EMAIL must be a Gmail address"] : []),
  ...(invalidAuthUrl ? ["NEXTAUTH_URL must be a valid HTTPS URL"] : []),
  ...(process.env.NEXTAUTH_SECRET &&
  process.env.CRON_SECRET &&
  process.env.NEXTAUTH_SECRET === process.env.CRON_SECRET
    ? ["NEXTAUTH_SECRET and CRON_SECRET must be different"]
    : []),
  ...(process.env.ENABLE_DEMO_LOGIN === "true"
    ? ["ENABLE_DEMO_LOGIN must not be true in production"]
    : []),
];

if (problems.length > 0) {
  console.error(`Production environment configuration is invalid:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}

console.log("Production environment configuration is valid.");
