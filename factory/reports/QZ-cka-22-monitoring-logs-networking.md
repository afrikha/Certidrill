# QZ-cka-22-monitoring-logs-networking — report

File: `content/cka/quizzes/22-monitoring-logs-networking.yaml` (10 questions, English only).

| # | Objective | Diff. | Type | Tests |
| --- | --- | --- | --- | --- |
| 1 | 2.4.2 | 1 | single | default node log directory `/var/log/pods` |
| 2 | 2.3.1 | 1 | single | metrics-server serves the Metrics API (kubectl top + HPA) |
| 3 | 2.4.1 | 2 | single | `--tail` defaults to 10 per Pod with a selector |
| 4 | 2.3.1 | 2 | multi | working set, `--sort-by` values, context namespace, CPU window |
| 5 | 2.5.1 | 2 | single | listing EndpointSlices with `kubernetes.io/service-name` |
| 6 | 2.3.2 | 3 | manifest | LimitRange `defaultRequest` / `default` / `max` for a quota-blocked CronJob |
| 7 | 2.4.1 | 3 | command (invocation) | `logs deployment/x -c --since-time --timestamps` |
| 8 | 2.4.2 | 3 | manifest | init container blocking `Init:0/1` → native sidecar + missing app mount |
| 9 | 2.5.1 | 3 | manifest | fix the Deployment (immutable selector, template labels, named port + probe) for an unchangeable Service |
| 10 | 2.5.2 | 3 | command (invocation) | temporary Pod that a NetworkPolicy admits (`-n`, `--labels`), Service port vs Pod port |

Bank overlap avoided: no top flag set, logs flag set, sidecar task, Service fix, DNS test or LimitRange from `content/cka/questions/troubleshooting/cka-2c-*`, `cka-2d-*`, `cka-2e-*` is repeated (the bank has no LimitRange, no `--since-time`, no `deployment/` logs, no stuck regular init container, no Deployment-side fix, no labelled test Pod).

Sources fetched: kubectl logs, kubectl top pod, kubectl run (flag tables), Resource metrics pipeline, Logging Architecture, Sidecar Containers, Limit Ranges, Configure Default Memory Requests and Limits for a Namespace, Resource Quotas, EndpointSlices, Debug Services, Deployments, Network Policies.

## Chapter errors

- Section `container-logs`, flag table: "`-c` ... required (or `--all-containers`) when the Pod has several and no default container annotation" is wrong for current kubectl: without `-c` kubectl picks the **first** container and prints `Defaulted container "x" out of: ...` (kubectl logs reference: "Return snapshot logs from first container of a job named hello"; the bank exercise `cka-2d-default-container-annotation` shows the same message). Suggest: "`-c` selects the container; without it kubectl uses the default-container annotation, else the first container".
- Not in the chapter but on the kubectl logs v1.37 page: `--all-pods` (logs of every Pod of `deployment/x`, sets `--prefix`). The sentence "`kubectl logs deployment/web` — one Pod chosen by kubectl" stays true without that flag.

## Doubts / unverified

- Q5: EndpointSlice names are said to be "the Service name plus a generated suffix"; the docs only show it by example (`hostnames-ytpni` on Debug Services), no explicit rule.
- Q6: a LimitRange split into two `type: Container` items (one with defaults, one with `max`) is valid but would fail the checks (the `[type=Container]` filter takes the first item). Unlikely answer.
- Q9: a candidate who adds a second port entry `http: 8080` while keeping `web: 8080` would fail `port-name` (filter takes the first entry); duplicate container ports are not a clean answer anyway.
- Q10: the URL check requires `http://`; whether busybox `wget` accepts a URL without a scheme was not verified. The `-l` short flag of `kubectl run` means `--labels` (verified) but the engine normalizes `-l` to `selector`, so the label check accepts both keys.
- Q7: `--since-time` accepted values are limited to `2026-11-27T06:00:00Z`, `+00:00` and `.000Z` forms of RFC 3339.
