# Task C-gcp-pca-4 — role COURSE, certification GCP-PCA (professional)

Read `factory/BRIEF.md`, then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/gcp-pca.md`, `content/gcp-pca/objectives.yaml` and `content/gcp-pca/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/gcp-pca/course/chapters/<id>.en.md`, no `.fr.md`):

- `41-technical-processes` — objectives: 4.1.1, 4.1.2, 4.1.3, 4.1.4, 4.1.5, 4.1.6
- `42-business-processes` — objectives: 4.2.1, 4.2.2, 4.2.3, 4.2.4, 4.2.5, 4.2.6, 4.2.7
- `51-advising-teams` — objectives: 5.1.1, 5.1.2, 5.1.3, 5.1.4, 5.1.5
- `52-programmatic-access` — objectives: 5.2.1, 5.2.2, 5.2.3, 5.2.4, 5.2.5, 5.2.6

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts gcp-pca 41-technical-processes 42-business-processes 51-advising-teams 52-programmatic-access`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`). Report doubts in `factory/reports/<task id>.md`.
