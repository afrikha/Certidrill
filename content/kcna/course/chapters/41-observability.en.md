Microservices spread one user request across many short-lived Pods, so you cannot understand a cloud native system by logging in to a server. Observability gives you the signals to answer "what is happening, and why?" from the outside. This chapter covers the three telemetry signals, Prometheus and Grafana for metrics, OpenTelemetry and Jaeger for traces, log collection with Fluentd and Fluent Bit, and cost management.

<!-- section: observability-signals | objectives: 4.1.1 -->
## Observability, monitoring and telemetry signals

The CNCF glossary defines **observability** as a property of a system: the degree to which it can generate actionable insights, so that operators understand its state and take corrective action. **Monitoring** is the practice of watching known indicators (CPU, error rate, latency) and alerting when they cross thresholds. Monitoring answers questions you anticipated; an observable system also lets you investigate failures you did not anticipate.

| Signal | What it is | Answers | Typical CNCF tools |
| --- | --- | --- | --- |
| **Metrics** | Numeric measurements over time, aggregated and cheap to store | "Is something wrong, and since when?" (trends, alerts, dashboards) | Prometheus, OpenTelemetry |
| **Logs** | Timestamped records of discrete events, text or structured (JSON) | "What exactly happened in this component?" | Fluentd, Fluent Bit, OpenTelemetry |
| **Traces** | The path of one request across services, as a tree of timed spans | "Where is the time spent, which service failed?" | OpenTelemetry, Jaeger |

Kubernetes itself provides only a minimal pipeline: **metrics-server** collects CPU and memory usage from the kubelets and serves the `metrics.k8s.io` API, used by `kubectl top`, the HorizontalPodAutoscaler and the VerticalPodAutoscaler. It is meant for autoscaling, not for monitoring: a full monitoring stack is a separate add-on.

> **Exam trap.** Metrics tell you **that** latency rose; a trace tells you **which service** in the request path caused it; logs tell you **what** that service reported.

<!-- section: prometheus-grafana | objectives: 4.1.2 -->
## Prometheus and Grafana

**Prometheus** is a monitoring and alerting toolkit, the second project hosted by the CNCF (after Kubernetes) and a graduated project.

| Feature | Detail |
| --- | --- |
| Data model | **Time series** identified by a metric name and key/value **labels**: `http_requests_total{method="GET", code="200"}` |
| Collection | **Pull**: the server **scrapes** HTTP endpoints (usually `/metrics`) of its targets at intervals |
| Target discovery | Static configuration or **service discovery**, including Kubernetes (Pods, Services, nodes) |
| Storage | Local time series database; each server is autonomous |
| Query | **PromQL**, for example `rate(http_requests_total[5m])` |
| Metric types | Counter (only increases), gauge (goes up and down), histogram and summary (distributions) |

| Component | Role |
| --- | --- |
| Client libraries | Instrument application code to expose metrics |
| **Exporters** | Expose metrics of software you cannot instrument (node exporter for Linux hosts, database exporters...) |
| Pushgateway | Lets **short-lived jobs** push metrics that Prometheus then scrapes |
| **Alertmanager** | Receives alerts fired by Prometheus rules; deduplicates, groups and routes them to receivers (email, chat, paging), with silences |

Kubernetes components expose their own metrics in the Prometheus format. Prometheus is designed to stay usable during an outage, but it is not for data that must be 100 % accurate, such as per-request billing.

**Grafana** is an open source visualization tool (from Grafana Labs, not a CNCF project) that builds **dashboards** on data sources such as Prometheus, and can also alert.

> **Exam trap.** Prometheus **pulls** metrics; the Pushgateway is the exception for batch jobs. Grafana displays data; it does not scrape targets. Alerts are evaluated by Prometheus and **delivered** by Alertmanager.

<!-- section: tracing-otel | objectives: 4.1.3 -->
## Distributed tracing and OpenTelemetry

A **trace** follows one request through every service it touches. Each unit of work is a **span** (name, start time, duration, attributes, parent span). The trace context (trace ID, parent span ID) is **propagated** between services, usually in HTTP headers, so the spans can be assembled into one tree and slow or failing hops stand out.

**OpenTelemetry (OTel)** is a vendor-neutral observability framework and toolkit to generate, collect and export traces, metrics and logs. It is a CNCF graduated project.

| Part | Role |
| --- | --- |
| Specification and **OTLP** | Common data model and the OpenTelemetry Protocol for sending telemetry |
| APIs and language **SDKs** | Instrument code and export the data |
| Instrumentation libraries, zero-code instrumentation | Produce telemetry from common frameworks without (or with little) code change |
| **OpenTelemetry Collector** | Vendor-agnostic proxy that **receives**, **processes** (batching, filtering, enrichment) and **exports** telemetry to one or more back ends; runs as an agent next to workloads or as a central gateway |
| Kubernetes Operator, Helm charts | Deploy the Collector and auto-instrumentation in clusters |

OpenTelemetry is **not a back end**: storage and visualization are left to other tools. **Jaeger** (graduated) is a distributed tracing back end that stores traces and shows them in a UI; Prometheus can store OTel metrics.

> **Exam tip.** "Instrument once and send the data to any back end without vendor lock-in" → OpenTelemetry. "Store and visualize traces" → Jaeger.

<!-- section: logging | objectives: 4.1.4 -->
## Logging in Kubernetes

Applications write to **stdout and stderr**. The container runtime writes these streams to files on the node (under `/var/log/pods`), the kubelet rotates them (by default 10 MiB per file, 5 files), and `kubectl logs` reads the latest file. When a Pod is evicted or deleted, its logs go with it, and **Kubernetes provides no native storage for log data**: cluster-level logging needs a separate back end.

| Approach | How | Notes |
| --- | --- | --- |
| **Node-level logging agent** | One agent per node, run as a **DaemonSet**, reads the log files of all containers and ships them | Recommended pattern; no change to applications |
| Streaming sidecar | A sidecar container tails a log file written by the app and prints it to its own stdout | For applications that cannot write to stdout |
| Sidecar with a logging agent | A full agent in each Pod | Higher resource use; logs not visible with `kubectl logs` |
| Push from the application | The app sends logs directly to the back end | Outside the scope of Kubernetes |

**Fluentd** (CNCF graduated) is a unified logging layer: it collects logs from many sources, parses and enriches them (for example with Pod and namespace metadata), and routes them to many destinations. **Fluent Bit**, a graduated project of the same Fluent organization, is a lighter and faster agent, commonly run as the node-level DaemonSet; it also handles metrics and traces.

> **Exam trap.** The logging agent runs as a **DaemonSet** (one per node), not as a Deployment. Kubernetes stores logs only on the node, temporarily.

<!-- section: cost-management | objectives: 4.1.5 -->
## Cloud native cost management

In Kubernetes, cost follows **requests**: the scheduler reserves requested CPU and memory on nodes, and node autoscalers add or remove nodes based on requests, not on real usage. Requests much higher than usage are paid-for idle capacity.

| Practice | Effect |
| --- | --- |
| **Right-sizing** | Set requests close to observed usage (from Prometheus or VPA recommendations) and limits where needed |
| **Autoscaling** | HPA or KEDA remove replicas when demand drops (KEDA down to zero); Cluster Autoscaler or Karpenter remove underused nodes |
| **Quotas** | ResourceQuota and LimitRange cap what each namespace can request |
| **Cheaper capacity** | Interruptible (spot) nodes for fault-tolerant workloads |
| **Visibility and allocation** | Labels and namespaces per team or application, so costs can be shown back (showback) or charged back (chargeback) |

**OpenCost** (CNCF incubating) provides visibility into current and historical Kubernetes spend and resource allocation, broken down by namespace, workload or label. FinOps is the practice that brings engineering, finance and business together around cloud costs.

> **Exam tip.** "Which team's workloads cost the most?" → cost allocation by namespace or label with a tool such as OpenCost. "Pay less for idle capacity" → right-size requests and autoscale.

<!-- section: key-points -->
## Key points

- Observability is a property of the system; monitoring watches known indicators. Signals: metrics, logs, traces.
- Prometheus: pull-based scraping, labelled time series, exporters, PromQL, Alertmanager for routing alerts; Pushgateway for short-lived jobs. Grafana: dashboards.
- metrics-server feeds `kubectl top` and autoscalers only.
- OpenTelemetry: APIs, SDKs, OTLP, Collector (receive, process, export); not a back end. Jaeger stores and shows traces.
- Logs: stdout/stderr, node files, rotation by the kubelet; node-level agent as a DaemonSet (Fluent Bit, Fluentd) to a central back end.
- Cost: requests drive cost; right-size, autoscale, allocate by namespace and label; OpenCost.
