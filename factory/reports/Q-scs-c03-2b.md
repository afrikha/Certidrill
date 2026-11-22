# Q-scs-c03-2b — questions SCS-C03, domain `incident`, objectives 2.2.2–2.2.5

41 files `content/scs-c03/questions/incident/scsc03-2b-*.yaml`, all `draft`. Validator: `41 files, 0 problem(s)`.

- Per objective: 2.2.2 = 11, 2.2.3 = 10, 2.2.4 = 10, 2.2.5 = 10.
- Types: single 33, multi 6 (all "Choose two."), ordering 1 (EKS pod response), dragdrop 1 (log source matching). Target was single 32.
- Difficulty: 6 easy, 21 medium, 14 hard.
- Single answers spread: a 8, b 8, c 8, d 9.
- No SCS-C03 course chapter for these objectives existed when the batch was written, so the questions rely on AWS documentation only.

## Sources fetched (2026-11-22)

Athena CloudTrail partition projection; CloudTrail event history; CloudWatch cross-account observability; Logs Insights query syntax; Security Lake subscriber management, native sources, custom sources; WAF log fields; ALB access logs; VPC flow log records; Route 53 VPC Resolver query log values; DNS Firewall rule actions; Firewall Manager DNS Firewall policies; S3 logging options; EKS control plane logs; EKS best practices incident response and forensics; GuardDuty IAM finding types, suppression rules, entity/IP lists, on-demand malware scan, Extended Threat Detection, compromised credentials and compromised EC2 remediation; Access Analyzer archive rules; Macie sensitive data samples; Inspector finding details and Inspector score; Security Hub (new) introduction; EC2 security group connection tracking; IAM revoke role sessions; IAM source identity; Identity Center authentication sessions, revoke user access, Deny policy with identitystore:userId; Lambda reserved concurrency; Cognito token revocation; AWS Backup logically air-gapped vault; RDS point-in-time restore; Auto Scaling detach instances; SCPs; Config resource timeline; Detective source data, finding groups, investigations, investigation report, VPC flow volume panel, Security Lake integration, recommendations, Organizations.

## Not verified on a fetched page (stable knowledge, review)

- Termination protection does not stop Auto Scaling, and scale-in protection does not prevent health check replacement (scsc03-2b-asg-detach-preserve, distractor b). The termination protection page did not load; the stop protection page says the same for stop protection.
- Kubernetes audit event field names `verb`, `objectRef.resource`, `user.username` (scsc03-2b-eks-audit-insights).
- `responseElements.ConsoleLogin = "Failure"` in CloudTrail ConsoleLogin events (scsc03-2b-insights-console-failures).
- Macie sensitive data discovery results do not contain the detected values (distractor d of scsc03-2b-macie-reveal-samples).
- GuardDuty keeps findings for 90 days (distractor c of scsc03-2b-det-retention-athena; the suppression page states 90 days for archived findings).
- Non-transitive session tags are dropped when roles are chained (distractor c of scsc03-2b-sourceidentity-chain).
- The `httpRequest.` prefix of the WAF `requestId` and `clientIp` fields (the fetched summary listed the fields without the prefix).

## Deviations and doubts

- The Route 53 page now names the feature "VPC Resolver query logs"; the questions keep "Route 53 Resolver query logs", the name used by the exam guide and by Security Lake.
- The Lambda concurrency page is titled "... for an Event Function"; the questions say "Lambda function".
- CloudTrail Lake appears only as a wrong option (closed to new customers since May 31, 2026). Security Hub CSPM is used for the former Security Hub.
- Scoring NOTE sentence kept on multi and dragdrop stems, as in the existing AWS banks, although SCS-C03 scores them all or nothing.
