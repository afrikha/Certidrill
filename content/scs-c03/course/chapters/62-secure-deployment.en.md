Guardrails at the organization level decide what is allowed; this chapter is about making the right thing the easy, repeatable thing. The exam describes a security team that must push the same baseline into every account and Region, catch insecure templates before they reach production, find and govern resources by owner or data classification, apply firewall rules everywhere from one place, and let teams consume approved resources without receiving broad permissions. The tools are CloudFormation StackSets and policy-as-code, tags, AWS Firewall Manager, AWS Service Catalog and AWS RAM.

<!-- section: stacksets | objectives: 6.2.1 -->
## Deploying consistently across accounts with StackSets

A **stack set** deploys one CloudFormation template as stack instances into many accounts and Regions. The permission model is the first decision.

| | Self-managed permissions | Service-managed permissions |
| --- | --- | --- |
| Trust setup | You create `AWSCloudFormationStackSetAdministrationRole` in the administrator account and `AWSCloudFormationStackSetExecutionRole` in every target account | Trusted access with Organizations; StackSets creates the roles it needs |
| Targets | Account IDs, inside or outside an organization | OUs or the whole organization (account filters are possible) |
| New accounts | Must be added by hand | Automatic deployment when an account joins a target OU, with removal or retention (`RetainStacksOnAccountRemoval`) when it leaves |
| Who can administer | The account holding the administration role | The management account, or up to five delegated administrators, who use `--call-as DELEGATED_ADMIN` and can deploy to any account of the organization |
| Management account | Can be targeted like any account | Receives no stack instances, even when it is inside a target OU |

```bash
aws cloudformation create-stack-set --stack-set-name security-baseline --template-url https://example-templates.s3.eu-west-1.amazonaws.com/baseline.yaml --permission-model SERVICE_MANAGED --auto-deployment Enabled=true,RetainStacksOnAccountRemoval=false --capabilities CAPABILITY_NAMED_IAM --call-as DELEGATED_ADMIN
aws cloudformation create-stack-instances --stack-set-name security-baseline --deployment-targets OrganizationalUnitIds=ou-a1b2-workload1 --regions eu-west-1 eu-central-1 --operation-preferences FailureToleranceCount=0,MaxConcurrentPercentage=25,RegionConcurrencyType=SEQUENTIAL --call-as DELEGATED_ADMIN
```

Operation preferences control blast radius: maximum concurrent accounts, failure tolerance (stop the rollout after N failures), and Region order or parallelism; managed execution lets non-conflicting operations run concurrently. Drift detection on the stack set shows accounts where someone changed a baseline resource by hand.

**Security inside the templates.** Deploy with a CloudFormation service role that has only the permissions the template needs, so that users who launch stacks don't need those permissions themselves. Protect critical resources with stack policies (deny `Update:Replace` or `Update:Delete` on a log bucket), termination protection, and `DeletionPolicy: Retain` on KMS keys and audit buckets. Never put secrets in parameters or templates: use dynamic references to Secrets Manager or Parameter Store `SecureString`, or let the service manage the secret (`ManageMasterUserPassword` on RDS).

> **Exam trap.** A stack set with self-managed permissions doesn't follow the organization: accounts created next month get nothing. "Every current and future account in the Workloads OU" is a service-managed stack set with automatic deployment, or a Control Tower or CfCT customization.

<!-- section: iac-validation | objectives: 6.2.1 -->
## Validating infrastructure as code before and during deployment

Validation happens at three moments, and each tool covers one of them.

| Tool | What it checks | Where it runs | Can it be bypassed? |
| --- | --- | --- | --- |
| cfn-lint | Template syntax, resource types and property values against the CloudFormation schemas, best-practice rules, custom rules | Developer machine, pull request checks | Yes, it's advisory |
| AWS CloudFormation Guard | Policy-as-code rules in a declarative DSL against any JSON or YAML: templates, change sets, JSON Terraform configurations, Kubernetes manifests, Config configuration items | CI pipeline, or as a Guard hook | In a pipeline, yes: someone deploying directly skips it |
| CloudFormation Hooks | Resources, stacks and change sets before create, update or delete, and Cloud Control API operations | Inside CloudFormation, server side | No for CloudFormation and Cloud Control API; it doesn't see other deployment tools |
| AWS Config rules | Deployed resources, whatever created them | After deployment, continuously | No, but it detects rather than prevents |

Hooks can be written in Guard, in a Lambda function, or as custom hooks in the CloudFormation registry, and Control Tower proactive controls are managed hooks from the Control Catalog. A hook either fails the operation or emits a warning and lets it continue.

```text
let buckets = Resources.*[ Type == 'AWS::S3::Bucket' ]

rule s3_buckets_use_kms when %buckets !empty {
    %buckets.Properties.BucketEncryption.ServerSideEncryptionConfiguration[*].ServerSideEncryptionByDefault.SSEAlgorithm == 'aws:kms'
    %buckets.Properties.PublicAccessBlockConfiguration.BlockPublicPolicy == true
}
```

```bash
cfn-lint templates/storage.yaml
cfn-guard validate --data templates/storage.yaml --rules rules/s3.guard
```

A secure pipeline runs in order: lint, policy-as-code tests on the template and the change set, a manual approval for high-risk changes, deployment by a role that only the pipeline can assume, and detection with Config afterwards.

**Third-party IaC tools.** Terraform and similar tools are in scope as long as they are secured: keep state in an S3 backend with SSE-KMS, versioning and Block Public Access, because state files contain resource attributes and often secrets; use S3 native state locking (`use_lockfile`, Terraform 1.11 and later) rather than the deprecated DynamoDB locking; have the pipeline assume a narrowly scoped role in each target account; and scan plans in the pipeline (Guard rules on the JSON plan, Amazon Inspector code security scanning of infrastructure as code in repositories). Remember that CloudFormation Hooks don't see Terraform deployments that call AWS APIs directly, so preventive coverage there comes from SCPs, RCPs and declarative policies.

> **Exam trap.** "Prevent any noncompliant S3 bucket from being created through CloudFormation, even by developers who deploy from their laptops" is a CloudFormation hook (or a Control Tower proactive control), not Guard in the CI pipeline, which only protects deployments that go through the pipeline.

<!-- section: tagging-strategy | objectives: 6.2.2 -->
## Organizing resources with tags

Tags group resources by department, cost center, environment, owner, application or data classification, and many security mechanisms select resources by tag: Firewall Manager scope, AWS Backup resource assignment, Data Lifecycle Manager targets, Recycle Bin rules, Systems Manager targets and attribute-based access control (ABAC). Never put sensitive data in tags: they appear in billing data and many APIs.

| Goal | Mechanism |
| --- | --- |
| Standardize key spelling, case and allowed values | Tag policies in Organizations; `enforced_for` blocks noncompliant tagging operations on listed resource types |
| Require a tag at creation | SCP denying the create action when `aws:RequestTag/CostCenter` is null, with the service's tag-on-create support |
| Stop users from changing security-relevant tags | SCP denying tag actions where `aws:TagKeys` contains the protected key, except for an automation role |
| Grant access by matching tags | ABAC: `aws:PrincipalTag` compared with `aws:ResourceTag` in IAM policies |
| Find and report untagged or noncompliant resources | AWS Config `required-tags` rule, Tag Editor, tag policy compliance reports (organization-wide from the management account) |
| Act on a group of resources | AWS Resource Groups based on a tag query or a CloudFormation stack |
| Allocate costs | Cost allocation tags activated in the management (payer) account |

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RequireCostCenterOnLaunch",
      "Effect": "Deny",
      "Action": ["ec2:RunInstances", "ec2:CreateVolume"],
      "Resource": ["arn:aws:ec2:*:*:instance/*", "arn:aws:ec2:*:*:volume/*"],
      "Condition": { "Null": { "aws:RequestTag/CostCenter": "true" } }
    },
    {
      "Sid": "ProtectClassificationTag",
      "Effect": "Deny",
      "Action": ["ec2:CreateTags", "ec2:DeleteTags"],
      "Resource": "*",
      "Condition": {
        "ForAnyValue:StringEquals": { "aws:TagKeys": ["DataClassification"] },
        "ArnNotLike": { "aws:PrincipalArn": "arn:aws:iam::*:role/TaggingAutomation" }
      }
    }
  ]
}
```

ABAC is only as strong as tag governance: if users can change a resource's `Project` tag or their own principal tag, they can grant themselves access. Protect the tags that drive authorization with SCPs, and set principal tags from the identity provider through session tags.

> **Exam trap.** Tag policies don't make a tag mandatory: resources without the tag, and tag keys the policy doesn't define, aren't evaluated. To require a tag at creation, use an SCP with `aws:RequestTag`; to report missing tags on existing resources, use the Config `required-tags` rule.

<!-- section: central-enforcement | objectives: 6.2.3 -->
## Enforcing policies from a central source with Firewall Manager

**AWS Firewall Manager** applies network and application protections across the organization and keeps them applied to new accounts and resources. Prerequisites, in order: Organizations with all features, a Firewall Manager default administrator account designated by the management account, AWS Config enabled in every account and Region in scope, AWS RAM sharing for Network Firewall and DNS Firewall policies, and an AWS Marketplace subscription for third-party firewalls.

| Policy type | What it enforces |
| --- | --- |
| AWS WAF | Web ACLs with mandatory first and last rule groups (for example AWS managed rules) on ALBs, API Gateway stages, CloudFront and other supported resources; account teams can add rules in between |
| Shield Advanced | Protection of ALBs, Classic Load Balancers, Elastic IPs and CloudFront distributions, with optional automatic application layer DDoS mitigation |
| Security group, common | Replicates a primary security group to instances and ENIs in scope |
| Security group, content audit | Flags or removes rules that allow forbidden traffic (for example 0.0.0.0/0 on SSH) |
| Security group, usage audit | Finds unused or redundant security groups |
| Network ACL | Enforces first and last NACL rules on subnets |
| AWS Network Firewall | Creates firewall endpoints and attaches central rule groups and policies in VPCs in scope |
| Route 53 Resolver DNS Firewall | Associates domain-list rule groups with VPCs |
| Third-party firewalls | Palo Alto Networks Cloud NGFW, Fortinet FortiGate CNF from AWS Marketplace |

Each policy targets accounts and OUs (include or exclude), resource types and optionally resource tags, in one Region (policies are Regional), with at most 2,500 accounts per policy. **Auto remediation** applies the protection to noncompliant resources; without it, the policy only reports compliance. Beyond the default administrator, the management account can create additional administrators with **restricted scope**: chosen accounts or OUs, Regions and policy types, so that the network team manages Network Firewall while the application security team manages WAF.

```bash
aws fms associate-admin-account --admin-account 222233334444
aws fms list-compliance-status --policy-id 1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d
```

Other central sources answer similar stems: organization conformance packs and Config rules (compliance checks), Security Hub CSPM central configuration (standards per OU), Organizations backup and tag policies, Systems Manager Quick Setup (patching, agents), and Control Tower controls.

> **Exam trap.** Firewall Manager depends on AWS Config: if recording is off in an account or Region, Firewall Manager can't see the resources there and reports nothing. A stem where new accounts are "not protected by the WAF policy" often hides a missing Config recorder, an account outside the policy scope, or a policy created without auto remediation.

<!-- section: resource-sharing | objectives: 6.2.4 -->
## Sharing resources securely across accounts

| Need | Mechanism |
| --- | --- |
| Use the same physical resource from several accounts (subnets, transit gateway, Private CA, Network Firewall policy, prefix lists, Resolver rules, logically air-gapped backup vault) | AWS RAM resource share |
| Give teams self-service access to approved, preconfigured stacks without broad permissions | AWS Service Catalog portfolio shared with their accounts |
| Install an identical copy of a resource in every account | StackSets |
| Grant another account access to one specific bucket, key, queue or secret | Resource-based policy |

**AWS RAM.** Enable sharing with Organizations from the RAM console or `aws ram enable-sharing-with-aws-organization`, which creates the RAM service-linked role; enabling trusted access only from the Organizations side doesn't. Inside the organization there are no invitations; outside it, invitations expire after 7 days or 12 hours depending on the resource type. The console defaults to "Allow sharing with anyone": choose sharing only within the organization, and enforce it with an SCP. Managed permissions (AWS managed or customer managed) cap what consumers can do; consumers still need IAM policies, which can't exceed them, and they can't re-share. Shares are Regional.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyRamSharingOutsideOrg",
      "Effect": "Deny",
      "Action": ["ram:CreateResourceShare", "ram:UpdateResourceShare"],
      "Resource": "*",
      "Condition": { "Bool": { "ram:RequestedAllowsExternalPrincipals": "true" } }
    }
  ]
}
```

**AWS Service Catalog.** Administrators publish products (CloudFormation or Terraform templates) in portfolios and apply constraints:

| Constraint | Effect |
| --- | --- |
| Launch | An IAM role that Service Catalog assumes to provision the product, so end users need only Service Catalog permissions, not permissions on the underlying services |
| Template | Restricts parameter values (allowed instance types, allowed Regions) |
| Notification | Sends stack events to an SNS topic |
| Tag update | Allows or prevents end users from changing tags on provisioned products |
| Stack set | Deploys the product across accounts and Regions |

TagOptions add administrator-defined tags to every provisioned product. Portfolios are shared account to account or with an organization or OU; the recipient imports a reference that stays in sync, can't change its products or constraints, and adds its own users, groups and roles. A launch constraint propagates with the share; to override it, the recipient adds the product to a local portfolio with its own launch constraint. With a role ARN, the account that owns the role provisions the resources; with a local role name, the role of that name in the end user's account is used. Imported portfolios can't be re-shared, and imports must be in the same Region.

> **Exam trap.** When a shared product must create resources in each consumer account with a role defined there, specify the launch role by local role name, not by ARN: a role ARN from the hub account makes the hub account provision, and pay for, the resources.

<!-- section: key-points -->
## Key points

- Service-managed stack sets follow OUs with automatic deployment, allow up to five delegated administrators, and never deploy to the management account.
- cfn-lint checks syntax and schema, Guard checks policy in the pipeline, CloudFormation Hooks enforce server side, Config detects after deployment.
- Terraform state belongs in an encrypted, versioned, private S3 bucket with native locking; Hooks don't see Terraform.
- Tag policies standardize tags but don't require them; SCPs with `aws:RequestTag` require them; protect ABAC tags with `aws:TagKeys` denies.
- Firewall Manager needs Organizations, a default administrator, Config everywhere and RAM for Network Firewall and DNS Firewall; policies are Regional; use auto remediation.
- Additional Firewall Manager administrators can be scoped by accounts, Regions and policy types.
- RAM: enable sharing from RAM, restrict external principals with `ram:RequestedAllowsExternalPrincipals`; managed permissions cap consumers.
- Service Catalog launch constraints let users deploy without service permissions; imported portfolios stay in sync and can't be re-shared.
