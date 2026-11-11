import { readdir } from "node:fs/promises";
import path from "node:path";
import { ContentError, parseWith, readYamlFiles, type CertificationContent } from "./loader";
import { caseStudyFileSchema, questionFileSchema, seriesFileSchema, type CaseStudyFile, type QuestionFile, type SeriesFile } from "@/lib/questions/schema";
import { compareCodeUnits } from "@/lib/sort";

export interface QuestionBank {
  questions: (QuestionFile & { file: string; domain: string })[];
  caseStudies: (CaseStudyFile & { file: string })[];
  series: (SeriesFile & { file: string })[];
}

async function yamlFiles(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true, recursive: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile() && /\.ya?ml$/.test(e.name))
    .map((e) => path.join(e.parentPath, e.name))
    .sort(compareCodeUnits);
}

/**
 * Loads and cross-checks the question bank of a certification:
 * questions/<domain>/<id>.yaml, case-studies/<id>.yaml, series/<id>.yaml.
 * Throws a ContentError naming the faulty file on the first problem.
 */
export async function loadBank(content: CertificationContent): Promise<QuestionBank> {
  const objectiveDomain = new Map<string, string>();
  for (const [domain, groups] of Object.entries(content.objectives)) {
    for (const g of groups) for (const o of g.objectives) objectiveDomain.set(o.code, domain);
  }

  const caseStudies = await loadFiles(path.join(content.dir, "case-studies"), (raw, file) => {
    const cs = parseWith(caseStudyFileSchema, raw, file);
    checkFileName(file, cs.id);
    return { ...cs, file };
  });
  const series = await loadFiles(path.join(content.dir, "series"), (raw, file) => {
    const s = parseWith(seriesFileSchema, raw, file);
    checkFileName(file, s.id);
    return { ...s, file };
  });
  const ids = new Set<string>([...caseStudies.map((c) => c.id), ...series.map((s) => s.id)]);
  if (ids.size !== caseStudies.length + series.length) throw new ContentError(content.dir, "case study and series ids must be unique");

  const seriesOrders = new Map<string, Set<number>>();
  const questionsRoot = path.join(content.dir, "questions");
  const questions = await loadFiles(questionsRoot, (raw, file) => {
    const q = parseWith(questionFileSchema, raw, file);
    checkFileName(file, q.id);
    if (ids.has(q.id)) throw new ContentError(file, `duplicate id "${q.id}"`);
    ids.add(q.id);
    const domain = questionDomain(q, file, questionsRoot, objectiveDomain);
    if (q.caseStudy && !caseStudies.some((c) => c.id === q.caseStudy)) throw new ContentError(file, `unknown case study "${q.caseStudy}"`);
    if (q.series) checkSeriesMember(q.series, q.seriesOrder, file, series, seriesOrders);
    return { ...q, file, domain };
  });
  return { questions, caseStudies, series };
}

/** Reads every YAML file of a folder (sorted) and checks each one, in order. */
async function loadFiles<T>(dir: string, check: (raw: unknown, file: string) => T): Promise<T[]> {
  const files = await yamlFiles(dir);
  const reads = await readYamlFiles(files);
  return files.map((file, i) => {
    const read = reads[i]!;
    if (!read.ok) throw read.error;
    return check(read.value, file);
  });
}

/** The domain of a question's objective, which must also be its folder. */
function questionDomain(q: QuestionFile, file: string, questionsRoot: string, objectiveDomain: Map<string, string>): string {
  const domain = objectiveDomain.get(q.objective);
  if (!domain) throw new ContentError(file, `unknown objective "${q.objective}"`);
  const folder = path.relative(questionsRoot, file).split(path.sep)[0];
  if (folder !== domain) throw new ContentError(file, `objective ${q.objective} belongs to domain "${domain}", but the file is in "${folder}/"`);
  return domain;
}

function checkSeriesMember(seriesId: string, order: number | undefined, file: string, series: readonly SeriesFile[], seriesOrders: Map<string, Set<number>>): void {
  if (!series.some((s) => s.id === seriesId)) throw new ContentError(file, `unknown series "${seriesId}"`);
  if (order === undefined) throw new ContentError(file, "series questions need seriesOrder");
  const orders = seriesOrders.get(seriesId) ?? new Set();
  if (orders.has(order)) throw new ContentError(file, `seriesOrder ${order} is used twice in series "${seriesId}"`);
  orders.add(order);
  seriesOrders.set(seriesId, orders);
}

function checkFileName(file: string, id: string) {
  if (path.basename(file).replace(/\.ya?ml$/, "") !== id) throw new ContentError(file, `file name must be "${id}.yaml"`);
}
