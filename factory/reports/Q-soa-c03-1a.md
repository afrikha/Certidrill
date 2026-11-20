# Q-soa-c03-1a — report

55 questions (`soac03-1a-*`, content/soa-c03/questions/monitoring/), 11 per objective 1.1.1–1.1.5; single 46, multi 9 (two "Choose three"); difficulty 17 easy / 27 medium / 11 hard. Validator: 0 problem(s). No course chapter existed yet; facts checked on AWS docs with WebFetch (Nov. 2026).

## Points to know / doubts

- Multi questions carry the "NOTE: Each correct selection is worth one point." sentence, following the existing SAA/DVA AWS banks, although the profile says AWS multiple response is all or nothing. Harmonize globally if needed.
- CloudWatch Logs Infrequent Access is now named **Essentials** (both values accepted; read APIs return ESSENTIALS from Dec. 2026). Questions say "Infrequent Access (Essentials)" or `INFREQUENT_ACCESS` (agent config value).
- New 2026 features used: CloudWatch alarm mute rules (`soac03-1a-alarm-mute-maintenance`, suppressor question distractor), Lambda alarm actions principal `lambda.alarms.cloudwatch.amazonaws.com`.
- `soac03-1a-agent-procstat`: the procstat page defines `pid_count` but does not explicitly document alarming on it when the process is absent (assumed the lookup reports 0).
- `soac03-1a-dash-stacksets`: StackSets automatic deployment to accounts joining a target OU taken from general knowledge (the StackSets overview page only lists the topic).
- `soac03-1a-composite-no-autoscaling`: answer = composite alarm Lambda action calling `ExecutePolicy` (composite alarms cannot trigger Auto Scaling; step scaling on metric-math alarms was not verified, so not used).
- Reference title "Validating CloudTrail log file integrity" taken from existing bank content (WebFetch did not return the H1); other titles fetched.
- Overlap avoided with DVA (alarm with `aws/sns` key, heartbeat `breaching`, AND composite, StatsD) and SAA (cross-account observability for metrics/logs/traces): our questions test other decisions (RDS key principal, `notBreaching`, ActionsSuppressor, alarms on source metrics vs legacy console).
