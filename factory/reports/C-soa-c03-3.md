# C-soa-c03-3 — COURSE SOA-C03, chapters 32, 41, 42, 51 (2026-11-20)

Files: `content/soa-c03/course/chapters/{32-automation,41-security-compliance,42-data-protection,51-vpc-connectivity}.{en,fr}.md` (8 files). `course.yaml` not touched. All `status: draft` (from course.yaml).
Check: `npx tsx factory/check-cert.ts soa-c03 32-automation 41-security-compliance 42-data-protection 51-vpc-connectivity` → `course problems (your chapters): 0`. EN/FR code blocks verified identical by script; no `<` outside code; French punctuation spacing checked.
English words (code, markers and table syntax excluded): 32 = 2,107; 41 = 1,996; 42 = 1,861; 51 = 1,867.

## Objective coverage
- 32: 3.2.1 (managed-nodes, run-command-state-manager, automation-runbooks, patching-sessions), 3.2.2 (eventbridge-automation, s3-lambda-events, ai-operations).
- 41: 4.1.1 (iam-credentials, roles-policies), 4.1.2 (access-troubleshooting), 4.1.3 (multi-account), 4.1.4 (trusted-advisor), 4.1.5 (config-compliance).
- 42: 4.2.1 (data-classification), 4.2.2 (encryption-at-rest), 4.2.3 (encryption-in-transit), 4.2.4 (secrets), 4.2.5 (security-findings).
- 51: 5.1.1 (vpc-subnets-routing, sg-nacl), 5.1.2 (vpc-endpoints, vpc-peering), 5.1.3 (network-protection-audit), 5.1.4 (network-cost).

## Verified on AWS pages (WebFetch, 2026-11-20)
- Systems Manager: DHMC (role name, IMDSv2, agent 3.2.582.0, per Region, 30 min); VPC endpoints ssm/ssmmessages/ec2messages (agent 3.3.40.0+ prefers ssmmessages); Patch Manager (patch policies recommended, Scan / Scan and install, predefined baselines are examples, CSV reports to S3, maintenance window task = one account-Region pair); Parameter Store tiers (10,000/4 KB vs 100,000/8 KB, no downgrade, advanced shareable). **Change Manager and Incident Manager closed to new customers November 7, 2025.**
- EventBridge: CloudTrail detail-type needs a trail; `ENABLED` matches write events only, `ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS` for read-only; retry 24 h / 185; Scheduler recommended, scheduled rules legacy. Trusted Advisor events only in us-east-1, source/detail-type strings, plan requirement.
- S3 Event Notifications destinations, FIFO not supported (use EventBridge), at-least-once, loop warning.
- AWS DevOps Agent (Agent Spaces, integrations, alert/ticket/webhook/manual triggers, topology, mitigation, prevention, Kiro hand-off; no autonomous remediation documented). GA date March 31, 2026 taken from C-dva-c03-4 report (not refetched). DevOps Guru closed October 29, 2026, EOS September 30, 2027. **CloudTrail Lake closed to new customers May 31, 2026** (CloudWatch recommended).
- AWS Security Agent: design review, code review (PR comments), threat modeling, penetration testing; its pages say "now part of AWS Continuum" and the Continuum page calls it "Continuum for penetration testing (f.k.a. AWS Security Agent)". GA status ambiguous on the pages (Continuum FAQ mentions a public preview and pay-as-you-go pricing): the chapter makes no GA claim.
- IAM: password policy ranges and defaults; MFA types, 8 devices, root MFA enforced, `aws login` for passkeys; Access Analyzer capabilities and Regional scope; policy simulator (SCPs yes, RCPs no); centralized root access. SCP and RCP behavior (management account, service-linked roles, root user).
- Trusted Advisor: 34 security checks (names), Basic/Developer access to six non-limit checks, manual refresh, Business Support+ / Enterprise / Unified Operations for all checks/API/EventBridge, statuses ERROR/WARN/OK/INFO, **Developer Support discontinued January 1, 2027**.
- Config remediation (retries example 5 in 300 s, resource ID parameter), conformance packs.
- KMS deletion 7–30 days (30 default); ACM 198-day validity, events (Approaching Expiration 30 d public / 45 d private-imported, configurable), `DaysToExpiry` metric, renewal eligibility; Secrets Manager rotation (4 h minimum, 1 h window, UTC, strategies, labels).
- Security Hub (v2, OCSF, exposure findings, Jira/ServiceNow) vs Security Hub CSPM (ASFF, standards, Config dependency, automation rules); GuardDuty plans and Extended Threat Detection; Inspector; Macie.
- VPC quotas; regional NAT gateway (no public subnet, 60 min expansion, 32 IPs/AZ vs 8, no private NAT, 55,000 connections per IP); gateway endpoints; endpoint types; peering limitations; public IPv4 charge for in-use and idle addresses; IPAM Public IP insights; WAF logging (`aws-waf-logs-`, same Region/account), WAF and Shield metrics; Shield Advanced resource types; Network Firewall logs (stateful only); DNS Firewall actions, block responses, fail-closed default. Docs now say "protection pack (web ACL)" and "Route 53 VPC Resolver": chapters keep the exam-guide names with the new WAF name in passing.

## From general knowledge, not confirmed on a fetched page (reviewer please check)
- Lambda async invocation retries twice by default; reserved concurrency; EventBridge 5 targets per rule.
- Run Command flags (`--cloud-watch-output-config`), automation cross-account role names `AWS-SystemsManager-Automation{Administration,Execution}Role`, `{{ global:DATE_TIME }}`, runbook names (`AWS-DisablePublicAccessForSecurityGroup` parameter `GroupId`), `AWS-RunPatchBaseline`.
- CloudFormation `AWS::Config::RemediationConfiguration` property names; Config managed rule names (`restricted-ssh`/`INCOMING_SSH_DISABLED`, `wafv2-logging-enabled`...).
- "Access denied messages name the policy type"; `aws:SourceIp` trap with VPC endpoints; Identity Center `AWSReservedSSO_` roles; Control Tower proactive controls via CloudFormation hooks.
- Secrets Manager 64 KB secret size, 7–30 day recovery window; `--manage-master-user-password`; `rds.force_ssl` / `require_secure_transport`.
- NAT metrics `ErrorPortAllocation`, `BytesOutToDestination`; usage types `NatGateway-Bytes`, `DataTransfer-Regional-Bytes`; VPC peering no hourly charge; Transit Gateway per attachment-hour pricing; 5 reserved subnet addresses; NACL ephemeral range advice.
- GuardDuty EventBridge `detail.severity` field and detail-type `GuardDuty Finding`.

## Deviations / notes
- 32-automation is ~2,107 words (inside the range). Systems Manager Automation authoring and EventBridge troubleshooting are left to chapter 12 (objectives 1.2.2, 1.2.3), with a pointer sentence.
- No prices quoted (VPC pricing page gives Ohio examples only).
- French to review: « délai de coupure (cutoff) », « référentiel de correctifs », « jeu d'autorisations », « politique d'approbation (trust policy) », « expiration stricte (hard expiry) », « routage de périphérie à périphérie ».
