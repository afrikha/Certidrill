# Q-dva-c03-4b — QUESTIONS DVA-C03, troubleshooting (2026-11-20)

## Output
- 55 questions in `content/dva-c03/questions/troubleshooting/`, prefix `dvac03-4b-`: 4.2.1 = 10, 4.2.2 to 4.3.1 = 9 each.
- Types: single 46, multi 9 (5 options / 2 correct). Difficulty: 17 easy, 26 medium, 12 hard.
- `CERT=dva-c03 npx tsx factory/validate.ts --prefix dvac03-4b-` → 55 files, 0 problem(s).
- No course chapter existed for these objectives when the batch was written; everything comes from AWS documentation pages fetched with WebFetch (titles checked one by one).

## 2026 service status applied
- Tracing questions follow the X-Ray SDK/daemon maintenance mode (since February 25, 2026): the OpenTelemetry answers are the ADOT Lambda layer with `AWS_LAMBDA_EXEC_WRAPPER=/opt/otel-instrument`, and the CloudWatch agent or OpenTelemetry Collector as an ECS sidecar with `xray:PutTraceSegments` on the task role. The X-Ray SDK is a wrong answer wherever it appears. X-Ray as a backend, sampling rules, annotations and stage or state machine tracing are kept.
- No Amazon Q Developer, Cloud9 or Copilot CLI answer. "Amazon Q Developer in chat applications" (the former AWS Chatbot) is not used.
- The CloudWatch Logs "Infrequent Access" log class is now called **Essentials**, and from December 2026 the APIs return `ESSENTIALS`. Because the name is changing, no question tests log classes. One stem says "Standard log class", because metric filters work only with Standard.
- Lambda doc titles now say "Event Function" (for example "Configuring provisioned concurrency for an Event Function"). The references use these exact titles, but the question text keeps "Lambda function".

## Facts not confirmed on a fetched page (general AWS knowledge, used only in explanations of wrong options)
- Lambda sends no EventBridge event for each failed synchronous invocation (`dvac03-4b-alarm-lambda-errors-email`, option d).
- CloudWatch alarm actions cannot stop ECS tasks (`dvac03-4b-ecs-worker-container-healthcheck`, option d). The alarms page lists SNS, EC2, Auto Scaling, Systems Manager and investigations.
- `PutMetricData` takes `Resource: "*"` with the `cloudwatch:namespace` condition. The CloudWatch page shows exactly that pattern, but the Service Authorization Reference was not fetched.
- Throttled asynchronous Lambda events are retried by Lambda (`dvac03-4b-reserved-concurrency-downstream`, explanation).
- API Gateway `$context` variable names (`$context.requestId`, `$context.identity.sourceIp`, `$context.status`). The access-logging page fetch returned only metadata. The CloudWatch role requirement and the split between access and execution logging come from "Set up CloudWatch logging for REST APIs in API Gateway".
- The exact CloudFormation EventBridge `detail-type` string was not confirmed, so the options do not quote it.

## Notes for reviewers
- Several options were reworded so that the correct answer is not the longest one; option lengths were checked by script.
- `dvac03-4b-concurrency-sizing-buffer` uses `shuffle: false` (ascending values, correct answer second).
- Code in stems: python (3 questions) and json (1), identical in EN and FR.
