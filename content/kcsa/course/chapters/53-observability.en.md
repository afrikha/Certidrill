Preventive controls fail sometimes; observability is how you find out. Security teams use the same telemetry as operations teams (logs, metrics, traces) plus two security-specific sources: the Kubernetes audit log and runtime events from the kernel. The KCSA exam expects you to know which signal answers which question, which CNCF project produces it, and how to keep the evidence trustworthy.

<!-- section: telemetry-signals | objectives: 5.3.1 -->
## Logs, metrics and traces for security

| Signal | Security questions it answers | Typical CNCF tools |
| --- | --- | --- |
| **Logs** (application, container, node, control plane) | Who logged in, which request failed authorization, what error preceded the crash | **Fluentd** and **Fluent Bit** collect, parse and forward logs |
| **Kubernetes audit log** | Who did what to which API object, when, and from where | API server audit backends, forwarded by the same log pipeline |
| **Metrics** | Abnormal resource use (a cryptominer's CPU spike), surges of `403` responses from the API server, certificate expiry dates | **Prometheus** scrapes metrics and evaluates alert rules; Alertmanager routes alerts |
| **Traces** | Which services a request crossed, unexpected call paths between services | **OpenTelemetry** instruments applications and collects traces, metrics and logs |

Key facts about the tools:

- **Prometheus** (CNCF graduated) **pulls** (scrapes) metrics over HTTP from `/metrics` endpoints and stores them as time series queried with PromQL. Control plane components and the kubelet expose metrics endpoints, which must require authentication and authorization; a metrics endpoint can leak internal names and topology.
- **OpenTelemetry** is a vendor-neutral set of APIs, SDKs and the **OpenTelemetry Collector**, which receives, processes and exports telemetry using the OTLP protocol. It standardizes collection; it is not a storage back end.
- **Fluentd** and **Fluent Bit** (CNCF graduated) are log processors. Fluent Bit is the lightweight agent usually deployed as a **DaemonSet** to read container logs from each node and forward them to central storage.

Container logs written to stdout and stderr are stored on the node and rotated by the kubelet: without a forwarding agent they disappear with the Pod or the node, along with the evidence of an attack.

> **Exam trap.** Prometheus collects metrics, not logs, and it pulls rather than receives pushes. Fluent Bit and Fluentd forward logs. OpenTelemetry covers all three signals but needs a back end to store and analyze them.

<!-- section: runtime-detection | objectives: 5.3.2 -->
## Runtime threat detection with Falco and eBPF

Admission control checks a Pod spec once, before it runs. **Runtime detection** watches what containers actually do afterwards: a shell started inside a production container, a write under `/etc`, a read of `/etc/shadow`, an unexpected outbound connection, a process executing from `/tmp`.

**Falco** (CNCF graduated) is the reference runtime security tool:

| Element | Description |
| --- | --- |
| Event sources | **System calls**, captured by a kernel driver: the **modern eBPF probe** (the default) or a kernel module; **plugins** add other sources such as **Kubernetes audit events** and cloud audit logs |
| Enrichment | Events are enriched with container and Kubernetes metadata (Pod, namespace, image) |
| Rules | YAML rules with a condition, an output message and a priority; a default rule set covers common attacks, and macros and lists make rules reusable |
| Outputs | Alerts to stdout, a file, syslog, a program or an HTTP endpoint; Falcosidekick forwards them to many chat, SIEM and alerting systems |

```text
Warning A shell was spawned in a container with an attached terminal (user=root container_id=4c2a1f9e3b7d container_name=web image=registry.example.com/shop/web:2.3.1 k8s.ns=shop k8s.pod=web-7d9f8 shell=bash parent=runc cmdline=bash)
```

Falco **detects and alerts**; it does not block the system call. Responding (killing the Pod, isolating it with a NetworkPolicy, cordoning the node) is done by an operator or by automation that consumes the alert.

Other eBPF-based tools observe the kernel with low overhead. **Tetragon**, part of the Cilium project, provides process, file and network observability and can also **enforce** policy at the kernel level, for example killing a process that performs a forbidden action. eBPF tools need privileged access to the node, so their own deployment must be protected.

| Need | Tool |
| --- | --- |
| Reject a privileged Pod before it is created | Admission control (Pod Security Admission, Kyverno, Gatekeeper) |
| Alert when a shell starts in a running container | Falco |
| Alert on a suspicious API call (for example a ClusterRoleBinding to `cluster-admin`) | Audit log, analyzed by a SIEM or by Falco's Kubernetes audit plugin |
| Kill a process on a forbidden action at runtime | eBPF enforcement such as Tetragon, or seccomp and AppArmor profiles |

> **Exam trap.** Falco is a detective control, OPA Gatekeeper and Kyverno are preventive admission controls. A question about "detecting unexpected behavior inside a running container" points to Falco, not to a policy engine.

<!-- section: correlation-integrity | objectives: 5.3.3 -->
## Correlation, incident response and log integrity

A single signal rarely tells the whole story. During an incident, responders join the sources by **time, Pod, namespace, node and identity**:

1. A Falco alert shows a shell spawned in Pod `web` of namespace `shop`.
2. The audit log shows that user `ci-deployer` ran `pods/exec` into that Pod a few seconds before, from an unusual source IP.
3. The audit log also shows a RoleBinding created by that user an hour earlier.
4. Metrics show a CPU spike on the node since the exec; network logs show connections to an unknown address.

That sequence reveals stolen CI credentials, a persistence attempt and a cryptominer, which no single source would prove. Accurate, synchronized clocks (NTP) on every node and component are a prerequisite for this kind of correlation.

The **audit log** is central. The audit policy chooses a level per rule: `None`, `Metadata` (user, verb, resource, timestamps), `Request` (adds the request body) or `RequestResponse` (adds the response body). Log Secrets at the `Metadata` level only, otherwise the audit log itself stores secret values. The API server writes audit events to a **log** backend (a file) or sends them to a **webhook** backend (an external collector).

**Protecting the integrity of collected logs** matters because an attacker's first step after gaining access is often to erase traces:

| Risk | Control |
| --- | --- |
| Logs deleted or edited on the compromised node | Forward logs in near real time to central storage outside the cluster |
| Tampering in central storage | Append-only or write-once (WORM) storage, retention policies, restricted delete rights |
| Interception or forgery in transit | TLS between agents and the collector, authenticated agents |
| Sensitive data in logs | Audit Secrets at `Metadata` level, mask tokens and personal data, restrict read access to logs |
| Gaps going unnoticed | Alert when a source stops sending (agent killed, audit backend failing) |

> **Exam tip.** "Keep audit evidence if the cluster is compromised" → send audit events off the cluster (webhook backend or a forwarder) to tamper-resistant storage. Logs kept only on the control plane node can be erased by whoever controls that node.

<!-- section: key-points -->
## Key points

- Logs (Fluentd, Fluent Bit), metrics (Prometheus, pull model, PromQL), traces (OpenTelemetry, Collector, OTLP); audit logs answer who did what in the API.
- Falco detects suspicious behavior from system calls (modern eBPF probe by default) and Kubernetes audit events; it alerts, it does not block.
- Tetragon and other eBPF tools observe the kernel and can enforce; admission controllers act before the Pod runs.
- Correlate by time, Pod, node and identity; keep clocks synchronized.
- Audit levels: None, Metadata, Request, RequestResponse; Secrets at Metadata only; backends: log file or webhook.
- Protect evidence: forward off the node, append-only storage, TLS in transit, alert on missing sources.
