# Q-soa-c03-2b — report

51 questions in `content/soa-c03/questions/reliability/`, prefix `soac03-2b-`: 2.2.1 = 17, 2.2.2 = 17, 2.3.1 = 17; single 42, multi 9 (one "Choose three"); difficulty 15 easy / 26 medium / 10 hard. Validator: 0 problem(s).

## Points to check / decisions
- `soac03-2b-backup-cold-retention`: answer 45 days warm + 135 days total relies on the plan-options page ("minimum of 90 days in addition to the time in warm storage", example 30/120). The copy-lifecycle text on the same page says "greater than 90 days beyond"; if AWS Backup enforced strictly greater, 135 would be off by one.
- `soac03-2b-regional-nat-gateway`: regional NAT gateway (availability mode regional, Nov 2025) is the correct answer; per-AZ zonal NAT gateways are the distractor that fails "least ongoing effort".
- `soac03-2b-arc-zonal-shift`: the stem states that the ALB is a managed ARC resource with zonal shift enabled; the exact ALB attribute name was not verified, so it is not named.
- `soac03-2b-rds-convert-multiaz`: RDS docs advise against converting a production DB instance in place; the stem uses an internal application.
- `soac03-2b-alb-target-notinuse`: the CLI output omits the `Description` field on purpose (its exact wording was not verified).
- Multi-AZ DB cluster failover time (often quoted as under 35 s) was not found on the fetched pages and is not used; reader endpoint of Multi-AZ DB clusters not used either.
- Route 53 now has "private endpoint" health checks (health-checks-types page); no question claims that health checks cannot reach private IPs.
- `soac03-2b-backup-failed-notify`: the stem states that the SNS topic policy already allows the publishing services (EventBridge needs it).

## Overlap avoided
- Dropped a DeletionPolicy/UpdateReplacePolicy Snapshot multi: `soac03-3a-cfn-retain-db-replace-delete` already tests the same pair (Retain).
- Continuous backup question rewritten toward the S3 EventBridge notification pitfall because `soac03-2c-backup-continuous-retention` covers retention changes.
- ASG ELB health check type and ALB `/health` path questions skipped (already in `dvac03-4b-*` and `saac03-2c-*`).
