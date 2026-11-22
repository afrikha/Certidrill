# Task C-scs-c03-5 — role COURSE, certification SCS-C03 (specialty)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` (overrides the Microsoft-specific rules; ordering and dragdrop allowed for SCS-C03) (rules + role COURSE), `factory/profiles/scs-c03.md`, `content/scs-c03/objectives.yaml` and `content/scs-c03/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/scs-c03/course/chapters/<id>.en.md` and `.fr.md`):

- `63-compliance` — objectives: 6.3.1, 6.3.2, 6.3.3

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts scs-c03 63-compliance`
