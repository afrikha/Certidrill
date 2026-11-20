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
import { localizeDocsUrl } from "@/lib/vendors";

/**
 * Highlighted languages: PowerShell, Azure CLI, ARM JSON, Bicep, KQL for Azure, and
 * application code (Python, JavaScript, TypeScript, Java) for AWS developer exams.
 */
const LANGUAGES = ["powershell", "bash", "shell", "json", "bicep", "kusto", "yaml", "python", "javascript", "typescript", "java"] as const;
const ALIASES: Record<string, string> = {
  azcli: "bash",
  sh: "bash",
  ps: "powershell",
  ps1: "powershell",
  kql: "kusto",
  arm: "json",
  py: "python",
  js: "javascript",
  ts: "typescript",
};

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
        // Shiki writes `tabindex` itself: one attribute only.
        pre.properties = { ...pre.properties, tabindex: undefined, tabIndex: 0, dataLanguage: lang };
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

/** What the course adds around the content, in the reader's language. */
export interface CourseRenderOptions {
  locale: "en" | "fr";
  /** Callout labels, as written in the chapters of that language: "Exam trap." → "trap". */
  callouts: Record<string, string>;
  /** Accessible name of a table's scrolling area, and the label of the copy buttons. */
  labels: { table: string; copy: string };
}

const el = (tagName: string, properties: Element["properties"], children: Element["children"]): Element => ({ type: "element", tagName, properties, children });

/** The callout kind of a quotation that starts with a known bold label. */
function calloutKind(node: Element, callouts: Record<string, string>): string | undefined {
  const first = node.children.find((c) => c.type === "element");
  if (first?.type !== "element" || first.tagName !== "p") return undefined;
  const strong = first.children[0];
  if (strong?.type !== "element" || strong.tagName !== "strong") return undefined;
  return callouts[toString(strong).trim()];
}

/**
 * Course presentation, after sanitizing (only elements and attributes set
 * here are added): documentation links (Microsoft Learn, AWS) in the reader's language and opened in a new
 * tab without referrer, callouts, tables in a scrolling area, and code blocks
 * that can take the focus, with a copy button shown by a script
 * (components/course/code-copy.tsx); reading needs no script.
 */
function rehypeCourse(options: CourseRenderOptions) {
  return (tree: Root) => {
    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName === "a" && typeof node.properties.href === "string" && node.properties.href.startsWith("https://")) {
        node.properties = { ...node.properties, href: localizeDocsUrl(node.properties.href, options.locale), target: "_blank", rel: ["noopener", "noreferrer"] };
        return;
      }
      if (node.tagName === "blockquote") {
        const kind = calloutKind(node, options.callouts);
        if (kind) node.properties = { ...node.properties, className: ["callout", `callout-${kind}`] };
        return;
      }
      if (!parent || index === undefined) return;
      if (node.tagName === "table") {
        // The visit goes on inside the table itself (its links).
        parent.children[index] = el("div", { className: ["table-scroll"], role: "region", tabIndex: 0, ariaLabel: options.labels.table }, [node]);
        return;
      }
      if (node.tagName === "pre") {
        node.properties = { ...node.properties, tabIndex: 0 };
        const button = el("button", { type: "button", className: ["copy-code"], dataCopy: "", hidden: true }, [{ type: "text", value: options.labels.copy }]);
        parent.children[index] = el("div", { className: ["code-block"] }, [button, node]);
        return "skip";
      }
    });
  };
}

/** A section of the course → sanitized HTML, with the course presentation (rehypeCourse). */
export async function renderCourseMarkdown(markdown: string, options: CourseRenderOptions): Promise<string> {
  const hl = await getHighlighter();
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSanitize, schema)
    .use(rehypeShiki, hl)
    .use(rehypeCourse, options)
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
