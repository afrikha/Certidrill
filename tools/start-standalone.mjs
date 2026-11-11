// Starts the standalone Next.js server built by `next build` (output: standalone),
// after copying the static assets it does not include.
import { cpSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath, not URL.pathname: the latter gives "/C:/..." on Windows.
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
cpSync(path.join(root, ".next/static"), path.join(root, ".next/standalone/.next/static"), { recursive: true });
if (existsSync(path.join(root, "public"))) cpSync(path.join(root, "public"), path.join(root, ".next/standalone/public"), { recursive: true });
const child = spawn(process.execPath, [path.join(root, ".next/standalone/server.js")], { stdio: "inherit", env: process.env });
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
child.on("exit", (code) => process.exit(code ?? 0));
