import path from "node:path";
import { describe, expect, it } from "vitest";
import { answerIssues, maxPoints, parseResponse, questionFileSchema, type QuestionFile } from "@/lib/questions/schema";
import { applyOrder, buildOptionOrder, shuffleArray } from "@/lib/questions/order";
import { isAnswered, isComplete, type PublicBody } from "@/lib/questions/public";
import { presentQuestion } from "@/lib/questions/present";
import { renderInline, renderMarkdown } from "@/lib/markdown";
import { loadCertification } from "@/lib/content/loader";
import { loadBank } from "@/lib/content/bank";

const base = {
  id: "sample-question",
  objective: "1.1.1",
  difficulty: 2,
  stem: { en: "Stem", fr: "Énoncé" },
  explanation: { correct: { en: "Because", fr: "Parce que" } },
  references: [{ title: "Doc", url: "https://learn.microsoft.com/en-us/azure/" }],
};

function seeded(seed = 1) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

describe("question file schema", () => {
  it("accepts a valid question of each type", () => {
    const samples: unknown[] = [
      { ...base, type: "single", body: { options: [{ id: "a", text: "A" }, { id: "b", text: "B" }] }, answer: { optionId: "a" } },
      { ...base, type: "multi", body: { choose: 2, options: [{ id: "a", text: "A" }, { id: "b", text: "B" }, { id: "c", text: "C" }] }, answer: { optionIds: ["a", "b"] } },
      { ...base, type: "yesno_statements", body: { statements: [{ id: "s1", text: "x" }, { id: "s2", text: "y" }] }, answer: { values: { s1: true, s2: false } } },
      { ...base, type: "dropdown", body: { layout: "code", template: "cmd [[x]]", slots: [{ id: "x", options: [{ id: "a", text: "A" }, { id: "b", text: "B" }] }] }, answer: { values: { x: "a" } } },
      { ...base, type: "dragdrop", body: { items: [{ id: "i1", text: "1" }, { id: "i2", text: "2" }], targets: [{ id: "t1", text: "T" }] }, answer: { mapping: { t1: "i2" } } },
      { ...base, type: "ordering", body: { count: 2, actions: ["a", "b", "c", "d"].map((id) => ({ id, text: id })) }, answer: { sequence: ["b", "a"] } },
      { ...base, type: "hotarea", body: { prompts: [{ id: "p", text: "P" }], grid: { rows: [[{ text: "x", area: "a1" }, { text: "y", area: "a2" }]] } }, answer: { values: { p: "a2" } } },
      { ...base, type: "series_yesno", series: "s", seriesOrder: 1, body: { solution: "Do X" }, answer: { value: false } },
    ];
    for (const s of samples) {
      const r = questionFileSchema.safeParse(s);
      expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
    }
  });

  it("rejects answers inconsistent with the body", () => {
    const bad: unknown[] = [
      { ...base, type: "single", body: { options: [{ id: "a", text: "A" }, { id: "b", text: "B" }] }, answer: { optionId: "z" } },
      { ...base, type: "multi", body: { choose: 2, options: [{ id: "a", text: "A" }, { id: "b", text: "B" }, { id: "c", text: "C" }] }, answer: { optionIds: ["a"] } },
      { ...base, type: "dropdown", body: { layout: "text", template: "no marker", slots: [{ id: "x", options: [{ id: "a", text: "A" }, { id: "b", text: "B" }] }] }, answer: { values: { x: "a" } } },
      { ...base, type: "dragdrop", body: { reuse: false, items: [{ id: "i1", text: "1" }, { id: "i2", text: "2" }], targets: [{ id: "t1", text: "T" }, { id: "t2", text: "U" }] }, answer: { mapping: { t1: "i1", t2: "i1" } } },
      { ...base, type: "ordering", body: { count: 2, actions: ["a", "b", "c", "d"].map((id) => ({ id, text: id })) }, answer: { sequence: ["a", "a"] } },
      { ...base, type: "hotarea", body: { prompts: [{ id: "p", text: "P" }], grid: { rows: [[{ area: "a1" }, { area: "a2" }]] } }, answer: { values: {} } },
      { ...base, type: "series_yesno", body: { solution: "Do X" }, answer: { value: false } },
      { ...base, type: "single", series: "s", body: { options: [{ id: "a", text: "A" }, { id: "b", text: "B" }] }, answer: { optionId: "a" } },
      { ...base, type: "single", body: { options: [{ id: "a", text: "A" }, { id: "a", text: "B" }] }, answer: { optionId: "a" } },
      { ...base, references: [], type: "single", body: { options: [{ id: "a", text: "A" }, { id: "b", text: "B" }] }, answer: { optionId: "a" } },
    ];
    for (const s of bad) expect(questionFileSchema.safeParse(s).success, JSON.stringify(s)).toBe(false);
  });

  it("reports precise answer issues", () => {
    expect(answerIssues({ type: "ordering", body: { count: 3, actions: [{ id: "a" }, { id: "b" }] }, answer: { sequence: ["a", "b"] } })).toContain(
      "sequence must contain exactly 3 actions",
    );
  });

  it("computes max points per type (spec §5)", () => {
    expect(maxPoints("single", {})).toBe(1);
    expect(maxPoints("multi", { choose: 3 })).toBe(3);
    expect(maxPoints("yesno_statements", { statements: [1, 2, 3] })).toBe(3);
    expect(maxPoints("dropdown", { slots: [1, 2] })).toBe(2);
    expect(maxPoints("dragdrop", { targets: [1, 2, 3, 4] })).toBe(4);
    expect(maxPoints("ordering", {})).toBe(1);
    expect(maxPoints("hotarea", { prompts: [1, 2] })).toBe(2);
    expect(maxPoints("series_yesno", {})).toBe(1);
  });

  it("validates candidate responses", () => {
    expect(parseResponse("single", { optionId: "a" }).success).toBe(true);
    expect(parseResponse("single", { optionId: 3 }).success).toBe(false);
    expect(parseResponse("ordering", { sequence: ["a", "b"] }).success).toBe(true);
    expect(parseResponse("series_yesno", { value: "yes" }).success).toBe(false);
  });
});

describe("option order", () => {
  const body = { options: ["a", "b", "c", "d", "e"].map((id) => ({ id, text: id })) };

  it("is deterministic for a given random source and keeps every id", () => {
    const o1 = buildOptionOrder("single", body, true, seeded(42));
    const o2 = buildOptionOrder("single", body, true, seeded(42));
    expect(o1).toEqual(o2);
    expect([...o1.options!].sort()).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("respects shuffle: false, except for ordering questions", () => {
    expect(buildOptionOrder("single", body, false, seeded(1)).options).toEqual(["a", "b", "c", "d", "e"]);
    const actions = { actions: body.options, count: 2 };
    const lists = Array.from({ length: 5 }, (_, i) => buildOptionOrder("ordering", actions, false, seeded(i + 2)).actions!.join(""));
    expect(lists.some((l) => l !== "abcde")).toBe(true);
  });

  it("covers dropdown slots and dragdrop items; nothing for other types", () => {
    const dd = buildOptionOrder("dropdown", { slots: [{ id: "x", options: [{ id: "a" }, { id: "b" }] }] }, true, seeded(3));
    expect(Object.keys(dd)).toEqual(["slot:x"]);
    expect(Object.keys(buildOptionOrder("dragdrop", { items: [{ id: "i" }] }, true, seeded(3)))).toEqual(["items"]);
    expect(buildOptionOrder("hotarea", {}, true, seeded(3))).toEqual({});
  });

  it("applies a frozen order and tolerates unknown ids", () => {
    const list = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(applyOrder(list, ["c", "zz", "a"]).map((x) => x.id)).toEqual(["c", "a", "b"]);
    expect(applyOrder(list, undefined).map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(shuffleArray([], seeded(1))).toEqual([]);
  });
});

describe("completeness", () => {
  const multi: PublicBody = { type: "multi", choose: 2, options: [] };
  it("detects complete and answered responses", () => {
    expect(isComplete(multi, { optionIds: ["a"] })).toBe(false);
    expect(isComplete(multi, { optionIds: ["a", "b"] })).toBe(true);
    expect(isComplete({ type: "series_yesno", solutionHtml: "" }, { value: false })).toBe(true);
    expect(isComplete({ type: "ordering", actions: [], count: 3 }, { sequence: ["a"] })).toBe(false);
    expect(isComplete({ type: "dragdrop", items: [], targets: [{ id: "t", html: "" }], reuse: false }, { mapping: { t: "i" } })).toBe(true);
    expect(isAnswered(null)).toBe(false);
    expect(isAnswered({ optionIds: [] })).toBe(false);
    expect(isAnswered({ values: { s1: false } })).toBe(true);
  });
});

describe("markdown", () => {
  it("drops remote images and prefixes ids and names (no DOM clobbering, no third-party requests)", async () => {
    const html = await renderMarkdown('![logo](https://tracker.example/pixel.png) <img src="https://tracker.example/x.png"> <a id="location" name="cookie">raw</a> [doc](https://learn.microsoft.com/) and a note[^1].\n\n[^1]: Footnote.');
    expect(html).not.toMatch(/<img|tracker\.example/);
    expect(html).not.toMatch(/(id|name)="(location|cookie)"/);
    // Generated ids (footnotes) keep the anti-clobbering prefix.
    expect(html).toMatch(/id="user-content-/);
    expect(html).not.toMatch(/ id="(?!user-content-)/);
    expect(html).toContain('href="https://learn.microsoft.com/"');
  });

  it("sanitizes HTML and scripts", async () => {
    const html = await renderMarkdown('Hello <script>alert(1)</script> <img src="x" onerror="alert(1)"> [x](javascript:alert(1))');
    expect(html).not.toMatch(/<script|onerror|javascript:/);
  });

  it("highlights code blocks and renders tables", async () => {
    const html = await renderMarkdown("| a | b |\n| - | - |\n| 1 | 2 |\n\n```powershell\nGet-AzVM -Name vm1\n```");
    expect(html).toContain("<table>");
    expect(html).toContain('data-language="powershell"');
    expect(html).toContain("Get-AzVM");
  });

  it("renders inline markdown without a paragraph", async () => {
    expect(await renderInline("Use `az vm list`")).toBe("Use <code>az vm list</code>");
  });
});

describe("AZ-104 sample bank", () => {
  it("validates, covers the 8 types with 3 questions each, and presents without leaking answers", async () => {
    const content = await loadCertification(path.resolve(__dirname, "../../content/az-104"));
    const bank = await loadBank(content);
    const counts = new Map<string, number>();
    for (const q of bank.questions) counts.set(q.type, (counts.get(q.type) ?? 0) + 1);
    expect(counts.size).toBe(8);
    for (const n of counts.values()) expect(n).toBeGreaterThanOrEqual(3);

    for (const q of bank.questions as (QuestionFile & { domain: string })[]) {
      for (const locale of ["en", "fr"] as const) {
        const pub = await presentQuestion(q, locale, buildOptionOrder(q.type, q.body, q.shuffle, seeded(7)));
        const json = JSON.stringify(pub);
        expect(json).not.toContain('"answer"');
        expect(json).not.toContain(JSON.stringify(q.explanation.correct[locale]).slice(1, -1));
        expect(pub.maxPoints).toBe(maxPoints(q.type, q.body));
      }
    }
  }, 120_000); // renders the whole bank (≈ 600 questions × 2 languages)
});
