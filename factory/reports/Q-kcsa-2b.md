# Q-kcsa-2b — KCSA questions, components 2.4.3–2.8.1 (2026-11-23)

48 `single` questions in `content/kcsa/questions/components/`, prefix `kcsa-2b-`, 4 per objective. English only.
Difficulty 19 / 22 / 7 (easy / medium / hard). Correct option positions a/b/c/d: 12 each.
Check: `CERT=kcsa npx tsx factory/validate.ts --prefix kcsa-2b-` gives 0 problem(s). `check-cert kcsa` reports no problems.
No other KCSA question files existed when this batch was written, so there was nothing to de-duplicate against.

## Pages fetched (references only point to these)
kubernetes.io: Using Node Authorization, Admission Control in Kubernetes (NodeRestriction, DenyServiceExternalIPs; NodeRestriction is not in the v1.37 default list), TLS bootstrapping, Using RBAC Authorization (system:node, system:node-proxier), Container Runtime Interface (CRI), Container Runtimes, Runtime Class, Volume Types (hostPath warning), Configure a Security Context, Pod Security Standards, Linux kernel security constraints, Pod API reference (runAsNonRoot, privileged, allowPrivilegeEscalation, hostIPC/hostPID, shareProcessNamespace, runtimeClassName, hostPort), Share Process Namespace, Kubernetes Configuration Good Practices, Configure Service Accounts for Pods, Managing Service Accounts, Operating etcd clusters, kube-proxy reference, Virtual IPs and Service Proxies, Service, Security Checklist, Multi-tenancy.
github.com: opencontainers/runc, google/gvisor, kata-containers/kata-containers. cri-o.io.

## Stated without a fetched page (low risk)
- kube-proxy needs `NET_ADMIN` or a privileged container plus `hostNetwork` (`kcsa-2b-kube-proxy-host-privileges` stem). This is how kubeadm deploys it, and the chapter says the same, but no fetched page states it.
- The exact permissions of `system:node-proxier` (reads Services, EndpointSlices, Nodes; no Secrets). The RBAC page only says "resources required by kube-proxy".
- The kube-proxy kubeconfig at mode `600` or stricter, owned by root, "as hardening guides check" (CIS Benchmark item not fetched).
- AlwaysPullImages described in a distractor explanation (standard behavior; that admission page section was not quoted in my fetch).
- crictl as a CRI debugging client (a distractor in `kcsa-2b-oci-runtime-role`).
- The kube-proxy metrics endpoint is read-only (it "does not accept configuration").
- gVisor is described only as "an application kernel in user space between the container and the host". The README did not describe how it intercepts system calls, so no question depends on that detail.

## Choices
- The Kata Containers reference title is the full GitHub page title (very long), without the " · GitHub" suffix, following the gVisor title convention already used in the bank.
- `kcsa-2b-runtimeclass-handler-missing` relies on the documented `Failed` phase. The RuntimeClass exists in the scenario, so admission does not interfere.
