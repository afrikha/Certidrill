# Task C-gcp-pca-5 — role COURSE, certification GCP-PCA (professional)

Read `factory/BRIEF.md`, then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/gcp-pca.md`, `content/gcp-pca/objectives.yaml` and `content/gcp-pca/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/gcp-pca/course/chapters/<id>.en.md`, no `.fr.md`):

- `61-operations-excellence` — objectives: 6.1.1, 6.2.1, 6.2.2, 6.2.3, 6.3.1, 6.4.1, 6.5.1, 6.6.1

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts gcp-pca 61-operations-excellence`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`). Report doubts in `factory/reports/<task id>.md`.
