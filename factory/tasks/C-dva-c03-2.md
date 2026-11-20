# Task C-dva-c03-2 — role COURSE, certification DVA-C03 (associate)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` (overrides the Microsoft-specific rules) (rules + role COURSE), `factory/profiles/dva-c03.md`, `content/dva-c03/objectives.yaml` and `content/dva-c03/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/dva-c03/course/chapters/<id>.en.md` and `.fr.md`):

- `21-auth` — objectives: 2.1.1, 2.1.2, 2.1.3, 2.1.4, 2.1.5, 2.1.6, 2.1.7
- `22-encryption-secrets` — objectives: 2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5, 2.2.6, 2.2.7
- `23-ai-security` — objectives: 2.3.1, 2.3.2, 2.3.3, 2.3.4, 2.3.5
- `31-artifacts-config` — objectives: 3.1.1, 3.1.2, 3.1.3, 3.1.4, 3.1.5

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts dva-c03 21-auth 22-encryption-secrets 23-ai-security 31-artifacts-config`
