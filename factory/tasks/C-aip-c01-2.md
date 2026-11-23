# Task C-aip-c01-2 — role COURSE, certification AIP-C01 (professional)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/aip-c01.md`, `content/aip-c01/objectives.yaml` and `content/aip-c01/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/aip-c01/course/chapters/<id>.en.md`, no `.fr.md`):

- `14-vector-stores` — objectives: 1.4.1, 1.4.2, 1.4.3, 1.4.4, 1.4.5
- `15-retrieval` — objectives: 1.5.1, 1.5.2, 1.5.3, 1.5.4, 1.5.5, 1.5.6
- `16-prompt-engineering` — objectives: 1.6.1, 1.6.2, 1.6.3, 1.6.4, 1.6.5, 1.6.6
- `21-agentic-ai` — objectives: 2.1.1, 2.1.2, 2.1.3, 2.1.4, 2.1.5, 2.1.6, 2.1.7

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts aip-c01 14-vector-stores 15-retrieval 16-prompt-engineering 21-agentic-ai`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
