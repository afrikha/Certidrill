# C-kcsa-2 — KCSA course, chapters 22–29 (2026-11-23)

## Files written
`content/kcsa/course/chapters/` 22-controller-manager, 23-scheduler, 24-kubelet, 25-container-runtime, 26-kube-proxy, 27-pod, 28-etcd, 29-container-networking (`.en.md` only). The `chapters/` folder did not exist; created it.
Check: `check-cert.ts kcsa 22… 29…` → 0 problems; `content:validate --course --chapters …` → 0 problem(s). 1,200–1,340 words per file (tables and code included).

## Verified on kubernetes.io (v1.37 docs) / etcd.io / gvisor.dev
kube-controller-manager and kube-scheduler flags (secure ports 10257/10259, `--bind-address` default 0.0.0.0, `--profiling` default true, always-allow paths, `--use-service-account-credentials`, `--service-account-private-key-file` "enables legacy secret-based tokens"); kubelet flag defaults vs KubeletConfiguration defaults; kubelet authz subresource mapping, `nodes/proxy` warning, KubeletFineGrainedAuthz stable since v1.36; Node authorizer and NodeRestriction text; ServiceAccountNodeAudienceRestriction beta since v1.33; TLS bootstrapping (serving CSRs not auto-approved); CCM controllers, RBAC and `node.cloudprovider.kubernetes.io/uninitialized` taint; CRI v1 requirement, default sockets, dockershim removal v1.24; RuntimeClass fields and Failed phase; kube-proxy modes (iptables default, nftables, ipvs deprecated v1.35 / disabled v1.40 / removed v1.43), metrics 127.0.0.1:10249, healthz 0.0.0.0:10256, `nodePortAddresses` defaults; Service types, NodePort range, `externalIPs` deprecated v1.36, DenyServiceExternalIPs; PSS Baseline/Restricted fields; AppArmor stable since v1.31; user namespaces stable since v1.36; projected token defaults (1 h, min 10 min, 80 %/24 h rotation), Pod `automountServiceAccountToken` wins; etcd TLS flags, "access to etcd is equivalent to root"; EncryptionConfiguration providers and KMS v1 deprecated; network model, NetworkPolicy limits, Cilium encryption options; DNS policies.

## Stated without a fetched page (doubts)
- `--bind-address=127.0.0.1` for controller manager/scheduler attributed to "hardening guides such as the CIS Kubernetes Benchmark" (CIS text not fetched; name only).
- `loadBalancerSourceRanges`: the Services page excerpt did not mention it and the cloud-firewall task page failed to load; kept with "where the provider supports it".
- kube-proxy needs `NET_ADMIN`/privileged, host network, `/run/xtables.lock`; `system:node-proxier` scope (reads Services, EndpointSlices, Nodes, writes events) — from general knowledge of kubeadm, not fetched.
- `kubeletconfig containerRuntimeEndpoint` field name, kubelet `seccompDefault`, KMS v2 etcd prefix `k8s:enc:kms:v2:`, CoreDNS label `k8s-app: kube-dns`, bootstrap tokens stored as Secrets in `kube-system`, signer name `kubernetes.io/kubelet-serving` — well-known, not re-fetched.
- `externalTrafficPolicy: Local` preserving client source IP — not in the fetched excerpt.
- Calico WireGuard encryption named without a fetched page (Calico docs host is not in the CNCF allowlist).
- Scheduler ClusterRole includes evicting/deleting Pods for preemption — general knowledge.
- No `references` added to course.yaml (task forbids editing it); chapters contain no inline links.
