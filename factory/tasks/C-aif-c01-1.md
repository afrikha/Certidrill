# Task C-aif-c01-1 — role COURSE, certification AIF-C01 (fundamentals)

Read `factory/BRIEF.md`, then `factory/BRIEF-AWS.md` (it overrides the Microsoft-specific rules; for AIF-C01 the types below override its "single and multi only" rule).md`, `content/aif-c01/objectives.yaml` and `content/aif-c01/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/aif-c01/course/chapters/<id>.en.md` and `.fr.md`):

- `00-getting-started` — objectives: (none: exam format, how to read questions, confusing pairs, study plan — model: content/clf-c02/course/chapters/00-getting-started.* (an AWS fundamentals example), adapted to this exam using factory/profiles/aif-c01.md)
- `11-ai-concepts` — objectives: 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5
- `12-ai-use-cases` — objectives: 1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.2.5, 1.2.6
- `13-ml-lifecycle` — objectives: 1.3.1, 1.3.2, 1.3.3, 1.3.4, 1.3.5, 1.3.6
- `21-genai-concepts` — objectives: 2.1.1, 2.1.2, 2.1.3, 2.1.4, 2.1.5, 2.1.6
- `22-genai-capabilities` — objectives: 2.2.1, 2.2.2, 2.2.3, 2.2.4
- `23-aws-genai-services` — objectives: 2.3.1, 2.3.2, 2.3.3, 2.3.4
- `31-fm-design` — objectives: 3.1.1, 3.1.2, 3.1.3, 3.1.4, 3.1.5, 3.1.6

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts aif-c01 00-getting-started 11-ai-concepts 12-ai-use-cases 13-ml-lifecycle 21-genai-concepts 22-genai-capabilities 23-aws-genai-services 31-fm-design`
