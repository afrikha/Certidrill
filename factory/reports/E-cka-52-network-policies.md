# E-cka-52-network-policies — report

8 exercises in `content/cka/questions/networking/` (prefix `cka-5b-`): 4 manifest, 3 command/invocation, 1 command/object; difficulty 1×1, 4×2, 3×3. The chapter `52-network-policies.en.md` did not exist yet: written from kubernetes.io (Network Policies, kubectl run, kubectl label, Debugging DNS Resolution), all fetched 2026-11-27.

## Doubts and deviations

- `cka-5b-predict-missing-label` (object mode on a file): the `output` assumes `kubectl label ... --local -o yaml` prints the Pod of `reporter.yaml` unchanged plus the label (keys sorted, no `creationTimestamp`/`status` added). To confirm in CI with real kubectl v1.37.
- `cka-5b-deny-all-allow-same-namespace`: `allow-same-namespace` selects every Pod for both Ingress and Egress, so the effective traffic does not depend on `default-deny-all`. Hence no negative breaks only `default-deny-all` (such a negative would yield the right traffic); its checks still verify the policy as the stem specifies it.
- Several "no wrong extra peer" conditions are checked with negative-lookahead `matches` regexes on the JSON of `spec.egress`/`spec.ingress`/`spec` (no `notContains` op exists). They assume `matchLabels` (a `matchExpressions` variant of the same selector is not recognized by the `contains` checks either).
- `cka-5b-ingress-namespace-and-agents`, `agent-any-namespace`: the regex only checks that an empty `namespaceSelector: {}` appears somewhere in the ingress rules, not specifically in the agent element.
- `cka-5b-test-allowed-client-run`: labels are matched on the `flags` JSON because the parser maps `kubectl run -l` to `selector` instead of `labels` (engine limitation: for `run`, `-l` means `--labels`).
