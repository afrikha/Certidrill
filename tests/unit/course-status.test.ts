import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { setChapterStatuses } from "@/lib/content/course-status";
import { courseFileSchema } from "@/lib/content/schema";

const manifest = `# Comment kept as is.
version: 1
certification: az-104
blueprintVersion: '2023-10-26'
modules:
- code: intro
  title: { en: Intro, fr: Intro }
- code: identities
  title: { en: Identities, fr: Identités }
chapters:
- id: 00-getting-started
  module: intro
  status: draft               # comment kept as is
  title: { en: Start, fr: Début }
  minutes: 10
- id: 11-entra-users-groups
  module: identities
  status: reviewed
  title: { en: Users, fr: Utilisateurs }
  minutes: 15
  references:
  - title: status
    url: https://learn.microsoft.com/en-us/entra/
- id: 12-rbac
  module: identities
  title: { en: RBAC, fr: RBAC }
  minutes: 15
`;
const statuses = (text: string) => Object.fromEntries(courseFileSchema.parse(parse(text)).chapters.map((c) => [c.id, c.status]));

describe("chapter statuses in course.yaml", () => {
  it("changes the chapters of a prefix and nothing else of the file", () => {
    const { text, changed } = setChapterStatuses(manifest, { status: "published", prefix: "11-" });
    expect(changed).toEqual(["11-entra-users-groups"]);
    expect(text).toBe(manifest.replace("  status: reviewed", "  status: published"));
  });

  it("changes all chapters, keeping comments, and gives a status to a chapter without one", () => {
    const { text, changed } = setChapterStatuses(manifest, { status: "reviewed", prefix: "all" });
    expect(changed).toEqual(["00-getting-started", "12-rbac"]);
    expect(text).toContain("  status: reviewed               # comment kept as is");
    expect(text).toContain("- id: 12-rbac\n  status: reviewed\n  module: identities");
    expect(statuses(text)).toEqual({ "00-getting-started": "reviewed", "11-entra-users-groups": "reviewed", "12-rbac": "reviewed" });
  });

  it("keeps to the chapters in the --from status, a missing status counting as draft", () => {
    const { text, changed } = setChapterStatuses(manifest, { status: "needs_review", prefix: "all", from: "draft" });
    expect(changed).toEqual(["00-getting-started", "12-rbac"]);
    expect(statuses(text)).toEqual({ "00-getting-started": "needs_review", "11-entra-users-groups": "reviewed", "12-rbac": "needs_review" });
    expect(setChapterStatuses(manifest, { status: "published", prefix: "all", from: "published" })).toEqual({ text: manifest, changed: [] });
  });

  it("reads past comments and blank lines between chapters", () => {
    const commented = manifest.replace("- id: 11-entra-users-groups", "# Identities.\n\n- id: 11-entra-users-groups").replace("- id: 12-rbac", "  # RBAC next.\n- id: 12-rbac");
    const { text, changed } = setChapterStatuses(commented, { status: "published", prefix: "all" });
    expect(changed).toEqual(["00-getting-started", "11-entra-users-groups", "12-rbac"]);
    expect(text).toContain("# Identities.\n\n- id: 11-entra-users-groups");
    expect(statuses(text)).toEqual({ "00-getting-started": "published", "11-entra-users-groups": "published", "12-rbac": "published" });
  });

  it("changes nothing when the chapters already have the status", () => {
    expect(setChapterStatuses(manifest, { status: "draft", prefix: "0" })).toEqual({ text: manifest, changed: [] });
    expect(setChapterStatuses(manifest, { status: "draft", prefix: "12-rbac" })).toEqual({ text: manifest, changed: [] });
  });
});
