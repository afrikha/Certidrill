# QZ-ckad-31-probes-api-versions — report

`content/ckad/quizzes/31-probes-api-versions.yaml`: 10 questions, `ckad-qz-31-01` to `-10`.
Positions 1–5: 4 `single` + 1 `multi`, difficulty 1, 1, 2, 2, 2. Positions 6–10: 1 `command` (invocation) + 4 `manifest`, difficulty 3.
Objectives: 3.1.1 (q1, q6), 3.1.2 (q3, q7, q9), 3.2.1 (q4, q8), 3.2.2 (q2, q5, q10).
Checks: `check-quiz.ts ckad 31-probes-api-versions` → 0 problem(s), 0 warning(s); `check-exercise.ts ckad ckad-qz-31-` → 0 problem(s).

## Not in the bank

The 16 bank exercises of 3.1.x/3.2.x (`ckad-3a-*`, `ckad-3b-*`) were read. The quiz tests other tasks: reading an object through a non-preferred version (`hpa.v1.autoscaling`), Ingress manifest migration with `spec.defaultBackend` and a named `servicePort` → `service.port.name`, RBAC migration where `apiGroups: ["extensions"]` must become `apps` / `networking.k8s.io` and `roleRef.apiGroup` keeps no version, HTTPS liveness with a `Host` header instead of the `host` field, exec through `sh -c`, and a fix task (dependency moved from liveness to readiness, liveness `initialDelaySeconds` dropped in favour of a startup probe, `successThreshold` fix, exec string split).

## Sources fetched (kubernetes.io)

kubectl api-versions, kubectl get (example `kubectl get deployments.v1.apps -o json`; no `--api-version` flag), kubectl create role, Deprecated API Migration Guide (Ingress, RBAC, Deployment, NetworkPolicy, HPA entries; stored objects stay readable through the new version), Liveness, Readiness, and Startup Probes (concepts: defaults and minimums, 200–399, HTTPS skips certificate verification, "set Host in httpHeaders" instead of `host`, gRPC no named port), Configure Liveness, Readiness and Startup Probes (exec, startup budget `failureThreshold * periodSeconds`), Using RBAC Authorization.

## Doubts / unverified

- q6: `autoscaling/v2` as the preferred version of the `autoscaling` group is stated in the stem, not verified on a page. Short name plus version and group (`hpa.v1.autoscaling`) is accepted by the check: from kubectl's shortcut expander behaviour (known from source), not from a doc page; the reference example only shows the full plural `deployments.v1.apps`.
- q10: the startup budget follows the documentation's convention (`failureThreshold × periodSeconds` = 20 × 15 = 300 s, as the docs' 30 × 10 = 300 s example). Strictly, the 20th failure happens at 19 × 15 = 285 s after the first check; a candidate who counts that way and writes 21 fails the check.
- q10: liveness `periodSeconds`, `failureThreshold`, `successThreshold` and `initialDelaySeconds` "absent or default" use negative-lookahead regexes on the JSON of the probe (same workaround as bank `ckad-3b-readiness-thresholds`), because no op accepts "absent or value". The readiness port of q10 is not checked (15-check limit).
- q8: the readiness check requires `sh`/`bash` with `-c` as separate items; a shell-free `["test", "-f", "/tmp/ready", "-a", "!", "-f", "/tmp/draining"]` would work but is rejected (the stem says to evaluate the shell condition and that `/bin/sh` exists).
- q4: option a uses `304 Not Modified` rather than a 301/302 redirect, because the kubelet follows same-host redirects and the result would then depend on the target.

## Chapter / bank remarks

- Chapter and bank agree with the pages fetched. The chapter's `host` row ("default Pod IP") does not say that a virtual host should be set with a `Host` entry in `httpHeaders` (concepts page note); q8 relies on deducing it from "default Pod IP". Worth adding to the chapter.
