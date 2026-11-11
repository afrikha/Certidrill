import "server-only";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema, type Options as SanitizeSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import { toString } from "hast-util-to-string";
import { createHighlighter, type Highlighter } from "shiki";
import type { Element, Root } from "hast";

/** Languages used in questions: PowerShell, Azure CLI, ARM JSON, Bicep, KQL. */
const LANGUAGES = ["powershell", "bash", "shell", "json", "bicep", "kusto", "yaml"] as const;
const ALIASES: Record<string, string> = { azcli: "bash", sh: "bash", ps: "powershell", ps1: "powershell", kql: "kusto", arm: "json" };

let highlighter: Promise<Highlighter> | undefined;
function getHighlighter() {
  highlighter ??= createHighlighter({ themes: ["github-light"], langs: [...LANGUAGES] });
  return highlighter;
}

/**
 * Sanitizer schema: GitHub's default (which keeps its "user-content-" prefix on
 * `id`/`name`, so content cannot clobber DOM globals), plus code-block language
 * classes. No images: a remote image would make the candidate's browser call a
 * third-party server (IP leak, RGPD); question content has none.
 */
const schema: SanitizeSchema = {
  ...defaultSchema,
  tagNames: (defaultSchema.tagNames ?? []).filter((t) => t !== "img"),
  attributes: {
    ...defaultSchema.attributes,
    code: [["className", /^language-[a-z0-9-]+$/]],
  },
};

/** Replaces sanitized `<pre><code class="language-x">` blocks with Shiki output. */
function rehypeShiki(hl: Highlighter) {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName !== "pre" || !parent || index === undefined) return;
      const code = node.children[0];
      if (code?.type !== "element" || code.tagName !== "code") return;
      const cls = (code.properties?.className as string[] | undefined)?.find((c) => c.startsWith("language-"));
      const raw = cls?.slice("language-".length);
      const lang = raw ? (ALIASES[raw] ?? raw) : undefined;
      if (!lang || !hl.getLoadedLanguages().includes(lang)) return;
      const hast = hl.codeToHast(toString(code).replace(/\n$/, ""), { lang, theme: "github-light" });
      const pre = hast.children[0];
      if (pre?.type === "element") {
        pre.properties = { ...pre.properties, tabIndex: 0, dataLanguage: lang };
        parent.children[index] = pre;
      }
    });
  };
}

/** Markdown → sanitized HTML (GFM tables, highlighted code blocks). */
export async function renderMarkdown(markdown: string): Promise<string> {
  const hl = await getHighlighter();
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize, schema)
    .use(rehypeShiki, hl)
    .use(rehypeStringify)
    .process(markdown);
  return String(file);
}

/** Short Markdown (option, statement) → sanitized inline HTML without the wrapping <p>. */
export async function renderInline(markdown: string): Promise<string> {
  const html = await renderMarkdown(markdown);
  const m = /^<p>([\s\S]*)<\/p>\s*$/.exec(html.trim());
  return m?.[1] ?? html;
}
