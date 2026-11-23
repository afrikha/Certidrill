KCSA checks that you can recognize the threats to a Kubernetes cluster and the controls that address them. It never asks you to type a command: every question comes down to identifying a component, a setting, a misconfiguration, a project or a framework, and knowing what it protects against.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Delivery | Online, proctored remotely on the PSI Bridge platform, in the PSI Secure Browser |
| Duration | 90 minutes |
| Questions | 60 multiple-choice questions |
| Passing score | 75 %; the score is reported as a percentage |
| Results | Emailed within 24 hours |
| Documentation | Closed book: no tools, resources or external sites during multiple-choice exams |
| Language | English only |
| Price and retake | 250 USD, one retake included; 12 months to schedule and take the exam |
| Validity | 2 years; passing CKS renews it |
| Prerequisites | None |
| Kubernetes version | Not published; this course is written for Kubernetes v1.37 |

The six domains don't weigh the same:

| Domain | Weight | Chapters |
| --- | --- | --- |
| Overview of Cloud Native Security | 14 % | 11 to 16 |
| Kubernetes Cluster Component Security | 22 % | 21 to 211 |
| Kubernetes Security Fundamentals | 22 % | 31 to 38 |
| Kubernetes Threat Model | 16 % | 41 to 47 |
| Platform Security | 16 % | 51 to 57 |
| Compliance and Security Frameworks | 10 % | 61 to 64 |

Each question has one correct answer among four options. You move with the Previous and Next buttons, you can flag an item and return to it from the review screen, and the timer keeps running if you pause or lose the connection. A blank answer can't score: answer every question, then use the remaining time on the flagged ones.

<!-- section: reading-questions -->
## Reading a question

Most stems describe a risk, a requirement or a short manifest in one to three sentences. Turn the key words into the control or component they point to:

| Words in the question | Think of |
| --- | --- |
| "who is calling", "401 Unauthorized" | Authentication |
| "is the caller allowed", "403 Forbidden" | Authorization (RBAC, Node) |
| "reject or modify the object before it is stored" | Admission control |
| "block privileged Pods in a namespace" | Pod Security Admission with the Baseline or Restricted standard |
| "limit which Pods can talk to each other" | NetworkPolicy, enforced by the network plugin |
| "encrypt traffic between services", "workload identity" | Service mesh mutual TLS, SPIFFE |
| "Secrets readable in etcd" | Encryption at rest with an EncryptionConfiguration |
| "detect a shell started in a container" | Runtime detection (Falco) |
| "only signed images from our registry" | Image signing (cosign) and an admission policy |
| "stronger isolation for untrusted code" | Sandboxed runtime (gVisor, Kata Containers) through a RuntimeClass |
| "record who did what in the API" | Audit logging |
| "check the cluster against a benchmark" | CIS Kubernetes Benchmark, kube-bench |

Look for the word that decides the stage: "prevent" points to a preventive control (RBAC, admission, NetworkPolicy), "detect" or "alert" to a detective one (audit logs, Falco), "after a compromise" to a corrective one. Removed features such as PodSecurityPolicy or dockershim are always wrong answers.

<!-- section: confusing-pairs -->
## Notions that are easy to confuse

| Don't confuse | With | Difference |
| --- | --- | --- |
| Authentication | Authorization | Authentication identifies the caller; authorization decides what that identity may do |
| Authorization | Admission control | Authorization sees the verb and resource; admission sees the object content and can modify or reject it |
| Role | ClusterRole | A Role is namespaced; a ClusterRole is cluster-wide or reusable in many namespaces through RoleBindings |
| Pod Security Admission | PodSecurityPolicy | PSA is the built-in replacement; PodSecurityPolicy was removed in v1.25 |
| enforce mode | audit and warn modes | Only enforce rejects Pods; audit adds an audit annotation, warn returns a warning to the client |
| base64 encoding | Encryption at rest | Secrets are only base64 encoded; encryption at rest needs an EncryptionConfiguration |
| NetworkPolicy | Service mesh policy | NetworkPolicy filters at layers 3 and 4; a mesh adds mutual TLS and layer 7 identity-based authorization |
| Falco | OPA Gatekeeper, Kyverno | Falco detects behavior at runtime; policy engines accept or reject objects at admission |
| seccomp | AppArmor, SELinux | seccomp filters system calls; AppArmor and SELinux restrict access to files and resources |
| gVisor | Kata Containers | gVisor intercepts system calls in a user-space kernel; Kata runs each Pod in a lightweight virtual machine |
| Image signature | SBOM | A signature proves who built the image and that it wasn't changed; an SBOM lists what is inside it |
| STRIDE | MITRE ATT&CK | STRIDE classifies threats while designing; ATT&CK catalogs real attacker tactics and techniques |
| CIS Kubernetes Benchmark | NIST SP 800-190 | CIS lists checkable configuration settings; SP 800-190 is general guidance on container risks |

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order: each one covers a single competency of the curriculum and takes about fifteen minutes.
2. Run a local cluster (kind or minikube) and look at what the chapters describe: label a namespace for Pod Security Admission, try `kubectl auth can-i`, read a Pod's securityContext, apply a default deny NetworkPolicy.
3. After each domain, take a mock exam and reread the sections linked to your mistakes.
4. Book the exam when three mock exams in a row are at 85 % or more on questions you haven't seen before: the real pass mark is 75 %, and the margin absorbs the stress of the day.
