import { isSqlite, runPrisma } from "./prisma-env.mjs";

if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
  console.log(`Vercel ${process.env.VERCEL_ENV} deployment — skipping production database migrations`);
  process.exit(0);
}

if (process.env.VERCEL_ENV === "production") {
  const invalid = ["DATABASE_URL", "DIRECT_URL"].filter(
    (name) => !/^postgres(?:ql)?:\/\//i.test(process.env[name]?.trim() ?? ""),
  );
  if (invalid.length > 0) {
    console.error(`Production migrations require PostgreSQL URLs for: ${invalid.join(", ")}`);
    process.exit(1);
  }
}

if (isSqlite()) {
  console.log("SQLite local database — skipping prisma migrate deploy");
  process.exit(0);
}

runPrisma(["migrate", "deploy"]);
