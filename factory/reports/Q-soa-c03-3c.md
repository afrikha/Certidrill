# Q-soa-c03-3c — report

36 questions (3.2.1: 18, 3.2.2: 18), single 30 / multi 6, difficulty 11/18/7. Validator: 0 problem(s).

## Facts relied on but not read verbatim on a fetched page
- `soac03-3c-eb-readonly-events`: GetSecretValue is treated as a read-only management event (CloudTrail `readOnly: true`); the EventBridge page confirms only the general rule for read-only events.
- `soac03-3c-automation-multi-account`, `soac03-3c-health-retirement-automation`: AWS-RestartEC2Instance stops and starts the instance (EC2 API, no managed node needed). The runbook page was not fetched.
- `soac03-3c-asg-hook-heartbeat`: 7200 s is the maximum heartbeat timeout. The fetched page gives 30–7200 s (labelled for the console); the API range is the same as far as I know.
- `soac03-3c-devops-agent-webhook-hmac`, option c: an EventBridge API destination with an API key connection sends the key with each request (general EventBridge knowledge, not on the DevOps Agent page).

## Choices
- Change Manager and Incident Manager are closed to new customers (November 7, 2025): never used. Change Calendar (not affected) is used.
- Quick Setup patch policies: automatic coverage of accounts that join later was not verified, so the stem does not require it.
- EventBridge Scheduler question uses the "UTC-only scheduled rule" trap to differ from `saac03-2b-scheduler-cron` (Lambda vs others).
- French: "réduction horizontale (scale-in)", "délai de pulsation (heartbeat timeout)", "journal de suivi" for CloudTrail trail, "nœud géré", "politique de correctifs", "référentiel de correctifs". Worth a glossary check against docs.aws.amazon.com/fr_fr.
