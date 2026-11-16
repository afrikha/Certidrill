/**
 * Reading the course (docs/SPECS-COURS.md §6) on a real PostgreSQL: which
 * chapters a reader and an administrator see, the outline with its progress
 * and where to resume, a chapter page, "mark as read" and the chapters to
 * review after a mock exam.
 */
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadCertification } from "@/lib/content/loader";
import { loadBank } from "@/lib/content/bank";
import { loadCourse } from "@/lib/content/course";
import { seedBank, seedCourse, seedReferential } from "@/lib/content/seed";
import { coursesFor, CourseError, getChapter, getCourseOutline, hasVisibleCourse, setSectionRead, weakDomains } from "@/lib/course/read";
import { createUser } from "@/lib/users";
import { publishSampleBank } from "./sample-bank";
import { grantFullAccess, playHalf } from "./access";

const db = new PrismaClient();
let reader: { userId: string; isAdmin: boolean };
let admin: { userId: string; isAdmin: boolean };
const PUBLISHED = ["00-getting-started", "11-entra-users-groups", "12-rbac"];

beforeAll(async () => {
  await db.$executeRawUnsafe(
    'TRUNCATE "course_progress","course_section","course_chapter","course_module","attempt_item","attempt_section","attempt","question_report","question","case_study","question_series","objective","domain","blueprint","certification","auth_account","auth_session","auth_verification_token","user" CASCADE',
  );
  const content = await loadCertification(path.resolve(__dirname, "../../content/az-104"));
  await seedReferential(db, content);
  await seedBank(db, content, await loadBank(content));
  await publishSampleBank(db);
  await seedCourse(db, content, await loadCourse(content));
  reader = { userId: (await createUser(db, { email: "course-reader@example.com" })).id, isAdmin: false };
  admin = { userId: (await createUser(db, { email: "course-admin@example.com", role: "admin" })).id, isAdmin: true };
});
afterAll(() => db.$disconnect());

const publish = (codes: string[]) => db.courseChapter.updateMany({ where: { code: { in: codes } }, data: { status: "published" } });

describe("visibility", () => {
  it("shows no chapter to a reader while everything is in draft, every chapter to an administrator", async () => {
    expect(await hasVisibleCourse(db, reader)).toBe(false);
    expect(await coursesFor(db, reader)).toEqual([]);
    expect(await getCourseOutline(db, { certification: "az-104", viewer: reader, locale: "en" })).toBeNull();
    expect(await getChapter(db, { certification: "az-104", chapter: "12-rbac", viewer: reader, locale: "en" })).toBeNull();

    expect(await hasVisibleCourse(db, admin)).toBe(true);
    const outline = (await getCourseOutline(db, { certification: "az-104", viewer: admin, locale: "en" }))!;
    expect(outline.modules.flatMap((m) => m.chapters)).toHaveLength(16);
    expect(outline.sections).toBe(107);
  });

  it("shows published chapters to a reader, never a retired one to anybody", async () => {
    await publish(PUBLISHED);
    const retired = await db.courseChapter.findFirstOrThrow({ where: { module: { code: "identities" }, code: { notIn: PUBLISHED } } });
    await db.courseChapter.update({ where: { id: retired.id }, data: { status: "retired" } });
    expect(await coursesFor(db, reader)).toEqual([{ code: "az-104", title: expect.any(String) }]);
    const outline = (await getCourseOutline(db, { certification: "az-104", viewer: reader, locale: "fr" }))!;
    expect(outline.modules.map((m) => m.code)).toEqual(["intro", "identities"]);
    expect(outline.modules.flatMap((m) => m.chapters.map((c) => c.code))).toEqual(PUBLISHED);
    expect(outline.modules[1]!.title).toMatch(/identités/i);
    const adminOutline = (await getCourseOutline(db, { certification: "az-104", viewer: admin, locale: "en" }))!;
    expect(adminOutline.modules.flatMap((m) => m.chapters)).toHaveLength(15);
    expect(adminOutline.modules.flatMap((m) => m.chapters).some((c) => c.status === "retired")).toBe(false);
  });

  it("does not open a chapter of another certification, an unknown chapter or an inactive certification", async () => {
    expect(await getChapter(db, { certification: "az-900", chapter: "12-rbac", viewer: admin, locale: "en" })).toBeNull();
    expect(await getChapter(db, { certification: "az-104", chapter: "99-nothing", viewer: admin, locale: "en" })).toBeNull();
    await db.certification.update({ where: { code: "az-104" }, data: { active: false } });
    try {
      expect(await getCourseOutline(db, { certification: "az-104", viewer: admin, locale: "en" })).toBeNull();
      expect(await hasVisibleCourse(db, admin)).toBe(false);
    } finally {
      await db.certification.update({ where: { code: "az-104" }, data: { active: true } });
    }
  });
});

describe("a chapter page", () => {
  it("gives the sections in the reader's language, with objectives, and the published chapters around it", async () => {
    const chapter = (await getChapter(db, { certification: "az-104", chapter: "11-entra-users-groups", viewer: reader, locale: "fr" }))!;
    expect(chapter.title).toBe("Gérer les utilisateurs et groupes Microsoft Entra");
    expect(chapter.sections.map((s) => s.code)).toEqual(["tenant-and-roles", "users", "groups", "licenses", "external-users", "sspr", "key-points"]);
    expect(chapter.sections[1]!.objectives.map((o) => o.code)).toEqual(["1.1.1", "1.1.2"]);
    expect(chapter.sections[0]!.body).not.toMatch(/^##/);
    expect(chapter.summary.length).toBeGreaterThan(20);
    expect(chapter.previous?.code).toBe("00-getting-started");
    expect(chapter.next?.code).toBe("12-rbac");
    const last = (await getChapter(db, { certification: "az-104", chapter: "12-rbac", viewer: reader, locale: "en" }))!;
    // The chapters after it are not published: no next chapter for the reader.
    expect(last.next).toBeNull();
  });
});

describe("reading progress", () => {
  it("marks a section read and unread, idempotently, and moves where to resume", async () => {
    const chapter = (await getChapter(db, { certification: "az-104", chapter: "00-getting-started", viewer: reader, locale: "en" }))!;
    const [first, second] = chapter.sections;
    let outline = (await getCourseOutline(db, { certification: "az-104", viewer: reader, locale: "en" }))!;
    expect(outline.read).toBe(0);
    expect(outline.resume).toMatchObject({ chapter: "00-getting-started", section: first!.code });

    expect(await setSectionRead(db, { viewer: reader, sectionId: first!.id, read: true })).toEqual({ certification: "az-104", chapter: "00-getting-started", section: first!.code });
    await setSectionRead(db, { viewer: reader, sectionId: first!.id, read: true });
    expect(await db.courseProgress.count({ where: { userId: reader.userId } })).toBe(1);
    outline = (await getCourseOutline(db, { certification: "az-104", viewer: reader, locale: "en" }))!;
    expect(outline.read).toBe(1);
    expect(outline.resume).toMatchObject({ section: second!.code });
    expect(outline.modules[0]!.chapters[0]!.read).toBe(1);
    expect((await getChapter(db, { certification: "az-104", chapter: "00-getting-started", viewer: reader, locale: "en" }))!.sections[0]!.read).toBe(true);

    await setSectionRead(db, { viewer: reader, sectionId: first!.id, read: false });
    await setSectionRead(db, { viewer: reader, sectionId: first!.id, read: false });
    expect(await db.courseProgress.count({ where: { userId: reader.userId } })).toBe(0);
  });

  it("refuses a section of a chapter the reader may not open, as if it did not exist", async () => {
    const draft = await db.courseSection.findFirstOrThrow({ where: { chapter: { status: "draft" } } });
    await expect(setSectionRead(db, { viewer: reader, sectionId: draft.id, read: true })).rejects.toThrow(CourseError);
    await expect(setSectionRead(db, { viewer: reader, sectionId: "nope", read: true })).rejects.toThrow(CourseError);
    expect(await db.courseProgress.count({ where: { userId: reader.userId } })).toBe(0);
    // An administrator reads drafts (preview).
    await setSectionRead(db, { viewer: admin, sectionId: draft.id, read: true });
    expect(await db.courseProgress.count({ where: { userId: admin.userId } })).toBe(1);
  });

  it("says when everything is read", async () => {
    const outline = (await getCourseOutline(db, { certification: "az-104", viewer: reader, locale: "en" }))!;
    const ids = outline.modules.flatMap((m) => m.chapters.flatMap((c) => c.sections.map((s) => s.id)));
    for (const id of ids) await setSectionRead(db, { viewer: reader, sectionId: id, read: true });
    const done = (await getCourseOutline(db, { certification: "az-104", viewer: reader, locale: "en" }))!;
    expect([done.read, done.sections, done.resume]).toEqual([ids.length, ids.length, null]);
    await db.courseProgress.deleteMany({ where: { userId: reader.userId } });
  });
});

describe("chapters to review", () => {
  it("flags the chapters of the domains below the pass mark at the last mock exam", async () => {
    const certification = await db.certification.findUniqueOrThrow({ where: { code: "az-104" } });
    expect(await weakDomains(db, reader.userId, certification.id)).toEqual([]);
    await grantFullAccess(db, reader.userId);
    // Storage answered right, the rest blank: every other domain is weak.
    await playHalf(db, reader.userId);
    const weak = await weakDomains(db, reader.userId, certification.id);
    expect(weak).toContain("identities");
    expect(weak).not.toContain("storage");
    const outline = (await getCourseOutline(db, { certification: "az-104", viewer: reader, locale: "en" }))!;
    expect(outline.weakDomains).toEqual(weak);
    const chapters = outline.modules.flatMap((m) => m.chapters.map((c) => [c.code, c.weak]));
    expect(chapters).toEqual([["00-getting-started", false], ["11-entra-users-groups", true], ["12-rbac", true]]);
  });
});
