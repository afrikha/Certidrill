# Q-dop-c02-5a — doubts and notes (2026-11-23)

Result: 56 questions (8 per objective 5.1.1–5.2.3), single 47 / multi 9, difficulty 8 easy / 28 medium / 20 hard, validator 0 problems.

## Process
- WebFetch hit its hourly limit at 17:42 UTC. I waited for the reset and fetched the rest after 18:00 UTC. Every reference is a page I fetched, and the title is the one the page shows.
- Read the 5b batch (written in parallel) and removed two of my drafts that tested the same decision as 5b: Health EC2 retirement → SSM Automation (5b `health-retirement-stop-start`) and Spot Capacity Rebalancing (5b `spot-capacity-rebalancing`). Both were replaced.
- Avoided decisions already tested in the sdlc/config/resilience/monitoring folders (SNS+SQS fan-out with filters, FIFO message group, Lambda SQS partial batch, Kinesis enhanced fan-out/poison record, Step Functions callback/retry/Express, Run Command rate control, Config auto-remediation for S3, and others).

## Facts to watch
- **EventBridge bus types changed in 2026.** The docs now call the rule-based custom bus "Custom Event Bus - Classic". There is a new "Custom Event Bus" (ARN contains `event-busv2`) with consumer-created subscribers and retention, and the docs say to start new applications with it. It cannot be a cross-Region target. My questions say "custom event bus that uses rules and targets" or use the default bus. Course chapter 51 does not mention the new bus type yet. Worth adding there.
- **Lambda page title** as fetched: "Control which events Lambda sends to your Event Function - AWS Lambda". The odd wording is the page's own.
- **Instance refresh `ReplaceRootVolume` strategy** (fetched page): it requires a mixed instances policy with `ImageId` overrides and no `$Latest`/`$Default`. It is not in course chapter 52, so the course could add it.
- **No end date for X-Ray, and the closed services are not answers.** CloudTrail Lake and Incident Manager appear only as distractors with their closure dates.
- These are used only in distractor explanations or option wording and were not shown on a fetched page:
  - the 5-minute maximum duration of Express workflows
  - S3 event notification filters limited to prefix/suffix
  - SNS subscription `FilterPolicyScope` = MessageBody
  - the managed rule name `ec2-volume-inuse-check`
  - the async-invoke on-failure destination not applying to event source mappings, which follows from synchronous ESM invocation
- Instance refresh "checkpoint delay": the page mentions the concept but not the parameter name (`CheckpointDelay`). The question says "checkpoint delay of 1,800 seconds" without the API name.
- Config proactive evaluation: the fetched page confirms proactive and detective modes and that proactive rules don't block deployment. It does not show the API name, so the question says "requests a proactive evaluation" and does not name StartResourceEvaluation.
