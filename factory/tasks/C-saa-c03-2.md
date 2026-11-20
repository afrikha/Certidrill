# Task C-saa-c03-2 — role COURSE, certification SAA-C03 (associate)

Read `factory/BRIEF.md`, then `factory/BRIEF-AWS.md` (it overrides the Microsoft-specific rules) (rules + role COURSE), `factory/profiles/saa-c03.md`, `content/saa-c03/objectives.yaml` and `content/saa-c03/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/saa-c03/course/chapters/<id>.en.md` and `.fr.md`):

- `21-loose-coupling` — objectives: 2.1.1, 2.1.2, 2.1.4, 2.1.5, 2.1.9, 2.1.10, 2.1.11, 2.1.16, 2.1.17, 2.1.19
- `22-scalable-architectures` — objectives: 2.1.3, 2.1.6, 2.1.7, 2.1.8, 2.1.12, 2.1.13, 2.1.14, 2.1.15, 2.1.18, 2.1.20, 2.1.21, 2.1.22, 2.1.23
- `23-high-availability` — objectives: 2.2.2, 2.2.3, 2.2.5, 2.2.7, 2.2.8, 2.2.9, 2.2.12, 2.2.13, 2.2.15, 2.2.16, 2.2.19, 2.2.20
- `24-disaster-recovery` — objectives: 2.2.1, 2.2.4, 2.2.6, 2.2.10, 2.2.11, 2.2.14, 2.2.17, 2.2.18

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts saa-c03 21-loose-coupling 22-scalable-architectures 23-high-availability 24-disaster-recovery`
