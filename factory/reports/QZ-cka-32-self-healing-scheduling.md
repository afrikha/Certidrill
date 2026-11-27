# QZ-cka-32-self-healing-scheduling — report

File: `content/cka/quizzes/32-self-healing-scheduling.yaml` (10 questions, `cka-qz-32-01` to `-10`).

| # | Objective | Diff. | Type | Tests |
| --- | --- | --- | --- | --- |
| 1 | 3.4.1 | 1 | single | readiness vs liveness/startup, Deployment `restartPolicy` only `Always` |
| 2 | 3.5.2 | 1 | single | `NoExecute` evicts untolerating running Pods at once (300 s default is only for not-ready/unreachable) |
| 3 | 3.4.2 | 2 | single | `minAvailable: 50%` of 7 rounded up, not-ready Pod not healthy → ALLOWED DISRUPTIONS 2 |
| 4 | 3.5.3 | 2 | single | limit only → request = limit, not `defaultRequest` |
| 5 | 3.5.1 | 2 | multi | `nodeSelector` AND node affinity, `nodeSelectorTerms` ORed |
| 6 | 3.5.2 | 3 | command (invocation) | remove only `dedicated=gpu:NoExecute` (`key:Effect-`), keep the NoSchedule taint |
| 7 | 3.4.1 | 3 | manifest | startup (5 s × 48 = 240 s), liveness on `/healthz` (2 failures, 2 s timeout), readiness on the DB-dependent `/ready` |
| 8 | 3.5.1 | 3 | manifest | required pod affinity on zone across namespaces (`namespaces` / `namespaceSelector`), preferred anti-affinity weight 100 |
| 9 | 3.4.2 | 3 | manifest | topology spread with `minDomains`, `nodeTaintsPolicy: Honor`, `matchLabelKeys: [pod-template-hash]` |
| 10 | 3.5.3 | 3 | manifest | LimitRange default limit below request + remaining quota → CPU limit 600m |

Differs from the bank (`cka-3d-*`, `cka-3e-*`, `cka-4d-pdb-unblock-drain`): no taint add, toleration, nodeSelector, required anti-affinity, zone/node spread, LimitRange max, PDB creation or `unhealthyPodEvictionPolicy` task is reused.

## Checks

- `npx tsx factory/check-quiz.ts cka 32-self-healing-scheduling` → 0 problem(s), 0 warning(s).
- `npx tsx factory/check-exercise.ts cka cka-qz-32-` → 0 problem(s).
- I also tested more correct answers by hand: `taint no …`, `--overwrite` added to a correct removal, `namespaces: [cache, shop]`, and a `namespaceSelector` with `matchExpressions`. They all pass.
- No `NOTE` sentence on q5: the CKA blueprint scores `multi` all or nothing.

## Doubts and unverified facts

- q3: the docs do not state the formula `disruptionsAllowed = currentHealthy - desiredHealthy` outright. It matches their example (3 healthy, `minAvailable: 2` → 1) and the disruption controller's behaviour.
- q10: the event message is quoted as in the Limit Ranges page ("must be less than or equal to cpu limit"). Recent versions may add "of 500m", which is why the stem says "contains".
- q10: a candidate who removes `requests.cpu` and sets only `limits.cpu: 600m` would get the same result (the request copies the limit), but the check on `requests.cpu` rejects it. The stem explicitly says to keep `requests.cpu: 600m`.
- q9: the Topology Spread page (last modified 2025-10) still calls `matchLabelKeys` beta, enabled by default since v1.27. Its stage in v1.37 is not checked; it does not matter for the task. `nodeTaintsPolicy` and `nodeAffinityPolicy` are GA since 1.33.
- q8: the Assigning Pods to Nodes page says a term applies to namespaces "selected by both" `namespaceSelector` and `namespaces`; the API reference describes it as a union. The quiz uses only one of the two fields, so this does not matter here.
- q6 negative "uncordon": it is stated that uncordon clears only `spec.unschedulable` and its `node.kubernetes.io/unschedulable` taint. This is standard behaviour, but no page was fetched for it.

## Chapter / bank issues

None found. The chapter matches the fetched pages on every point used here.
