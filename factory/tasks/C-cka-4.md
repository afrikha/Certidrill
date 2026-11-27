# Task C-cka-4 — role COURSE, certification CKA (performance-based, hands-on)

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md`, `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/BRIEF-PRACTICE.md` (the exercise types the course prepares for), `factory/profiles/cka.md`, `content/cka/objectives.yaml` and `content/cka/course/course.yaml` (chapter titles). Model of tone and density: `content/kcna/course/chapters/13-scheduling.en.md` (but deeper and hands-on).

Write these chapters, **in English only** (`content/cka/course/chapters/<id>.en.md`, no `.fr.md`):

- `41-rbac-extensions` — objectives: 4.1.1, 4.1.2, 4.7.1, 4.7.2, 4.8.1, 4.8.2
- `42-kubeadm-install-ha` — objectives: 4.2.1, 4.2.2, 4.3.1, 4.3.2, 4.5.1, 4.5.2

This course prepares a **hands-on** exam: every section shows the exact commands (`kubectl`, `kubeadm`, `etcdctl`/`etcdutl`, `crictl`, `systemctl`, `journalctl`, `helm`) and the manifest or configuration fields the tasks need, as short `bash` and `yaml` blocks valid for Kubernetes v1.37, with file paths, defaults and the classic mistakes as `> **Exam trap.**` callouts. Decision tables ("task asks for → command or field") and step-by-step procedures where order matters (upgrade, etcd restore, node join). 1,300–2,200 words per chapter (00-getting-started 700–1,200). Verify every flag, path, field name and default on kubernetes.io, etcd.io, helm.sh or gateway-api.sigs.k8s.io (fetch the pages; long kubectl reference pages need WebFetch with `offset`).

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts cka 41-rbac-extensions 42-kubeadm-install-ha` and `npm run -s content:validate -- --cert cka --course --chapters 41-rbac-extensions,42-kubeadm-install-ha`

**English only**: no `fr` key, no `.fr.md` file. Report doubts in `factory/reports/C-cka-4.md`.
