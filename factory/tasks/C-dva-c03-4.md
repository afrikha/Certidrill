# Task C-dva-c03-4 — role COURSE, certification DVA-C03 (associate)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` (overrides the Microsoft-specific rules) (rules + role COURSE), `factory/profiles/dva-c03.md`, `content/dva-c03/objectives.yaml` and `content/dva-c03/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/dva-c03/course/chapters/<id>.en.md` and `.fr.md`):

- `43-optimization` — objectives: 4.3.1, 4.3.2, 4.3.3, 4.3.4, 4.3.5, 4.3.6

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts dva-c03 43-optimization`
