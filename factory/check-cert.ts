/** npx tsx factory/check-cert.ts <cert> [chapter-id ...]  — referential + course problems (optionally only for the given chapter ids). */
import path from "node:path";
import { loadCertification } from "../lib/content/loader";
import { validateCourse } from "../lib/content/course";
const [cert, ...only] = process.argv.slice(2);
const content = await loadCertification(path.resolve("content", cert!));
const objectives = Object.values(content.objectives).flat().reduce((n, g) => n + g.objectives.length, 0);
console.log(`referential OK: ${cert} v${content.blueprint.blueprint.version}, ${content.blueprint.domains.length} domains, ${objectives} objectives`);
const report = await validateCourse(content);
if (!report) { console.log("no course/ folder"); process.exit(0); }
const mine = report.problems.filter((p) => only.length === 0 || only.some((id) => path.basename(p.file).startsWith(id)));
console.log(`course problems${only.length ? " (your chapters)" : ""}: ${mine.length} (all chapters: ${report.problems.length})`);
for (const p of mine.slice(0, 60)) console.log(` - ${path.basename(p.file)}${p.line ? ":" + p.line : ""} ${p.message}`);
