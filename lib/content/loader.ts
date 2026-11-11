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

/** Every directory of content/ holding a blueprint.yaml is a certification. */
export async function listCertificationDirs(root = CONTENT_ROOT): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const dirs: string[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const dir = path.join(root, e.name);
    if (await exists(path.join(dir, "blueprint.yaml"))) dirs.push(dir);
  }
  return dirs.sort(compareCodeUnits);
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
  const domainCodes = new Set(blueprint.domains.map((d) => d.code));
  for (const code of Object.keys(objectives)) {
    if (!domainCodes.has(code)) throw new ContentError(objFile, `unknown domain "${code}"`);
  }
  for (const code of domainCodes) {
    if (!objectives[code]) throw new ContentError(objFile, `domain "${code}" has no objectives`);
  }
  const seen = new Set<string>();
  for (const groups of Object.values(objectives)) {
    for (const g of groups) {
      for (const o of g.objectives) {
        if (seen.has(o.code)) throw new ContentError(objFile, `duplicate objective code "${o.code}"`);
        seen.add(o.code);
      }
    }
  }
  return { dir, blueprint, objectives };
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
