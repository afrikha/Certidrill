# QZ-cka-52-network-policies — report

File: `content/cka/quizzes/52-network-policies.yaml` (10 questions, `cka-qz-52-01` … `-10`).

- Positions 1–5: single, single, single, multi, single (difficulty 1, 1, 2, 2, 2). Positions 6–10: command/object (label removal), then 4 manifests (difficulty 3).
- Objectives: 5.2.1 → q1, q3, q7, q8; 5.2.2 → q2, q4, q5, q6, q9, q10.
- Checks: `check-quiz.ts cka 52-network-policies` → 0 problem(s), 0 warning(s); `check-exercise.ts cka cka-qz-52-` → 5 exercises, 0 problem(s). Both re-run after the candidate reread.

## Sources fetched (2026-11-27)

- Network Policies (kubernetes.io/docs/concepts/services-networking/network-policies/), page marked v1.37: policyTypes default, isolation, additivity, node traffic always allowed, AND/OR peers, ipBlock, endPort, `kubernetes.io/metadata.name`.
- NetworkPolicy API reference (kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/): empty `ingress` allows nothing, empty or missing `from`/`to`/`ports` match everything, protocol default TCP, named port, peer semantics. Note: the CKAD quiz cites `.../policy-resources/network-policy-v1/` for the same page; both URLs answered, and I cite the one whose field text I read.
- kubectl label (removing with `key-` needs no `--overwrite`, changing a value needs `--overwrite`, `--local`).

## Avoiding repeats

- CKA bank (cka-5b-*) avoided: deny-all + same-namespace, egress ipBlock + endPort, fixing the db AND + DNS, ingress from a namespace + agents in any namespace, adding a missing Pod label, `kubectl run` test client, `exec nslookup`, `describe netpol`.
- I also read the CKAD quiz `content/ckad/quizzes/52-network-policies.yaml` (same chapter id). I dropped three drafts that were too close to it: named port vs Service port as a multi, the ledger ingress with a named port, and the cross-namespace two-policy flow. The Service port vs targetPort trap is still used, as one negative among others, in q9 and q10.

## Doubts / unverified

- q1 option c says kube-proxy implements Services and not NetworkPolicies. That is standard, but I did not fetch the kube-proxy page.
- q3 option c (`namespace:` in a peer): the explanation says kubectl rejects the unknown field. This relies on kubectl's default `--validate=strict`, which I did not re-fetch for v1.37.
- q5 option b (connection through a ClusterIP is still denied): the explanation only says the source is still a Pod of `shop`. It does not claim when NAT happens, because the docs leave that implementation-defined for ipBlock.
- q6: the outputs of `kubectl label --local -o yaml` assume kubectl prints the file's object with sorted keys and the label removed or changed, as the bank exercises do. CI with real kubectl will confirm this.
- q7: the checks require `matchExpressions` with `operator: In` (the stem asks for one namespaceSelector for both environments). `NotIn [dev]` is rejected on purpose, because it would also match namespaces that have no `env` label.
- q9: a fix of `invoice-public` with `from: [{ipBlock: {cidr: 0.0.0.0/0}}]` fails the "no from" check. Whether a 0.0.0.0/0 ipBlock matches in-cluster Pod IPs depends on the plugin, so I accept only the rule without `from` (or with `from: []`). In q8 and q9 I only check that no port uses UDP or SCTP, so writing `protocol: TCP` or leaving it out both pass.
- The chapter and the bank exercises I read look correct. I found nothing wrong.
