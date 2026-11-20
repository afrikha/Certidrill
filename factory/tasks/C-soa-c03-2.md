# Task C-soa-c03-2 — role COURSE, certification SOA-C03 (associate)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` (overrides the Microsoft-specific rules) (rules + role COURSE), `factory/profiles/soa-c03.md`, `content/soa-c03/objectives.yaml` and `content/soa-c03/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/soa-c03/course/chapters/<id>.en.md` and `.fr.md`):

- `21-scaling` — objectives: 2.1.1, 2.1.2, 2.1.3
- `22-high-availability` — objectives: 2.2.1, 2.2.2
- `23-backup-restore` — objectives: 2.3.1, 2.3.2, 2.3.3, 2.3.4
- `31-provisioning` — objectives: 3.1.1, 3.1.2, 3.1.3, 3.1.4, 3.1.5, 3.1.6

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts soa-c03 21-scaling 22-high-availability 23-backup-restore 31-provisioning`
