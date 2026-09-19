import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function applyEnvFile(fileName) {
  const file = path.join(root, fileName);
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

applyEnvFile(".env");
applyEnvFile(".env.local");

export function isSqlite() {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("file:") || url.includes("mode=memory");
}

export function schemaPath() {
  return isSqlite() ? "prisma/schema.sqlite.prisma" : "prisma/schema.prisma";
}

export function ensureDirectUrl() {
  if (!isSqlite() && !process.env.DIRECT_URL && process.env.DATABASE_URL) {
    process.env.DIRECT_URL = process.env.DATABASE_URL;
  }
}

export function runPrisma(args) {
  ensureDirectUrl();
  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["prisma", ...args, "--schema", schemaPath()],
    { stdio: "inherit", cwd: root, shell: true, env: process.env },
  );
  process.exit(result.status ?? 1);
}
