# Task C-aip-c01-4 — role COURSE, certification AIP-C01 (professional)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/aip-c01.md`, `content/aip-c01/objectives.yaml` and `content/aip-c01/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/aip-c01/course/chapters/<id>.en.md`, no `.fr.md`):

- `31-input-output-safety` — objectives: 3.1.1, 3.1.2, 3.1.3, 3.1.4, 3.1.5
- `32-data-security-privacy` — objectives: 3.2.1, 3.2.2, 3.2.3
- `33-governance-compliance` — objectives: 3.3.1, 3.3.2, 3.3.3, 3.3.4
- `34-responsible-ai` — objectives: 3.4.1, 3.4.2, 3.4.3

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts aip-c01 31-input-output-safety 32-data-security-privacy 33-governance-compliance 34-responsible-ai`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
