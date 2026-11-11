import { cn } from "@/lib/utils";

/** Renders HTML that was sanitized server-side (lib/markdown.ts). */
export function Html({ html, className, inline = false }: { html: string; className?: string; inline?: boolean }) {
  const Tag = inline ? "span" : "div";
  return <Tag className={cn(!inline && "prose-q", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
