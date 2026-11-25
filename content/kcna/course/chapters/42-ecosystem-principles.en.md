Cloud native is a way of building and running applications, not a single product. This chapter covers the principles behind it (the CNCF definition, microservices, immutability, declarative APIs, the twelve-factor app), the autoscalers that make capacity follow demand, serverless with scale to zero, the open standards that keep the ecosystem portable, and how to find your way in the CNCF landscape.

<!-- section: cloud-native-principles | objectives: 4.2.1 -->
## Cloud native principles and architecture

The **CNCF Cloud Native Definition** (v1.1) says cloud native practices let organizations develop, build and deploy workloads in public, private and hybrid clouds, scaling in a programmatic, repeatable way. They rely on **loosely coupled** systems that are **resilient, manageable, observable** (and sustainable), with examples such as containers, service meshes, multi-tenancy, microservices, immutable infrastructure, serverless and declarative APIs. Combined with robust **automation**, they let engineers make high-impact changes frequently and predictably with minimal toil.

| Principle | Meaning | In Kubernetes |
| --- | --- | --- |
| **Microservices** | Small services, each owning one capability, deployed and scaled independently, talking over APIs | One Deployment and Service per microservice |
| **Immutable infrastructure** | Never patch a running server or container; build a new image and replace the old instances | New image tag, rolling update; no `kubectl exec` fixes in production |
| **Declarative APIs** | Describe the desired state; controllers converge the actual state to it | Manifests and `kubectl apply`, reconciliation loops |
| **Resiliency** | Expect failures and recover automatically | Replicas, probes, self-healing, spreading across zones |
| **Automation** | Repeatable pipelines instead of manual steps | CI/CD, GitOps, autoscaling |

**The twelve-factor app** is a methodology for building software-as-a-service applications that fit this model:

| Factor | Rule |
| --- | --- |
| Codebase | One codebase in version control, many deploys |
| Dependencies | Declare and isolate them explicitly |
| **Config** | Store configuration in the **environment** (ConfigMaps, Secrets, environment variables), not in the code |
| Backing services | Treat databases and queues as attached resources |
| Build, release, run | Strictly separate the build and run stages |
| **Processes** | Run the app as one or more **stateless** processes |
| Port binding | Export services by listening on a port |
| Concurrency | Scale out with more processes (replicas) |
| **Disposability** | Fast startup and graceful shutdown |
| Dev/prod parity | Keep environments as similar as possible |
| **Logs** | Treat logs as **event streams** (write to stdout) |
| Admin processes | Run admin tasks as one-off processes (Jobs) |

> **Exam trap.** Twelve-factor puts configuration in the **environment**, not baked into the image, and treats logs as a stream to stdout, not files the app manages.

<!-- section: autoscaling | objectives: 4.2.2 -->
## Autoscaling in Kubernetes

| Autoscaler | Scales | Based on | Part of Kubernetes? |
| --- | --- | --- | --- |
| **HorizontalPodAutoscaler (HPA)** | Number of **replicas** of a Deployment, StatefulSet or other scalable resource | CPU or memory utilization (relative to **requests**), custom or external metrics | Yes: API resource `autoscaling/v2` and a controller in kube-controller-manager |
| **VerticalPodAutoscaler (VPA)** | CPU and memory **requests** of the Pods | Observed usage | No: add-on from the Kubernetes autoscaler project, installed separately |
| **Cluster Autoscaler** | Number of **nodes**, in pre-configured node groups | Pods that cannot be scheduled; underused nodes | Add-on sponsored by SIG Autoscaling, integrated with each cloud provider |
| **Karpenter** | Nodes, provisioned directly (no node groups) | Unschedulable Pods; consolidation | Add-on sponsored by SIG Autoscaling |
| **KEDA** | Replicas, **including to and from zero** | **Events**: queue length, stream lag, cron schedules, many scalers | CNCF graduated add-on |

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
```

- The HPA checks metrics every 15 seconds by default and computes `desiredReplicas = ceil(currentReplicas × currentValue / targetValue)`. It waits 5 minutes (stabilization window) before scaling down.
- CPU and memory metrics come from **metrics-server** (the `metrics.k8s.io` API), which must be installed. Without requests on the containers, utilization cannot be computed and the HPA does nothing.
- The HPA cannot scale a DaemonSet. Do not let HPA and VPA both act on the same CPU or memory metric of a workload: they would work against each other.
- **KEDA** works with the HPA: KEDA activates a workload from zero to one and back to zero, feeds event metrics to the HPA, which scales from one to N. Its objects are `ScaledObject` (Deployments, StatefulSets) and `ScaledJob` (Jobs).
- Node autoscalers react to Pod **requests**, not to real usage: an HPA adds Pods, they stay `Pending`, the Cluster Autoscaler adds a node.

> **Exam trap.** More Pods = HPA. Bigger Pods = VPA. More nodes = Cluster Autoscaler or Karpenter. Scaling on queue messages or to zero = KEDA.

<!-- section: serverless | objectives: 4.2.3 -->
## Serverless and Function as a Service

**Serverless** computing abstracts servers away from the user: the platform provisions and scales the infrastructure, resources follow demand, and you pay for what you use; servers still exist, but operating them is the provider's job. **Function as a Service (FaaS)** is one serverless model where you deploy individual functions triggered by events or HTTP requests. The two terms are often used interchangeably but are distinct: serverless also covers containers and managed services.

**Scale to zero** is the key property: when no request or event arrives, no Pod runs, so an idle workload consumes nothing; the first request after idle waits for a **cold start**.

**Knative** (CNCF graduated) adds serverless capabilities to Kubernetes with custom resources:

| Component | Role |
| --- | --- |
| **Knative Serving** | Runs stateless HTTP containers; a Knative `Service` manages a `Configuration`, immutable `Revisions` (one per change) and a `Route` that can split traffic between revisions; request-based autoscaling, including **scale to zero** (on by default with the Knative Pod Autoscaler) |
| **Knative Eventing** | APIs for event-driven architectures: routes events from producers (sources) to consumers (sinks), using the **CloudEvents** specification |

> **Exam tip.** "HTTP workload that should run no Pods when idle and scale with requests" → Knative Serving. "Scale an existing Deployment on queue length, down to zero" → KEDA.

<!-- section: open-standards | objectives: 4.2.4 -->
## Open standards and portability

Open standards define interfaces between layers, so any compliant implementation can replace another without changing the layers above.

| Standard | Between | Examples of implementations |
| --- | --- | --- |
| **OCI** (Open Container Initiative): image, runtime and distribution specifications | Image builders, registries and runtimes | runc (low-level runtime), any OCI registry; images built by one tool run on any OCI runtime |
| **CRI** (Container Runtime Interface) | kubelet and the container runtime | containerd, CRI-O |
| **CNI** (Container Network Interface) | Container runtime and network plugins | Cilium, Calico, Flannel |
| **CSI** (Container Storage Interface) | Orchestrator and storage drivers | Cloud disk drivers, Ceph through Rook |

The OCI, created in 2015 under the Linux Foundation, defines open standards for container formats and runtimes. CNI is a CNCF project (incubating). Thanks to these interfaces, Kubernetes removed dockershim (v1.24) and its in-tree cloud volume plugins: runtimes and drivers are maintained outside the core.

> **Exam trap.** OCI standardizes **images and runtimes**; CRI is the **Kubernetes** API between the kubelet and the runtime. An image built with any OCI-compliant tool runs on containerd or CRI-O.

<!-- section: landscape | objectives: 4.2.5 -->
## The CNCF landscape and major projects

The **CNCF landscape** (landscape.cncf.io) maps cloud native projects and products by category and shows each CNCF project's maturity level.

| Landscape category | Purpose | CNCF projects |
| --- | --- | --- |
| Provisioning | Automation, registries, security and compliance | Harbor (registry), OPA and Kyverno (policy), Falco (runtime threat detection), cert-manager (certificates) |
| Runtime | Container runtime, storage, network | containerd, CRI-O, Rook, Cilium, CNI |
| Orchestration and Management | Scheduling, service discovery, proxies, service mesh | Kubernetes, KEDA, Knative, etcd, CoreDNS, Envoy, Istio, Linkerd |
| App Definition and Development | Packaging, image build, CI/CD, databases, messaging | Helm, Backstage, Dapr, Argo, Flux |
| Observability and Analysis | Monitoring, logging, tracing, cost optimization | Prometheus, OpenTelemetry, Jaeger, Fluentd, OpenCost |
| Platform | Certified Kubernetes distributions, hosted services and installers | Conformance-certified offerings |
> **Exam tip.** Learn one purpose per project: etcd stores cluster state, CoreDNS serves cluster DNS, Envoy is a proxy, Istio and Linkerd are service meshes, Helm packages, Argo CD and Flux do GitOps, Prometheus monitors, Jaeger traces, Falco detects runtime threats, OPA Gatekeeper and Kyverno enforce policies, Harbor is a registry.

<!-- section: key-points -->
## Key points

- Cloud native: loosely coupled, resilient, manageable, observable systems with automation; microservices, immutable infrastructure, declarative APIs.
- Twelve-factor: config in the environment, stateless processes, disposability, logs as event streams.
- HPA: replicas, built in, needs metrics-server and requests. VPA: requests, add-on. Cluster Autoscaler and Karpenter: nodes. KEDA: events and scale to zero.
- Serverless: no server management, pay per use, scale to zero; Knative Serving and Eventing (CloudEvents).
- Open standards: OCI (images, runtimes), CRI, CNI, CSI make components replaceable.
- Landscape categories: Provisioning, Runtime, Orchestration and Management, App Definition and Development, Observability and Analysis, Platform.
