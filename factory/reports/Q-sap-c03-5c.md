# Q-sap-c03-5c — report

49 questions in `content/sap-c03/questions/operations/`, prefix `sapc03-5c-` (7 per objective 5.3.6, 5.3.7, 5.4.1–5.4.5).
Types: single 41, multi 8. Difficulty: 7 easy, 25 medium, 17 hard. Validator: 0 problem(s).

## Facts used but not confirmed word for word on a fetched page (general AWS knowledge, low risk)

- An OS reboot keeps an EC2 instance on the same host (only stop/start migrates it) — `health-retirement-stop-start`, distractor b.
- Route 53 health checkers can't reach private IP addresses — `canary-vpc-no-egress`, distractor b.
- Event source mapping `MaximumRetryAttempts`, `BisectBatchOnFunctionError` and on-failure destinations apply to stream sources, not SQS — `lambda-sqs-partial-batch`.
- EventBridge detail-type `EC2 Instance-terminate Lifecycle Action` — `lifecycle-hook-runbook`.
- `aws:sleep` Automation action — `health-retirement-stop-start`, answer d.
- Change Calendar: the fetched page confirms runbooks can be blocked by calendar state; the dependency mechanism itself is phrased generically.
- A Synthetics canary runs from the Region where it is created (deduced from canaries being Regional; course chapter says the same).
- Termination lifecycle hook: wording that the instance "is already leaving service" (load balancer deregistration timing not stated on the fetched page) — `asg-maintenance-launch-first`, distractor c.

## Notes

- Closed services used only as distractors: Change Manager and Incident Manager (closed to new customers Nov 7, 2025, confirmed on the AWS Service Availability Updates page and the Change Calendar page).
- The SDK retry page now describes a 2026 retry behavior behind `AWS_NEW_RETRIES_2026`; the question only relies on adaptive vs standard vs legacy semantics, which are unchanged.
- Some reference titles are the page H1 as returned by the fetch (no " - Service" suffix): RUM app monitor page, Service Quotas pages, SQS fair queues, ECS predictive scaling, Application Auto Scaling metric math, custom health check, instance maintenance policy overview, Change Calendar.
- No answer depends on the Lambda maximum timeout.
