# C-kcna-2 — KCNA course chapters (2026-11-23)

## Files written
`content/kcna/course/chapters/` 24-storage, 31-application-delivery, 32-debugging, 41-observability, 42-ecosystem-principles, 43-community-collaboration (`.en.md` only). 30 objectives covered (2.4.1–2.4.5, 3.1.1–3.1.5, 3.2.1–3.2.5, 4.1.1–4.1.5, 4.2.1–4.2.5, 4.3.1–4.3.5). Check: 0 problems (check-cert and content:validate).

## Length
Prose (code excluded) is about 1,000–1,300 words per chapter, slightly above the 1,200-word fundamentals target for 4 chapters. This matches the KCNA chapters already written (11-core-concepts 1,251; 22-security 1,163). Each chapter has 5 objectives, plus tables of projects and commands.

## Verified on official sources (WebFetch, 2026-11-23)
- Storage: PV access modes (RWOP stable v1.29, CSI only); reclaim policies (Recycle deprecated, Delete is the dynamic default); PV phases; one-to-one binding; StorageClass defaults (Delete, Immediate) and default-class annotation and behaviour (most recent default wins, retroactive assignment, `""` opts out); emptyDir/tmpfs; hostPath risks; generic and CSI ephemeral volumes; CSI GA v1.13; CSI migration stable v1.25; removed in-tree types; CSI controller/node plugin deployment; StatefulSet PVC retention policy stable v1.32 (Retain default).
- Delivery: Deployment strategies, maxSurge/maxUnavailable 25 %, rollout commands, revisionHistoryLimit 10, progressDeadlineSeconds 600 / ProgressDeadlineExceeded, `kubernetes.io/change-cause`; Helm 4 is the current major version (helm.sh); Kustomize in kubectl since 1.14; OpenGitOps four principles; Argo CD and Flux features.
- Debugging: kubectl logs flags; ephemeral containers (stable v1.25; restrictions); kubectl debug forms; port-forward (TCP only, `--address` default localhost, one Pod selected, session ends with the Pod); kubelet log rotation 10Mi × 5.
- Observability: Prometheus overview; OpenTelemetry components and "not a back end"; metrics-server scope; logging architecture.
- Maturity levels on cncf.io/projects and landscape.yml: OpenTelemetry Graduated (2026-05-11), Knative Graduated (2025-09-11), KEDA Graduated (2023-08-22), Jaeger and Fluentd Graduated, Fluent Bit "graduated project under the Fluent organization", OpenCost Incubating, CNI Incubating, Kyverno and OPA Graduated, Backstage and Thanos Incubating.
- Governance: TOC 11 voting members (6 GB, 2 TOC, 2 end user, 1 maintainer), 5 current TAG names; graduation template (maintainers from 2 organizations, OpenSSF badge, third-party security review); archived projects; Kubernetes Steering Committee 7 members; KEPs; OWNERS `/lgtm` and `/approve`; releases about three per year, three minor versions maintained (1.37, 1.36, 1.35), about one year of patch support.

## Doubts / not fully verified
1. **VPA and in-place resize**: kubernetes.io (autoscaling page, v1.37) says "VPA does not support resizing pods in-place", but the VPA quickstart lists `InPlaceOrRecreate` and `InPlace` modes and marks `Auto` as deprecated. The course does not mention VPA update modes. Question writers should not test them.
2. **HPA scale to zero**: the HPA page describes `minReplicas: 0` for object/external metrics behind the `HPAScaleToZero` gate (the fetch said beta, enabled by default). Not stated in the course. Scale to zero is attributed to KEDA and Knative only.
3. **kubectl debug default profile**: kubernetes.io still says `legacy` is the default. Not mentioned in the course.
4. "Working groups own no code", "Steering Committee members are elected", and "Grafana is not a CNCF project (Grafana Labs)" come from general knowledge. The fetched pages did not state them explicitly.
5. "Do not combine HPA and VPA on the same CPU/memory metric" is long-standing VPA guidance, but the current VPA README/quickstart fetched did not repeat it.
6. Personas (4.3.4) have no single official CNCF source. The definitions follow the CNCF glossary (DevOps, SRE, platform engineering), and the others are generic.
7. `CreateContainerConfigError` (missing ConfigMap/Secret in env) is not described on the fetched debug pages. It is standard kubelet behaviour.
8. Hosts such as jaegertracing.io, grafana.com, fluentbit.io, opengitops.dev, 12factor.net and opencost.io are not in the CNCF `docsHosts`. The chapters contain no links to them. `course.yaml` references were left empty (not my file).
