# Task C-ckad-2 — role COURSE, certification CKAD (performance-based, hands-on)

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md`, `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/BRIEF-PRACTICE.md` (the exercise types the course prepares for), `factory/profiles/ckad.md`, `content/ckad/objectives.yaml` and `content/ckad/course/course.yaml` (chapter titles). Model of tone and density: `content/kcna/course/chapters/13-scheduling.en.md` (but deeper and hands-on).

Write these chapters, **in English only** (`content/ckad/course/chapters/<id>.en.md`, no `.fr.md`):

- `12-multicontainer-volumes` — objectives: 1.3.1, 1.3.2, 1.3.3, 1.4.1, 1.4.2, 1.4.3
- `21-deployments-strategies` — objectives: 2.1.1, 2.1.2, 2.1.3, 2.2.1, 2.2.2, 2.2.3, 2.2.4

This course prepares a **hands-on** exam: every section shows the exact `kubectl` commands (imperative shortcuts first, with `--dry-run=client -o yaml` to generate a manifest) and the manifest fields the tasks need, as short `bash` and `yaml` blocks valid for Kubernetes v1.37, with defaults, field names and the classic mistakes as `> **Exam trap.**` callouts. Decision tables ("task asks for → command or field"). 1,300–2,200 words per chapter (00-getting-started 700–1,200). Verify every field name, flag and default on kubernetes.io (fetch the pages; long kubectl reference pages need WebFetch with `offset`).

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts ckad 12-multicontainer-volumes 21-deployments-strategies` and `npm run -s content:validate -- --cert ckad --course --chapters 12-multicontainer-volumes,21-deployments-strategies`

**English only**: no `fr` key, no `.fr.md` file. Report doubts in `factory/reports/C-ckad-2.md`.
