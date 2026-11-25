# Q-kcsa-4a — KCSA questions, domain `threats` (4.1.1–4.4.2)

55 `single` questions in `content/kcsa/questions/threats/`, prefix `kcsa-4a-`, 5 per objective, English only.
Difficulty 22 easy / 25 medium / 8 hard. Correct options: a 14, b 16, c 15, d 10.
Checks: `CERT=kcsa npx tsx factory/validate.ts --prefix kcsa-4a-` → 0 problem(s); `npm run content:validate -- --cert kcsa --prefix kcsa-4a-` → 0 problems, 0 warnings.

## Deduplication
Other agents wrote KCSA questions at the same time (prefixes 1a–6b, 101 files already in `threats/` from 4b). After the first draft I compared my stems with theirs and replaced 18 questions that tested the same decision as an existing question. The topics I left to them:
- 4b: kubelet certificate verification (`--kubelet-certificate-authority`), plaintext Pod traffic, NodePort to ClusterIP, privileged mode overriding profiles.
- 2b: hostPID visibility, runtime socket risk, disabling token automount. 5b: API server proxy in plain HTTP, Pod verifying the API server with `ca.crt`, `system:masters` client certificate.
- 3a/3c: legacy token Secret risk, quota that needs LimitRange defaults, LimitRange defaults, `count/<resource>` quotas. 1b: CPU throttling vs OOM, shared kernel. 1a: rebuild nodes from a patched image. 6a/5a: revisiting the threat model, tag-replacement threat, digest/signature questions.
- I kept `ps-backdoored-image` (why the backdoor returns: mutable tag), which differs from 6a-attack-implant-image (technique name). `tb-node-credential-boundary` maps the boundary; 2b-noderestriction-self-label tests the plugin.

## Sources fetched (2026-11-23)
kubernetes.io: Communication between Nodes and the Control Plane, Multi-tenancy, RBAC Good Practices, Static Pods (concept and task), Authenticating (no certificate revocation in 1.37, OIDC id_token not revocable, static token file), Dynamic Admission Control, Service Accounts, Managing Service Accounts, API Priority and Fairness, Resource Quotas, Limit Ranges, Resource Management for Pods and Containers, Process ID Limits And Reservations, Node-pressure Eviction, Local ephemeral storage, Reserve Compute Resources for System Daemons, Pod Security Standards, Linux kernel security constraints, Volumes, Volume Types (hostPath warning), Service, Network Policies, Auditing, Ports and Protocols, Kubelet authentication/authorization, Using Node Authorization, Securing a Cluster, Security Checklist, Secrets, Operating etcd clusters, Field Selectors, Horizontal Pod Autoscaling, Accessing the Kubernetes API from a Pod, DaemonSet, CronJob, Safely Drain a Node, Cloud Native Security and Kubernetes, kubelet reference (`--root-dir`).
Other: attack.mitre.org (Containers matrix v20, T1525, T1498, T1611, T1496, T1609, T1543.005), falco.org/docs, istio.io rate limit task, argo-cd.readthedocs.io Orphaned Resources Monitoring.

## Doubts and choices
1. **MITRE tactics**: only technique names and IDs are used, never a tactic name such as Defense Evasion (v19 split it).
2. **4Cs**: not used in this domain.
3. **Not verified on a fetched page** (general knowledge, low risk):
   - `CAP_SYS_MODULE` allows loading kernel modules, and `SYS_TIME` sets the clock (`esc-sys-module`). There is no allowed-host man page; MITRE T1611 only covers loading a module from a privileged container.
   - Connecting to a UNIX socket still works through a `readOnly: true` mount (`esc-socket-readonly`). The Volume Types warning ("whether these are mounted as read-only or as read-write") supports the conclusion but does not describe the mechanism.
   - Secret volumes of other Pods live under the kubelet root directory (`esc-kubelet-root-dir`). The kubelet reference only says "volume mounts, etc." for `--root-dir`.
   - Kubelet and `kube-system` controller requests fall into non-exempt suggested APF levels (`cpdos-exempt-level`). The fetched excerpt confirms only the `exempt` FlowSchema for `system:masters`.
   - The audit example policy lowers or drops some high-volume resources (`pc-audit-scope`, worded "some of them").
   - The DFD element classes (external entity, process, data store, data flow) are the STRIDE/DFD convention. The OWASP threat modeling page redirects to `community.owasp.org`, which is not in the CNCF host list, so it is not referenced.
   - The mirror Pod name suffix and the static Pod task path `/etc/kubernetes/manifests` are verified. "Admission does not stop the kubelet from running a static Pod" is worded from "managed directly by the kubelet ... without the API server observing them"; the behaviour when the mirror Pod is rejected is not stated.
4. **Argo CD orphaned resources** covers namespaced resources only, so `pc-gitops-baseline` deliberately mentions Deployments and CronJobs and not ClusterRoleBindings.
5. **4.3.3 references**: kubernetes.io has no edge DDoS page. The question about volumetric attacks cites MITRE T1498, and the rate-limit question cites the Istio/Envoy task (a neutral example of a gateway).
