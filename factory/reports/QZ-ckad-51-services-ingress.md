# QZ-ckad-51-services-ingress — report

File: `content/ckad/quizzes/51-services-ingress.yaml` (10 questions, English only). Checks: `check-quiz` 0 problem(s), 0 warning(s); `check-exercise ckad ckad-qz-51-` 0 problem(s).

| # | Objective | Type | Topic |
| --- | --- | --- | --- |
| 1 | 5.2.1 | single, d1 | Default type ClusterIP, targetPort defaults to port |
| 2 | 5.3.1 | single, d1 | `Prefix` matches element by element (`/shopping` is not matched by `/shop`) |
| 3 | 5.2.2 | single, d2 | Cross-namespace DNS name plus Service port vs targetPort |
| 4 | 5.3.2 | single, d2 | 503 / Service not found: the backend Service must be in the Ingress namespace |
| 5 | 5.2.1 | multi, d2 | What `kubectl expose` copies (selector, ClusterIP), compared with `create service` |
| 6 | 5.2.1 | command/object | `expose` of a Deployment selected with `matchExpressions`: `--selector` with two labels |
| 7 | 5.3.1 | command/object | `create ingress` with an `Exact /` rule and a `Prefix /guides` rule on a named Service port |
| 8 | 5.2.2 | manifest | Fix the Deployment, not the Service: template labels, immutable selector, named container port |
| 9 | 5.3.2 | manifest | TLS fix: Opaque Secret, rule without host, both hosts under `tls` |
| 10 | 5.3.1 | manifest (2 docs) | Service with a named port + Ingress backend on the Service port (`web`/80), not the container port |

None of the exercises repeats a bank task (`ckad-5b-*`, `ckad-5c-*`, and `ckad-2a-bluegreen-switch-selector` for `set selector`, which I deliberately avoided).

## Tooling bug (blocks `kubectl create service <type>` solutions)

`factory/check-exercise.ts` (`consistency`) rejects every object-mode solution of the form `kubectl create service nodeport NAME …`. `parseCommand` takes the service type (`nodeport`, `clusterip`…) as the object name (`names[0]`), so the checker reports "output has no object named nodeport". `create secret <type>` gets special handling in `describeKubectl`, but `create service <type>` does not. Because of this I rewrote position 6, which first used `create service nodeport --node-port`. `create service` now appears only as a negative, and negatives are not checked for consistency. Fix: handle `create service <clusterip|nodeport|loadbalancer|externalname>` as `create secret` is handled.

Related parser point: `KUBECTL_SHORT` maps `-l` to `selector` for every verb. For `kubectl expose`, though, `-l` is `--labels`, not `--selector`, so a candidate's `expose … -l app=x` would be misread in invocation-style parsing. It does not affect the object-mode checks here, which run on the printed output.

## Unverified or to watch

- **Q6, `--selector` with `expose`.** The kubectl reference I fetched documents `--selector` ("only equality-based selector requirements… If empty… infer the selector from the resource being exposed"). It also documents that a Deployment is exposed only if its selector has just `matchLabels`. From memory of the source, I rely on two further points: an explicit `--selector` skips the conversion of the Deployment selector, so the command works on a `matchExpressions` Deployment; and the output copies the Deployment's `metadata.labels`. CI with real kubectl should confirm both.
- **Q6, scope.** The chapter mentions the `matchExpressions` limitation (Exam tip) but never mentions `expose --selector`. The flag is on the kubectl reference page allowed during the exam. Consider adding one line to the chapter's Exam tip: "or pass `--selector` with equality labels".
- **Q7, merged output.** The output assumes `kubectl create ingress` merges two `--rule` values for the same host into one rule with two paths, in the order given. This matches the reference's "multipath" example as I remember the source. If kubectl printed two separate rules for the same host, the `[host=…]` filter would see only the first one, and CI would catch it.
- **Q8, named-port symptom.** The negative explanation says the Service has no port to send traffic to on these Pods when the named targetPort matches no container port name. From memory of the EndpointSlice controller, the Pod's port lookup fails and that port is skipped for the Pod. The Debug Services page only asks "do your Pods expose a port with the same name?".
- **Q4, the 503.** The code is controller-specific (ingress-nginx answers 503 when the backend is missing). The stem therefore relies on `describe` reporting the missing Service; the chapter's symptom table has the same 503 line.
- **Chapter imprecision (minor).** The chapter states that the TLS Secret must be in the Ingress namespace ("`secretName` has no namespace field"). That is consistent with the API, but neither the Ingress concept page nor the API reference states it in so many words. Q9 does not depend on it. The rule that the backend Service must be in the same namespace is stated in the API reference (`IngressServiceBackend.name`), which Q4 and Q10 cite.
- The kubectl reference text for `--rule` says "Paths containing the leading character '*'"; it is actually a trailing `*`. The chapter is right.
