# C-scs-c03-4 — COURSE SCS-C03, chapters 52, 53, 61, 62 (2026-11-22)

Files: `content/scs-c03/course/chapters/{52-data-at-rest,53-secrets-keys,61-multi-account,62-secure-deployment}.{en,fr}.md` (8 files). `course.yaml` not touched (status stays draft there).
Check: `npx tsx factory/check-cert.ts scs-c03 52-data-at-rest 53-secrets-keys 61-multi-account 62-secure-deployment` → `course problems (your chapters): 0`. Code blocks identical EN/FR, same table rows and callouts per section (script check), no `<` outside code, French spacing before `: ; ? !` checked. Fences used: bash, json, text.

English length: prose without tables and code 1,699 / 1,658 / 1,493 / 1,385; with tables (code excluded) about 2,450 / 2,340 / 2,300 / 2,050. 52, 53 and 61 are above 2,200 when tables are counted (4–5 dense objectives each; already trimmed once).

## Objective coverage
- 52: 5.2.1 (encryption-choices, service-encryption), 5.2.2 (integrity), 5.2.3 (lifecycle-retention), 5.2.4 (backup-replication).
- 53: 5.3.1 (secrets-rotation), 5.3.2 (imported-key-material), 5.3.3 (key-material-origins), 5.3.4 (data-masking), 5.3.5 (multi-region-keys-certificates).
- 61: 6.1.1 (organizations-setup), 6.1.2 (control-tower), 6.1.3 (organization-policies), 6.1.4 (delegated-admin), 6.1.5 (root-user).
- 62: 6.2.1 (stacksets, iac-validation), 6.2.2 (tagging-strategy), 6.2.3 (central-enforcement), 6.2.4 (resource-sharing).

## Verified on AWS pages (WebFetch, 2026-11-22)
- **S3 SSE-C disabled by default for new general purpose buckets since April 2026** (and existing buckets in accounts without SSE-C objects); `BlockedEncryptionTypes` = `NONE` to re-enable; 403 otherwise. DSSE-KMS (no Bucket Keys, same-Region key); Bucket Keys (99 %, bucket ARN context, fewer CloudTrail events).
- Object Lock modes, legal hold, default retention, enable on existing buckets (irreversible), delete-marker behavior, `s3:object-lock-remaining-retention-days`, not a server-access-log destination; replication requirements with Object Lock. S3 checksums (CRC64NVME default). Glacier vault service closed to new customers; Vault Lock 24 h process.
- Lambda code signing (Warn default / Enforce, four checks, .zip only, layers, existing code keeps running); Signer (Lambda, ECR with Notation, EKS verification). CloudTrail log file validation.
- EFS lifecycle defaults (30 / 90 days, Standard not set, On first access). FSx for Lustre backups (persistent non-S3-linked only, 0–90 days, default 0, user backups never expire). Recycle Bin (EBS volumes 1–7 days — newer resource type —, snapshots/AMIs 1–365, tag-level vs Region-level, exclusion tags). EBS snapshot lock (cooling-off 1–72 h, 1–36,500 days). DLM default vs custom policies. Backup Vault Lock (grace ≥ 72 h, 1–36,500 days) and logically air-gapped vault (AWS owned key default, RAM sharing to account IDs only, MPA). DataSync verify modes and mTLS 1.3.
- KMS: import (key types incl. multi-Region; wrapping specs/algorithms; 24 h token; expiration ≤ 365 days; `NEW_KEY_MATERIAL` symmetric only; reimport same material), on-demand rotation (25, Rotate now needs Pending rotation for imported), deletion of imported material, XKS concepts (double encryption, 35 ms RTT, symmetric only), multi-Region keys (shared/independent properties).
- Secrets Manager: rotation types (managed: RDS, Aurora, DocumentDB, Redshift, ECS Service Connect; managed external secrets), strategies, cross-account (CMK required). CloudWatch Logs data protection (account/log-group level, egress masking, `logs:Unmask`, ingest-time, Standard and **Essentials (formerly Infrequent Access)** log classes, 30,720 chars, `LogEventsWithFindings`). **SNS message data protection closed to new customers April 30, 2026**, alternative Lambda + Bedrock Guardrails.
- ACM exportable public certificates (extra charge, 198 days, renewal 45 days before). Private CA Regional, no copy, free when key not accessible.
- Organizations policy types list (now includes Security Hub, Inspector, GuardDuty, Bedrock, S3, upgrade rollout policies; management-account applicability); EC2 declarative policy attributes (7); declarative behaviors; AI opt-out behavior; RCP scope and exceptions. Delegated-admin support list; GuardDuty per Region same account, 50,000 members; Security Hub vs CSPM delegated administrator rules.
- Control Tower LZ 4.0 (Nov 17, 2025: optional integrations, Config dependency, no mandatory Security OU, controls-only experience); Control Catalog rename (June 12, 2025); AFT plan-only runs (Sept 16, 2026).
- Centralized root access (two features, new accounts without root credentials), AssumeRoot task policies (5), 900 s max, Regional endpoint, `sts:TaskPolicyArn`; root MFA required for all account types, 14-day window.
- StackSets delegated admins (up to 5), auto-deployment; Guard (formats, no server-side enforcement); Hooks (four implementation types, fail or warn); tag policies (untagged not evaluated); Firewall Manager prerequisites, administrators and scope, 2,500 accounts per policy, Regional; Service Catalog sharing and launch-role behavior; RAM sharing (service-linked role, invitations 7 d / 12 h, console default "Allow sharing with anyone").

## From knowledge or earlier reports, not re-fetched this session
- SCP quotas 10 per target / 10,240 chars (from C-sap-c03-3 report); RCP 5 / 5,120; Parameter Store tiers and rotation every 4 h minimum (C-soa-c03-3 report); 8 MFA devices; Terraform S3 native locking (C-soa-c03-2 report).
- `SecondsUntilKeyMaterialExpiration` metric; CloudHSM key store "two active HSMs in different AZs", `kmsuser`; Secrets Manager 64 KB, rotation step names, `replicate-secret-to-regions` syntax; CloudWatch Logs audit destinations (CloudWatch Logs, Firehose, S3) and policy JSON syntax.
- `ram:RequestedAllowsExternalPrincipals`; Firewall Manager security group policy subtypes and third-party firewall names; service-managed StackSets never deploy to the management account; S3 lifecycle minimum durations; version-specific deletes not replicated; RDS/EFS encryption only at creation; AI opt-out policy JSON syntax.
- Not stated on purpose: Firewall Manager max number of administrators, Recycle Bin unlock-delay range, AssumeRoot interplay with SCPs denying root.

## French to review
« éléments de clé » (as in objectives.yaml, rather than « matériel de clé » used in sap-c03), « coffre isolé logiquement », « période de refroidissement », « expérience limitée aux contrôles », « politique d'événement de copie entre comptes », « liste ACL web », « correction automatique », « étiquettes intermédiaires (staging labels) ».
