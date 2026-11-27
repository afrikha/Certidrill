/**
 * The `--cert` option shared by the content tools: which certification(s) of
 * content/ a command works on.
 *   --cert az-900            one certification
 *   --cert az-900,dp-900     several (or --cert repeated)
 *   --cert all               every certification of content/
 *   --cert 'all,!ckad'       every certification but ckad (a `!` code is left out)
 * The value is checked against the folders of content/ that hold a
 * blueprint.yaml, so a typo fails with the list of known codes.
 */
import path from "node:path";
import { CONTENT_ROOT, listCertificationDirs } from "../lib/content/loader";

export interface CertArgs {
  /** The certification folders asked for, in code order; null without --cert. */
  dirs: string[] | null;
  /** The other arguments, in their order. */
  rest: string[];
}

/** Splits `--cert` (or `--cert=`) out of the arguments and resolves it to folders of content/. */
export async function parseCertArgs(argv: readonly string[], root = CONTENT_ROOT): Promise<CertArgs> {
  const codes: string[] = [];
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--cert") {
      const value = argv[++i];
      if (!value || value.startsWith("--")) throw new Error("--cert expects a certification code (or all)");
      codes.push(...value.split(","));
    } else if (arg.startsWith("--cert=")) {
      codes.push(...arg.slice("--cert=".length).split(","));
    } else {
      rest.push(arg);
    }
  }
  if (codes.length === 0) return { dirs: null, rest };
  const known = await listCertificationDirs(root);
  const byCode = new Map(known.map((dir) => [path.basename(dir), dir]));
  const excluded = codes.filter((c) => c.startsWith("!")).map((c) => c.slice(1));
  const asked = codes.filter((c) => !c.startsWith("!"));
  const unknown = [...asked.filter((c) => c !== "all"), ...excluded].filter((c) => !byCode.has(c));
  if (unknown.length > 0) {
    throw new Error(`unknown certification ${unknown.join(", ")}; known: ${[...byCode.keys()].join(", ")}`);
  }
  const chosen = asked.includes("all") ? [...byCode.keys()] : asked;
  return { dirs: [...new Set(chosen)].filter((c) => !excluded.includes(c)).sort((a, b) => a.localeCompare(b)).map((c) => byCode.get(c)!), rest };
}

/** The folders asked for, or a clear error when the command needs --cert. */
export async function requireCertDirs(argv: readonly string[], usage: string, root = CONTENT_ROOT): Promise<CertArgs & { dirs: string[] }> {
  const args = await parseCertArgs(argv, root);
  if (!args.dirs) throw new Error(`--cert <code|all> is required\n${usage}`);
  return { dirs: args.dirs, rest: args.rest };
}

/** The certification a content file belongs to (content/<code>/...), if any. */
export function certOfFile(file: string, root = CONTENT_ROOT): string | undefined {
  const rel = path.relative(root, path.resolve(file)).split(path.sep);
  return rel.length > 1 && rel[0] !== ".." ? rel[0] : undefined;
}
