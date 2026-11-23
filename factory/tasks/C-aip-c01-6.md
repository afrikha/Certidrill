# Task C-aip-c01-6 — role COURSE, certification AIP-C01 (professional)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/aip-c01.md`, `content/aip-c01/objectives.yaml` and `content/aip-c01/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/aip-c01/course/chapters/<id>.en.md`, no `.fr.md`):

- `52-rag-agent-evaluation` — objectives: 5.1.3, 5.1.5, 5.1.6, 5.1.7
- `53-troubleshooting` — objectives: 5.2.1, 5.2.2, 5.2.3, 5.2.4, 5.2.5

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts aip-c01 52-rag-agent-evaluation 53-troubleshooting`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
