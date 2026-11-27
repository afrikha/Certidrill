# QZ-ckad-52-network-policies — report

File: `content/ckad/quizzes/52-network-policies.yaml` (10 questions, `ckad-qz-52-01` to `-10`).

- Objectives: 5.1.1 (q2, q3, q6, q7, q9), 5.1.2 (q1, q4, q5, q8, q10). Difficulty 1, 1, 2, 2, 2, then 3 ×5.
- Types: q1–q5 `single` ×4 + `multi` ×1; q6 `command` (object mode, `kubectl label --overwrite`), q7–q10 `manifest` (q8 and q10 multi-document).
- Checks: `check-quiz.ts ckad 52-network-policies` → 0 problem(s), 0 warning(s); `check-exercise.ts ckad ckad-qz-52-` → 0 problem(s). Both re-run after the candidate reread (removed a hint in the q9 stem, made the q1 options parallel).

## Facts verified (kubernetes.io, fetched 2026-11-27, v1.37 docs)

- Network Policies concept page: `policyTypes` default, isolation per direction, union of policies, node traffic and replies always allowed, `endPort` stable since v1.25 with a numeric `port`, AND/OR peers, `kubernetes.io/metadata.name`, default-deny and allow-all examples.
- NetworkPolicy API reference (`/docs/reference/kubernetes-api/policy-resources/network-policy-v1/`, page title "NetworkPolicy"): `podSelector` is optional (defaults to empty), `port` can be numeric or named, `protocol` defaults to TCP, `endPort` cannot be set with a named port, a peer with `ipBlock` cannot also have `podSelector` or `namespaceSelector`, `except` must lie inside `cidr`, a missing or empty `from`/`to`/`ports` matches everything.
- Labels and Selectors: `matchLabels` and `matchExpressions` are ANDed; `In` semantics.
- kubectl label: `--overwrite` is needed to change an existing value; `--local`.

## Doubts / unverified

- q6 (object mode): the `output` of `kubectl label … --local -o yaml` on `pod-reporter.yaml` is assumed to be the file object with its keys sorted, with nothing added. I wrote the file in sorted key order so that both match. CI with real kubectl should confirm this. The negative "label without `--overwrite`" (a real mistake) is left out because kubectl prints an error instead of an object, and object-mode negatives need an output.
- q9: the claim that `access: true` (unquoted) makes `kubectl apply` fail comes from the chapter and from `matchLabels` being a map of strings. I did not fetch the exact error text, and the stem does not quote it. I do not state what a plugin does with the `ingress` rules of a policy whose `policyTypes` is `[Egress]`. The texts only say that the policy does not isolate the Pods for ingress, and that it blocks all egress because it has no egress rule.
- q7: a candidate who lists 100 separate port entries instead of `endPort`, or who uses `matchExpressions` for `team: audit`, would fail the checks. I accept this as unrealistic. The `length` checks (two rules, one peer and one port entry each) enforce the "nothing else" requirement.
- q8, q10: I check `policyTypes` with `matches` on the JSON of `spec` (negative lookahead), so that an omitted `policyTypes` still passes where it is correct (q10). In q8 the egress-baseline `podSelector` is checked with `absent` on `matchLabels`/`matchExpressions`, so `{}` and an omitted field both pass.
- q10: this relies on the standard behavior, which the chapter also states, that policies see Service traffic after it reaches the backend Pod (target port 8080).

## Bank overlap

I read the eight `ckad-5a-*` exercises. The quiz does not reuse their tasks or traps. Instead it tests: label overwrite with `matchExpressions` ANDed with `matchLabels`; named port plus `endPort` split into two rules; `0.0.0.0/0` with several `except` ranges plus DNS to any destination for every Pod across two policies; a debug fix (`policyTypes`, `ipBlock` in the same peer as `podSelector`, an unquoted label value); and a cross-namespace flow that needs both ends, with Service port vs targetPort. Shared background facts are unavoidable: `kubernetes.io/metadata.name`, and the rule that `policyTypes` must be explicit for egress. I found no errors in the chapter or in the bank exercises.
