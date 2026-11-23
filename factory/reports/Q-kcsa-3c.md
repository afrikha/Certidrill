# Q-kcsa-3c — KCSA questions, fundamentals 3.6.3–3.8.3 (2026-11-23)

39 `single` questions in `content/kcsa/questions/fundamentals/kcsa-3c-*.yaml` (English only).
Per objective: 3.6.3 ×5, 3.6.4 ×5, 3.7.1 ×5, 3.7.2 ×5, 3.7.3 ×5, 3.8.1 ×5, 3.8.2 ×5, 3.8.3 ×4.
Difficulty: 15 easy / 18 medium / 6 hard. Correct options: a 11, b 9, c 12, d 7.
Check: `CERT=kcsa npx tsx factory/validate.ts --prefix kcsa-3c-` → 0 problem(s); `content:validate --cert kcsa --prefix kcsa-3c-` → 0 problems, 0 warnings.

## Pages fetched (all used as references)
kubernetes.io: Resource Quotas, Limit Ranges, Taints and Tolerations, Assigning Pods to Nodes, Runtime Class, Multi-tenancy, Auditing (task page), kube-apiserver Audit Configuration (v1), Authenticating, Using Node Authorization (fact check only), Network Policies (shows "As of Kubernetes 1.37"). Also falco.org/docs/ ("The Falco Project"), falco.org Kubernetes Audit Events (k8saudit plugin), istio.io Security concepts.

## Duplicates avoided
Other agents wrote KCSA questions in parallel. I replaced 14 drafts that tested the same decision as an existing question: audit without `--audit-policy-file` (kcsa-2a-audit-no-policy), RuntimeClass for gVisor (kcsa-4b-sandboxed-runtime), Pod traffic not encrypted (kcsa-4b-plaintext-pod-traffic), audit log shipped off the node (kcsa-6a-audit-log-tamper-proof, kcsa-5a-ir-audit-off-node), `ipBlock` with `except` (kcsa-4b-block-metadata-egress), dedicated nodes for sensitivity (kcsa-6a-nist-sensitivity-grouping), taint without affinity (kcsa-2a-taint-without-affinity, kcsa-1b-boundary-dedicated-nodes), `node-restriction.kubernetes.io/` label (kcsa-2a-isolation-label-prefix), `scheduling.nodeSelector` (kcsa-2b-runtimeclass-scheduling), missing RuntimeClass or handler → Failed (kcsa-2b-runtimeclass-handler-missing), hostNetwork Pods and NetworkPolicy (kcsa-1a-imds-hostnetwork), Secrets at Metadata (kcsa-4b-audit-secrets-metadata), default deny ingress manifest (kcsa-4b-default-deny-ingress), CNI does not enforce NetworkPolicy (kcsa-2c-cni-policy-no-effect). The last replacement covers ICMP behaviour under a deny-all policy, which the Network Policies page says is undefined.
Batches written after this one should check against the `kcsa-3c-` stems.

## Stated from general knowledge or partly verified (low risk)
- An egress rule without `to` matches all destinations. The API reference was not fetched; the Network Policies page shows the related `egress: [{}]` allow-all.
- The `blocking` backend mode does not fail the request when an audit write fails (the page describes only `blocking-strict` as failing the request).
- Interactive `kubectl exec` session contents are not in the audit log, at any level.
- `omitManagedFields` exists at the top level of a Policy (the rule-level field was confirmed; the top-level default is from the API type).
- kube-proxy watches EndpointSlices, kubelets update Leases in `kube-node-lease`, and controllers create Events. These are used only as "normal activity" distractors in kcsa-3c-audit-recon-403.
- RBAC cannot restrict individual Pod spec fields, and Pod Security Standards do not cover tolerations (kcsa-3c-toleration-admission).
- An exact count of two audit events (RequestReceived and ResponseComplete) for a short request when no stage is omitted. This follows from the stage definitions, but the page does not state it as a count.

## Choices
- No question depends on a MITRE tactic name or on the 4Cs.
- Kubelet username `system:node:<nodeName>` was verified on "Using Node Authorization". It appears only in an explanation.
