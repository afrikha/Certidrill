# Task C-dea-c01-4 — role COURSE, certification DEA-C01 (associate)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` (overrides the Microsoft-specific rules) (rules + role COURSE), `factory/profiles/dea-c01.md`, `content/dea-c01/objectives.yaml` and `content/dea-c01/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/dea-c01/course/chapters/<id>.en.md` and `.fr.md`):

- `34-data-quality` — objectives: 3.4.1, 3.4.2, 3.4.3, 3.4.4, 3.4.5
- `41-authentication` — objectives: 4.1.1, 4.1.2, 4.1.3, 4.1.4, 4.1.5, 4.1.6, 4.1.7
- `42-authorization` — objectives: 4.2.1, 4.2.2, 4.2.3, 4.2.4, 4.2.5, 4.2.6
- `43-encryption-masking` — objectives: 4.3.1, 4.3.2, 4.3.3, 4.3.4

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts dea-c01 34-data-quality 41-authentication 42-authorization 43-encryption-masking`
