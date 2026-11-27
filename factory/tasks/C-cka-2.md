# Task C-cka-2 — role COURSE, certification CKA (performance-based, hands-on)

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md`, `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/BRIEF-PRACTICE.md` (the exercise types the course prepares for), `factory/profiles/cka.md`, `content/cka/objectives.yaml` and `content/cka/course/course.yaml` (chapter titles). Model of tone and density: `content/kcna/course/chapters/13-scheduling.en.md` (but deeper and hands-on).

Write these chapters, **in English only** (`content/cka/course/chapters/<id>.en.md`, no `.fr.md`):

- `21-nodes-components` — objectives: 2.1.1, 2.1.2, 2.1.3, 2.2.1, 2.2.2, 2.2.3
- `22-monitoring-logs-networking` — objectives: 2.3.1, 2.3.2, 2.4.1, 2.4.2, 2.5.1, 2.5.2

This course prepares a **hands-on** exam: every section shows the exact commands (`kubectl`, `kubeadm`, `etcdctl`/`etcdutl`, `crictl`, `systemctl`, `journalctl`, `helm`) and the manifest or configuration fields the tasks need, as short `bash` and `yaml` blocks valid for Kubernetes v1.37, with file paths, defaults and the classic mistakes as `> **Exam trap.**` callouts. Decision tables ("task asks for → command or field") and step-by-step procedures where order matters (upgrade, etcd restore, node join). 1,300–2,200 words per chapter (00-getting-started 700–1,200). Verify every flag, path, field name and default on kubernetes.io, etcd.io, helm.sh or gateway-api.sigs.k8s.io (fetch the pages; long kubectl reference pages need WebFetch with `offset`).

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts cka 21-nodes-components 22-monitoring-logs-networking` and `npm run -s content:validate -- --cert cka --course --chapters 21-nodes-components,22-monitoring-logs-networking`

**English only**: no `fr` key, no `.fr.md` file. Report doubts in `factory/reports/C-cka-2.md`.
