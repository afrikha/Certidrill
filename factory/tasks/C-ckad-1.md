# Task C-ckad-1 — role COURSE, certification CKAD (performance-based, hands-on)

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md`, `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/BRIEF-PRACTICE.md` (the exercise types the course prepares for), `factory/profiles/ckad.md`, `content/ckad/objectives.yaml` and `content/ckad/course/course.yaml` (chapter titles). Model of tone and density: `content/kcna/course/chapters/13-scheduling.en.md` (but deeper and hands-on).

Write these chapters, **in English only** (`content/ckad/course/chapters/<id>.en.md`, no `.fr.md`):

- `00-getting-started` — objectives: (none: the real exam (format, environment, `ssh` to the task host, `k` alias, allowed docs, time management: skip and flag), how the Certidrill practice works and what it does not train (a real cluster: use the two killer.sh sessions included with the exam), kubectl speed habits (`--dry-run=client -o yaml > file`, `kubectl explain`, `-n` on every command, `kubectl config set-context --current --namespace`), study plan — from factory/profiles/ckad.md; structure of content/kcna/course/chapters/00-getting-started.en.md)
- `11-images-workloads` — objectives: 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.2.1, 1.2.2, 1.2.3, 1.2.4

This course prepares a **hands-on** exam: every section shows the exact `kubectl` commands (imperative shortcuts first, with `--dry-run=client -o yaml` to generate a manifest) and the manifest fields the tasks need, as short `bash` and `yaml` blocks valid for Kubernetes v1.37, with defaults, field names and the classic mistakes as `> **Exam trap.**` callouts. Decision tables ("task asks for → command or field"). 1,300–2,200 words per chapter (00-getting-started 700–1,200). Verify every field name, flag and default on kubernetes.io (fetch the pages; long kubectl reference pages need WebFetch with `offset`).

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts ckad 00-getting-started 11-images-workloads` and `npm run -s content:validate -- --cert ckad --course --chapters 00-getting-started,11-images-workloads`

**English only**: no `fr` key, no `.fr.md` file. Report doubts in `factory/reports/C-ckad-1.md`.
