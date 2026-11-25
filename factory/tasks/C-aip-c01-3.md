# Task C-aip-c01-3 — role COURSE, certification AIP-C01 (professional)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/aip-c01.md`, `content/aip-c01/objectives.yaml` and `content/aip-c01/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/aip-c01/course/chapters/<id>.en.md`, no `.fr.md`):

- `22-model-deployment` — objectives: 2.2.1, 2.2.2, 2.2.3
- `23-enterprise-integration` — objectives: 2.3.1, 2.3.2, 2.3.3, 2.3.4, 2.3.5
- `24-fm-api-integration` — objectives: 2.4.1, 2.4.2, 2.4.3, 2.4.4
- `25-app-integration-tools` — objectives: 2.5.1, 2.5.2, 2.5.3, 2.5.4, 2.5.5, 2.5.6

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts aip-c01 22-model-deployment 23-enterprise-integration 24-fm-api-integration 25-app-integration-tools`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
