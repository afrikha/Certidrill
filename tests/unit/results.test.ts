import { describe, expect, it } from "vitest";
import { describeAnswer } from "@/lib/exam/results";

const yn: [string, string] = ["Yes", "No"];
const c = (id: string, text: string | { en: string; fr: string } = id) => ({ id, text });

describe("describeAnswer", () => {
  it("describes the expected answer of each type", async () => {
    expect(await describeAnswer("single", { options: [c("a", "Alpha")] }, { optionId: "a" }, "en", yn)).toEqual([{ html: "Alpha" }]);
    expect(await describeAnswer("multi", { options: [c("a"), c("b", "**B**")] }, { optionIds: ["a", "b"] }, "en", yn)).toEqual([{ html: "a" }, { html: "<strong>B</strong>" }]);
    expect(await describeAnswer("yesno_statements", { statements: [c("s1", { en: "One", fr: "Un" }), c("s2")] }, { values: { s1: true, s2: false } }, "fr", ["Oui", "Non"])).toEqual([
      { label: "Un", html: "Oui" },
      { label: "s2", html: "Non" },
    ]);
    expect(await describeAnswer("dropdown", { slots: [{ id: "x", options: [c("o1", "--sku")] }] }, { values: { x: "o1" } }, "en", yn)).toEqual([{ label: "1", html: "--sku" }]);
    expect(await describeAnswer("dragdrop", { items: [c("i", "Item")], targets: [c("t", "Target")] }, { mapping: { t: "i" } }, "en", yn)).toEqual([{ label: "Target", html: "Item" }]);
    expect(await describeAnswer("ordering", { actions: [c("a", "First"), c("b", "Second")] }, { sequence: ["b", "a"] }, "en", yn)).toEqual([
      { label: "1", html: "Second" },
      { label: "2", html: "First" },
    ]);
    expect(
      await describeAnswer("hotarea", { prompts: [c("p", "Pick"), c("q", "Other")], grid: { rows: [[{ text: "Cell", area: "r1" }, { area: "r2" }]] } }, { values: { p: "r1", q: "r2" } }, "en", yn),
    ).toEqual([
      { label: "Pick", html: "Cell" },
      { label: "Other", html: "r2" },
    ]);
    expect(await describeAnswer("series_yesno", {}, { value: true }, "en", yn)).toEqual([{ html: "Yes" }]);
    expect(await describeAnswer("series_yesno", {}, { value: false }, "en", yn)).toEqual([{ html: "No" }]);
  });

  it("falls back to ids when the answer key references unknown elements", async () => {
    expect(await describeAnswer("single", { options: [c("a")] }, { optionId: "zz" }, "en", yn)).toEqual([{ html: "zz" }]);
    expect(await describeAnswer("hotarea", { prompts: [c("p")], grid: { rows: [[{ area: "r1" }]] } }, { values: {} }, "en", yn)).toEqual([{ label: "p", html: "" }]);
  });
});
