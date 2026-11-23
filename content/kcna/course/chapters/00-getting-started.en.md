KCNA (Kubernetes and Cloud Native Associate) is the entry-level certification of the Cloud Native Computing Foundation (CNCF), run by The Linux Foundation. It checks that you understand what Kubernetes is made of, how it runs containers and what the wider cloud native ecosystem offers. You never type a command during the exam: each question asks you to recognize one component, object, field, command or project. This chapter covers the format, a method for reading the short questions, the pairs that the exam likes to confuse and a study plan. The course is written for Kubernetes v1.37.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Certification | Kubernetes and Cloud Native Associate (KCNA), CNCF |
| Delivery | Online, proctored |
| Duration | 90 minutes |
| Questions | 60, multiple choice |
| Passing score | 75 %; the score is a percentage, emailed within 24 hours |
| Attempts | Two attempts per purchase (one retake), to be used within 12 months |
| Validity | 2 years |
| Prerequisites | None; the level is beginner |
| Languages | English, Japanese, Simplified Chinese |

The four domains don't weigh the same:

| Domain | Weight | Competencies |
| --- | --- | --- |
| Kubernetes Fundamentals | 44 % | Core concepts, administration, scheduling, containerization |
| Container Orchestration | 28 % | Networking, security, troubleshooting, storage |
| Cloud Native Application Delivery | 16 % | Application delivery, debugging |
| Cloud Native Architecture | 12 % | Observability, ecosystem and principles, community and collaboration |

Every question has four options and one correct answer. There is no "Choose two", no lab, no case study and no command to type. Kubernetes Fundamentals alone is almost half of the exam: the first four chapters of this course are the most profitable.

> **Exam tip.** An unanswered question earns nothing: always pick an answer, even after eliminating only two options. Certidrill mock exams have 60 questions and score all of them.

<!-- section: reading-questions -->
## Reading a question

A stem has one or two sentences, sometimes with a short manifest, a `kubectl` command or its output. It ends with "Which component...?", "Which object...?", "Which command...?" or "Which project...?". The four options belong to the same family, so a single detail of the stem decides. Work in this order:

1. Read the question sentence first: are you choosing a component, an object kind, a field, a command or a CNCF project?
2. Find the key words of the need: "every node", "stable network identity", "run to completion", "store the cluster state".
3. Eliminate the options that do something close but different.

| Words in the stem | Think of |
| --- | --- |
| "stores the cluster state", "key-value store" | etcd |
| "decides on which node a Pod runs" | kube-scheduler |
| "agent on each node that runs the Pods" | kubelet |
| "one Pod on every node", "log or monitoring agent" | DaemonSet |
| "stable identity", "ordered", "database" | StatefulSet |
| "run to completion", "batch" | Job; on a schedule: CronJob |
| "stable virtual IP for a set of Pods" | Service (ClusterIP) |
| "HTTP routing by host or path" | Ingress or Gateway API |
| "restrict traffic between Pods" | NetworkPolicy |
| "who may do what in the API" | RBAC (Role, RoleBinding) |
| "restart the container when it hangs" | Liveness probe |
| "stop sending traffic until ready" | Readiness probe |
| "desired state stored in Git and pulled" | GitOps (Argo CD, Flux) |
| "scale to zero", "event-driven" | Knative, KEDA |

> **Exam trap.** A feature removed from Kubernetes is never the right answer: PodSecurityPolicy (removed in v1.25), dockershim (removed in v1.24) and the in-tree cloud providers belong to history. Their replacements are Pod Security Admission, a CRI runtime such as containerd or CRI-O, and the cloud-controller-manager.

<!-- section: confusing-pairs -->
## Pairs that are easy to confuse

| Family | Options | What separates them |
| --- | --- | --- |
| Workloads | Deployment, StatefulSet, DaemonSet, Job, CronJob | Stateless replicas; stable identity and storage per Pod; one Pod per node; run to completion; run on a schedule |
| Service types | ClusterIP, NodePort, LoadBalancer, ExternalName, headless | Internal virtual IP; a port on every node; an external load balancer; a DNS alias (CNAME); no virtual IP, DNS returns the Pod IPs |
| Configuration | ConfigMap, Secret | Non-sensitive settings; sensitive data, base64-encoded but not encrypted by default |
| Interfaces | CRI, CNI, CSI, OCI | Container runtime; Pod networking; storage drivers; image and runtime formats |
| Resources | Requests, limits | Used by the scheduler to place the Pod; enforced at run time (CPU throttling, memory OOM kill) |
| Placement | Taints and tolerations, node affinity | Keep Pods away from nodes; attract Pods to nodes |
| Probes | Liveness, readiness, startup | Restart the container; remove the Pod from Service endpoints; hold the other probes until the app has started |
| Authorization | Role and RoleBinding, ClusterRole and ClusterRoleBinding | Permissions in one namespace; cluster-wide permissions or cluster-scoped resources |
| Storage | PersistentVolume, PersistentVolumeClaim, StorageClass | A piece of storage; a request for storage; a template for dynamic provisioning |
| Autoscaling | HPA, VPA, Cluster Autoscaler, KEDA | More Pods; bigger Pods; more nodes; scaling on external events, down to zero |
| Packaging | Helm, Kustomize | Charts with templates and values, installed as releases; overlays patching plain YAML without templates |
| Telemetry | Metrics, logs, traces | Numbers over time (Prometheus); event records (Fluent Bit); a request's path across services (OpenTelemetry, Jaeger) |

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order: the architecture and the objects of the first module explain almost everything that follows.
2. Start a local cluster with kind or minikube and run the commands shown in the chapters: create a Deployment, expose it with a Service, break a probe, read the events. Seeing a Pod go to `CrashLoopBackOff` makes the vocabulary concrete.
3. For each family of the table above, write the one-line difference from memory, then compare.
4. Browse the CNCF landscape and the project pages of the projects named in the course: know the purpose of each one in one sentence.
5. After each domain, take a mock exam, read every explanation, including why the wrong options fail, and reread the sections linked to your mistakes.
6. Book the exam when three mock exams in a row reach 85 % or more on questions you haven't seen before.

<!-- section: key-points -->
## Key points

- 90 minutes, 60 single-answer questions, 75 % to pass, two attempts per purchase, valid 2 years.
- Kubernetes Fundamentals is 44 % of the exam; Container Orchestration 28 %.
- Each question tests one fact: find the key word, then eliminate the neighbors from the same family.
- Removed features (PodSecurityPolicy, dockershim, in-tree cloud providers) are only ever wrong answers.
