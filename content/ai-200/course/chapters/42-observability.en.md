A request to an AI back end crosses several components: an API in Container Apps, a call to a model endpoint, a vector search in Cosmos DB or PostgreSQL, a Service Bus message, a function. To find why it was slow or failed, each component emits telemetry with OpenTelemetry, Application Insights stores it in a Log Analytics workspace, and you query it with the Kusto Query Language (KQL). The exam asks which SDK call or setting produces the expected telemetry, which table a span lands in, and which query answers a question.

<!-- section: otel-model | objectives: 4.2.1 -->
## OpenTelemetry signals and distributed traces

OpenTelemetry is a vendor-neutral standard (API, SDK, exporters) for three **signals**:

| Signal | What it is | Where it lands in Application Insights (workspace table) |
| --- | --- | --- |
| Traces | A tree of **spans** that share one trace ID; each span is a timed operation with attributes | `AppRequests` (incoming operations) and `AppDependencies` (outgoing calls and internal work) |
| Metrics | Numeric measurements aggregated over time (counters, histograms, gauges) | `AppMetrics` (custom metrics) and the metrics explorer |
| Logs | Timestamped records from the logging framework | `AppTraces` (and `AppExceptions` for exceptions) |

> **Exam trap.** In Application Insights the logs table is called **traces** (`AppTraces`). A distributed trace is not stored there: it is the set of `AppRequests` and `AppDependencies` rows that share an operation ID.

A span carries a name, a start time and a duration, a **span kind**, a status, **attributes** (key-value pairs) and events (exceptions are recorded as events). The span kind decides the Application Insights table:

| Span kind | Use | Table |
| --- | --- | --- |
| `SERVER` | Handles an incoming request (HTTP endpoint) | `AppRequests` |
| `CONSUMER` | Processes a message received from a queue or topic | `AppRequests` |
| `CLIENT` | Outgoing synchronous call (HTTP, database, model endpoint) | `AppDependencies` |
| `PRODUCER` | Sends a message | `AppDependencies` |
| `INTERNAL` (default) | In-process work | `AppDependencies`, dependency type `InProc` |

**Context propagation** links spans across processes. The caller sends the W3C Trace Context header `traceparent`, and the callee continues the same trace:

```text
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
             version-trace id (32 hex)-parent span id (16 hex)-flags (01 = sampled)
```

In the tables, the trace ID becomes `OperationId`, the span ID `Id` and the parent span ID `ParentId`. Instrumented HTTP clients and servers inject and extract this header automatically; for a custom transport you do it yourself (see below). The OpenTelemetry **resource** attributes `service.namespace` and `service.name` (only `service.name` when no namespace is set) become the cloud role name (`AppRoleName`), the node of the application map; `service.instance.id` becomes `AppRoleInstance`.

<!-- section: otel-python | objectives: 4.2.1 -->
## Enabling the Azure Monitor OpenTelemetry Distro in Python

The Azure Monitor OpenTelemetry Distro packages the OpenTelemetry SDK, the Azure Monitor exporter and common instrumentation libraries. One call at startup, before the app creates its clients, configures traces, metrics and logs:

```bash
pip install azure-monitor-opentelemetry
export APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=...;IngestionEndpoint=..."
export OTEL_SERVICE_NAME="rag-api"
```

```text
import logging
from azure.monitor.opentelemetry import configure_azure_monitor

configure_azure_monitor(
    # connection_string read from APPLICATIONINSIGHTS_CONNECTION_STRING when omitted
    logger_name="contoso.rag",                       # only this logger is exported
    instrumentation_options={"flask": {"enabled": False}},
)

logger = logging.getLogger("contoso.rag")
logger.warning("Index not warmed up", extra={"index": "products"})  # AppTraces, Properties.index
```

| Setting | Behavior |
| --- | --- |
| `connection_string` / `APPLICATIONINSIGHTS_CONNECTION_STRING` | Target Application Insights resource; the environment variable is recommended in production. Parameters passed in code take priority over environment variables |
| `OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES` or `resource=` | Cloud role name and other resource attributes; `OTEL_SERVICE_NAME` wins over `service.name` in `OTEL_RESOURCE_ATTRIBUTES` |
| `logger_name` | Python logger whose records are collected; set it so the SDK's own logs aren't tracked |
| `instrumentation_options` / `OTEL_PYTHON_DISABLED_INSTRUMENTATIONS` | Turn bundled instrumentations on or off |
| `sampling_ratio` (0 to 1) or `traces_per_second` | Application Insights fixed-percentage sampler or rate-limited sampler |
| `OTEL_TRACES_SAMPLER` / `OTEL_TRACES_SAMPLER_ARG` | Sampler set by environment; takes precedence over the code options. Default: rate-limited, 5 traces per second |
| `enable_live_metrics` | Live metrics, `True` by default |
| `span_processors` | Processors that enrich or filter spans before export |
| `OTEL_TRACES_EXPORTER`, `OTEL_METRICS_EXPORTER`, `OTEL_LOGS_EXPORTER` = `None` | Disable one signal |

Bundled instrumentations, enabled by default: `azure_sdk` (spans for Azure SDK calls such as Cosmos DB, Service Bus, Key Vault), `django`, `fastapi`, `flask`, `httpx`, `psycopg2`, `requests`, `urllib`, `urllib3`. They create the server spans of the web framework and the client spans of outgoing calls, with context propagation, without any code.

Metrics are never sampled. With trace sampling, each stored item has an `ItemCount` column that tells how many items it represents. Telemetry that can't be sent is cached and retried for up to 48 hours.

> **Exam tip.** Microsoft Learn now recommends the Microsoft OpenTelemetry Distro (`pip install microsoft-opentelemetry`, `use_microsoft_opentelemetry(...)`) for new applications; apps already on the Azure Monitor distro need no change. Never initialize both distros in the same app. The OpenTelemetry API code below is the same with either.

<!-- section: otel-custom | objectives: 4.2.1 -->
## Custom spans, attributes, metrics and propagation

Use the vendor-neutral `opentelemetry` API for anything the instrumentations don't capture, such as a retrieval step or a model call made through a custom client:

```text
from opentelemetry import trace, metrics
from opentelemetry.trace import SpanKind, Status, StatusCode
from opentelemetry.propagate import inject, extract

tracer = trace.get_tracer(__name__)
meter = metrics.get_meter("contoso.rag")
tokens = meter.create_counter("rag.tokens", unit="token")
latency = meter.create_histogram("rag.retrieval.duration", unit="ms")

def answer(question, user_id):
    with tracer.start_as_current_span("retrieve-chunks") as span:   # INTERNAL: AppDependencies
        span.set_attribute("rag.top_k", 5)                           # Properties["rag.top_k"]
        span.set_attribute("enduser.id", user_id)
        try:
            chunks = search(question)
        except TimeoutError as ex:
            span.record_exception(ex)
            span.set_status(Status(StatusCode.ERROR))
            raise
    tokens.add(812, {"model": "gpt-4.1-mini"})
    latency.record(48.0, {"store": "cosmos"})

def send_job(payload):
    headers = {}
    inject(headers)                      # adds traceparent to a custom message
    queue_send(payload, headers)

def process_job(payload, headers):
    ctx = extract(headers)               # continue the caller's trace
    with tracer.start_as_current_span("process-job", context=ctx, kind=SpanKind.CONSUMER):
        ...                              # CONSUMER: AppRequests
```

- `start_as_current_span` used as a context manager starts the span, makes it the parent of every span created inside it, and ends it. An exception that escapes the block is recorded automatically (pass `record_exception=False` to handle it yourself).
- Span attributes are exported as custom properties: `customDimensions` in classic queries, `Properties` in workspace tables.
- A background job that isn't triggered by an instrumented request should use `kind=SpanKind.SERVER` (or `CONSUMER` for a message) so it appears in `AppRequests` as an operation with its own failures and durations.
- Add custom properties to every span with a span processor (`on_start` calls `span.set_attribute`), passed in `span_processors`.

How Azure Monitor aggregates custom metric instruments:

| Instrument | Aggregation |
| --- | --- |
| Counter, UpDownCounter (and their asynchronous versions) | Sum |
| Histogram | Min, Max, Average, Sum and Count |
| Asynchronous gauge | Average |

> **Exam trap.** A counter only adds values: use it for tokens consumed or documents indexed. A histogram records a distribution, but Azure Monitor currently flattens it into Min, Max, Average, Sum and Count (percentile support is underway): for p95 latency, query `percentile(DurationMs, 95)` on the `AppRequests` or `AppDependencies` rows. A value that goes up and down (queue length) is an UpDownCounter or an asynchronous gauge.

<!-- section: kql-basics | objectives: 4.2.2 -->
## KQL essentials and the telemetry tables

A KQL query starts from a table and pipes rows through operators. Column and table names are **case-sensitive**.

| Need | Operator or function |
| --- | --- |
| Filter rows | `where TimeGenerated > ago(1h)`, `==` (case-sensitive), `=~` (case-insensitive), `has` (whole term, uses the index), `contains` (substring, slower), `in (...)`, `between (a .. b)` |
| Choose or compute columns | `project`, `project-away`, `extend Seconds = DurationMs / 1000` |
| Aggregate | `summarize count(), avg(DurationMs), percentile(DurationMs, 95), dcount(UserId) by Name` |
| Time buckets | `summarize ... by bin(TimeGenerated, 5m)` |
| Sort and limit | `order by` (`sort by`), `top 10 by DurationMs desc`, `take 100` |
| Read a dynamic property | `tostring(Properties["rag.model"])`, `toint(...)`, `parse_json(...)` |
| Combine tables | `join kind=inner (...) on OperationId`, `union AppRequests, AppDependencies` |
| Chart | `render timechart`, `render barchart` |

Application Insights telemetry has two sets of names: the classic (legacy) names, still found in older queries run from the Application Insights resource, and the `App*` tables of the Log Analytics workspace that a workspace-based resource writes to. Most columns differ only by capitalization, and KQL is case-sensitive, so a classic query must be rewritten:

| Classic table | Workspace table | What it holds |
| --- | --- | --- |
| `requests` | `AppRequests` | Requests received by the app |
| `dependencies` | `AppDependencies` | Calls to other components |
| `traces` | `AppTraces` | Logs |
| `exceptions` | `AppExceptions` | Exceptions |
| `customMetrics` | `AppMetrics` | Custom metrics |
| `customEvents` | `AppEvents` | Custom events |

| Classic column | Workspace column |
| --- | --- |
| `timestamp` | `TimeGenerated` |
| `duration` | `DurationMs` |
| `operation_Id` | `OperationId` |
| `cloud_RoleName` | `AppRoleName` |
| `customDimensions` | `Properties` |
| `valueSum` / `valueCount` (metrics) | `Sum` / `ItemCount` |

Useful columns: `AppRequests` has `Name`, `Url`, `ResultCode`, `Success`, `DurationMs`; `AppDependencies` adds `Target`, `DependencyType` (HTTP, SQL, InProc) and `Data` (full URL or statement); `AppTraces` has `Message` and `SeverityLevel`; `AppExceptions` has `ExceptionType`, `OuterMessage`, `InnermostMessage` and `ProblemId`.

Other tables in AI-200 scenarios:

| Table | Content | Key columns |
| --- | --- | --- |
| `ContainerAppConsoleLogs_CL` / `ContainerAppSystemLogs_CL` | Container Apps stdout and stderr / platform events (Log Analytics destination) | `ContainerAppName_s`, `RevisionName_s`, `Log_s` |
| `ContainerAppHTTPLogs` | Container Apps ingress requests (HTTP logging through diagnostic settings) | `StatusCode`, `Path`, `RequestDuration`, `RevisionName` |
| `ContainerLogV2` | AKS container logs (Container insights) | `PodNamespace`, `PodName`, `ContainerName`, `LogLevel`, `LogMessage` (dynamic) |
| `AzureMetrics` | Platform metrics exported by a diagnostic setting | `MetricName`, `Average`, `Maximum`, `Minimum`, `Total`, `Count`, `Resource` |

> **Exam trap.** With sampling, one stored row can represent several requests. To count requests, use `sum(ItemCount)`, not `count()`.

<!-- section: kql-queries | objectives: 4.2.2 -->
## Writing KQL queries for common questions

Failure rate and p95 latency of each API operation over the last day:

```kusto
AppRequests
| where TimeGenerated > ago(1d)
| summarize Requests = sum(ItemCount),
            Failed = sumif(ItemCount, Success == false),
            P95 = percentile(DurationMs, 95)
    by Name
| extend FailureRate = round(100.0 * Failed / Requests, 2)
| order by FailureRate desc
```

Latency of the calls to the model endpoint, by 5-minute bucket, as a chart:

```kusto
AppDependencies
| where TimeGenerated > ago(6h) and Target has "openai.azure.com"
| summarize avg(DurationMs), percentile(DurationMs, 95) by bin(TimeGenerated, 5m)
| render timechart
```

End-to-end view of one failed transaction across services:

```kusto
union AppRequests, AppDependencies, AppTraces, AppExceptions
| where OperationId == "4bf92f3577b34da6a3ce929d0e0e4736"
| project TimeGenerated, Type, AppRoleName, Name, DurationMs, Success, Message, OuterMessage
| order by TimeGenerated asc
```

Failed requests with the exception that caused them:

```kusto
AppRequests
| where TimeGenerated > ago(1h) and Success == false
| join kind=inner (AppExceptions | project OperationId, ExceptionType, OuterMessage) on OperationId
| summarize Failures = count() by Name, ExceptionType
```

Custom attribute and custom metric:

```kusto
AppDependencies
| where Name == "retrieve-chunks"
| summarize avg(DurationMs) by TopK = toint(Properties["rag.top_k"])

AppMetrics
| where Name == "rag.tokens"
| summarize Tokens = sum(Sum) by Model = tostring(Properties["model"]), bin(TimeGenerated, 1h)
```

Container logs:

```kusto
ContainerAppConsoleLogs_CL
| where ContainerAppName_s == "rag-api" and Log_s has "Timeout"
| project TimeGenerated, RevisionName_s, Log_s
| take 100

ContainerLogV2
| where TimeGenerated > ago(1h) and PodNamespace == "rag" and LogLevel == "ERROR"
| project TimeGenerated, PodName, ContainerName, LogMessage
```

| Question | Shape of the answer |
| --- | --- |
| "Count per interval" or "trend" | `summarize ... by bin(TimeGenerated, ...)` then `render timechart` |
| "Slowest", "top N" | `top N by DurationMs desc`, or `summarize` followed by `top` |
| "Tail latency" | `percentile()` or `percentiles(DurationMs, 50, 95, 99)`, not `avg()` |
| "Distinct users" | `dcount(UserId)` |
| "Correlate a request with its logs" | Same `OperationId` in `AppTraces` |
| "Filter on a custom attribute" | `Properties["name"]` with `tostring()` or `toint()` |

> **Exam trap.** `where` before `summarize` filters rows; a condition on an aggregate (`where FailureRate > 5`) must come after `summarize` or `extend`. `project` drops every column it doesn't list, so a later operator can't use them.

<!-- section: key-points -->
## Key points

- Three signals: traces (spans), metrics, logs; Application Insights stores logs in `AppTraces`, traces in `AppRequests` and `AppDependencies`.
- `SERVER` and `CONSUMER` spans become requests; `CLIENT`, `PRODUCER` and `INTERNAL` spans become dependencies.
- `traceparent` carries the trace ID (`OperationId`) and the parent span ID (`ParentId`) between services; `inject`/`extract` for custom transports.
- `configure_azure_monitor()` reads `APPLICATIONINSIGHTS_CONNECTION_STRING`; `OTEL_SERVICE_NAME` sets the cloud role name.
- Span attributes become `Properties`; exceptions in a span block are recorded automatically.
- KQL: `where`, `summarize ... by bin()`, `percentile`, `join ... on OperationId`, `render timechart`; count with `sum(ItemCount)` when sampling is on.
- Workspace tables use `TimeGenerated`, `DurationMs`, `OperationId`, `AppRoleName`, `Properties`.
