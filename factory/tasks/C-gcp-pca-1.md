# Task C-gcp-pca-1 — role COURSE, certification GCP-PCA (professional)

Read `factory/BRIEF.md`, then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/gcp-pca.md`, `content/gcp-pca/objectives.yaml` and `content/gcp-pca/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/gcp-pca/course/chapters/<id>.en.md`, no `.fr.md`):

- `00-getting-started` — objectives: (none: exam format, how to read questions, confusing pairs, study plan — model: content/az-900/course/chapters/00-getting-started.*, adapted to this exam using factory/profiles/gcp-pca.md)
- `11-business-requirements` — objectives: 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5, 1.1.6
- `12-business-tradeoffs` — objectives: 1.1.7, 1.1.8, 1.1.9, 1.1.10, 1.1.11, 1.1.12
- `13-technical-requirements` — objectives: 1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.2.5, 1.2.6, 1.2.7

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts gcp-pca 00-getting-started 11-business-requirements 12-business-tradeoffs 13-technical-requirements`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`). Report doubts in `factory/reports/<task id>.md`.
