# C-ckad-5 — CKAD course, chapters 42 and 43 (2026-11-27)

## Result
2 English chapters: `content/ckad/course/chapters/42-configmaps-secrets.en.md` (1,925 words, objectives 4.4.1, 4.4.2, 4.6.1, 4.6.2) and `43-resources-quotas.en.md` (1,835 words, objectives 4.3.1, 4.3.2, 4.5.1, 4.5.2). `check-cert.ts`: 0 problems for these chapters; `content:validate --course --chapters`: 0 problems for these chapters (the run also lists 2 problems in another agent's question files, `ckad-1c-init-*`).

## Sources
kubernetes.io was blocked by the egress proxy for curl, and WebFetch returns only the navigation of long pages, so the pages were read from their source in `github.com/kubernetes/website` (main branch, which is the v1.37 site: `data/releases/schedule.yaml` lists 1.37.x as current), plus one WebFetch with offset (LimitRange API reference). Pages: configure-pod-configmap, configmap, secret, managing-secret-using-kubectl, distribute-credentials-secure, define-environment-variable-container, pull-image-private-registry, resource-quotas, limit-range, manage-resources-containers, pod-qos, quality-service-pod, quota-memory-cpu-namespace, memory/cpu-default-namespace, memory/cpu-constraint-namespace, limit-range-v1 API reference, feature gates PodLevelResources and InPlacePodVerticalScaling. kubectl reference pages for create configmap, create secret generic/tls/docker-registry, create quota, set resources, set env, run, and the kubectl source (`kubernetes/kubectl` pkg/cmd/create, set) for flag validation.

## Facts checked in kubectl source (not stated on the doc pages)
- `--from-env-file` can't be combined with `--from-file` or `--from-literal` (configmap and secret generic): Validate() error.
- `docker-registry`: needs `--from-file`, or username + password + server; `--docker-server` defaults to `https://index.docker.io/v1/`; email optional.
- `kubectl set env --from=configmap/x` writes one `env` entry with `configMapKeyRef` per key (not `envFrom`).

## Doubts / from knowledge, not re-verified
- `CreateContainerConfigError` as the status for a missing ConfigMap referenced by `env`: well known kubelet reason, not on the pages read.
- LimitRange: "`default` omitted → takes `max`; `defaultRequest` omitted → takes `default`" is inferred from the constraint task pages (min/max only → default and defaultRequest both equal max), not stated as a rule there.
- Docs inconsistency: configure-pod-configmap still says invalid keys are skipped by `envFrom` (`InvalidVariableNames` event), while define-environment-variable-container says v1.37 env var names may be any printable ASCII except `=`. The chapter avoids the "skipped" claim and only warns that a key like `log.level` is awkward in a shell.
- Exit code 137 for OOMKilled and `FailedCreate` as the ReplicaSet event reason under a quota: from knowledge.
- `secret.name` instead of `secretName`: the chapter says it fails validation (unknown field with strict validation, missing `secretName`); exact error text not checked.
