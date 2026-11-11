import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createRng } from "@/lib/exam/random";
import { readYamlFiles } from "@/lib/content/loader";
import { htmlToText } from "@/components/questions/plain-text";
import { withKeys } from "@/components/with-keys";

describe("createRng", () => {
  // Values produced by the reference implementation (`| 0`, charCodeAt) before
  // the rewrite: exams already drawn from a seed must be reproducible.
  const draws = (seed: string) => {
    const r = createRng(seed);
    return Array.from({ length: 5 }, () => Math.floor(r() * 2 ** 32));
  };
  it("keeps the frozen sequence of the reference implementation", () => {
    const seed = "3f2b8c1e-0d4a-4e5b-9c7a-1b2c3d4e5f60";
    expect(draws(seed)).toEqual([1407873212, 3873424128, 1678770865, 2633824417, 1456220185]);
    expect(draws(`${seed}:c2-vmss-flexible-features`)).toEqual([2794687709, 2036361576, 1046560795, 638092302, 641497505]);
  });
});

describe("htmlToText", () => {
  it.each([
    ["<code>Get-AzVM</code> and <strong>VM1</strong>", "Get-AzVM and VM1"],
    ["a <> b", "a <> b"],
    ["unclosed < tag", "unclosed < tag"],
    ["x &lt;y&gt; &amp;&amp; &quot;z&quot; &#39;q&#x27;", "x <y> && \"z\" 'q'"],
    ["&amp;lt;", "&lt;"],
    ["<a href=\"x\">link</a><", "link<"],
    ["", ""],
  ])("%j → %j (same as removing /<[^>]+>/g, then decoding)", (html, text) => {
    expect(htmlToText(html)).toBe(text);
  });
  it("stays linear on a long run of '<'", () => {
    const html = "<".repeat(100_000);
    expect(htmlToText(html)).toBe(html);
  });
});

describe("withKeys", () => {
  it("builds keys from the content and numbers repeats", () => {
    expect(withKeys(["a", "b", "a", "a"], (s) => s).map((k) => k.key)).toEqual(["a", "b", "a#1", "a#2"]);
    expect(withKeys([], String)).toEqual([]);
  });
});

describe("readYamlFiles", () => {
  it("returns results in file order, with errors in place, whatever the concurrency", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "yaml-"));
    const files = Array.from({ length: 7 }, (_, i) => path.join(dir, `f${i}.yaml`));
    files.forEach((f, i) => writeFileSync(f, i === 3 ? "a: [unclosed" : `n: ${i}\n`));
    const runs = await Promise.all([1, 2, 16].map((concurrency) => readYamlFiles([...files, path.join(dir, "missing.yaml")], concurrency)));
    for (const reads of runs) {
      expect(reads.map((r) => r.ok)).toEqual([true, true, true, false, true, true, true, false]);
      expect(reads.filter((r) => r.ok).map((r) => (r as { value: { n: number } }).value.n)).toEqual([0, 1, 2, 4, 5, 6]);
    }
    expect(await readYamlFiles([])).toEqual([]);
  });
});
