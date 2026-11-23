# C-kcna-1 — KCNA course, chapters 00, 11–14, 21–23 (2026-11-23)

## Result
8 English chapters written (`content/kcna/course/chapters/{00-getting-started,11-core-concepts,12-administration,13-scheduling,14-containerization,21-networking,22-security,23-troubleshooting}.en.md`), all 45 assigned objectives covered. `npx tsx factory/check-cert.ts kcna <8 ids>`: 0 problems; `npm run content:validate -- --cert kcna --course --chapters ...`: 0 problems.

## Sources fetched (kubernetes.io v1.37 docs unless stated)
releases, version-skew-policy, releases/release (cadence), components, virtual-ips (kube-proxy modes), service, dns-pod-service, ingress, gateway, network-policies, pod-lifecycle, sidecar-containers, images, runtime-class, container-runtimes, cgroups, kube-scheduler, pod-priority-preemption, pod-qos, manage-resources-containers, taint-and-toleration, node-status, safely-drain-node, limit-range, resource-quotas, kubeconfig, operator, controlling-access, cloud-native-security, pod-security-admission, pod-security-standards, secret, service-accounts, kubectl events reference; istio.io data plane modes; gvisor.dev; LF KCNA certification page.

## Facts worth flagging
- v1.37 specifics used: kube-proxy default mode still `iptables` (nftables future default), `ipvs` deprecated since v1.35 (disabled by default from v1.40); Endpoints API deprecated since v1.33; cgroup v1 deprecated since v1.35 (kubelet refuses cgroup v1 by default); native sidecars stable since v1.33; Ingress API frozen, Gateway API = successor (add-on CRDs); maintained releases 1.37/1.36/1.35.
- LF page lists both "Two exam attempts" and "One Retake" (consistent: first attempt + one retake). Validity 2 years, no prerequisites, 12 months to take the exam.

## Doubts / not verified (left out or kept generic)
- No penalty for wrong answers is not stated on the pages read: 00 says only "an unanswered question earns nothing".
- Study-plan threshold "85 % on three mock exams" is our recommendation (pass mark 75 %), not an official figure.
- Not stated (not verified): CNCF maturity of Kyverno, OPA Gatekeeper, Linkerd, Istio, Cilium; only containerd and CoreDNS are called "CNCF graduated" (known graduated since 2019). Question writers must check cncf.io/projects before testing maturity.
- Event TTL "one hour by default" (kube-apiserver `--event-ttl`), httpGet probe success range 200–399, Job `backoffLimit` default 6, kubelet heartbeat Lease 10 s, ServiceAccount token mount path: from knowledge, consistent with docs but not re-fetched in this session.
- Node-status page is inconsistent (40 s vs 50 s unreachable timeout); the chapter uses 50 s (the Ready condition row and taint section).
- Length: chapters run about 1,200–1,450 words including code and tables (fundamentals target 600–1,200), because each covers 5–7 objectives; prose alone is close to the target.
