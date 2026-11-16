/**
 * Chapter statuses of a course manifest (course.yaml), changed by
 * `npm run content:status -- <status> <chapter-prefix|all> --course`.
 * The file is edited line by line so that its layout and comments stay as
 * they are; the caller checks the result against the schema before writing.
 */
import { contentStatuses } from "./schema";

export type ContentStatus = (typeof contentStatuses)[number];

export interface StatusChange {
  status: ContentStatus;
  /** Chapter id prefix, or "all". */
  prefix: string;
  /** Only chapters currently in this status. */
  from?: ContentStatus;
}

const CHAPTER = /^- id: ["']?([a-z0-9-]+)["']?\s*$/;
const STATUS = /^( {2}status: *)(\w+)(.*)$/;
const TOP_LEVEL = /^\S/;

/** Returns the new text of course.yaml and the ids of the chapters changed. */
export function setChapterStatuses(text: string, change: StatusChange): { text: string; changed: string[] } {
  const lines = text.split("\n");
  const out: string[] = [];
  const changed: string[] = [];
  let inChapters = false;
  // The chapter being read, while its status is still to be handled.
  let chapter: string | null = null;

  const selected = (id: string) => change.prefix === "all" || id.startsWith(change.prefix);
  // A chapter without a status line is a draft (the schema default): it gets one.
  const closeChapter = () => {
    if (chapter && selected(chapter) && change.status !== "draft" && (!change.from || change.from === "draft")) {
      const at = out.findLastIndex((l) => CHAPTER.test(l));
      out.splice(at + 1, 0, `  status: ${change.status}`);
      changed.push(chapter);
    }
    chapter = null;
  };

  for (const line of lines) {
    if (TOP_LEVEL.test(line) && !line.startsWith("- ")) {
      closeChapter();
      inChapters = /^chapters:\s*$/.test(line);
    } else if (inChapters && CHAPTER.test(line)) {
      closeChapter();
      chapter = CHAPTER.exec(line)![1]!;
    } else if (chapter && STATUS.test(line)) {
      const [, head, current, tail] = STATUS.exec(line)!;
      if (selected(chapter) && current !== change.status && (!change.from || current === change.from)) {
        out.push(`${head}${change.status}${tail}`);
        changed.push(chapter);
        chapter = null;
        continue;
      }
      chapter = null;
    }
    out.push(line);
  }
  closeChapter();
  return { text: out.join("\n"), changed };
}
