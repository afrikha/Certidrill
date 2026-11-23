# Task C-dea-c01-2 — role COURSE, certification DEA-C01 (associate)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` (overrides the Microsoft-specific rules) (rules + role COURSE), `factory/profiles/dea-c01.md`, `content/dea-c01/objectives.yaml` and `content/dea-c01/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/dea-c01/course/chapters/<id>.en.md` and `.fr.md`):

- `14-programming` — objectives: 1.4.1, 1.4.2, 1.4.3, 1.4.4, 1.4.5, 1.4.6, 1.4.7, 1.4.8, 1.4.9, 1.4.10, 1.4.11
- `21-data-store` — objectives: 2.1.1, 2.1.2, 2.1.3, 2.1.4, 2.1.5, 2.1.6, 2.1.7, 2.1.8
- `22-cataloging` — objectives: 2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5, 2.2.6
- `23-lifecycle` — objectives: 2.3.1, 2.3.2, 2.3.3, 2.3.4, 2.3.5, 2.3.6

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts dea-c01 14-programming 21-data-store 22-cataloging 23-lifecycle`
