# C-sap-c03-5 — COURSE SAP-C03, chapters 41, 42, 43, 51 (2026-11-20)

## Output
- `content/sap-c03/course/chapters/41-migration-strategies.{en,fr}.md` — 7 sections + key points (4.1.1–4.1.6).
- `42-disaster-recovery.{en,fr}.md` — 6 sections + key points (4.2.1–4.2.6).
- `43-business-continuity.{en,fr}.md` — 5 sections + key points (4.3.1–4.3.5).
- `51-infrastructure-as-code.{en,fr}.md` — 4 sections + key points (5.1.1–5.1.4).
- `check-cert.ts sap-c03 41-… 42-… 43-… 51-…`: course problems (your chapters) 0.
- English length (my counter, tables included, code excluded): about 2,190 / 1,950 / 1,800 / 1,390 words.

## Sources (WebFetch, model-summarised pages)
AWS Transform user guide (what is, discovery tool, discovery source data, migration assessment, mainframe); Transform MGN user guide (what is, agentless page), MGN CLI reference; Mainframe Modernization availability change; Prescriptive Guidance (7 Rs, strangler fig); DMS (welcome, CDC, Serverless, homogeneous data migrations); DataSync (what is, task modes); Storage Gateway; Data Transfer Terminal; DRS user guide, DRS FAQ, `drs start-recovery` CLI; Resilience Hub (what is, concepts, resource collections, resiliency policies); ARC (what is, Region switch, execution blocks, routing control, best practices, zonal shift resources); Route 53 health check values and HealthCheckConfig API; Global Accelerator traffic dials; ECR replication; EKS Argo CD capability; AWS Backup (cross-account, Vault Lock, logically air-gapped vault, restore testing), Organizations backup policy syntax, `put-backup-vault-lock-configuration` and `ec2 lock-snapshot` CLI; EBS snapshot lock and concepts; Recycle Bin; S3 Object Lock; FIS (what is, scenario library, AZ power interruption, safety lever); CloudFormation Hooks (what is, concepts); CDK aspects; Config rule components and remediation; CloudFormation dynamic references (overview, secretsmanager, ssm-secure); RDS Secrets Manager integration; StackSets (concepts, trusted access, auto deployment, self-managed prerequisites, service-managed targets).

## Service status points written into the chapters (verified)
- Migration Hub, Application Discovery Service and Migration Hub Refactor Spaces closed to new customers (Nov 7, 2025) → AWS Transform.
- MGN agentless (vCenter Client) replication "no longer available for new deployments".
- AWS Mainframe Modernization: managed runtime stopped accepting new customers; self-managed experience no longer open to new customers (no date on the page) → AWS Transform for mainframe.
- Snow Family not offered to new customers (from the profile; not re-fetched).

## Stated from general knowledge, not confirmed on a fetched page
- DMS Fleet Advisor named as current (DMS welcome page lists it; no status notice seen).
- Systems Manager Automation multi-account/multi-Region execution with rate control; EC2 automatic instance recovery; ECS deployment circuit breaker; static stability 150 % sizing on three AZs; ALB path routing as strangler fig facade.
- Route 53 control plane not suited to the failover critical path (wording kept generic).
- Backup Audit Manager control list (only "restore time" control seen on the restore testing page).
- CloudFormation: IaC generator, resource import, stack policies, termination protection, `NoEcho` behaviour, `GenerateSecretString` properties, `ManageMasterUserPassword` as a CloudFormation property; CDK `--require-approval broadening`, `SecretValue`, `Secret.fromSecretNameV2`; Guard rule syntax; Control Tower preventive/detective/proactive control types; FIS template JSON keys and `aws:ec2:stop-instances` parameter.
- Secrets Manager vs Parameter Store (rotation, replicas, cost) comparison.

## Deviations / notes
- Amazon FSx File Gateway deliberately not mentioned (I recall a closure to new customers but did not confirm it).
- ARC readiness check mentioned only as "not for the critical failover path" (page carries an availability change link).
- Recycle Bin retention and unlock-delay ranges left out (not on fetched pages).
- Porting Assistant for .NET and App2Container (named on the 7 Rs page) not used; AWS Transform .NET and containerization used instead.
- CDK aspect/TypeScript code not shown (code fences limited to bash, json, yaml, text); the Guard rule is in a `text` fence.
