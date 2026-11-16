/**
 * The course in the back-office (docs/SPECS-COURS.md §9) on a real
 * PostgreSQL: the chapter list with its reading statistics, a status change
 * and its audit trace, a chapter for review in both languages; and a status
 * set in the back-office that a new seed keeps, then a reader who sees it.
 */
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadCertification, type CertificationContent } from "@/lib/content/loader";
import { loadCourse, type Course } from "@/lib/content/course";
import { seedCourse, seedReferential } from "@/lib/content/seed";
import { createUser } from "@/lib/users";
import { chapterForReview, coursesForAdmin, setChapterStatus } from "@/lib/course/admin";
import { getChapter } from "@/lib/course/read";

const db = new PrismaClient();
let content: CertificationContent;
let course: Course;
let adminId: string;

beforeAll(async () => {
  await db.$executeRawUnsafe(
    'TRUNCATE "course_progress","course_section","course_chapter","course_module","audit_log","objective","domain","blueprint","certification","user" CASCADE',
  );
  content = await loadCertification(path.resolve(__dirname, "../../content/az-104"));
  course = (await loadCourse(content))!;
  await seedReferential(db, content);
  await seedCourse(db, content, course);
  adminId = (await createUser(db, { email: "course-back-office@example.com", role: "admin" })).id;
});
afterAll(() => db.$disconnect());

const chapterId = async (code: string) => (await db.courseChapter.findFirstOrThrow({ where: { code } })).id;

describe("course back-office", () => {
  it("lists every chapter in course order, with its status, sections and reading statistics", async () => {
    const [ann, bob] = await Promise.all([createUser(db, { email: "ann@example.com" }), createUser(db, { email: "bob@example.com" })]);
    const rbac = await db.courseSection.findMany({ where: { chapter: { code: "12-rbac" } }, orderBy: { order: "asc" } });
    await db.courseProgress.createMany({
      data: [
        { userId: ann.id, sectionId: rbac[0]!.id },
        { userId: ann.id, sectionId: rbac[1]!.id },
        { userId: bob.id, sectionId: rbac[0]!.id },
      ],
    });

    const [az104, ...others] = await coursesForAdmin(db, "fr");
    expect(others).toEqual([]);
    expect(az104!.certification.code).toBe("az-104");
    expect(az104!.chapters.map((c) => c.code)).toEqual(course.chapters.map((c) => c.id));
    const row = az104!.chapters.find((c) => c.code === "12-rbac")!;
    expect(row).toMatchObject({ title: "Gérer l'accès aux ressources Azure", free: false, status: "draft", fileStatus: "draft", sections: rbac.length, readers: 2, sectionsRead: 3 });
    expect(az104!.chapters.find((c) => c.code === "00-getting-started")).toMatchObject({ free: true, readers: 0, sectionsRead: 0 });
    // The latest change of the chapter or of one of its sections.
    const later = new Date(Date.now() + 60_000);
    await db.courseSection.update({ where: { id: rbac[2]!.id }, data: { contentUpdatedAt: later } });
    expect((await coursesForAdmin(db, "en"))[0]!.chapters.find((c) => c.code === "12-rbac")!.contentUpdatedAt).toEqual(later);
  });

  it("changes a status once, with its trace in the audit log; the same status again changes nothing", async () => {
    const id = await chapterId("21-storage-access");
    expect(await setChapterStatus(db, adminId, id, "published")).toBe(true);
    expect(await setChapterStatus(db, adminId, id, "published")).toBe(false);
    expect(await setChapterStatus(db, adminId, "missing", "published")).toBeNull();
    const log = await db.auditLog.findMany({ where: { action: "course.status" } });
    expect(log.map((l) => [l.actorId, l.details])).toEqual([[adminId, { certification: "az-104", chapter: "21-storage-access", from: "draft", to: "published" }]]);
  });

  it("records one change only when two administrators submit the same status at the same time", async () => {
    const id = await chapterId("22-storage-accounts");
    const results = await Promise.all([setChapterStatus(db, adminId, id, "reviewed"), setChapterStatus(db, adminId, id, "reviewed")]);
    expect([...results].sort()).toEqual([false, true]);
    const log = await db.auditLog.findMany({ where: { action: "course.status", details: { path: ["chapter"], equals: "22-storage-accounts" } } });
    expect(log.map((l) => l.details)).toEqual([{ certification: "az-104", chapter: "22-storage-accounts", from: "draft", to: "reviewed" }]);
    await setChapterStatus(db, adminId, id, "draft");
  });

  it("keeps the back-office status at the next seed, and a reader sees the chapter published from there", async () => {
    const reader = { userId: (await createUser(db, { email: "full-reader@example.com" })).id, isAdmin: false };
    // A free chapter: readable at the free level.
    expect(await getChapter(db, { certification: "az-104", chapter: "11-entra-users-groups", viewer: reader, locale: "en" })).toBeNull();
    await setChapterStatus(db, adminId, await chapterId("11-entra-users-groups"), "published");
    expect((await seedCourse(db, content, course)).statusKept).toBe(2);
    const chapter = await getChapter(db, { certification: "az-104", chapter: "11-entra-users-groups", viewer: reader, locale: "en" });
    expect(chapter?.status).toBe("published");
    expect((await coursesForAdmin(db, "en"))[0]!.chapters.find((c) => c.code === "11-entra-users-groups")).toMatchObject({ status: "published", fileStatus: "draft" });
  });

  it("gives a chapter for review in both languages, whatever its status", async () => {
    await setChapterStatus(db, adminId, await chapterId("12-rbac"), "retired");
    const chapter = (await chapterForReview(db, "az-104", "12-rbac"))!;
    expect(chapter.status).toBe("retired");
    expect(chapter.title).toEqual({ en: "Manage access to Azure resources", fr: "Gérer l'accès aux ressources Azure" });
    const model = chapter.sections.find((s) => s.code === "rbac-model")!;
    expect(model.title).toEqual({ en: "The model: who, what, where", fr: "Le modèle : qui, quoi, où" });
    expect(model.body.en.length).toBeGreaterThan(100);
    expect(model.body.fr.length).toBeGreaterThan(100);
    expect(model.objectives.map((o) => o.code)).toEqual(["1.2.1"]);
    expect(await chapterForReview(db, "az-104", "missing")).toBeNull();
    expect(await chapterForReview(db, "az-900", "12-rbac")).toBeNull();
  });
});
