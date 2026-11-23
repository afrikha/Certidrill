# C-kcsa-1 — KCSA course, chapters 00, 11-16, 21 (2026-11-23)

8 English chapters written in `content/kcsa/course/chapters/` (1,036 to 1,369 words each). `check-cert`: 0 problems for these chapters; `content:validate`: 0 problems.

## Sources fetched
kubernetes.io (v1.37 docs): Cloud Native Security and Kubernetes, Security Checklist, Application Security Checklist, Securing a Cluster, Controlling Access, Authentication (anonymous), Authorization, Admission Controllers, kube-apiserver reference, Auditing, Ports and Protocols, Images, Secrets, Secrets good practices, Multi-tenancy, User Namespaces, RuntimeClass, Linux kernel security constraints, AppArmor and seccomp tutorials, Verify Signed Kubernetes Artifacts. Also the v1.28 archived page "Overview of Cloud Native Security" (4Cs), the CNCF Cloud Native Security Whitepaper v2, csrc.nist.gov (SP 800-190), cisecurity.org (CIS Kubernetes Benchmark), the LF KCSA page, and LF docs (MC FAQ, MC instructions, MC exam UI, resources allowed).

## Doubts and choices
1. **4Cs source**: no current page publishes the 4Cs. The CNCF whitepaper v2 does not mention them. Chapter 11 cites the archived v1.28 kubernetes.io page (`v1-28.docs.kubernetes.io`, inline link; this host is not in `lib/vendors.ts` docsHosts, so don't use it as a course.yaml reference) and says that kubernetes.io now uses the lifecycle phases of the whitepaper.
2. **Layer of a control**: the 4Cs page puts infrastructure (API server and etcd network access, etcd encryption) under Cloud and TLS/mTLS under Code. Chapter 11 follows the page. Question writers should keep the same mapping.
3. **Closed book**: the LF "resources allowed" page says multiple-choice exams allow no tools, resources or external sites, without naming KCSA. Written as closed book.
4. **No negative marking** is not stated anywhere. Chapter 00 says only that a blank answer can't score.
5. **"Passing CKS renews KCSA"** comes from the profile. I did not re-check it.
6. **NodeRestriction**: the v1.37 admission page and the kube-apiserver reference list it outside the default plugins. The kube-apiserver `--enable-admission-plugins` default list also shows new v1.37 plugins (PodGroupProtection, PodTopologyLabels, NodeDeclaredFeatureValidator, PodResizeValidator) that the admission page doesn't list. The chapters name only the stable, well-known ones.
7. **Memory limit vs request**: the Security Checklist says the limit should be "equal or inferior to the request", and the Application Security Checklist says "equal to or greater than". These contradict each other, so the chapters only say "set a memory limit" (the example uses limit = request).
8. **seccompDefault** feature state is inconsistent on its own page (stable v1.27 in one place, beta in another). The chapters don't state a stage for it.
9. **AppArmor annotations**: the docs call them deprecated and don't give a removal version. Written as "deprecated".
10. **Shared responsibility** (1.2.1): no kubernetes.io page covers it. The table is generic and avoids naming any provider; a managed service's worker-node responsibilities vary ("usually the operator").
11. **Dockerfile** in chapter 15 is in a `text` fence, because `dockerfile` is not an allowed fence language.
