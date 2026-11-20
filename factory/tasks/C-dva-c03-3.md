# Task C-dva-c03-3 — role COURSE, certification DVA-C03 (associate)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` (overrides the Microsoft-specific rules) (rules + role COURSE), `factory/profiles/dva-c03.md`, `content/dva-c03/objectives.yaml` and `content/dva-c03/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/dva-c03/course/chapters/<id>.en.md` and `.fr.md`):

- `32-testing` — objectives: 3.2.1, 3.2.2, 3.2.3, 3.2.4, 3.2.5
- `33-cicd` — objectives: 3.3.1, 3.3.2, 3.3.3, 3.3.4, 3.3.5, 3.3.6, 3.3.7, 3.3.8, 3.3.9
- `41-root-cause` — objectives: 4.1.1, 4.1.2, 4.1.3, 4.1.4, 4.1.5
- `42-observability` — objectives: 4.2.1, 4.2.2, 4.2.3, 4.2.4, 4.2.5

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts dva-c03 32-testing 33-cicd 41-root-cause 42-observability`
