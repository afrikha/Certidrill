# Q-sap-c03-5b — QUESTIONS SAP-C03, domain operations (5.2.4, 5.2.5, 5.3.1–5.3.5)

- 53 questions in `content/sap-c03/questions/operations/sapc03-5b-*.yaml`: 5.2.4 ×8, 5.2.5 ×8, 5.3.1 ×8, 5.3.2 ×8, 5.3.3 ×7, 5.3.4 ×7, 5.3.5 ×7.
- Types: single 44, multi 9 (8 with 5 options / choose 2, 1 with 6 options / choose 3: `archive-tiers-lock`). Difficulty: 8 easy / 26 medium / 19 hard. Single answer positions: a 11, b 11, c 11, d 11.
- Validator: `CERT=sap-c03 npx tsx factory/validate.ts --prefix sapc03-5b-` gives 0 problem(s).
- Multi stems carry "Each correct answer presents part of / a complete solution." and the NOTE line, like most SAP-C03 batches (BRIEF.md rule). The blueprint scores multi all or nothing, so remove the NOTE bank-wide if that rule is applied.
- Course chapters 52 (sections ai-evaluation, deployment-strategies) and 53 (5.3.1–5.3.5) were read. Every reference was fetched on 2026-11-20. Reference titles are the page H1 without the " - Service" suffix.

## Service status that drives answers
- Distractors only (closed to new customers): SageMaker Model Monitor (availability-change page fetched), SageMaker Clarify (availability-change page fetched), Systems Manager Incident Manager (closure date November 7, 2025 taken from chapter 53, not re-fetched). OpsCenter shows no availability notice and is the answer for incident work items.
- X-Ray SDKs and daemon are in maintenance mode since February 25, 2026 (fetched). They appear only as distractors.
- No answer depends on the Lambda maximum timeout.

## Facts that decide answers (all fetched)
- Bedrock Evaluations: judge-based jobs allow up to 1,000 prompts, custom metrics, and bring-your-own responses (`modelResponses`). Only one model response per prompt and one `modelIdentifier` per job are allowed. `referenceResponse` is used for correctness and completeness. RAG jobs come in retrieve-only and retrieve-and-generate types. Context coverage needs ground truth. Human jobs compare up to two models with a work team.
- AgentCore Evaluations: online jobs sample live traffic (0.01–100 %, default 10 %). On-demand jobs score chosen spans or traces, with spans collected by the caller. Batch jobs give a baseline and pre/post comparison over many sessions, with server-side discovery. Built-in evaluators include goal success rate (session) and tool selection accuracy (tool).
- ECS built-in canary and linear with NLB: the What's New post of February 4, 2026 is the only source fetched for this. The canary docs page does not mention NLB, so the question cites the canary page plus the CodeDeploy page (NLB allows only ECSAllAtOnce). ECS blue/green lifecycle stages: POST_TEST_TRAFFIC_SHIFT supports hooks, BAKE_TIME does not.
- CloudFormation rollback triggers: up to 5 alarms (composite alarms included) and a monitoring period of 0–180 minutes.
- Transaction Search: the CMK must be a symmetric key in the same account and Region, and it needs a logs resource policy for xray.amazonaws.com. EMF page: OTLP metrics are recommended for new workloads, and EMF when the metric and its log event must stay together. The question uses that qualifier.
- ECS `containerInsights` account setting applies to new clusters only, and existing clusters need `update-cluster-settings`. The EKS add-on collects accelerated compute metrics by default and recommends Pod Identity.
- Centralization rules: backup Region, naming attributes, tag propagation needing the three attributes, CMK options, and the `LogsManaged = true` tag. Account-level subscription filters: `NOT IN` selection criteria, and the destination must be in the same Region as the log groups.
- Alarm mute rules: cron or at schedules, up to 100 alarm names, P15D max, actions run at the end of the window if the state differs. Metrics Insights tag-based alarms need "Enable resource tags on telemetry".
- Bedrock runtime metrics: `TimeToFirstToken`. Requests that fail before the model is known are published without `ModelId`. Guardrail `GuardrailPolicyType` applies only to `InvocationsIntervened` and `TextUnitCount`.

## Stated from general AWS knowledge or the chapter, not read verbatim on a fetched page
- `put-account-setting-default` for `containerInsights` (the fetched page shows `put-account-setting --principal-arn ...root`; the chapter uses `-default`).
- Fargate does not support the DAEMON scheduling strategy. CancelUpdateStack works only during UPDATE_IN_PROGRESS. Alarm evaluations do not call SetAlarmState. API Gateway API mappings have no traffic weights. ALB does not carry a proprietary TCP protocol.
- In cross-account subscriptions, the sender needs no IAM role; only the destination's role delivers.
- The stopCode value `EssentialContainerExited`.
- `guardrail-output-pii` assumes that `GuardrailPolicyType` and `GuardrailContentSource` can be combined on `InvocationsIntervened`. The page lists both dimensions for that metric, but not their combination explicitly.
- Security Lake multi-account enablement through Organizations, and its native sources and rollup Regions (fetched).

## Overlap check
- `sapc03-1a-ecs-deployment-rollback` (circuit breaker + alarms) is not repeated. The ECS questions here test built-in blue/green hooks and bake time, and canary with an NLB.
- `sapc03-2b-observability-plus-centralization` is not repeated. The centralization questions here test the backup Region, naming and tag propagation, and CMKs.
- SAA-C03 `saac03-2d-container-insights`, `-synthetics-canary` and `-cross-account-observability` test different decisions.
