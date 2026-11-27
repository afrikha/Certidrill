# C-ckad-2 — report

Chapters written (English only): `12-multicontainer-volumes.en.md` (≈1,950 prose words, 2,290 with code), `21-deployments-strategies.en.md` (≈1,590 prose words). Validators: 0 problems for both chapters.

## Facts checked on kubernetes.io (2026-11-27)

Init containers, sidecar containers (stable since v1.33), pod lifecycle (container-level restartPolicy / ContainerRestartRules beta since v1.35), ephemeral containers, volumes and volume types (emptyDir Memory/sizeLimit, subPath no updates, hostPath types), projected volumes, persistent volumes, PV/PVC API reference (reclaim policy defaults, phases), storage classes (WaitForFirstConsumer, reclaimPolicy default Delete), configure-persistent-volume-storage task, Deployment concept page, managing workloads (canary), HPA walkthrough, kubectl reference: autoscale, create deployment, rollout restart, set selector, logs, debug, labels-annotations-taints (default-container, change-cause).

## Doubts and deviations

- `kubectl autoscale`: the v1.37 generated reference lists `--cpu` and `--memory` (percentage or quantity) and **no `--cpu-percent`** flag, while the Deployment concept page still shows `--cpu-percent=80%`. The chapter teaches `--cpu=70%` only. Exercise writers should not use `--cpu-percent` as the only solution.
- Endpoints: the chapter shows `kubectl get endpointslices -l kubernetes.io/service-name=web` and `kubectl describe service` rather than `kubectl get endpoints` (v1 Endpoints API deprecated); not re-verified on a page this session.
- `Init:Error` / `Init:CrashLoopBackOff` status strings: only `Init:0/2` appears on the init-containers page; the other two are standard kubectl output, not quoted from the docs.
- "Recreate with a `rollingUpdate` block is rejected" and "`kubectl annotate` needs `--overwrite` for an existing key" come from API validation / kubectl behaviour, not from a fetched page sentence.
- Blue/green has no kubernetes.io page; the section is built from Service selectors, `kubectl set selector` (replaces the whole selector, Services only) and Deployment selector immutability, all verified.
- `course.yaml` `references` for both chapters left empty (not my file to edit).
