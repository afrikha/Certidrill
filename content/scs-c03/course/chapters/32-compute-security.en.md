Compute security is a chain: start from a hardened image, give the workload only the role it needs, scan it continuously for known vulnerabilities and watch its runtime, patch it automatically and prove it is patched, reach it for administration without open ports or long-lived keys, catch vulnerable code before it ships, and, for generative AI applications, filter what goes into and comes out of the model. Several services named in the guide changed status in 2025 and 2026; this chapter gives the current answer and says where the guide's examples no longer apply to new customers.

<!-- section: hardened-images | objectives: 3.2.1 -->
## Hardened AMIs and container images

**EC2 Image Builder** automates golden images:

| Building block | Content |
| --- | --- |
| Image recipe or container recipe | Base image (AMI, or container image from ECR or Docker Hub) and ordered **components** |
| Build components | Updates, agents (SSM Agent, CloudWatch agent), hardening such as the Amazon managed STIG components (`STIG-Build-Linux-High`, `STIG-Build-Windows-Medium`...: levels Low, Medium, High are cumulative; High is the Linux default) |
| Test components | Checks run on an instance launched from the new image; the image is distributed only if every test passes |
| Infrastructure configuration | Instance type, subnet, security group, the instance profile used during the build, logs bucket, SNS topic |
| Distribution settings | Target Regions, accounts or organizations and OUs, launch permissions, KMS key for the AMI, launch template updates; container images go to ECR |
| Pipeline | Schedule or manual run, workflows `BUILD`, `TEST`, `DISTRIBUTION`, image scanning with Amazon Inspector |

Hardening content: remove unneeded packages and services, no credentials or keys baked into the image, SSM Agent installed so the instance is managed without SSH, CloudWatch agent for logs, IMDSv2 required (set the AMI property `ImdsSupport` to `v2.0`), encrypted EBS volumes. Without Image Builder, the Automation runbooks `AWS-UpdateLinuxAmi` and `AWS-UpdateWindowsAmi` patch a source AMI and create a new one.

**Enforce approved images.**

- **Allowed AMIs** (EC2 account setting per Region, or an Organizations **declarative policy** for many accounts and Regions): criteria on image providers (`amazon`, `aws-marketplace`, `aws-backup-vault`, account IDs), image names, creation age, deprecation and Inspector scan results. Use **audit mode** first, then **enabled**, which hides and blocks non-matching AMIs; AMIs owned by the account are always allowed. The Config rule `ec2-instance-launched-with-allowed-ami` finds existing instances that do not comply.
- Block public sharing of AMIs with the account-level **block public access for AMIs** setting.

```json
{
  "ImageCriteria": [
    { "ImageProviders": ["444455556666"], "ImageNames": ["hardened-al2023-*"] },
    { "ImageProviders": ["amazon"], "CreationDateCondition": { "MaximumDaysSinceCreated": 90 } }
  ]
}
```

**Container images**: minimal base images, a non-root user, no secrets in layers, ECR tag immutability, image signing, enhanced scanning in ECR before deployment, rebuild on base image updates.

> **Exam trap.** A launch template with an approved AMI does not stop someone from launching another image. "Prevent any instance from being launched from a non-approved AMI across the organization" is Allowed AMIs through a declarative policy (or SCPs on `ec2:RunInstances`), not a Config rule, which only detects.

<!-- section: compute-roles | objectives: 3.2.2 -->
## Instance profiles, service roles and execution roles

| Workload | Identity | Trust principal | Typical mistake |
| --- | --- | --- | --- |
| EC2 instance | Instance profile containing one IAM role; credentials delivered through IMDS | `ec2.amazonaws.com` | Storing access keys on the instance |
| ECS task | **Task role** for the application's calls; **task execution role** for the agent (pull from ECR, send logs, inject secrets from Secrets Manager or Parameter Store) | `ecs-tasks.amazonaws.com` | Giving the application permissions to the execution role |
| Lambda function | **Execution role** for what the code calls; a separate **resource-based policy** for who may invoke it | `lambda.amazonaws.com` | Using the execution role to allow invocations |
| EKS pod | EKS Pod Identity association or IAM roles for service accounts | `pods.eks.amazonaws.com` or the cluster OIDC provider | Pods inheriting the node role |
| AWS service acting for you (CodeBuild, Image Builder, Automation) | Service role you create and pass | The service principal | Over-broad service roles |
| Service-linked role | Predefined by the service, permissions not editable | The service | Trying to restrict it with an inline policy |

Passing a role to a service requires `iam:PassRole`; restrict which roles and to which service:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::111122223333:role/workloads/web-*",
      "Condition": { "StringEquals": { "iam:PassedToService": "ec2.amazonaws.com" } }
    }
  ]
}
```

Protect instance credentials: require **IMDSv2** (`HttpTokens` `required`, enforceable with the `ec2:MetadataHttpTokens` condition key and account-level defaults), keep the **hop limit** at 1 when containers on the host must not reach the instance role (2 is needed when containers legitimately use it), and restrict where instance credentials can be used with an SCP comparing `aws:Ec2InstanceSourceVpc` with `aws:SourceVpc` (and `aws:Ec2InstanceSourcePrivateIPv4` with `aws:VpcSourceIp`), excluding `aws:ViaAWSService` calls. This addresses the GuardDuty finding `InstanceCredentialExfiltration`.

> **Exam trap.** A Lambda function cannot be invoked by another account because of its execution role: invocation permission is the function's resource-based policy. And an ECS task that cannot pull its image or read its injected secret lacks permissions on the task execution role, not the task role.

<!-- section: vuln-scanning | objectives: 3.2.3 -->
## Scanning compute for vulnerabilities and monitoring runtimes

**Amazon Inspector** finds **known vulnerabilities** continuously, rescanning when software changes or a new CVE is published, and closes findings when the fix is detected.

| Resource | How Inspector scans |
| --- | --- |
| EC2 | **Agent-based** through the SSM Agent (SSM managed instance, instance profile with `AmazonSSMManagedInstanceCore`; private subnets need endpoints for `inspector2-telemetry`, `s3`, `ssm`, `ssmmessages`); **agentless** from EBS snapshots for unmanaged instances; **hybrid** mode combines both. Network reachability every 12 hours. Deep inspection for language packages on Linux. Exclude with the `InspectorEc2Exclusion` tag |
| ECR images | **Enhanced scanning** (OS and language packages) on push or **continuous**; continuous rescans for a set duration based on push and last-in-use dates; maps images to running ECS tasks and EKS pods. Basic scanning is billed through ECR |
| Lambda | **Standard scanning** of dependencies in functions and layers; **code scanning** of custom code (requires standard scanning). Covers `$LATEST` functions invoked or updated in the last 90 days; functions encrypted with customer managed keys are not supported |

Findings carry an **Inspector score** that adjusts CVSS to the environment (lower if no network path exists), go to EventBridge and Security Hub CSPM, and are managed for the organization by a delegated administrator.

**Amazon GuardDuty** watches for **active threats**:

- **Runtime Monitoring** with the GuardDuty security agent for EKS, ECS on Fargate and EC2 (not EKS on Fargate): process execution, file access, command lines, network connections. The agent is managed automatically or manually (automatic only for Fargate).
- **Malware Protection for EC2**: GuardDuty-initiated scans of attached EBS volumes when a finding suggests malware, plus on-demand scans; snapshots are kept only when malware is found.
- **Malware Protection for S3**: scans new objects in chosen buckets, can run without enabling GuardDuty, and can tag objects with `GuardDutyMalwareScanStatus` so a bucket policy denies reads of objects tagged `THREATS_FOUND`.

> **Exam tip.** Inspector answers "which workloads have known CVEs?"; GuardDuty Runtime Monitoring answers "is something malicious running right now?". A question about containers on EKS with AWS Fargate cannot use GuardDuty Runtime Monitoring.

<!-- section: patching | objectives: 3.2.4 -->
## Automated patching with continuous validation

**Systems Manager Patch Manager**:

- **Patch policies** configured with Quick Setup are the recommended method: one policy across the organization, OUs, accounts and Regions, with separate schedules for **Scan** and **Install**.
- **Patch baselines** define compliance: auto-approval rules by classification and severity with a delay in days, explicit approved and rejected lists, a compliance level. AWS recommends custom baselines over the predefined ones.
- Other execution methods: Host Management (scan only, default baseline), maintenance windows running `AWS-RunPatchBaseline` with `Operation` `Scan` or `Install`, and **Patch now** for on-demand runs.
- Compliance data is a snapshot of the last operation (check the capture time); it feeds Security Hub CSPM and the Config rule `ec2-managedinstance-patch-compliance-status-check`, and exports to S3.
- Limits: AWS does not test patches, and Patch Manager does not perform major OS upgrades.

```bash
aws ssm create-patch-baseline \
  --name "rhel9-security-fast" \
  --operating-system REDHAT_ENTERPRISE_LINUX \
  --approval-rules "PatchRules=[{PatchFilterGroup={PatchFilters=[{Key=CLASSIFICATION,Values=[Security]},{Key=SEVERITY,Values=[Critical,Important]}]},ApproveAfterDays=3,ComplianceLevel=HIGH}]"
aws ssm send-command --document-name "AWS-RunPatchBaseline" \
  --targets "Key=tag:patch-wave,Values=wave-1" \
  --parameters '{"Operation":["Install"],"RebootOption":["RebootIfNeeded"]}'
```

**Continuous validation**: Amazon Inspector rescans after packages change and closes remediated findings, which proves the patch worked; an EventBridge rule on new critical Inspector findings can start a Patch now operation or an Automation runbook. For immutable fleets, rebuild the AMI with Image Builder and roll it out with an Auto Scaling group **instance refresh** instead of patching in place; for containers, rebuild images and redeploy; for Lambda, update dependencies and rely on runtime management controls.

> **Exam trap.** Patch compliance in Patch Manager says which approved patches are installed according to your baseline; it does not prove the absence of vulnerabilities. "Validate continuously that patched instances no longer have the CVE" is Inspector.

<!-- section: admin-access | objectives: 3.2.5 -->
## Secure administrative access

| Method | Network requirement | Authentication and audit |
| --- | --- | --- |
| **Session Manager** | No inbound port, no bastion, no public IP: the SSM Agent opens outbound HTTPS (443) to `ssm`, `ssmmessages` and `ec2messages`, or to interface VPC endpoints | IAM (`ssm:StartSession`, conditions on resource tags); session logs to S3 and CloudWatch Logs, session data encrypted with a KMS key, Run As users; port forwarding and SSH through `AWS-StartSSHSession` |
| **EC2 Instance Connect** | Public IP, or private connectivity to the instance | IAM `ec2-instance-connect:SendSSHPublicKey` pushes a one-time public key that stays in instance metadata for **60 seconds** |
| **EC2 Instance Connect Endpoint** | Instances in private subnets, no public IP, no bastion, no internet gateway; SSH or RDP | IAM `ec2-instance-connect:OpenTunnel` (with a `maxTunnelDuration` condition); the instance security group must allow the endpoint |
| Bastion host | Inbound SSH or RDP from somewhere | Keys to manage and rotate; avoid for new designs |

Session Manager feature versions of the SSM Agent: 2.3.539.0 or later for KMS encryption of session data, 3.0.222.0 or later for port forwarding and SSH sessions, 3.0.284.0 or later for streaming to CloudWatch Logs.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ssm:StartSession",
      "Resource": [
        "arn:aws:ec2:eu-west-1:111122223333:instance/*",
        "arn:aws:ssm:eu-west-1:111122223333:document/SSM-SessionManagerRunShell"
      ],
      "Condition": { "StringEquals": { "ssm:resourceTag/team": "${aws:PrincipalTag/team}" } }
    },
    {
      "Effect": "Allow",
      "Action": ["ssm:TerminateSession", "ssm:ResumeSession"],
      "Resource": "arn:aws:ssm:*:*:session/${aws:userid}-*"
    }
  ]
}
```

> **Exam trap.** "No inbound ports, no SSH keys, every command logged" is Session Manager, not EC2 Instance Connect: Instance Connect still uses SSH on port 22 and only makes the key short-lived. An EC2 Instance Connect session is not ended when the IAM credentials expire.

<!-- section: pipeline-security | objectives: 3.2.6 -->
## Security tools in the pipeline

**Service status the guide's examples hide**: **Amazon CodeGuru Security was discontinued on November 20, 2025**. **Amazon Q Developer** closed new sign-ups on May 15, 2026, its IDE plugins reach end of support on April 30, 2027, and AWS names **Kiro** as the successor for IDE use. For a new pipeline, the AWS-native scanners are in **Amazon Inspector**.

| Stage | Control |
| --- | --- |
| Source repository | **Inspector code security**: SAST on first-party code, scanning of third-party dependencies, IaC scanning; integrations with GitHub, GitHub Enterprise Server and GitLab Self-Managed (private networks through VPC configurations or AWS CodeConnections); scan configurations set when repositories are scanned; automatic pull requests to fix SAST findings above a severity threshold |
| Build | **Inspector SBOM Generator** creates a CycloneDX SBOM of the image, directory or archive, and the **Inspector Scan API** returns its vulnerabilities; plugins for Jenkins, TeamCity and GitHub Actions, plus CodePipeline, CodeCatalyst and GitLab integrations; fail the build above a severity threshold |
| Registry | ECR enhanced scanning on push, block deployment of images with critical findings |
| IaC | Policy-as-code checks before deployment (CloudFormation Guard, CloudFormation Hooks) |
| Deploy and run | Inspector continuous scanning of EC2, ECR and Lambda, GuardDuty Runtime Monitoring |

Secure the pipeline itself: build roles with least privilege, federation with OIDC for external CI systems instead of stored access keys, secrets from Secrets Manager at build time, encrypted artifact buckets, manual approval before production.

```bash
./inspector-sbomgen container --image 111122223333.dkr.ecr.eu-west-1.amazonaws.com/orders:1.8.2 -o sbom.json
./inspector-sbomgen container --image 111122223333.dkr.ecr.eu-west-1.amazonaws.com/orders:1.8.2 \
  --scan-sbom --scan-sbom-output-format cyclonedx --aws-region eu-west-1 --outfile findings.json
```

> **Exam trap.** If an option still names CodeGuru Security or Amazon Q Developer for a new customer, the service is no longer available to them. Choose Inspector code security for repositories, the SBOM Generator with the Scan API in builds, and ECR enhanced scanning for images.

<!-- section: genai-guardrails | objectives: 3.2.7 -->
## Guardrails for generative AI applications

The **OWASP Top 10 for LLM Applications (2025)** and AWS controls:

| Risk | AWS controls |
| --- | --- |
| LLM01 Prompt Injection | Bedrock Guardrails content filter **Prompt Attack**, input tagging of user content, least-privilege tools |
| LLM02 Sensitive Information Disclosure | **Sensitive information filters** (block or mask PII, custom regex), Macie on training and retrieval data, KMS |
| LLM03 Supply Chain | Approved models only, Inspector on containers and dependencies, SBOMs |
| LLM04 Data and Model Poisoning | Controlled write access and versioning on training and knowledge base data, provenance checks |
| LLM05 Improper Output Handling | Treat model output as untrusted input: validate and encode before use, output guardrails |
| LLM06 Excessive Agency | Least-privilege roles for agent actions and Lambda tools, user confirmation for sensitive actions |
| LLM07 System Prompt Leakage | No secrets or authorization logic in prompts; secrets in Secrets Manager |
| LLM08 Vector and Embedding Weaknesses | Access control and per-tenant metadata filtering on knowledge bases, encryption |
| LLM09 Misinformation | **Contextual grounding checks**, **Automated Reasoning checks** |
| LLM10 Unbounded Consumption | API Gateway throttling and usage plans, WAF rate-based rules, token limits, quotas |

**Amazon Bedrock Guardrails** policies: **content filters** (Hate, Insults, Sexual, Violence, Misconduct, Prompt Attack; text and images), **denied topics**, **word filters** (including profanity), **sensitive information filters**, **contextual grounding checks** (grounding and relevance for RAG answers) and **Automated Reasoning checks**. Classic and Standard safeguard tiers. Apply a guardrail in inference calls, or evaluate any text, including for models outside Bedrock, with the **`ApplyGuardrail`** API.

**Enforcing guardrails**:

- IAM condition key **`bedrock:GuardrailIdentifier`** on `InvokeModel`, `InvokeModelWithResponseStream`, `Converse` and `ConverseStream` (deny when the request does not carry the required guardrail and version).
- **Account-level enforcement** (`PutEnforcedGuardrailConfiguration`, per Region) and **organization-level enforcement** with an Amazon Bedrock policy (`BEDROCK_POLICY`, a declarative policy type) that applies a guardrail from the management account to every invocation of the targeted accounts. Enforced guardrails do not support Automated Reasoning checks.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RequireSupportGuardrailV3",
      "Effect": "Deny",
      "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "bedrock:GuardrailIdentifier": "arn:aws:bedrock:eu-west-1:111122223333:guardrail/supportbot01:3"
        }
      }
    }
  ]
}
```

Also: model invocation logging to CloudWatch Logs or S3, interface VPC endpoints for Bedrock, CloudTrail for API activity, and GuardDuty AI Protection signals from Bedrock and SageMaker AI data events.

> **Exam trap.** The IAM guardrail condition does not fit multi-call APIs such as `RetrieveAndGenerate` or `InvokeAgent`, and input tags let a caller exclude its prompt from evaluation (the response is still evaluated). To guarantee a guardrail on every invocation across accounts, use guardrail enforcement through an Amazon Bedrock policy.

<!-- section: key-points -->
## Key points

- Images: Image Builder recipes with STIG and test components, Inspector scanning, distribution with KMS; IMDSv2 in the AMI; Allowed AMIs (audit then enabled, declarative policies) to enforce approved images.
- Roles: instance profile for EC2, task role versus task execution role for ECS, execution role versus resource-based policy for Lambda, `iam:PassRole` with `iam:PassedToService`, IMDSv2 and credential-location condition keys.
- Inspector finds known vulnerabilities (EC2 agent-based, agentless or hybrid; ECR enhanced; Lambda standard and code); GuardDuty Runtime Monitoring and Malware Protection find active threats.
- Patch Manager patch policies, custom baselines, `AWS-RunPatchBaseline` Scan or Install; Inspector validates continuously; rebuild immutable images instead of patching in place.
- Administration: Session Manager without inbound ports, EC2 Instance Connect with 60-second keys, Instance Connect Endpoint for private subnets.
- Pipelines: CodeGuru Security discontinued, Q Developer closed to new sign-ups (Kiro); use Inspector code security, SBOM Generator and Scan API, ECR scanning.
- GenAI: map OWASP LLM risks to Bedrock Guardrails filters, least-privilege agents and rate limits; enforce with `bedrock:GuardrailIdentifier` or organization and account guardrail enforcement.
