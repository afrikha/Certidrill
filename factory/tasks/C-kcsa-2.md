# Task C-kcsa-2 — role COURSE, certification KCSA (fundamentals)

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/kcsa.md`, `content/kcsa/objectives.yaml` and `content/kcsa/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/kcsa/course/chapters/<id>.en.md`, no `.fr.md`):

- `22-controller-manager` — objectives: 2.2.1, 2.2.2, 2.2.3
- `23-scheduler` — objectives: 2.3.1, 2.3.2, 2.3.3
- `24-kubelet` — objectives: 2.4.1, 2.4.2, 2.4.3, 2.4.4
- `25-container-runtime` — objectives: 2.5.1, 2.5.2, 2.5.3
- `26-kube-proxy` — objectives: 2.6.1, 2.6.2, 2.6.3
- `27-pod` — objectives: 2.7.1, 2.7.2, 2.7.3
- `28-etcd` — objectives: 2.8.1, 2.8.2, 2.8.3
- `29-container-networking` — objectives: 2.9.1, 2.9.2, 2.9.3

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts kcsa 22-controller-manager 23-scheduler 24-kubelet 25-container-runtime 26-kube-proxy 27-pod 28-etcd 29-container-networking`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
