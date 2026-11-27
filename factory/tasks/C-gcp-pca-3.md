# Task C-gcp-pca-3 — role COURSE, certification GCP-PCA (professional)

Read `factory/BRIEF.md`, then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/gcp-pca.md`, `content/gcp-pca/objectives.yaml` and `content/gcp-pca/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/gcp-pca/course/chapters/<id>.en.md`, no `.fr.md`):

- `23-compute-systems` — objectives: 2.3.1, 2.3.2, 2.3.3, 2.3.4, 2.3.5, 2.3.6
- `24-ai-ml-platform` — objectives: 2.4.1, 2.4.2, 2.4.3, 2.5.1, 2.5.2, 2.5.3
- `31-security-design` — objectives: 3.1.1, 3.1.2, 3.1.3, 3.1.4, 3.1.5, 3.1.6, 3.1.7, 3.1.8, 3.1.9
- `32-compliance` — objectives: 3.2.1, 3.2.2, 3.2.3, 3.2.4

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts gcp-pca 23-compute-systems 24-ai-ml-platform 31-security-design 32-compliance`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`). Report doubts in `factory/reports/<task id>.md`.
