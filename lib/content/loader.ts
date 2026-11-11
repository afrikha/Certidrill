import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { blueprintFileSchema, objectivesFileSchema, type BlueprintFile, type ObjectivesFile } from "./schema";
import { compareCodeUnits } from "../sort";

export const CONTENT_ROOT = path.resolve(process.cwd(), "content");

export class ContentError extends Error {
  constructor(file: string, detail: string) {
    super(`${path.relative(process.cwd(), file)}: ${detail}`);
    this.name = "ContentError";
  }
}

export async function readYaml(file: string): Promise<unknown> {
  return parse(await readFile(file, "utf8"));
}

export type YamlRead = { ok: true; value: unknown } | { ok: false; error: unknown };

/**
 * Reads and parses YAML files, a few at a time (the bank has hundreds of files:
 * opening them all at once could exhaust file descriptors). Each result says
 * whether that file could be read, in the order of `files`, so that callers can
 * report problems in file order, as a sequential read would.
 */
export async function readYamlFiles(files: readonly string[], concurrency = 16): Promise<YamlRead[]> {
  const results: YamlRead[] = new Array(files.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    const i = next++;
    if (i >= files.length) return;
    results[i] = await readYaml(files[i]!).then(
      (value): YamlRead => ({ ok: true, value }),
      (error: unknown): YamlRead => ({ ok: false, error }),
    );
    return worker();
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, worker));
  return results;
}

/** Every directory of content/ holding a blueprint.yaml is a certification. */
export async function listCertificationDirs(root = CONTENT_ROOT): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const candidates = entries.filter((e) => e.isDirectory()).map((e) => path.join(root, e.name));
  const hasBlueprint = await Promise.all(candidates.map((dir) => exists(path.join(dir, "blueprint.yaml"))));
  return candidates.filter((_, i) => hasBlueprint[i]).sort(compareCodeUnits);
}

export interface CertificationContent {
  dir: string;
  blueprint: BlueprintFile;
  objectives: ObjectivesFile;
}

export async function loadCertification(dir: string): Promise<CertificationContent> {
  const bpFile = path.join(dir, "blueprint.yaml");
  const objFile = path.join(dir, "objectives.yaml");
  const blueprint = parseWith(blueprintFileSchema, await readYaml(bpFile), bpFile);
  const objectives = parseWith(objectivesFileSchema, await readYaml(objFile), objFile);

  if (path.basename(dir) !== blueprint.certification.code) {
    throw new ContentError(bpFile, `certification.code "${blueprint.certification.code}" must match its folder name`);
  }
  checkObjectives(blueprint, objectives, objFile);
  return { dir, blueprint, objectives };
}

/** Objectives cover exactly the blueprint's domains, with unique codes. */
function checkObjectives(blueprint: BlueprintFile, objectives: ObjectivesFile, objFile: string): void {
  const domainCodes = new Set(blueprint.domains.map((d) => d.code));
  for (const code of Object.keys(objectives)) {
    if (!domainCodes.has(code)) throw new ContentError(objFile, `unknown domain "${code}"`);
  }
  for (const code of domainCodes) {
    if (!objectives[code]) throw new ContentError(objFile, `domain "${code}" has no objectives`);
  }
  const seen = new Set<string>();
  for (const o of Object.values(objectives).flatMap((groups) => groups.flatMap((g) => g.objectives))) {
    if (seen.has(o.code)) throw new ContentError(objFile, `duplicate objective code "${o.code}"`);
    seen.add(o.code);
  }
}

export function parseWith<T>(schema: { safeParse(v: unknown): { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } } }, value: unknown, file: string): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const detail = result.error.issues.map((i) => `${i.path.map(String).join(".") || "(root)"}: ${i.message}`).join("; ");
    throw new ContentError(file, detail);
  }
  return result.data;
}

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}
