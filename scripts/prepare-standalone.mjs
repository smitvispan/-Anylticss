import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standaloneDir = join(root, ".next", "standalone");

if (!existsSync(standaloneDir)) {
  throw new Error("Missing .next/standalone. Run next build with output: 'standalone' first.");
}

const publicDir = join(root, "public");
if (existsSync(publicDir)) {
  cpSync(publicDir, join(standaloneDir, "public"), { recursive: true });
}

const staticDir = join(root, ".next", "static");
if (existsSync(staticDir)) {
  const standaloneNextDir = join(standaloneDir, ".next");
  mkdirSync(standaloneNextDir, { recursive: true });
  cpSync(staticDir, join(standaloneNextDir, "static"), { recursive: true });
}

console.log("Prepared standalone Next.js server assets.");
