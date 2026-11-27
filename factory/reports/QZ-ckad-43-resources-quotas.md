# QZ-ckad-43-resources-quotas — report

File: `content/ckad/quizzes/43-resources-quotas.yaml` (10 questions, `ckad-qz-43-01` to `-10`).
Checks: `check-quiz.ts ckad 43-resources-quotas` → 0 problem(s), 0 warning(s); `check-exercise.ts ckad ckad-qz-43-` → 5 exercises, 0 problem(s).

## Layout

| # | Obj. | Diff. | Type | Tests |
| --- | --- | --- | --- | --- |
| 1 | 4.5.2 | 1 | single | CPU limit → throttling (not OOM, eviction, Pending) |
| 2 | 4.5.1 | 1 | multi | `500m` = `0.5`; `50m`, `5000m`, `0.5m` wrong |
| 3 | 4.3.2 | 2 | single | LimitRange with only min/max → defaults derived from `max` |
| 4 | 4.3.1 | 2 | single | Quota on cpu/memory + unvalued Deployment → `0/3`, RS `FailedCreate` |
| 5 | 4.5.2 | 2 | multi | QoS: limits-only container is Guaranteed |
| 6 | 4.3.1 | 3 | command/object | `create quota --scopes=NotTerminating` |
| 7 | 4.5.2 | 3 | command/invocation | jsonpath filter on `containerStatuses[?(@.name==...)].lastState.terminated.reason` |
| 8 | 4.5.1 | 3 | manifest | CronJob resources nested under `jobTemplate`, 1.5 CPU / 1.5Gi, no CPU limit, restartPolicy |
| 9 | 4.3.1 | 3 | manifest | Fit a Pod into the remaining quota (Used/Hard), required memory limit |
| 10 | 4.3.2 | 3 | manifest | LimitRange `max` + `maxLimitRequestRatio` with injected default limit, two containers |

No bank exercise repeated: the bank has no scope quota, no CronJob resources, no lastState jsonpath, no ratio fix. Closest: q9 vs `ckad-4c-quota-fit-deployment` (both quota arithmetic, but the bank computes replicas with no other Pods; q9 reads the Used column of a single Pod and needs the "must specify limits.memory" rule) and q10 vs `ckad-4c-limitrange-request-over-default` (both "fix so it is admitted"; the bank's trap is default limit < request, q10's is the ratio and `max` binding on different containers).

## Facts verified (kubernetes.io, fetched 2026-11-27)

- Resource Quotas: scope table (NotTerminating = `activeDeadlineSeconds` nil; Terminating = set), resources trackable with Terminating/NotTerminating (`pods`, `cpu`, `memory`, `requests.*`, `limits.*`), `cpu`/`memory` synonyms of `requests.*`, "must specify requests or limits" rule, non-terminal Pods.
- Limit Ranges: defaults applied first, then min/max/ratio checks, 403 Forbidden, running Pods unaffected.
- LimitRange API reference: `maxLimitRequestRatio` = limit / request ≤ value, both non-zero.
- Memory constraints task page: LimitRange with only min/max gets `default` and `defaultRequest` equal to `max` (shown in the `kubectl get limitrange` output).
- Resource Management page: throttling, OOM kill, limit copied as request, `0.1` = `100m`, no precision below `1m`.
- Pod QoS page: Guaranteed / Burstable / BestEffort criteria.
- kubectl create quota reference: `--hard`, `--scopes`.
- JSONPath Support: `?()` filter syntax.
- CronJob page: `spec.jobTemplate.spec.template` nesting.

## Doubts / unverified

- q6: the docs list `count.pods` (sic, probably `count/pods`) among resources a Terminating/NotTerminating quota may track. The check accepts `pods` or `count/pods`; if the API refuses `count/pods` with a scope, that variant should fail. No solution uses it.
- q6 outputs (object mode) written by hand: keys sorted alphabetically, `scopes` list after `hard`, quantities canonical (`"3"`, `6Gi`), `status: {}`. To confirm in CI with real kubectl v1.37.
- q7: kubelet probably sorts `containerStatuses` by container name; the negative using `[1]` is wrong because the stem forbids position-based selection, not because the index would necessarily point elsewhere (the "why" says so). Spaces around `==` inside the filter are allowed by the regex but not verified against kubectl's JSONPath parser.
- q8: the Job `restartPolicy` rule (OnFailure or Never) is from the Job docs, not re-fetched; the check accepts both.
- q10: exact text of the ratio error message not used (not verified).

## Tooling remark (not fixed, outside my files)

- `factory/exercise.ts` `parseCommand`: `-ojsonpath='{...}'` (no space, no `=` after `-o`) is mis-parsed: the output flag becomes `jsonpath` and the expression is lost, because the `=` inside `jsonpath=` is taken as the short-flag separator. Candidates who type `-ojsonpath=...` would fail q7 and `ckad-4e-qos-class-jsonpath`. `-o jsonpath=...` and `-o=jsonpath=...` work.

## Chapter remarks

- The chapter lists CronJob among objects `kubectl set resources` accepts; not verified against the kubectl reference (not used in the quiz).
- Nothing found wrong in the chapter against the pages above.
