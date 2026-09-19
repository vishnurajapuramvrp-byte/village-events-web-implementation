import { runPrisma } from "./prisma-env.mjs";

runPrisma(["db", "push"]);
