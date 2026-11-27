# E-ckad-52-network-policies — EXERCISES CKAD, chapter 52-network-policies (2026-11-27)

## Output
8 exercises in `content/ckad/questions/networking/` (no model exercise existed for 5.1.x).

| Id | Obj. | Type | Diff. |
| --- | --- | --- | --- |
| ckad-5a-allow-from-pods-port | 5.1.1 | manifest | 2 |
| ckad-5a-namespace-and-pod-selector | 5.1.1 | manifest | 3 |
| ckad-5a-ipblock-except | 5.1.1 | manifest | 2 |
| ckad-5a-label-namespace-allow | 5.1.1 | command/object (`kubectl label` on a file) | 1 |
| ckad-5a-default-deny-ingress | 5.1.2 | manifest | 1 |
| ckad-5a-egress-db-and-dns | 5.1.2 | manifest | 3 |
| ckad-5a-pods-selected-by-policy | 5.1.2 | command/invocation | 2 |
| ckad-5a-test-connectivity-exec | 5.1.2 | command/invocation | 2 |

Mix: 3 command (37.5 %) / 5 manifest (62.5 %), slightly off the 45/55 target: NetworkPolicy has no `kubectl create` generator, so real tasks are file-based; the command exercises cover labeling a namespace, listing selected Pods and testing connectivity. Difficulty 2/4/2 (25/50/25 %).

Checks: `check-exercise.ts ckad ckad-5a-` 0 problem(s); `content:validate --cert ckad --prefix ckad-5a-` 0 problem(s).

## Deviations and doubts
- **Stem hints to keep checks exact.** The engine has no "absent OR equals" operator, so:
  - `default-deny-ingress` asks to "declare the policy type explicitly in policyTypes" (omitting `policyTypes` would be an equally correct default-deny ingress, since Ingress is always set by default);
  - `egress-db-and-dns` asks to "write `protocol` on every port entry" (TCP is the API default, so `port: 53` without protocol would also be correct for the TCP rule).
- **Selector spellings not accepted:** namespace selection via `matchExpressions` (`kubernetes.io/metadata.name In [web]`) instead of `matchLabels` fails the checks of `namespace-and-pod-selector` and `egress-db-and-dns`; the set-based `-l 'app in (api),tier in (backend)'` fails `pods-selected-by-policy`. Both are rare but correct.
- `namespace-and-pod-selector` checks `spec.ingress[0].from` length 1 (assumes one ingress rule, the natural layout).
- `label-namespace-allow` (object mode): the `output` assumes `kubectl label -f ns-metrics.yaml team=monitoring --local -o yaml` prints the file object plus the label, keys sorted, nothing added. To confirm with the real kubectl v1.37 in CI, as well as the rewrite of `kubectl label namespace metrics ...` onto the file.
- `test-connectivity-exec`: target and timeout are matched with regexes on the JSON of `rest` (accepts `api.payments`, `.svc`, `.svc.cluster.local`, with or without `http://`; `-T 2`, `-T2`, `--timeout=2`, `--timeout 2`). Other HTTP clients (`curl`, `nc`) are not accepted because the stem names wget.
- Protocol default TCP: not stated in any explanation (unverified: the NetworkPolicy API reference page (`/docs/reference/kubernetes-api/networking-resources/network-policy-v1/`) could not be fetched in this session and the concept page does not state it). Solutions without `protocol` are still accepted for the TCP-only rules of 5.1.1.
- The chapter `52-network-policies.en.md` did not exist yet; facts come from kubernetes.io (Network Policies, Debugging DNS Resolution, DNS for Services and Pods, Labels and Selectors, kubectl label, kubectl exec).
