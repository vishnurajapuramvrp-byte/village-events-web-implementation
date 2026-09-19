import { isSqlite, runPrisma } from "./prisma-env.mjs";

if (isSqlite()) {
  console.log("SQLite local database — skipping prisma migrate deploy");
  process.exit(0);
}

runPrisma(["migrate", "deploy"]);
