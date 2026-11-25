Compliance that depends on someone remembering to run a check does not last. Automation turns the frameworks of this domain into checks that run at every stage: the cluster configuration against the CIS Kubernetes Benchmark, images and manifests in the CI/CD pipeline, every request at admission, and every process at runtime. The exam expects you to know which tool works at which stage, and what each one does not do.

<!-- section: kube-bench | objectives: 6.4.1 -->
## Benchmark assessment with kube-bench

**kube-bench** is an open source tool from Aqua Security that checks whether Kubernetes is deployed securely by running the checks of the **CIS Kubernetes Benchmark**. It inspects the node it runs on: the flags of the running components, their configuration files and the permissions and ownership of those files.

How it runs:

- **As a Kubernetes Job**, from the `job.yaml` provided by the project; the results are in the Pod's logs. To check control plane nodes, the Job's Pod must be scheduled there (nodeSelector and tolerations), and it needs the host's PID namespace and read access to host directories such as `/etc` and `/var`.
- **As a binary** directly on a node, usually as root to read every configuration file.
- **In a container** with `--pid=host` and the host's `/etc` and `/var` mounted read-only.

```bash
kubectl apply -f job.yaml
kubectl logs job/kube-bench
```

```text
[INFO] 4 Worker Node Security Configuration
[INFO] 4.2 Kubelet
[PASS] 4.2.1 Ensure that the --anonymous-auth argument is set to false (Automated)
[PASS] 4.2.2 Ensure that the --authorization-mode argument is not set to AlwaysAllow (Automated)
[WARN] 4.2.4 Verify that the --read-only-port argument is set to 0 (Manual)
[FAIL] 4.2.10 Ensure that the --rotate-certificates argument is not set to false (Automated)
```

The output above is abridged; check numbers come from the benchmark version in use (here the `cis-1.10` checks) and change between versions.

Each check reports **PASS**, **FAIL** or **WARN** (a check that needs manual verification or could not be evaluated automatically), and each failure comes with a remediation text. By default kube-bench detects the Kubernetes version and picks the matching benchmark version; it can also run a given benchmark, including the variants for managed services and distributions. On a managed Kubernetes service, the control plane nodes are not accessible, so only worker nodes can be checked.

What kube-bench does **not** do: it does not fix anything (it reports), it does not scan images or workloads for vulnerabilities, and a single run reflects a single node. Running it as a scheduled job (or through an operator such as the Trivy Operator, which can also produce CIS reports) gives continuous evidence.

> **Exam trap.** kube-bench checks the **configuration of the Kubernetes components and nodes** against the CIS Benchmark. It does not check images (Trivy), it does not block Pods (admission controllers) and it does not detect attacks at runtime (Falco).

<!-- section: pipeline-scanning | objectives: 6.4.2 -->
## Image and configuration scanners in CI/CD

Shifting checks left means failing a build or a pull request before a vulnerable image or an insecure manifest reaches the cluster. Two families of checks run in the pipeline:

- **Image scanning**: compare the packages of an image with vulnerability databases (CVEs), and look for secrets and misconfigurations in it.
- **Configuration scanning**: analyse manifests, Helm charts and other infrastructure-as-code files for insecure settings (privileged containers, missing limits, running as root, `hostPath` mounts) before they are applied.

| Tool | Scans | Typical use |
| --- | --- | --- |
| **Trivy** (Aqua Security) | Container images, filesystems, Git repositories, VM images, Kubernetes clusters; vulnerabilities, misconfigurations, secrets, licenses; generates SBOMs (CycloneDX, SPDX) | Fail the pipeline on HIGH or CRITICAL vulnerabilities; scan manifests and charts; Trivy Operator for continuous in-cluster reports |
| **Kubescape** (CNCF incubating) | Clusters, YAML manifests and Helm charts, repositories, registries and images; checks against frameworks such as NSA-CISA, MITRE ATT&CK and CIS; vulnerabilities and risk scores | Manifest scanning in CI and in the developer's editor; in-cluster operator for scheduled scans and runtime detection |

A pipeline gate with Trivy: the command returns a non-zero exit code when it finds high or critical vulnerabilities that have a fix, which stops the job.

```bash
trivy image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 \
  registry.example.com/shop/cart:1.4.2
trivy image --format cyclonedx --output sbom.cdx.json \
  registry.example.com/shop/cart:1.4.2
```

Good practices around these scanners:

- **Scan again later.** An image that was clean at build time becomes vulnerable when a new CVE is published: rescan images in the registry and running workloads on a schedule.
- **Scan what you deploy.** Scan the image by digest, then deploy that same digest.
- **Use the same policies everywhere.** The rules that fail the pipeline should match the rules enforced at admission, so that a developer is not surprised at deployment.

> **Exam trap.** A CI/CD scan is a **preventive control for the pipeline only**. Anyone who can `kubectl apply` directly bypasses it. Pair it with admission control in the cluster, which checks every request whatever its origin.

<!-- section: enforcement-detection | objectives: 6.4.3 -->
## Continuous enforcement and runtime detection

Inside the cluster, two kinds of tools close the loop: **policy engines** prevent non-compliant resources from being admitted and report on those that already exist, and **runtime detection** watches what containers actually do.

**Policy engines** run as validating (and often mutating) admission webhooks:

| Engine | Policies written in | Modes and reporting |
| --- | --- | --- |
| **Kyverno** (CNCF) | Kubernetes resources in YAML, with CEL expressions in the current policy types | Audit (allow and record) or Enforce/Deny (block); `PolicyReport` and `ClusterPolicyReport` results (pass, fail, warn, error, skip), including background scans of existing resources; can also mutate, generate resources and verify images |
| **OPA Gatekeeper** (CNCF, built on Open Policy Agent) | Rego, in ConstraintTemplates; constraints apply them to resources | `enforcementAction`: `deny` (default), `dryrun`, `warn`; periodic **audit** of existing resources (every 60 seconds by default) with violations in each constraint's status |
| **ValidatingAdmissionPolicy** (built into Kubernetes, stable) | CEL expressions, evaluated in the API server without a webhook | `validationActions` on the binding: `Deny`, `Warn`, `Audit` (adds the result to the audit event) |

The usual rollout is to deploy a new policy in audit, dryrun or warn mode, read the reports to find existing violations, fix them, then switch to enforcement.

**Falco** (a CNCF graduated project) provides **runtime threat detection**. It reads system calls from the kernel (through its modern eBPF probe by default, or a kernel module) and, through plugins, other event sources such as the Kubernetes audit log. Rules written in YAML describe suspicious behaviour: a shell spawned in a container, a write below `/etc`, a read of sensitive files, an unexpected outbound connection, a Pod exec. When a rule matches, Falco emits an alert to standard output, a file, syslog, a program or an HTTP endpoint; Falcosidekick forwards alerts to chat, SIEM and other systems, where a responder or an automated action can isolate the workload.

| Need | Tool |
| --- | --- |
| Block a privileged Pod at creation | Pod Security Admission, Kyverno, Gatekeeper or ValidatingAdmissionPolicy |
| Prove that existing resources comply | Kyverno background scans and policy reports, Gatekeeper audit |
| Detect a shell started in a running container | Falco |
| Check API server and kubelet flags against the CIS Benchmark | kube-bench |
| Find CVEs in an image before release | Trivy, Kubescape |

> **Exam trap.** Falco **detects and alerts**; it does not prevent a container from running and does not reject API requests. Policy engines **prevent** at admission time but do not see what happens inside a container after it starts. A complete answer uses both.

<!-- section: key-points -->
## Key points

- kube-bench runs the CIS Kubernetes Benchmark checks on a node (Job, binary or container), reports PASS, FAIL and WARN with remediation, and fixes nothing; on managed services only worker nodes can be checked.
- Trivy scans images, filesystems, repositories and clusters for vulnerabilities, misconfigurations, secrets and licenses, and generates SBOMs; `--exit-code` fails a pipeline. Kubescape scans clusters, manifests and images against NSA-CISA, MITRE ATT&CK and CIS frameworks.
- CI/CD scans can be bypassed; admission control cannot. Rescan images as new CVEs are published.
- Kyverno (Audit or Enforce, policy reports), Gatekeeper (`deny`, `dryrun`, `warn`, audit), ValidatingAdmissionPolicy (`Deny`, `Warn`, `Audit`) prevent and report.
- Falco detects suspicious runtime behaviour from system calls and audit events and sends alerts; it does not block.
