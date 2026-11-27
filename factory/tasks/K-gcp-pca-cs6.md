# Task K-gcp-pca-cs6 — role CASES, certification GCP-PCA

Read `factory/BRIEF.md`, then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + roles QUESTIONS and CASES) and `factory/profiles/gcp-pca.md`.

Write **3 case studies**, each with **5 or 6 questions** spread over at least three domains of `content/gcp-pca/objectives.yaml`, in a different industry and architecture each (list the existing files of `content/gcp-pca/case-studies/` first and choose other companies).
Id prefix for case studies and their questions: `gcppca-cs6` (e.g. `gcppca-cs6a-<company>`, questions `gcppca-cs6a-<topic>`).
Check: `CERT=gcp-pca npx tsx factory/validate.ts --prefix gcppca-cs6` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`). Report doubts in `factory/reports/<task id>.md`.
