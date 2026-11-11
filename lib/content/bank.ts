import { readdir } from "node:fs/promises";
import path from "node:path";
import { ContentError, parseWith, readYaml, type CertificationContent } from "./loader";
import { caseStudyFileSchema, questionFileSchema, seriesFileSchema, type CaseStudyFile, type QuestionFile, type SeriesFile } from "@/lib/questions/schema";

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
    .sort();
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

  const caseStudies = [];
  for (const file of await yamlFiles(path.join(content.dir, "case-studies"))) {
    const cs = parseWith(caseStudyFileSchema, await readYaml(file), file);
    checkFileName(file, cs.id);
    caseStudies.push({ ...cs, file });
  }
  const series = [];
  for (const file of await yamlFiles(path.join(content.dir, "series"))) {
    const s = parseWith(seriesFileSchema, await readYaml(file), file);
    checkFileName(file, s.id);
    series.push({ ...s, file });
  }

  const ids = new Set<string>([...caseStudies.map((c) => c.id), ...series.map((s) => s.id)]);
  if (ids.size !== caseStudies.length + series.length) throw new ContentError(content.dir, "case study and series ids must be unique");

  const questions = [];
  const seriesOrders = new Map<string, Set<number>>();
  const questionsRoot = path.join(content.dir, "questions");
  for (const file of await yamlFiles(questionsRoot)) {
    const q = parseWith(questionFileSchema, await readYaml(file), file);
    checkFileName(file, q.id);
    if (ids.has(q.id)) throw new ContentError(file, `duplicate id "${q.id}"`);
    ids.add(q.id);

    const domain = objectiveDomain.get(q.objective);
    if (!domain) throw new ContentError(file, `unknown objective "${q.objective}"`);
    const folder = path.relative(questionsRoot, file).split(path.sep)[0];
    if (folder !== domain) throw new ContentError(file, `objective ${q.objective} belongs to domain "${domain}", but the file is in "${folder}/"`);

    if (q.caseStudy && !caseStudies.some((c) => c.id === q.caseStudy)) throw new ContentError(file, `unknown case study "${q.caseStudy}"`);
    if (q.series) {
      if (!series.some((s) => s.id === q.series)) throw new ContentError(file, `unknown series "${q.series}"`);
      if (q.seriesOrder === undefined) throw new ContentError(file, "series questions need seriesOrder");
      const orders = seriesOrders.get(q.series) ?? new Set();
      if (orders.has(q.seriesOrder)) throw new ContentError(file, `seriesOrder ${q.seriesOrder} is used twice in series "${q.series}"`);
      orders.add(q.seriesOrder);
      seriesOrders.set(q.series, orders);
    }
    questions.push({ ...q, file, domain });
  }
  return { questions, caseStudies, series };
}

function checkFileName(file: string, id: string) {
  if (path.basename(file).replace(/\.ya?ml$/, "") !== id) throw new ContentError(file, `file name must be "${id}.yaml"`);
}
