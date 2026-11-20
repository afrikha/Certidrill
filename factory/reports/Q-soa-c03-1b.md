# Q-soa-c03-1b — QUESTIONS SOA-C03, monitoring (1.2.1–1.3.2)

55 questions, prefix `soac03-1b-`, 11 per objective (1.2.1, 1.2.2, 1.2.3, 1.3.1, 1.3.2); single 46 / multi 9; difficulty 16 easy / 28 medium / 11 hard. Validator: 0 problem(s). Facts checked on AWS documentation pages on 2026-11-20 (all references fetched).

## Points to know
- **EventBridge 2026 change**: EventBridge docs now describe three bus types: default, "Custom Event Bus - Classic" (rules and targets) and a new "Custom Event Bus" (subscribers, retention, ordering, replay; ARN contains `event-busv2`; cannot be a cross-Region target). CloudTrail events go to the default bus only. All 1.2.2 questions use the default bus to stay valid; course chapter 12 should mention the new bus type.
- New metrics/features used: EBS `VolumeIOPSExceededCheck`, `VolumeThroughputExceededCheck`, `VolumeAvgReadLatency`, instance-level `InstanceEBSIOPSExceededCheck`; gp3 now 80,000 IOPS / 2,000 MiB/s / 64 TiB (0.25 MiB/s per IOPS); EBS provisioned rate for volume initialization (100–300 MiB/s); CloudWatch "resource tags for telemetry" (required for tag-based Metrics Insights queries); Compute Optimizer free 32-day lookback; Lambda doc pages now say "Event Function".
- Rule state `ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS` for read-only management events (verified).
- Kiro is not tested in this batch (DVA-C03 already has many Kiro questions); AWS DevOps Agent: one question (ServiceNow built-in integration, verified).

## Not verified verbatim (kept as reasonable)
- `soac03-1b-eb-readonly-management`: EC2 GetPasswordData assumed to be a read-only management event (Get* call); no page states it explicitly.
- `soac03-1b-ssm-approve-sns-prefix`: the doc only says the topic name "must be prefixed with Automation"; the symptom (manager never receives the request) is inferred.
- `soac03-1b-resize-runbook-tags`: AWS-ResizeInstance page only says it changes the instance type (steps not listed); the question does not rely on the stop/start sequence.
- `soac03-1b-ssm-assume-role-passrole`: user iam:PassRole comes from the IAM PassRole page, not from the Automation setup page.
