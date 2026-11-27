# Task C-gcp-pca-2 — role COURSE, certification GCP-PCA (professional)

Read `factory/BRIEF.md`, then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/gcp-pca.md`, `content/gcp-pca/objectives.yaml` and `content/gcp-pca/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/gcp-pca/course/chapters/<id>.en.md`, no `.fr.md`):

- `14-network-storage-compute-design` — objectives: 1.3.1, 1.3.2, 1.3.3, 1.3.4, 1.3.5, 1.3.6, 1.3.7
- `15-migration-future` — objectives: 1.4.1, 1.4.2, 1.4.3, 1.4.4, 1.5.1, 1.5.2, 1.5.3
- `21-network-topologies` — objectives: 2.1.1, 2.1.2, 2.1.3, 2.1.4
- `22-storage-systems` — objectives: 2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5, 2.2.6, 2.2.7

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts gcp-pca 14-network-storage-compute-design 15-migration-future 21-network-topologies 22-storage-systems`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`). Report doubts in `factory/reports/<task id>.md`.
