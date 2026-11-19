# Task C-aif-c01-2 — role COURSE, certification AIF-C01 (fundamentals)

Read `factory/BRIEF.md`, then `factory/BRIEF-AWS.md` (it overrides the Microsoft-specific rules; for AIF-C01 the types below override its "single and multi only" rule).md`, `content/aif-c01/objectives.yaml` and `content/aif-c01/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/aif-c01/course/chapters/<id>.en.md` and `.fr.md`):

- `32-prompt-engineering` — objectives: 3.2.1, 3.2.2, 3.2.3, 3.2.4, 3.2.5
- `33-fm-training` — objectives: 3.3.1, 3.3.2, 3.3.3
- `34-fm-evaluation` — objectives: 3.4.1, 3.4.2, 3.4.3, 3.4.4, 3.4.5
- `41-responsible-ai` — objectives: 4.1.1, 4.1.2, 4.1.3, 4.1.4, 4.1.5, 4.1.6, 4.1.7
- `42-transparency-explainability` — objectives: 4.2.1, 4.2.2, 4.2.3, 4.2.4
- `51-securing-ai` — objectives: 5.1.1, 5.1.2, 5.1.3, 5.1.4, 5.1.5
- `52-ai-governance` — objectives: 5.2.1, 5.2.2, 5.2.3

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts aif-c01 32-prompt-engineering 33-fm-training 34-fm-evaluation 41-responsible-ai 42-transparency-explainability 51-securing-ai 52-ai-governance`
