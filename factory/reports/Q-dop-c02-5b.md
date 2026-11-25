# Q-dop-c02-5b — QUESTIONS DOP-C02, domain incident (2026-11-23)

## Result
- 54 questions in `content/dop-c02/questions/incident/`, prefix `dopc02-5b-`: 5.2.4 ×8, 5.2.5 ×8, 5.3.1 ×8, 5.3.2 ×8, 5.3.3 ×8, 5.3.4 ×7, 5.3.5 ×7.
- Types: single 46, multi 8 (target 45/9, within the approximate mix). Difficulty: 8 easy / 27 medium / 19 hard (15 / 50 / 35 %). Single answer positions a 11, b 10, c 12, d 13.
- `CERT=dop-c02 npx tsx factory/validate.ts --prefix dopc02-5b-` → 0 problem(s); `npm run content:validate -- --cert dop-c02 --prefix dopc02-5b-` → 0 problems, 0 warnings.

## Overlap with other prefixes
- The 5a batch was being written in the same folder at the same time. I deleted and replaced 6 of my drafts that tested the same decision as a 5a question: EventBridge CloudTrail events need a trail (5a-trail-required-api-events), AWS Health backup Region and de-duplication (5a-health-backup-region-dedupe), AWS Health Region coverage (5a-health-global-events-region), Health organizational view with a delegated administrator (5a-health-org-feed-delegated), a GuardDuty rule in the delegated administrator account (5a-guardduty-admin-routing), and transcoding workers during scale-in (5a-asg-scale-in-protection-jobs: my heartbeat question now uses an index export at termination).
- Still close but testing a different decision: `dopc02-5b-remediation-exception-stop` (why AWS Config stops after MaximumAutomaticAttempts within RetryAttemptSeconds) versus 5a-config-auto-remediation-retries (configure retries) and 5a-config-remediation-exception (manual exception). Worth a look at review.
- In other domains, I avoided the decisions of 2b-eventbridge-ssm-remediation, 2a-config-auto-remediation-s3, 3c-asg-elb-health-check, 1d-health-constraints-skipped, 1b-invoke-ecs-test-traffic-hook and 4b-xray-ecs-fargate-collector. `traces-slow-dependency` (traces versus metrics or logs, OTel versus the X-Ray SDK) is close to the 4b X-Ray questions but has a different requirement.

## Facts checked on pages I fetched
- All 54 references were fetched on 2026-11-23.
- Profile closures used as distractors only: Incident Manager and Change Manager (closed to new customers on 2025-11-07, Incident Manager page fetched), CloudTrail Lake (closed 2026-05-31, from the profile and A-aws-9), X-Ray SDKs/daemon (maintenance since 2026-02-25, migration page fetched).
- Systems Manager Explorer: its page says that "The Explorer page will be deprecated on December 31, 2026" (Resource Data Sync moves to OpsCenter). I did not use Explorer. Future writers should not make it an answer, and the profile could add it.
- AWS Health API support plans have new names: "Business Support+, Enterprise Support, or Unified Operations", or legacy Business / Enterprise On-Ramp / Enterprise. The question therefore says "no paid AWS Support plan" and does not say "Basic". The What is AWS Health page says that all customers receive Health events through EventBridge at no additional cost.

## Doubts (not fully verified, left as distractor wording or general knowledge)
- `ecs-all-at-once-health`: the CodeDeploy deployment-group alarm with automatic rollback was not checked on a fetched page. The troubleshooting page does confirm that canary and linear need an ALB, and the ECS page confirms that the circuit breaker works only with the ECS (rolling) controller.
- `alarm-event-restart-service`: the alarms page I fetched lists the action types SNS, EC2, Auto Scaling, investigations, and OpsItem/incident. It does not mention Lambda alarm actions. The explanation only says that alarm actions cannot run a command.
- `ecs-stopped-task-reasons`: the one-hour retention is confirmed for the console only. The explanation of option a avoids an exact retention for the API.
- `logs-field-index` option b (Infrequent Access log class): the explanation that the log class does not reduce the data scanned is general knowledge, not taken from a fetched page.
- `opsitem-dedup-string`: the OpsCenter page says only briefly that a deduplication string can be set on an EventBridge rule. The input transformer syntax is not in the question.
- `remediation-lambda-runbook`: the AmazonSSMAutomationRole restriction to functions named Automation* comes from the Automation service-role page. aws:invokeLambdaFunction was checked on its action page.

## Process note
- I hit the WebFetch hourly limit around 17:40 UTC. I waited for the reset, and every fact behind an answer was fetched after that.
