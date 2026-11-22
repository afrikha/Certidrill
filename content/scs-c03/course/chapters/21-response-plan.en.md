An incident response plan is judged on the day it is needed, so the exam asks what must already exist before the first alert: written playbooks, executable runbooks, responder roles in every account, security tooling deployed centrally, a forensic account, DDoS protections with a response team that can act, tests that prove all of it works, and automation that contains the common cases without waiting for a human. This chapter follows that order: plan, prepare, test, automate.

<!-- section: plans-runbooks | objectives: 2.1.1 -->
## Response plans, playbooks and runbooks

AWS aligns its incident response guidance with the NIST SP 800-61 lifecycle: **preparation**, **detection and analysis**, **containment, eradication and recovery**, and **post-incident activity**. A plan has three layers:

| Layer | Content | Form on AWS |
| --- | --- | --- |
| Plan | Scope, roles (incident commander, responders, legal, communications), severity levels, escalation paths, contact lists, evidence-handling rules | Document kept outside the affected accounts, reviewed after each exercise |
| Playbook | The investigation and decision steps for one scenario: exposed access key, public S3 bucket, compromised EC2 instance, crypto-mining, ransomware against data | Document plus queries, often a notebook |
| Runbook | The exact, repeatable actions of one step (isolate an instance, deactivate a key, snapshot volumes) | Systems Manager Automation runbook, Lambda function, Step Functions state machine |

Tools the guide names, and where each fits:

| Tool | Role in incident response |
| --- | --- |
| **Systems Manager Automation** | Runbooks written in YAML or JSON (`schemaVersion: '0.3'`) with steps such as `aws:executeAwsApi`, `aws:executeScript`, `aws:runCommand` and `aws:approve` (a manual approval gate). Runs under an assume role, with rate control and multi-account, multi-Region execution |
| **Systems Manager OpsCenter** | OpsItems collect the work for one issue: created from EventBridge rules (for example Security Hub CSPM findings) or CloudWatch alarms in `ALARM` state, with related resources (up to 100 ARNs), associated Automation runbooks launched with **Run automation**, and a 30-day record of runbook runs |
| **Amazon SageMaker AI notebooks** | Jupyter notebooks as interactive playbooks: the explanation, the Athena or SDK queries and their results live in one document that responders run and keep as a record |
| **AWS Security Incident Response** | Managed service: triages GuardDuty and Security Hub CSPM threat findings, opens proactive cases, gives 24/7 access to AWS responders and, with pre-authorization, runs containment for EC2 instances, S3 buckets and IAM principals |
| **Systems Manager Incident Manager** | Response plans, contacts, escalation and on-call. **No longer open to new customers since November 7, 2025** (existing customers continue); do not design a new solution around it |

A minimal containment runbook, ready to be launched from an OpsItem or by an EventBridge rule:

```yaml
description: Quarantine a suspected compromised EC2 instance and snapshot its volumes
schemaVersion: '0.3'
assumeRole: '{{ AutomationAssumeRole }}'
parameters:
  InstanceId:
    type: String
  QuarantineSecurityGroupId:
    type: String
  AutomationAssumeRole:
    type: String
mainSteps:
  - name: tagForInvestigation
    action: aws:createTags
    inputs:
      ResourceType: EC2
      ResourceIds:
        - '{{ InstanceId }}'
      Tags:
        - Key: ir-status
          Value: quarantined
  - name: replaceSecurityGroups
    action: aws:executeAwsApi
    inputs:
      Service: ec2
      Api: ModifyInstanceAttribute
      InstanceId: '{{ InstanceId }}'
      Groups:
        - '{{ QuarantineSecurityGroupId }}'
  - name: snapshotAllVolumes
    action: aws:executeAwsApi
    inputs:
      Service: ec2
      Api: CreateSnapshots
      InstanceSpecification:
        InstanceId: '{{ InstanceId }}'
      CopyTagsFromSource: volume
```

> **Exam tip.** "Responders need a documented, repeatable procedure that a human can approve before it changes production" points to a Systems Manager Automation runbook with an `aws:approve` step, launched from OpsCenter. "Interactive investigation with queries and results kept together" points to notebooks.

<!-- section: preparation | objectives: 2.1.2 -->
## Preparing accounts and services for incidents

**Provision access before it is needed.**

- Deploy **incident response roles** into every account in advance (CloudFormation StackSets or Control Tower customizations): a read-only investigation role and a separate containment role with only the actions the runbooks use. Responders reach them through IAM Identity Center permission sets or role assumption from the security account.
- Keep a **break-glass** path that does not depend on the identity provider (for example a tightly monitored IAM user or role in the management account with MFA), alarmed when used.
- Test that responders can actually assume the roles; an untested role is discovered broken during the incident.

**Deploy the security tools centrally.** Use a security tooling account as **delegated administrator** for GuardDuty, Security Hub, Detective, Inspector and Macie, an **organization trail** delivering to a log archive account, AWS Config in every account and Region, and VPC Flow Logs and Route 53 Resolver query logs on critical VPCs. Logs that were never collected cannot be investigated.

**Build a forensic account in advance**: an isolated VPC with no internet path, forensic AMIs with the tools preinstalled (built with EC2 Image Builder), an evidence bucket with versioning and S3 Object Lock, and KMS keys whose policies let the forensic account use shared snapshots.

**Minimize the blast radius**: one account per workload and environment, SCPs and RCPs as guardrails, least-privilege roles with short sessions, network segmentation, and the log archive in a separate account that workload administrators cannot change.

**Configure AWS Shield Advanced protections before an attack:**

| Setting | What to know |
| --- | --- |
| Protected resources | CloudFront distributions, Route 53 hosted zones, Global Accelerator standard accelerators, Elastic IP addresses (and so EC2 instances and NLBs behind them), ALBs and Classic Load Balancers. Nothing is protected until you add it, directly or through a Firewall Manager Shield Advanced policy |
| Health-based detection | Associate a Route 53 health check with each protection (all types except hosted zones): detection becomes faster and more sensitive when the application is unhealthy |
| Shield Response Team (SRT) access | An IAM role trusted by `drt.shield.amazonaws.com` with the managed policy `AWSShieldDRTAccessPolicy`; optionally up to 10 S3 log buckets in the console. Requires Business Support or Enterprise Support |
| Proactive engagement | The SRT contacts you when a Shield Advanced detected event affects the health checks: needs health checks, at least one contact (up to 10) and a WAF (v2) web ACL on the protected resource |
| Application layer | Web ACL on CloudFront and ALBs. Since March 26, 2026 the **Anti-DDoS** managed rule group (`AWSManagedRulesAntiDDoSRuleSet`, included in the subscription) is the default for HTTP flood protection; the older automatic application layer mitigation remains for existing users |
| Billing | One subscription for the consolidated billing family; WAF charges for protected resources are included (Bot Control, CAPTCHA and some extras excluded) |

> **Exam trap.** The SRT cannot read logs in buckets encrypted with AWS KMS keys: logs you plan to share with the SRT must be in plaintext or SSE-S3 buckets in the same account. And proactive engagement without associated Route 53 health checks does not work.

<!-- section: plan-testing | objectives: 2.1.3 -->
## Testing and validating the plan

| Method | What it proves |
| --- | --- |
| Tabletop exercise | Roles, decisions, communication and escalation are clear; gaps in the playbooks |
| Simulation with sample findings | Detection pipelines, EventBridge rules, notifications and runbooks fire end to end |
| Game day or red team exercise | Detection and response against realistic activity, including access to accounts and tooling |
| AWS Fault Injection Service (FIS) | The workload and its alarms behave as expected when real faults are injected |
| AWS Resilience Hub | The application meets its RTO and RPO targets and has the alarms, SOPs and tests it needs |

GuardDuty sample findings exercise a response pipeline without a real threat:

```bash
aws guardduty create-sample-findings \
  --detector-id 12abc34d567e8fa901bc2d34e56789f0 \
  --finding-types UnauthorizedAccess:EC2/SSHBruteForce Recon:EC2/PortProbeUnprotectedPort
```

**AWS FIS**: an **experiment template** defines **actions** (for example `aws:network:disrupt-connectivity` with a `scope` such as `all` or `s3`, `aws:ec2:stop-instances`, `aws:ssm:send-command`, `aws:ssm:start-automation-execution`, `aws:fis:inject-api-internal-error`), **targets** selected by ID, tag or state, and **stop conditions**, which are CloudWatch alarms that halt the experiment. FIS acts through an IAM role you provide, can target other accounts in multi-account experiments, and takes real actions on real resources, so start in pre-production.

```json
{
  "description": "Cut network access of tagged app instances for 5 minutes",
  "roleArn": "arn:aws:iam::111122223333:role/fis-experiments",
  "targets": {
    "appSubnets": {
      "resourceType": "aws:ec2:subnet",
      "resourceTags": { "ir-test": "true" },
      "selectionMode": "ALL"
    }
  },
  "actions": {
    "isolateSubnets": {
      "actionId": "aws:network:disrupt-connectivity",
      "parameters": { "duration": "PT5M", "scope": "all" },
      "targets": { "Subnets": "appSubnets" }
    }
  },
  "stopConditions": [
    { "source": "aws:cloudwatch:alarm", "value": "arn:aws:cloudwatch:eu-west-1:111122223333:alarm:orders-error-rate" }
  ]
}
```

**AWS Resilience Hub** imports an application (CloudFormation, Terraform, EKS or myApplications), assesses it against a **resiliency policy** (RTO and RPO for application, infrastructure, Availability Zone and Region disruptions), produces a resiliency score and recommends CloudWatch alarms, standard operating procedures and FIS experiments, and detects drift from the assessed configuration.

Measure every test: time to detect, time to contain, whether the right people were reached, whether the runbook did what it claimed. Then update the plan; the post-incident review is part of the lifecycle, not an option.

> **Exam trap.** FIS injects faults; it does not assess an application against RTO and RPO. Resilience Hub assesses and recommends, and runs FIS experiments for the tests. A stop condition in FIS is always a CloudWatch alarm.

<!-- section: auto-remediation | objectives: 2.1.4 -->
## Automated remediation

The common pattern is **finding, then EventBridge rule, then target**. GuardDuty, Security Hub CSPM, Inspector, Macie, Config and CloudTrail all publish events. A rule for high and critical GuardDuty findings on EC2 instances:

```json
{
  "source": ["aws.guardduty"],
  "detail-type": ["GuardDuty Finding"],
  "detail": {
    "severity": [{ "numeric": [">=", 7] }],
    "resource": { "resourceType": ["Instance"] }
  }
}
```

| Requirement | Target |
| --- | --- |
| One quick API action (deactivate a key, block public access) | Lambda function (15-minute maximum) |
| Several steps, branches, retries, parallel evidence collection, waits or a human approval through a task token | AWS Step Functions |
| Reusable runbook with approvals, rate control and multi-account execution | Systems Manager Automation |
| Resource configuration drifts from a rule (unencrypted volume, open port) | AWS Config rule with automatic remediation (an Automation runbook, with retries) |
| An analyst chooses to act on a finding in the console | Security Hub CSPM custom action, which emits an EventBridge event |
| Collect memory and disk evidence from EC2 automatically | Automated Forensics Orchestrator for Amazon EC2 |
| Restore availability by moving traffic away from an impaired zone or Region | Amazon Application Recovery Controller (ARC) |

**Automated Forensics Orchestrator for Amazon EC2** (an AWS Solution, documentation now titled "for Amazon EC2 and EKS"): Security Hub findings reach EventBridge, which starts a Step Functions triage workflow (instance details, isolation decided by the Security Hub action, acquisition decided by instance tags). Memory and disk acquisition run in parallel: memory goes to S3 and the instance is then isolated with a new security group; EBS snapshots are shared with the forensic account. An investigation workflow then launches an instance from the **forensic AMI** (SSM Agent and tools), attaches the evidence, runs the tools with Run Command and reports through SNS. DynamoDB tracks the state.

**ARC** capabilities: **zonal shift** (move traffic away from one Availability Zone for up to three days, extendable), **zonal autoshift** (AWS shifts for you on its telemetry), **routing control** (DNS failover between Regions, with safety rules) and **Region switch** (orchestrated multi-Region recovery plans). ARC **readiness check** is in maintenance (closed to new customers since April 30, 2026).

> **Exam trap.** Config remediation fixes configuration drift; it is not a threat response engine. A GuardDuty finding is routed through EventBridge. And a Security Hub CSPM custom action needs an analyst to trigger it: "without human intervention" means an EventBridge rule on the findings themselves.

<!-- section: key-points -->
## Key points

- Plan, playbook, runbook: decisions on paper, scenario steps in documents or notebooks, actions in Automation runbooks, Lambda or Step Functions. Incident Manager is closed to new customers.
- Prepare: pre-deployed responder roles, break-glass access, delegated administrators in a security account, organization trail, forensic account with forensic AMIs and Object Lock, small blast radius.
- Shield Advanced: add resources explicitly, Route 53 health checks for health-based detection and proactive engagement, SRT role with `AWSShieldDRTAccessPolicy`, Business or Enterprise Support, Anti-DDoS rule group for HTTP floods.
- Test: tabletop, sample findings, game days, FIS experiments with alarm stop conditions, Resilience Hub assessments against RTO and RPO.
- Automate: EventBridge rules to Lambda, Step Functions or Automation; Config remediation for drift; the forensics orchestrator for evidence; ARC for availability recovery.
