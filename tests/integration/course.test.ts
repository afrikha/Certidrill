/**
 * Course seed (docs/SPECS-COURS.md §4–5) on a real PostgreSQL: loading,
 * idempotence, content versions, removal of chapters and sections with the
 * reading progress on them, and deletion of that progress with the account.
 */
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadCertification, type CertificationContent } from "@/lib/content/loader";
import { loadCourse, type Course } from "@/lib/content/course";
import { seedCourse, seedReferential } from "@/lib/content/seed";
import { createUser } from "@/lib/users";

const db = new PrismaClient();
let content: CertificationContent;
let course: Course;

beforeAll(async () => {
  await db.$executeRawUnsafe(
    'TRUNCATE "course_progress","course_section","course_chapter","course_module","attempt_item","attempt_section","attempt","question_report","question","case_study","question_series","objective","domain","blueprint","certification","auth_account","auth_session","auth_verification_token","user" CASCADE',
  );
  content = await loadCertification(path.resolve(__dirname, "../../content/az-104"));
  course = (await loadCourse(content))!;
  await seedReferential(db, content);
});
afterAll(() => db.$disconnect());

const sections = () =>
  db.courseSection.findMany({ orderBy: [{ chapter: { order: "asc" } }, { order: "asc" }], include: { objectives: { select: { code: true } } } });
const chapters = () => db.courseChapter.findMany({ orderBy: { order: "asc" } });

/** The course with a change to one chapter, the files untouched. */
const withChapter = (id: string, change: (c: Course["chapters"][number]) => Course["chapters"][number] | null): Course => ({
  ...course,
  chapters: course.chapters.flatMap((c) => (c.id === id ? (change(c) ?? []) : [c])),
});

describe("course seed", () => {
  it("loads the 6 modules, 16 chapters and 107 sections, as drafts, with their objectives", async () => {
    const report = await seedCourse(db, content, course);
    expect(report).toEqual({ modules: 6, chapters: 16, sections: 107, changed: { chapters: 16, sections: 107 }, removed: { modules: 0, chapters: 0, sections: 0, progress: 0 } });
    expect(await db.courseModule.count()).toBe(6);
    const all = await chapters();
    expect(all.map((c) => c.code)).toEqual(course.chapters.map((c) => c.id));
    expect(all.every((c) => c.status === "draft")).toBe(true);
    expect(all.filter((c) => c.free).map((c) => c.code)).toEqual(["00-getting-started", "11-entra-users-groups"]);
    const rows = await sections();
    expect(rows).toHaveLength(107);
    expect(new Set(rows.flatMap((s) => s.objectives.map((o) => o.code))).size).toBe(81);
    const rbac = rows.find((s) => s.code === "rbac-model")!;
    expect(rbac.objectives.map((o) => o.code)).toEqual(["1.2.1"]);
    expect(rbac.title).toEqual({ en: "The model: who, what, where", fr: "Le modèle : qui, quoi, où" });
  });

  it("changes nothing when run again: same ids, same content versions, progress kept", async () => {
    const user = (await createUser(db, { email: "reader@example.com" })).id;
    const before = await sections();
    const chaptersBefore = await chapters();
    await db.courseProgress.create({ data: { userId: user, sectionId: before[0]!.id } });

    const report = await seedCourse(db, content, course);
    expect(report.changed).toEqual({ chapters: 0, sections: 0 });
    expect(report.removed).toEqual({ modules: 0, chapters: 0, sections: 0, progress: 0 });
    expect(await sections()).toEqual(before);
    expect(await chapters()).toEqual(chaptersBefore);
    expect(await db.courseProgress.count({ where: { userId: user } })).toBe(1);
  });

  it("moves the content version of a changed section only, and follows the status of course.yaml", async () => {
    const before = await sections();
    const edited = withChapter("12-rbac", (c) => ({
      ...c,
      status: "reviewed",
      sections: c.sections.map((s, i) => (i === 1 ? { ...s, body: { ...s.body, en: `${s.body.en}\n\nOne more line.` } } : s)),
    }));
    const report = await seedCourse(db, content, edited);
    expect(report.changed).toEqual({ chapters: 0, sections: 1 });
    const after = await sections();
    const moved = after.filter((s, i) => s.contentHash !== before[i]!.contentHash || s.contentUpdatedAt.getTime() !== before[i]!.contentUpdatedAt.getTime());
    expect(moved.map((s) => s.code)).toEqual(["built-in-roles"]);
    expect(after.map((s) => s.id)).toEqual(before.map((s) => s.id));
    expect((await db.courseChapter.findFirstOrThrow({ where: { code: "12-rbac" } })).status).toBe("reviewed");
    await seedCourse(db, content, course);

    // Objectives are part of the content version too.
    const objectives = withChapter("12-rbac", (c) => ({ ...c, sections: c.sections.map((s, i) => (i === 0 ? { ...s, objectives: [...s.objectives, "1.2.2"] } : s)) }));
    expect((await seedCourse(db, content, objectives)).changed).toEqual({ chapters: 0, sections: 1 });
    expect((await sections()).find((s) => s.code === "rbac-model")!.objectives.map((o) => o.code).sort()).toEqual(["1.2.1", "1.2.2"]);
    await seedCourse(db, content, course);
  });

  it("deletes a section and a chapter removed from the files, with the progress on them", async () => {
    const user = (await createUser(db, { email: "remover@example.com" })).id;
    const rbac = await db.courseChapter.findFirstOrThrow({ where: { code: "12-rbac" }, include: { sections: { orderBy: { order: "asc" } } } });
    const governance = await db.courseChapter.findFirstOrThrow({ where: { code: { not: "12-rbac" }, module: { code: "identities" }, free: false }, include: { sections: true } });
    const [kept, gone] = rbac.sections;
    await db.courseProgress.createMany({ data: [kept!, gone!, governance.sections[0]!].map((s) => ({ userId: user, sectionId: s.id })) });

    const removed = withChapter(governance.code, () => null);
    const report = await seedCourse(db, content, {
      ...removed,
      chapters: removed.chapters.map((c) => (c.id === "12-rbac" ? { ...c, sections: c.sections.filter((s) => s.id !== gone!.code) } : c)),
    });
    expect(report.removed).toEqual({ modules: 0, chapters: 1, sections: governance.sections.length + 1, progress: 2 });
    expect(await db.courseChapter.count({ where: { id: governance.id } })).toBe(0);
    expect(await db.courseSection.count({ where: { id: gone!.id } })).toBe(0);
    expect((await db.courseProgress.findMany({ where: { userId: user } })).map((p) => p.sectionId)).toEqual([kept!.id]);

    // Back in the files: the chapter and the section come back, under new ids.
    const back = await seedCourse(db, content, course);
    expect(back.changed).toEqual({ chapters: 1, sections: governance.sections.length + 1 });
    expect(await db.courseSection.count()).toBe(107);
  });

  it("deletes a module removed from the files", async () => {
    const report = await seedCourse(db, content, { ...course, modules: [...course.modules, { code: "extra", title: { en: "Extra", fr: "Extra" } }] });
    expect(report.modules).toBe(7);
    expect((await seedCourse(db, content, course)).removed).toEqual({ modules: 1, chapters: 0, sections: 0, progress: 0 });
    expect(await db.courseModule.count()).toBe(6);
  });

  it("keeps the content version of a chapter that only becomes free, or moves to another module", async () => {
    const before = await db.courseChapter.findFirstOrThrow({ where: { code: "12-rbac" } });
    const report = await seedCourse(db, content, withChapter("12-rbac", (c) => ({ ...c, free: true, module: "storage" })));
    expect(report.changed).toEqual({ chapters: 0, sections: 0 });
    const after = await db.courseChapter.findFirstOrThrow({ where: { code: "12-rbac" }, include: { module: true } });
    expect([after.free, after.module.code, after.contentHash, after.contentUpdatedAt]).toEqual([true, "storage", before.contentHash, before.contentUpdatedAt]);
    await seedCourse(db, content, course);
  });

  it("deletes the whole course when its folder is gone, and loads it again", async () => {
    const user = (await createUser(db, { email: "nocourse@example.com" })).id;
    const [first] = await sections();
    await db.courseProgress.create({ data: { userId: user, sectionId: first!.id } });
    const progress = await db.courseProgress.count();
    const report = await seedCourse(db, content, null);
    expect(report).toMatchObject({ modules: 0, chapters: 0, sections: 0, removed: { modules: 6, chapters: 16, sections: 107, progress } });
    expect(await db.courseProgress.count()).toBe(0);
    expect(await db.courseModule.count()).toBe(0);
    expect((await seedCourse(db, content, course)).sections).toBe(107);
  });

  it("deletes a user's reading progress with the account", async () => {
    const user = (await createUser(db, { email: "leaver@example.com" })).id;
    const [first] = await sections();
    await db.courseProgress.create({ data: { userId: user, sectionId: first!.id } });
    await db.user.delete({ where: { id: user } });
    expect(await db.courseProgress.count({ where: { userId: user } })).toBe(0);
    expect(await db.courseSection.count({ where: { id: first!.id } })).toBe(1);
  });
});
