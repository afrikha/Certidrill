// Starts the standalone Next.js server built by `next build` (output: standalone),
// after copying the static assets it does not include.
import { cpSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";

const root = new URL("..", import.meta.url).pathname;
cpSync(`${root}.next/static`, `${root}.next/standalone/.next/static`, { recursive: true });
if (existsSync(`${root}public`)) cpSync(`${root}public`, `${root}.next/standalone/public`, { recursive: true });
const child = spawn(process.execPath, [`${root}.next/standalone/server.js`], { stdio: "inherit", env: process.env });
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
child.on("exit", (code) => process.exit(code ?? 0));
