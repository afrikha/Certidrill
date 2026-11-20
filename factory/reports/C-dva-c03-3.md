# C-dva-c03-3 — COURSE, DVA-C03, chapters 32, 33, 41, 42

Files: `content/dva-c03/course/chapters/{32-testing,33-cicd,41-root-cause,42-observability}.{en,fr}.md` (8 files). `course.yaml` not touched. French code blocks were filled programmatically from the English files (identical by construction).
Check: `npx tsx factory/check-cert.ts dva-c03 32-testing 33-cicd 41-root-cause 42-observability` → `course problems (your chapters): 0`.
English words (code blocks, markers and table syntax excluded, whitespace split): 32 = 1,978; 33 = 2,279; 41 = 1,967; 42 = 1,822. **33-cicd is about 80 words over the 2,200 guideline** (9 objectives, 30-minute chapter); trimmed twice, kept rather than dropping exam-relevant facts.

## Objective coverage

- 32: 3.2.1 (iac-tests), 3.2.2 (mock-apis), 3.2.3 (test-events), 3.2.4 (test-environments), 3.2.5 (ai-testing).
- 33: 3.3.1 (lambda-packaging), 3.3.2 (containers), 3.3.3 (iac-templates), 3.3.4 (codedeploy), 3.3.5 (codepipeline), 3.3.8 (source-control), 3.3.6 (deployment-strategies), 3.3.7 (rollback), 3.3.9 (ai-cicd).
- 41: 4.1.1 (debugging-defects), 4.1.2 (metrics-logs-traces), 4.1.3 (query-logs), 4.1.4 (deployment-failures), 4.1.5 (ai-troubleshooting).
- 42: 4.2.1 (structured-logging), 4.2.2 (custom-metrics), 4.2.3 (notification-alerts), 4.2.4 (tracing), 4.2.5 (workload-health).

## Facts verified on AWS / Kiro pages (2026-11-20), worth a reviewer's eye

- Lambda quotas page: 50 MB zipped direct upload, 250 MB unzipped incl. layers, 10 GB image, 5 layers, 4 KB env vars, async payload 1 MB. **The page now lists the function timeout as 1,800 seconds (30 minutes)** and 90 minutes for Lambda Managed Instances async/ESM — not used in my chapters; other writers still using 900 s should check.
- Lambda shareable test events: schema registry `lambda-testevent-schemas`, EventBridge schemas permissions, 10 private events per function, schemas not deleted with the function.
- API Gateway mock integration (REST); canary release on a stage with `percentTraffic`, `stageVariableOverrides`, separate `/Canary` log groups.
- SAM: `generate-event`, `remote invoke` (Lambda, Kinesis, SQS, Step Functions, `--test-event-name`), `validate --lint`, `AutoPublishAlias` + `DeploymentPreference` (types, Alarms, PreTraffic/PostTraffic, first deployment in two steps).
- CDK assertions (Template.from_stack, has_resource_properties partial match, resource_count_is, Match, snapshot tests).
- CodeDeploy hook lists per platform, 3,600 s script timeout, 1-hour Lambda hook callback, predefined configuration names, agent log paths.
- CodePipeline V1/V2 feature table, execution modes (SUPERSEDED default; no stage rollback in PARALLEL), trigger filters (push: branches/paths/tags; PR: branches/paths; events opened/updated/closed).
- ECS: three deployment types; native blue/green (lifecycle hooks Lambda/pause, bake time); built-in linear and canary (What's New, October 2025); rolling min/max semantics; circuit breaker and alarm rollback; healthCheck ranges and defaults; execution vs task role; Fargate requires awsvpc.
- CloudFormation: rollback triggers (5 alarms, 0–180 min), UPDATE_ROLLBACK_FAILED and resources to skip, DELETE_FAILED retain.
- Elastic Beanstalk deployment policies; Amplify PR previews (50-branch quota, public-repo restriction, temporary backends for private repos).
- CloudWatch: Logs Insights QL/PPL/SQL, natural-language query generation, 60-min timeout, 7-day results; discovered fields (Lambda REPORT fields listed without `@initDuration`, so I did not use it); PutMetricData resolution/dimensions/statistic sets, "OpenTelemetry recommended for new implementations"; EMF spec and limits; data protection policies (`logs:Unmask`, account vs log group, `LogEventsWithFindings`). The data protection page calls the second log class **"Essentials (formerly Infrequent Access)"** — not used, but worth checking elsewhere.
- Lambda log format (Text default, JSON, INFO default levels, supported runtimes).
- X-Ray: SDK/daemon maintenance Feb 25, 2026 (end of support Feb 25, 2027 from the profile); replacements ADOT/OTel SDKs + CloudWatch agent (≥1.300025.0) or OTel Collector; sampling default 1/s + 5 %, priority 1–9999.
- CloudWatch investigations (sources, outputs, 2 concurrent active, 150 enhanced/month, CloudTrail logging). AWS DevOps Agent GA March 31, 2026. Synthetics canaries (Node.js/Python/Java, once per minute, `CloudWatchSynthetics` namespace).
- Kiro: specs (requirements/design/tasks), steering, hook trigger types (File Create/Save/Delete, Post Task Execution...), CLI headless (`--no-interactive`, `KIRO_API_KEY`, `--trust-tools`, `--v3`). Copilot CLI end of support June 12, 2026 and migration paths (ECS Express Mode, CDK L3).
- CodeBuild test report formats and 30-day expiry.

## General knowledge, not confirmed on a page fetched in this session

- `--cli-binary-format raw-in-base64-out`; API Gateway 502 (malformed proxy response), 504, `403 Missing Authentication Token`; console OPTIONS method = mock; console Test tab behaviour.
- Weighted alias restrictions ($LATEST not allowed); stage-variable integration ARN + per-alias permission; ECR tag immutability.
- CodePipeline manual approval 7-day timeout and `put-approval-result` CLI syntax; trigger `providerType: CodeStarSourceConnection` (the fetched doc example used `provider: Connection`/`CodeConnection` — reviewer please check the JSON key and value).
- CodeBuild `file-format` values `JUNITXML`, `COBERTURAXML`; buildspec `secrets-manager` syntax.
- Elastic Beanstalk "swap environment URLs" blue/green; CDK `bootstrap` / `CDKToolkit`; SAM `Globals.Api.TracingEnabled`; `AWSXRayDaemonWriteAccess`; X-Ray error/fault/throttle colors; annotations vs metadata.
- Metric names (Lambda, API Gateway, SQS, DynamoDB, ALB); namespaces cannot start with `AWS/`; alarm settings and EventBridge detail-types for CodeDeploy and CloudTrail API calls.
- Kubernetes probes semantics, `kubectl rollout`, ECS `healthCheckGracePeriodSeconds`; botocore `Stubber`; `sam local start-lambda`; CodeDeploy ApplicationStop-failure trap.

## Deviations / notes

- AWS DevOps Agent and CloudWatch investigations are not in the guide's in-scope list (non-exhaustive); presented as AWS AI tools for 4.1.5 and 3.3.9 next to Kiro and Bedrock. Amazon Q Developer mentioned only as closed (successor Kiro).
- No HTTP API mock claim (not verified). No Copilot command syntax (end of support).
- No `glossary.yaml` for dva-c03; French follows BRIEF-AWS §6 (étape for stage, politique basée sur les ressources, jeu de modifications, restauration for rollback, mise à jour propagée, sondes de vivacité / disponibilité as in the objectives file).
