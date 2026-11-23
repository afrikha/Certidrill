# C-kcsa-4 — KCSA course chapters 37, 38, 41–46 (2026-11-23)

## Files written
`content/kcsa/course/chapters/` : `37-audit-logging`, `38-network-policy`, `41-trust-boundaries`, `42-persistence`, `43-denial-of-service`, `44-malicious-code`, `45-network-attacker`, `46-sensitive-data` (`.en.md` only). Prose 1,166–1,337 words each (code excluded). `check-cert`: 0 problems for these chapters.

## Sources fetched (kubernetes.io unless noted)
Auditing task page; Network Policies; Communication between Nodes and the Control Plane; Kubelet authn/authz; KubeletConfiguration v1beta1 reference; Good practices for Secrets; Secrets; Encrypting confidential data at rest; API Priority and Fairness; Resource Quotas; Static Pods (concept + task); Service Accounts; RBAC good practices; Authentication (no certificate revocation in v1.37; static token file); Pod Security Standards; Ports and Protocols (control plane table); attack.mitre.org Containers matrix; OWASP Threat Modeling Cheat Sheet (four questions, STRIDE); falco.org event sources (k8saudit plugin).

## Doubts and choices
1. **MITRE ATT&CK Containers matrix changed**: the current matrix has no "Defense Evasion" column; it shows "Stealth" (TA0005) and a new "Defense Impairment" (TA0112). Chapters only cite technique names and IDs (T1525, T1053.007, T1543.005, T1098.006, T1204.003, T1609, T1610, T1611, T1613, T1046, T1496), no tactic names. Question writers should not use "Defense Evasion" as a container-matrix tactic without checking.
2. **Kubelet defaults**: flags default to anonymous auth on + `AlwaysAllow`; the KubeletConfiguration file defaults to anonymous off, `Webhook`, `readOnlyPort: 0` (verified on the config reference). Chapter 45 states both; questions should say which one they mean.
3. **`NET_RAW` granted by default by many runtimes** (ch. 45): from runtime knowledge (containerd/Docker default capability sets), not verified on a kubernetes.io page. Worded "many runtimes".
4. **Worker node ports** (kube-proxy 10256, NodePort 30000–32767) and kubelet read-only port number 10255: the ports page fetch returned only the control plane table; 10255 and 30000–32767 are stated from knowledge (well established). 10250 verified.
5. **DNS label `k8s-app: kube-dns`** in the DNS egress example (ch. 38) is the conventional CoreDNS label in kubeadm clusters; it can differ per distribution.
6. **Dashboards** (ch. 45) kept generic ("cluster web UIs") on purpose: the status of the Kubernetes Dashboard project in 2026 was not checked.
7. **Edge DoS** (ch. 43): no specific ingress controller named (ingress-nginx status in 2026 not checked); mitigations described generically (WAF, rate limiting at ingress/Gateway, provider DDoS protection).
8. No inline links and no `course.yaml` references added (course.yaml is not mine to edit); the chapters' `references: []` stay empty.
