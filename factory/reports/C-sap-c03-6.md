# C-sap-c03-6 — course chapters 52, 53, 54 (SAP-C03)

Files: `content/sap-c03/course/chapters/52-cicd-devsecops.{en,fr}.md`, `53-observability.{en,fr}.md`, `54-operational-automation.{en,fr}.md`. Check: `course problems (your chapters): 0`.

Length: prose without code and tables 1,443–1,693 English words per chapter; with tables 2,244–2,733 (53 covers 7 objectives), in line with the finished SAA-C03 chapters.

## Service status found while verifying (worth propagating to the profile and question writers)

- **SageMaker Model Monitor** and **SageMaker Clarify**: "no longer open to new customers" (AWS availability-change pages; no date printed). AWS recommends open-source monitoring solutions (Evidently, MLflow) + CloudWatch + SNS for drift, and Bedrock Evaluations / fmeval for FM evaluation. Chapter 53 and 52 say so; never make Model Monitor or Clarify the answer for a new design.
- **Systems Manager Incident Manager**: closed to new customers since November 7, 2025 (existing customers continue). **Change Manager**: same date. Change Calendar remains available.
- X-Ray SDKs and daemon: maintenance mode since February 25, 2026.
- ECR enhanced scanning default re-scan duration: 7 days for activations on or after October 15, 2026.
- CloudWatch Logs: subscription filters per log group = 5 (not 2); log event size 1,024 KB.
- ECS now has built-in blue/green, LINEAR and CANARY strategies (no CodeDeploy needed); deployment circuit breaker has `thresholdConfiguration` (BOUNDED_PERCENT default 50 %, clamp 3–200) and `resetOnHealthyTask`.
- AWS SDK retry behavior changes in 2026 (`AWS_NEW_RETRIES_2026` opt-in); chapter keeps only stable facts (standard mode default, 3 attempts, full jitter, retry quota).

## Left out (not verified)

- Exact list and levels of AgentCore built-in evaluators (only `Builtin.Helpfulness` named).
- ECS predictive scaling, Synthetics multi-location canaries details, RUM resource-based-policy authorization, CloudWatch Logs centralization pricing beyond "first copy free, backup copy paid".
- `aws:executeScript` runtimes and duration limits.

## Defaults stated from general knowledge but consistent with fetched pages

- CodePipeline manual approval timeout 7 days; ECR replication applies only to images pushed after the rule; Bedrock model invocation logging off by default; S3 Glacier minimum storage durations (90/90/180 days) and Deep Archive retrieval within 12 hours.
