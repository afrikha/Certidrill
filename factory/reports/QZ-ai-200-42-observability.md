# QZ-ai-200-42-observability — report

Quiz: `content/ai-200/quizzes/42-observability.yaml`, 10 questions (4.2.1 ×5, 4.2.2 ×5). `check-quiz`: 0 problem(s), 0 warning(s).

## Out of date or wrong against current Learn (chapter not edited)

1. **Histogram and p95 (otel-custom, Exam trap).** The chapter says "To analyze a distribution (p95 latency), use a histogram." *Add and Modify OpenTelemetry in Application Insights* (fetched 2026-11-24) says Azure Monitor flattens the histogram into Min, Max, Average, Sum and Count, and that "support for percentiles is underway". So you can't get a p95 from a histogram in `AppMetrics` today. To get tail latency, query `percentile(DurationMs, 95)` on the span rows. Suggest rewording the trap. The quiz doesn't test this point; Q6 uses the histogram only for Max and Sum.
2. **Recommended distro.** Learn's OpenTelemetry pages (configuration, add-modify) now lead with the Microsoft OpenTelemetry Distro (`pip install microsoft-opentelemetry`) for new apps. The chapter only mentions it in an Exam tip and builds everything on `azure-monitor-opentelemetry`. That package is still documented (readme v1.8.12), so the quiz keeps `configure_azure_monitor()`. Learn doesn't say whether the Microsoft distro is preview or GA, so the quiz doesn't test it.
3. **Python sampling options.** *Configure OpenTelemetry in Application Insights* now shows only the `OTEL_TRACES_SAMPLER` / `OTEL_TRACES_SAMPLER_ARG` environment variables for Python. `sampling_ratio` / `traces_per_second` appear only in the distro readme, and the readme gives two defaults that disagree (`sampling_ratio` 1.0, and a rate-limited sampler at 5 traces per second). The chapter's table is consistent with the readme. Not tested.
4. **`service.namespace` prefix.** Learn says the cloud role name "uses service.namespace and service.name", but no fetched page gives the exact combined format. The chapter's "prefixed by service.namespace" is plausible but unverified. Not tested.
5. **Broken reference target.** `https://learn.microsoft.com/en-us/azure/azure-monitor/app/distributed-trace-data` now serves the archived page "Monitor .NET and Node.js Applications with Application Insights (Classic API 2.x)" (noindex). Don't use it as a reference. The quiz uses *Application Insights telemetry data model* instead.

## Unverified or general-knowledge facts used

- Q1: "baggage" is described as key-value pairs propagated with the context, and as not a signal. This is standard OpenTelemetry; no Learn page fetched says it.
- Q2: the span kind → requests/dependencies mapping is stated on Learn in the .NET section (ActivityKind). Python follows the same exporter rule, which the chapter also states.
- Q9: that the CONSUMER span's `ParentId` equals the producer span ID comes from the W3C mapping table and the "request uses the dependency id as operation_parentId" rule on the correlation page. These rules are documented for the classic SDK but are language-neutral.

## Not repeated from the mock bank

70 mock questions read for 4.2.1/4.2.2. The quiz tests decisions those questions don't test: span kinds that land in `AppRequests`; 429 in `AppDependencies.ResultCode` rather than `AppRequests`; `percentiles()` with several values; connection-string parameter priority over the environment variable combined with `OTEL_SERVICE_NAME` precedence; a histogram for total plus max with one instrument; a `where` before `summarize` that changes the percentile; joining by `OperationId` (not `ParentId`/`Id`) through an INTERNAL span; how `traceparent` fields map to the IDs of producer, consumer and child rows; and a combined sampling/`project`/filter-order trap.
