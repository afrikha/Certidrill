# Q-kcsa-4b — KCSA threats questions (4.4.3–4.7.3), English only

46 `single` questions in `content/kcsa/questions/threats/kcsa-4b-*.yaml`. Counts per objective as assigned (5×6, 4×4). Difficulty 18 easy / 21 medium / 7 hard. Correct answers a 12, b 11, c 10, d 13. Check: `CERT=kcsa npx tsx factory/validate.ts --prefix kcsa-4b-` → 0 problem(s); `npm run content:validate -- --cert kcsa --prefix kcsa-4b-` → 0 problem(s), 0 warning(s).

## Deduplication against the other KCSA batches
Other batches (1a/1b, 2a–2c, 3a–3c, 4a, 5a/5b, 6a/6b) were written at the same time and kept growing. I compared my stems with theirs three times and replaced 41 of my drafts that tested the same decision with the same answer (for example readOnlyRootFilesystem, seccomp vs AppArmor, privileged overrides profiles, gVisor model, user namespaces root/capabilities/host namespaces, kubelet read-only port and anonymous flags, IMDS risk and egress policy, ClusterIP exposure, CNI encryption, default-deny ingress, audit Metadata for Secrets, Secrets Store CSI, volume vs env var, secret in image layer, base64 in Git, sidecar Secret scope, etcd snapshot, Node authorizer scope, create pods escalation, serviceaccounts/token, namespace patch, webhook configuration RBAC, LoadBalancer quota, token RBAC scope). Questions created after my last check (2026-11-23) may still overlap; a final cross-batch pass is advisable.

## Sources fetched (2026-11-23)
kubernetes.io: security context task, Pod Security Standards, Pod Security Admission, Linux kernel security constraints, Runtime Class, User Namespaces, Network Policies (incl. `kubernetes.io/metadata.name`, node traffic exception, ipBlock NAT caveat), Kubelet authn/authz (path→subresource table, `nodes/proxy` warning), kubelet CLI reference (flag defaults), control plane–node communication, Secrets, Good practices for Secrets, Encrypting Confidential Data at Rest, RBAC reference (escalation prevention, resourceNames, default roles, default SA), RBAC good practices, Admission Control, Node authorization, Auditing, Securing a Cluster, Security Checklist, Application Security Checklist, Service, Service Accounts, Accessing the API from a Pod, Ports and Protocols, Resource Quotas, Volumes, kubectl proxy. Also istio.io Security concepts (no AuthorizationPolicy = allow all), linkerd.io Automatic mTLS (24 h certificates), docs.cilium.io Transparent Encryption, OCI image-spec layer.md, NIST SP 800-190 PDF (the last two were used by a draft that was later removed as a duplicate).

## Stated from general knowledge (not on a fetched page; low risk)
- `kcsa-4b-net-raw-capability`: `NET_RAW` allows raw/packet sockets (Linux capability semantics). Not claimed to be in runtimes' default sets.
- `kcsa-4b-ptrace-hostpid`: `SYS_PTRACE` + `hostPID` allows tracing and reading memory of host processes (Linux semantics). The PSS page confirms both are forbidden by Baseline.
- `kcsa-4b-proc-environ-hostpid`: environment readable via `/proc/<pid>/environ` from the host PID namespace with privileged mode.
- `kcsa-4b-privileged-with-ape-false`: the docs say the combination "cannot be set"; I state that the API server rejects it (validation error), which matches known behaviour.
- `kcsa-4b-userns-requirements` uses the kernel (Linux 6.3, idmap mounts) and runtime versions given on the User Namespaces page.
- `kcsa-4b-kubelet-exec-subresource`: KubeletFineGrainedAuthz adds subresources for some read paths; exec still maps to `nodes/proxy` (fetched v1.37 table lists only stats/metrics/log/spec/checkpoint, others → proxy).
- `kcsa-4b-service-discovery-env-dns`: the Service page does not say whether `*_SERVICE_HOST` variables cover only the Pod's namespace; the question does not depend on it.

## Choices
- No MITRE ATT&CK tactic names; no 4Cs; no Kubernetes Dashboard project status (kept "cluster web UI" generic, as chapter 45 does).
- PodSecurityPolicy, dockershim, KMS v1 not used.
