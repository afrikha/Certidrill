import path from "node:path";
import os from "node:os";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { afterAll, describe, expect, it } from "vitest";
import { ContentError, loadCertification } from "@/lib/content/loader";
import { formatProblem, loadCourse, parseChapter, validateCourse } from "@/lib/content/course";
import { courseFileSchema } from "@/lib/content/schema";

const AZ104 = path.resolve(__dirname, "../../content/az-104");
const roots: string[] = [];
afterAll(() => Promise.all(roots.map((r) => rm(r, { recursive: true, force: true }))));

/** A copy of the AZ-104 referential and course, changed by `change`, then checked. */
async function check(change: (dir: string) => Promise<unknown> = async () => undefined) {
  const root = await mkdtemp(path.join(os.tmpdir(), "course-"));
  roots.push(root);
  const dir = path.join(root, "az-104");
  await mkdir(dir);
  await Promise.all(["blueprint.yaml", "objectives.yaml", "course"].map((f) => cp(path.join(AZ104, f), path.join(dir, f), { recursive: true })));
  await change(dir);
  const report = await validateCourse(await loadCertification(dir));
  // Paths relative to course/, with "/" on every system.
  const course = path.join(dir, "course");
  return report!.problems.map((p) => `${path.relative(course, p.file).split(path.sep).join("/")}${p.line ? `:${p.line}` : ""}: ${p.message}`);
}

/** Rewrites a file of the course (path relative to course/). */
async function edit(dir: string, file: string, change: (text: string) => string) {
  const p = path.join(dir, "course", file);
  await writeFile(p, change(await readFile(p, "utf8")));
}
const both = (dir: string, chapter: string, change: (text: string) => string) =>
  Promise.all(["en", "fr"].map((l) => edit(dir, `chapters/${chapter}.${l}.md`, change)));

/** The first chapter whose French file contains `text`. */
async function chapterWith(text: string): Promise<string> {
  const files = (await readdir(path.join(AZ104, "course/chapters"))).filter((f) => f.endsWith(".fr.md")).sort();
  for (const f of files) if ((await readFile(path.join(AZ104, "course/chapters", f), "utf8")).includes(text)) return f.replace(".fr.md", "");
  throw new Error(`no chapter contains ${text}`);
}

describe("the delivered AZ-104 course", () => {
  it("loads 16 chapters and 107 sections covering the 81 objectives, in both languages", async () => {
    const course = (await loadCourse(await loadCertification(AZ104)))!;
    expect(course.chapters).toHaveLength(16);
    const sections = course.chapters.flatMap((c) => c.sections);
    expect(sections).toHaveLength(107);
    expect(new Set(sections.flatMap((s) => s.objectives)).size).toBe(81);
    expect(course.chapters.filter((c) => c.free).map((c) => c.id)).toEqual(["00-getting-started", "11-entra-users-groups"]);
    expect(course.chapters.every((c) => c.status === "draft")).toBe(true);

    const rbac = course.chapters.find((c) => c.id === "12-rbac")!;
    expect(rbac.module).toBe("identities");
    expect(rbac.summary.en).not.toContain("<!--");
    expect(rbac.sections[0]).toMatchObject({ id: "rbac-model", objectives: ["1.2.1"], title: { en: "The model: who, what, where", fr: "Le modèle : qui, quoi, où" } });
    // The body is the Markdown after the heading, up to the next marker.
    expect(rbac.sections[0]!.body.en).not.toMatch(/^## |<!-- section/m);
    expect(rbac.sections[0]!.body.fr.startsWith("Une **attribution de rôle** relie trois éléments")).toBe(true);
    expect(rbac.summary.fr.startsWith("Le contrôle d'accès en fonction du rôle Azure")).toBe(true);
  });

  it("passes every check", async () => {
    expect(await check()).toEqual([]);
  });

  it("is absent from a certification without course folder", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "course-"));
    roots.push(root);
    const dir = path.join(root, "az-104");
    await mkdir(dir);
    await Promise.all(["blueprint.yaml", "objectives.yaml"].map((f) => cp(path.join(AZ104, f), path.join(dir, f))));
    const content = await loadCertification(dir);
    expect(await validateCourse(content)).toBeNull();
    expect(await loadCourse(content)).toBeNull();
  });
});

describe("course checks — files", () => {
  it("needs both languages of every chapter", async () => {
    expect(await check((dir) => rm(path.join(dir, "course/chapters/12-rbac.fr.md")))).toEqual(['chapters/12-rbac.fr.md: missing: chapter "12-rbac" has no fr file']);
  });

  it("refuses a file that is not a chapter of the manifest", async () => {
    expect(await check((dir) => writeFile(path.join(dir, "course/chapters/99-extra.en.md"), "Text.\n"))).toEqual(["chapters/99-extra.en.md: orphan file (not a chapter file of course.yaml)"]);
  });
});

describe("course checks — EN/FR parity", () => {
  it("needs the same sections in both languages", async () => {
    // The French file loses its second section.
    const problems = await check((dir) => edit(dir, "chapters/12-rbac.fr.md", (t) => t.replace(/<!-- section: built-in-roles[\s\S]*?(?=<!-- section)/, "")));
    expect(problems).toEqual([expect.stringContaining("12-rbac.fr.md: sections differ from English: en [rbac-model, built-in-roles,")]);
  });

  it("needs the same objectives", async () => {
    const problems = await check((dir) => edit(dir, "chapters/12-rbac.fr.md", (t) => t.replace("section: rbac-model | objectives: 1.2.1 -->", "section: rbac-model | objectives: 1.2.1, 1.2.2 -->")));
    expect(problems).toEqual(['chapters/12-rbac.fr.md:3: section "rbac-model": objectives differ from English (en 1.2.1, fr 1.2.1, 1.2.2)']);
  });

  it("needs identical code blocks, comments included", async () => {
    const problems = await check((dir) => edit(dir, "chapters/12-rbac.fr.md", (t) => t.replace("# Managed identity: use the object ID", "# Identité managée : utiliser l'ID d'objet")));
    expect(problems).toEqual([expect.stringMatching(/^chapters\/12-rbac\.fr\.md:\d+: section "[a-z-]+": code block \d+ differs from English/)]);
  });

  it("needs as many code blocks", async () => {
    const problems = await check((dir) => edit(dir, "chapters/12-rbac.fr.md", (t) => t.replace(/```json[\s\S]*?```\n/, "")));
    expect(problems).toEqual([expect.stringMatching(/section "rbac-model": 0 code block\(s\), 1 in English/)]);
  });

  it("needs the same table rows and columns", async () => {
    // The first table of the French file loses a row.
    const problems = await check((dir) => edit(dir, "chapters/12-rbac.fr.md", (t) => t.replace(/(\| --- \| --- \| --- \|\n)\|[^\n]*\n/, "$1")));
    expect(problems).toEqual([expect.stringMatching(/section "rbac-model": tables \(rows×columns\) differ from English: en \[4×3.*\], fr \[3×3/)]);
  });

  it("needs the same callouts", async () => {
    const chapter = await chapterWith("**Piège d'examen.**");
    const problems = await check((dir) => edit(dir, `chapters/${chapter}.fr.md`, (t) => t.replace("> **Piège d'examen.**", "> Piège d'examen.")));
    expect(problems).toEqual([expect.stringMatching(/callouts differ from English: en \[.*trap.*\], fr \[/)]);
  });
});

describe("course checks — objectives", () => {
  it("knows every objective code", async () => {
    const problems = await check((dir) => both(dir, "12-rbac", (t) => t.replace("objectives: 1.2.1 -->", "objectives: 1.2.1, 9.9.9 -->")));
    expect(problems).toEqual(['chapters/12-rbac.en.md:3: section "rbac-model": unknown objective 9.9.9']);
  });

  it("keeps each objective in its chapter's domain", async () => {
    const problems = await check((dir) => both(dir, "12-rbac", (t) => t.replace("objectives: 1.2.1 -->", "objectives: 1.2.1, 2.1.1 -->")));
    expect(problems).toEqual(['chapters/12-rbac.en.md:3: section "rbac-model": objective 2.1.1 belongs to domain "storage", the chapter to module "identities"']);
  });

  it("allows no objective in the introduction", async () => {
    const problems = await check((dir) => both(dir, "00-getting-started", (t) => t.replace("<!-- section: exam-format -->", "<!-- section: exam-format | objectives: 1.1.1 -->")));
    expect(problems).toEqual(['chapters/00-getting-started.en.md:3: section "exam-format": objective 1.1.1 belongs to domain "identities", the chapter to module "intro"']);
  });

  it("covers every objective of the referential", async () => {
    const problems = await check(async (dir) => {
      const file = path.join(dir, "objectives.yaml");
      const text = await readFile(file, "utf8");
      await writeFile(file, text.replace('- { code: "1.1.1",', '- { code: "1.1.9", en: Extra, fr: "Extra" }\n      - { code: "1.1.1",'));
    });
    expect(problems).toEqual(["course.yaml: objective 1.1.9 (identities) is covered by no section"]);
  });
});

describe("course checks — Markdown", () => {
  // One check per test: each one copies and validates the whole course.
  it("needs a level-2 heading after each marker", async () => {
    expect(await check((dir) => edit(dir, "chapters/12-rbac.en.md", (t) => t.replace("## The model: who, what, where", "The model: who, what, where")))).toEqual([
      'chapters/12-rbac.en.md:3: section "rbac-model": the marker must be followed by a level-2 heading',
    ]);
  });

  it("needs a marker before each level-2 heading", async () => {
    expect(await check((dir) => edit(dir, "chapters/12-rbac.en.md", (t) => t.replace("<!-- section: rbac-model | objectives: 1.2.1 -->\n", "")))).toEqual(
      expect.arrayContaining(["chapters/12-rbac.en.md:3: level-2 heading without a section marker before it"]),
    );
  });

  it.each([
    ["# Title", /12-rbac\.en\.md:\d+: level-1 heading/],
    ["### Detail", /12-rbac\.en\.md:\d+: level-3 heading \(sections use level 2 only\)/],
  ])("refuses the heading %s", async (heading, message) => {
    expect(await check((dir) => edit(dir, "chapters/12-rbac.en.md", (t) => t.replace("A **role assignment**", `${heading}\n\nA **role assignment**`)))).toEqual([
      expect.stringMatching(message),
    ]);
  });

  it("refuses images", async () => {
    expect(await check((dir) => edit(dir, "chapters/12-rbac.en.md", (t) => t.replace("A **role assignment**", "![Diagram](https://example.com/d.png)\n\nA **role assignment**")))).toEqual([
      expect.stringMatching(/12-rbac\.en\.md:\d+: image/),
    ]);
  });

  it("refuses `<` outside code, HTML included", async () => {
    expect(await check((dir) => edit(dir, "chapters/12-rbac.en.md", (t) => t.replace("A **role assignment**", "A <b>role</b> **role assignment**")))).toEqual([
      expect.stringMatching(/12-rbac\.en\.md:\d+: `<` outside code/),
    ]);
  });

  it("allows `<` in code", async () => {
    expect(await check((dir) => both(dir, "12-rbac", (t) => t.replace("**role assignment**", "**role assignment** (`a < b`) **attribution de rôle**")))).toEqual([]);
  });

  const link = (target: string) => (t: string) => t.replace("A **role assignment**", `See [this](${target}). A **role assignment**`);
  it.each([
    ["javascript:alert(1)", /12-rbac\.en\.md:\d+: link to "javascript:alert\(1\)" \(only https:\/\/ links and #anchors\)/],
    ["http://example.com", /12-rbac\.en\.md:\d+: link to "http:\/\/example\.com"/],
  ])("refuses a link to %s", async (target, message) => {
    expect(await check((dir) => edit(dir, "chapters/12-rbac.en.md", link(target)))).toEqual([expect.stringMatching(message)]);
  });

  it("refuses a link definition to data:", async () => {
    expect(await check((dir) => edit(dir, "chapters/12-rbac.en.md", (t) => `${t}\n[ref]: data:text/html,x\n`))).toEqual([
      expect.stringMatching(/12-rbac\.en\.md:\d+: link to "data:text\/html,x"/),
    ]);
  });

  it.each(["https://learn.microsoft.com/en-us/azure/", "#scopes"])("allows a link to %s", async (target) => {
    expect(await check((dir) => both(dir, "12-rbac", link(target)))).toEqual([]);
  });

  it("allows only the course's code languages", async () => {
    expect(await check((dir) => both(dir, "12-rbac", (t) => t.replace("```json", "```js")))).toEqual([
      expect.stringMatching(/12-rbac\.en\.md:\d+: code block language "js" \(allowed: bash, powershell, json, bicep, kusto, yaml, text\)/),
      expect.stringMatching(/12-rbac\.fr\.md:\d+: code block language "js"/),
    ]);
  });

  it("needs the language of every code block", async () => {
    expect(await check((dir) => both(dir, "12-rbac", (t) => t.replace("```json", "```")))).toEqual([
      expect.stringMatching(/12-rbac\.en\.md:\d+: code block without a language/),
      expect.stringMatching(/12-rbac\.fr\.md:\d+: code block without a language/),
    ]);
  });

  it("needs closed code blocks", async () => {
    expect(await check((dir) => both(dir, "12-rbac", (t) => `${t}\n\`\`\`bash\naz group list\n`))).toEqual([
      expect.stringMatching(/12-rbac\.en\.md:\d+: code block not closed/),
      expect.stringMatching(/12-rbac\.fr\.md:\d+: code block not closed/),
    ]);
  });

  it("allows only the two callout labels of each language", async () => {
    const chapter = await chapterWith("**Piège d'examen.**");
    expect(await check((dir) => edit(dir, `chapters/${chapter}.fr.md`, (t) => t.replace("> **Piège d'examen.**", "> **Exam trap.**")))).toEqual([
      expect.stringMatching(/\.fr\.md:\d+: unknown callout label \(allowed: \*\*Piège d'examen\.\*\*, \*\*Conseil d'examen\.\*\*\)/),
      expect.stringMatching(/callouts differ from English/),
    ]);
  });
});

describe("course checks — manifest and references", () => {
  it("keeps references on Microsoft Learn", async () => {
    const problems = await check((dir) => edit(dir, "course.yaml", (t) => t.replace("https://learn.microsoft.com/en-us/entra/identity/users/groups-dynamic-membership", "https://example.com/groups")));
    expect(problems).toEqual(['course.yaml: chapter "11-entra-users-groups": reference https://example.com/groups is not on https://learn.microsoft.com/']);
  });

  it("matches the blueprint version", async () => {
    expect(await check((dir) => edit(dir, "course.yaml", (t) => t.replace("blueprintVersion: '2023-10-26'", "blueprintVersion: '2020-01-01'")))).toEqual([
      `course.yaml: blueprintVersion "2020-01-01" must be the blueprint's "2023-10-26"`,
    ]);
  });

  it("matches the certification", async () => {
    expect(await check((dir) => edit(dir, "course.yaml", (t) => t.replace("certification: az-104", "certification: az-900")))).toEqual(['course.yaml: certification "az-900" must be "az-104"']);
  });

  it("takes its modules from the blueprint's domains", async () => {
    expect(await check((dir) => edit(dir, "course.yaml", (t) => t.replace("- code: intro", "- code: welcome").replaceAll("module: intro", "module: welcome")))).toEqual([
      'course.yaml: module "welcome" is neither a domain of blueprint.yaml nor "intro"',
    ]);
  });

  it("rejects a manifest that does not match its schema", async () => {
    const problems = await check((dir) => edit(dir, "course.yaml", (t) => t.replace("- id: 12-rbac", "- id: 11-entra-users-groups")));
    expect(problems).toEqual([expect.stringMatching(/^course\.yaml: chapters\.\d+\.id: duplicate chapter id "11-entra-users-groups"/)]);
    const base = { version: 1, certification: "x", blueprintVersion: "1", modules: [{ code: "a", title: { en: "A", fr: "A" } }] };
    const chapter = { id: "c", module: "b", title: { en: "C", fr: "C" }, minutes: 5 };
    expect(courseFileSchema.safeParse({ ...base, chapters: [chapter] }).error?.issues[0]?.message).toBe('unknown module "b"');
    expect(courseFileSchema.safeParse({ ...base, chapters: [{ ...chapter, module: "a" }] }).data?.chapters[0]).toMatchObject({ status: "draft", free: false, references: [] });
  });

  it("makes loadCourse throw on the first problem", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "course-"));
    roots.push(root);
    const dir = path.join(root, "az-104");
    await mkdir(dir);
    await Promise.all(["blueprint.yaml", "objectives.yaml", "course"].map((f) => cp(path.join(AZ104, f), path.join(dir, f), { recursive: true })));
    await rm(path.join(dir, "course/chapters/12-rbac.fr.md"));
    await writeFile(path.join(dir, "course/chapters/99-extra.en.md"), "x");
    const err = await loadCourse(await loadCertification(dir)).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ContentError);
    expect((err as Error).message).toMatch(/12-rbac\.fr\.md: missing: chapter "12-rbac" has no fr file \(and 1 more: npm run content:validate\)$/);
  });
});

describe("formatProblem", () => {
  it("gives the file relative to the working directory, then the line", () => {
    const file = path.join(process.cwd(), "content", "x.en.md");
    expect(formatProblem({ file, line: 3, message: "bad" })).toBe(`${path.join("content", "x.en.md")}:3: bad`);
    expect(formatProblem({ file, message: "bad" })).toBe(`${path.join("content", "x.en.md")}: bad`);
  });
});

describe("parseChapter", () => {
  it("cuts on markers, keeps the introduction apart and ignores markers inside code", () => {
    const text = [
      "Intro paragraph.",
      "",
      "<!-- section: one | objectives: 1.1.1, 1.1.2 -->",
      "## One",
      "",
      "Body one.",
      "",
      "```text",
      "<!-- section: not-a-marker -->",
      "```",
      "",
      "<!-- section: key-points -->",
      "## Key points",
      "",
      "- Last.",
      "",
    ].join("\n");
    const chapter = parseChapter("x.en.md", text, "en");
    expect(chapter.problems).toEqual([]);
    expect(chapter.summary).toBe("Intro paragraph.");
    expect(chapter.sections.map((s) => [s.id, s.objectives, s.title])).toEqual([
      ["one", ["1.1.1", "1.1.2"], "One"],
      ["key-points", [], "Key points"],
    ]);
    expect(chapter.sections[0]!.body).toBe("Body one.\n\n```text\n<!-- section: not-a-marker -->\n```");
    expect(chapter.sections[1]!.body).toBe("- Last.");
  });

  it("reports a bad section id, a duplicate id, a missing introduction and a file without section", () => {
    const dup = parseChapter("x.en.md", "<!-- section: A_1 -->\n## A\n\nx\n\n<!-- section: b -->\n## B\n\n<!-- section: b -->\n## B2\n", "en");
    expect(dup.problems.map((p) => p.message)).toEqual([
      'section id "A_1" (lowercase letters, digits and hyphens only)',
      'section id "b" used twice',
      "no introduction paragraph before the first section",
    ]);
    expect(parseChapter("x.en.md", "Only text.\n", "en").problems.map((p) => p.message)).toEqual(["no section marker"]);
  });
});
