import { describe, expect, it } from "vitest";
import { renderCourseMarkdown } from "@/lib/markdown";
import { localizeDocsUrl } from "@/lib/vendors";
import { courseHtml } from "@/lib/course/render";

const options = { locale: "fr" as const, callouts: { "Piège d'examen.": "trap", "Conseil d'examen.": "tip" }, labels: { table: "Tableau", copy: "Copier" } };

describe("renderCourseMarkdown", () => {
  it("styles the two callouts, and leaves a plain quotation alone", async () => {
    const html = await renderCourseMarkdown("> **Piège d'examen.** A.\n\n> **Conseil d'examen.** B.\n\n> Plain.", options);
    expect(html).toContain('<blockquote class="callout callout-trap">');
    expect(html).toContain('<blockquote class="callout callout-tip">');
    expect(html).toMatch(/<blockquote>\s*<p>Plain\.<\/p>/);
  });

  it("puts tables in a named scrolling area and keeps the links inside them", async () => {
    const html = await renderCourseMarkdown("| a | b |\n| --- | --- |\n| [x](https://learn.microsoft.com/en-us/azure/) | 2 |", options);
    expect(html).toMatch(/^<div class="table-scroll" role="region" tabindex="0" aria-label="Tableau"><table>/);
    expect(html).toContain('<a href="https://learn.microsoft.com/fr-fr/azure/" target="_blank" rel="noopener noreferrer">x</a>');
  });

  it("makes every code block focusable once, with a copy button hidden until the script shows it", async () => {
    const html = await renderCourseMarkdown("```bash\naz vm list\n```\n\n```text\nplain\n```", options);
    expect(html.match(/<div class="code-block"><button type="button" class="copy-code" data-copy="" hidden>Copier<\/button><pre/g)).toHaveLength(2);
    expect(html.match(/tabindex="0"/g)).toHaveLength(2);
    expect(html).toContain('data-language="bash"');
  });

  it("keeps anchors in the page, and sanitizes as the rest of the site", async () => {
    const html = await renderCourseMarkdown("See [the scopes](#scopes). <script>alert(1)</script> [x](javascript:alert(1))", options);
    expect(html).toContain('<a href="#scopes">the scopes</a>');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("javascript:");
  });
});

describe("localizeDocsUrl", () => {
  it("gives Learn pages in the reader's language and leaves other sites alone", () => {
    expect(localizeDocsUrl("https://learn.microsoft.com/en-us/azure/storage/", "fr")).toBe("https://learn.microsoft.com/fr-fr/azure/storage/");
    expect(localizeDocsUrl("https://learn.microsoft.com/fr-fr/azure/storage/", "en")).toBe("https://learn.microsoft.com/en-us/azure/storage/");
    expect(localizeDocsUrl("https://example.com/en-us/x", "fr")).toBe("https://example.com/en-us/x");
  });

  it("gives AWS guides in French under /fr_fr/, and leaves aws.amazon.com alone", () => {
    expect(localizeDocsUrl("https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html", "fr")).toBe("https://docs.aws.amazon.com/fr_fr/AmazonS3/latest/userguide/Welcome.html");
    expect(localizeDocsUrl("https://docs.aws.amazon.com/fr_fr/AmazonS3/latest/userguide/Welcome.html", "en")).toBe("https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html");
    expect(localizeDocsUrl("https://docs.aws.amazon.com/fr_fr/AmazonS3/latest/userguide/Welcome.html", "fr")).toBe("https://docs.aws.amazon.com/fr_fr/AmazonS3/latest/userguide/Welcome.html");
    expect(localizeDocsUrl("https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/", "fr")).toBe("https://docs.aws.amazon.com/fr_fr/vpc/latest/userguide/");
    expect(localizeDocsUrl("https://aws.amazon.com/s3/faqs/", "fr")).toBe("https://aws.amazon.com/s3/faqs/");
    // Not the documentation: a look-alike host is left alone.
    expect(localizeDocsUrl("https://docs.aws.amazon.com.example.com/x", "fr")).toBe("https://docs.aws.amazon.com.example.com/x");
  });

  it("opens AWS links of a French course chapter in French", async () => {
    const html = await renderCourseMarkdown("See [S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html).", { locale: "fr", callouts: {}, labels: { table: "t", copy: "c" } });
    expect(html).toContain('href="https://docs.aws.amazon.com/fr_fr/AmazonS3/latest/userguide/Welcome.html"');
  });
});

describe("courseHtml", () => {
  const labels = { table: "Table", copy: "Copy" };
  it("renders a version once per language, and again when the content version changes", async () => {
    const a = courseHtml({ key: "s1", contentHash: "h1", markdown: "> **Exam tip.** Hi." }, "en", labels);
    expect(courseHtml({ key: "s1", contentHash: "h1", markdown: "ignored: same version" }, "en", labels)).toBe(a);
    expect(await a).toContain("callout-tip");
    const fr = courseHtml({ key: "s1", contentHash: "h1", markdown: "> **Conseil d'examen.** Salut." }, "fr", labels);
    expect(fr).not.toBe(a);
    expect(await fr).toContain("callout-tip");
    expect(await courseHtml({ key: "s1", contentHash: "h2", markdown: "New." }, "en", labels)).toBe("<p>New.</p>");
  });
});
