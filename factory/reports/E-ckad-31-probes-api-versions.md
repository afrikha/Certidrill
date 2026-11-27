# E-ckad-31-probes-api-versions — report

16 exercises in `content/ckad/questions/observability/` (15 new + model `ckad-3b-readiness-liveness-pod`), 4 per objective 3.1.1, 3.1.2, 3.2.1, 3.2.2.
Mix: 7 command (5 invocation, 2 object) / 9 manifest; difficulty 3 × 1, 8 × 2, 5 × 3.
Checks: `check-exercise.ts ckad ckad-3a- ckad-3b-` → 0 problem(s); `content:validate --prefix ckad-3a-` and `ckad-3b-` → 0 problem(s).

## Doubts to verify in CI (real kubectl v1.37)

- `ckad-3a-cronjob-batch-v1` solution 1 output: I wrote `spec.jobTemplate.spec.template.metadata: {}` and `status: {}` after the removal of `creationTimestamp: null`; not checked by any check, but the CI diff may differ. `jobTemplate.metadata.name` and `restartPolicy: OnFailure` come from the kubectl source (`create_cronjob.go`).
- `ckad-3a-ingress-recreate-v1` outputs: structure taken from `create_ingress.go` (Exact by default, trailing `*` → Prefix, numeric port → `port.number`, `ingressClassName` only with `--class`); `status: loadBalancer: {}` is from memory.
- `ckad-3b-describe-probe-failures` explanation quotes the usual `kubectl describe` probe line format (`delay=0s timeout=1s period=10s #success=1 #failure=3`) from memory.
- `ckad-3b-readiness-thresholds` check `liveness-success` uses a regex with lookaheads on the JSON of `livenessProbe`, because no op accepts "absent or 1". An `absentOr`/`oneOf` that accepts a missing field would be cleaner.
- `ckad-3b-startup-budget`: the liveness `failureThreshold` (3 = default) is deliberately not checked, since no op passes on both "absent" and "3".

## Sources

- The probes task page on kubernetes.io is truncated by WebFetch before the field list; defaults/minimums (period 10, timeout 1, success 1 and must be 1 for liveness/startup, failure 3) were verified in the Pod v1 API reference (Probe section). gRPC probes: stable since v1.27, no named ports, `mode: TLS` alpha in v1.37 (not used).
- Probe-level `terminationGracePeriodSeconds`: the API reference still calls it beta behind `ProbeTerminationGracePeriod`; left out.
- Deprecation guide: latest removal listed is v1.32 (flowcontrol v1beta3); nothing for v1.33–v1.37.
- `kubectl explain` now has `--max-depth` (with `--recursive`); not used.
