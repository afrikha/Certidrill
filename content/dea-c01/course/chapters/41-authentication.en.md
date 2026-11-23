Authentication questions ask how a pipeline component proves who it is and reaches what it needs: a Glue job that cannot connect to an RDS database in a private subnet, a Lambda function that needs a database password, an API that writes to Kinesis, an administrator who deploys a stack without broad personal permissions. The answer combines security groups, IAM roles, VPC endpoints and their policies, Secrets Manager rotation and, for governed analytics, SageMaker Unified Studio domains and projects. This chapter also contrasts managed and unmanaged services.

<!-- section: security-groups | objectives: 4.1.1 -->
## Updating VPC security groups

A **security group** is a stateful virtual firewall on an elastic network interface: allow rules only, return traffic allowed automatically, outbound open by default. A rule's source can be a CIDR, a prefix list or **another security group**, which is the usual way to say "only the ETL layer may reach the database". Network ACLs, by contrast, are stateless, apply to the subnet and support deny rules.

| Data component | Rule to add |
| --- | --- |
| Glue job or crawler with a connection (JDBC, VPC resource) | The security group of the connection needs a **self-referencing inbound rule for all TCP ports**; outbound all, or a self-referencing outbound rule plus HTTPS 443 to the S3 gateway endpoint prefix list |
| Glue reaching the database | Inbound on the database port (for example 5432 PostgreSQL, 3306 MySQL, 5439 Redshift) from the Glue security group |
| Lambda function in a VPC | Its security group as the source in the database's inbound rule |
| Amazon MSK clients | Inbound from the client security group on the broker port: 9092 plaintext, 9094 TLS, 9096 SASL/SCRAM, 9098 IAM access control |
| Amazon EMR | EMR managed security groups for primary and core/task nodes (plus a service access group in private subnets); add your own groups for extra access |

Glue places elastic network interfaces in the connection's subnet, which needs a route to the data and, for S3, a gateway endpoint or a NAT gateway.

```bash
aws ec2 authorize-security-group-ingress --group-id sg-0glue1111 \
  --protocol tcp --port 0-65535 --source-group sg-0glue1111

aws ec2 authorize-security-group-ingress --group-id sg-0db2222 \
  --protocol tcp --port 5432 --source-group sg-0glue1111
```

> **Exam trap.** A Glue connection that fails with a message about the security group lacks the self-referencing rule, not a rule from 0.0.0.0/0. Opening the database to the internet is never the answer.

<!-- section: iam-identities | objectives: 4.1.2 -->
## IAM groups, roles, endpoints and services

| Identity | Use in data engineering |
| --- | --- |
| IAM user | Long-term credentials; avoid for people (prefer IAM Identity Center) and for code (prefer roles) |
| IAM group | A set of users that share policies; not a principal, cannot be named in a resource policy, cannot contain groups |
| IAM role | Temporary credentials through AWS STS; a **trust policy** says who can assume it, permission policies say what it can do |
| Service role | A role a service assumes on your behalf (Glue job role, EMR service role, Firehose delivery role); you manage its policies |
| Service-linked role | Predefined by the service, linked to it, with permissions you cannot edit (for example the Lake Formation role used to register S3 locations) |

A role is the identity of every pipeline component. Its trust policy names the service principal:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "glue.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

```bash
aws iam create-role --role-name GlueOrdersJob \
  --assume-role-policy-document file://glue-trust.json
aws iam attach-role-policy --role-name GlueOrdersJob \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole
aws iam put-role-policy --role-name GlueOrdersJob \
  --policy-name orders-data --policy-document file://orders-s3.json
```

**VPC endpoints** keep traffic to AWS services on the AWS network, without internet gateway or NAT:

| Endpoint type | Services | Notes |
| --- | --- | --- |
| Gateway endpoint | Amazon S3, DynamoDB | Route table entry; no hourly charge; same Region only |
| Interface endpoint (AWS PrivateLink) | Glue, Athena, Kinesis Data Streams, Data Firehose, Secrets Manager, KMS, STS, CloudWatch Logs, Redshift and many more | Elastic network interfaces with private IPs in your subnets, a security group, private DNS; hourly and per-GB charges |

> **Exam tip.** "A Lambda function in a private subnet without internet access must read a secret" is a Secrets Manager interface endpoint (and its security group allowing HTTPS from the function). "Glue jobs in a VPC write to S3 without a NAT gateway" is an S3 gateway endpoint.

<!-- section: credential-rotation | objectives: 4.1.3 -->
## Creating and rotating credentials

**AWS Secrets Manager** stores credentials encrypted with KMS and rotates them:

| Rotation type | When |
| --- | --- |
| Managed rotation | The service that owns the secret rotates it: Amazon RDS and Aurora managed master user password, Amazon Redshift managed admin password |
| Rotation by Lambda function | Other secrets: database users, API keys; AWS provides templates for supported databases |
| Single user strategy | One user, password changed in place; clients holding the old password can fail briefly |
| Alternating users strategy | Two users take turns, so one valid credential always exists; needs a superuser secret to create the clone |

Schedules use `rate()` or `cron()` expressions, from every four hours to 999 days, within a rotation window of at least one hour. During rotation the new version is labeled `AWSPENDING`, then becomes `AWSCURRENT`; the old one becomes `AWSPREVIOUS`.

```bash
aws secretsmanager create-secret --name prod/warehouse/etl_user \
  --kms-key-id alias/data-secrets \
  --secret-string file://etl-user.json

aws secretsmanager rotate-secret --secret-id prod/warehouse/etl_user \
  --rotation-lambda-arn arn:aws:lambda:eu-west-1:111122223333:function:rotate-redshift \
  --rotation-rules '{"ScheduleExpression": "rate(30 days)"}'

aws redshift create-cluster --cluster-identifier analytics \
  --node-type ra3.xlplus --number-of-nodes 2 \
  --master-username admin --manage-master-password
```

With `--manage-master-password`, Redshift generates the admin password, stores it in Secrets Manager and rotates it every 30 days by default; you cannot also pass a master user password. If the cluster is paused when rotation runs, rotation fails and stops until you call `RotateSecret`.

Service-specific rules: Amazon MSK SASL/SCRAM secrets must be named with the prefix `AmazonMSK_` and encrypted with a customer managed KMS key (not the default Secrets Manager key). Glue connections can reference a secret instead of storing a user name and password.

> **Exam trap.** "Rotate the database password automatically with the least operational overhead" is Secrets Manager rotation (managed when the service offers it), not a scheduled Lambda function that updates a Parameter Store value. Better still, avoid passwords where the service supports IAM authentication.

<!-- section: roles-for-access | objectives: 4.1.4 -->
## Setting up IAM roles for access

| Caller | Role setup |
| --- | --- |
| AWS Lambda | **Execution role** trusted by `lambda.amazonaws.com`; read from Kinesis or SQS through an event source mapping needs the read actions in this role; `AWSLambdaVPCAccessExecutionRole` for VPC access |
| Amazon API Gateway | **IAM authorization** (`AWS_IAM`) requires callers to sign requests with SigV4 and hold `execute-api:Invoke`; for an AWS service integration (for example `PutRecord` to Kinesis Data Streams) API Gateway assumes a **credentials role** trusted by `apigateway.amazonaws.com` |
| AWS CLI | A profile with `role_arn` and `source_profile` assumes the role automatically; `aws configure sso` for IAM Identity Center users; `aws sts assume-role` returns temporary keys |
| AWS CloudFormation | A **service role** passed with `--role-arn`: the stack uses it for every operation, so the user needs only CloudFormation permissions and `iam:PassRole` on that role |
| Amazon Redshift | IAM roles associated with the cluster or namespace, named in `COPY`, `UNLOAD` and external schemas (`IAM_ROLE default` uses the default role) |
| Amazon EMR | Service role for EMR, EC2 instance profile for cluster nodes, runtime roles for per-job access |

```text
# ~/.aws/config
[profile pipeline-deploy]
role_arn = arn:aws:iam::111122223333:role/PipelineDeploy
source_profile = default
region = eu-west-1
```

```bash
aws cloudformation deploy --template-file pipeline.yaml \
  --stack-name orders-pipeline \
  --role-arn arn:aws:iam::111122223333:role/CfnPipelineService \
  --capabilities CAPABILITY_NAMED_IAM
```

`iam:PassRole` is the permission that lets a user hand a role to a service (a Glue job, a Lambda function, a CloudFormation stack). Restrict it to the specific role ARNs and, with the `iam:PassedToService` condition, to the intended service.

> **Exam trap.** An API Gateway method that writes directly to Kinesis fails with an authorization error when the credentials role is missing or lacks `kinesis:PutRecord`; the caller's own permissions do not matter for the integration call.

<!-- section: policies-endpoints | objectives: 4.1.5 -->
## IAM policies on roles, endpoints and services

**Endpoint policies** are resource policies on a VPC endpoint: they limit what can be done through it, in addition to the identity policy. A gateway endpoint policy that allows only the company's buckets blocks exfiltration to other buckets:

```json
{
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::example-datalake", "arn:aws:s3:::example-datalake/*"]
    }
  ]
}
```

On the bucket side, `aws:SourceVpce` (a specific endpoint) or `aws:SourceVpc` (a VPC) in a `Deny` statement allows only private access.

**S3 Access Points** give each consumer (a team, an application, a VPC) its own host name and policy on a shared bucket. Both the access point policy and the bucket policy must allow a request; the recommended setup delegates the bucket to the account's access points:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "AWS": "*" },
      "Action": "*",
      "Resource": ["arn:aws:s3:::example-datalake", "arn:aws:s3:::example-datalake/*"],
      "Condition": { "StringEquals": { "s3:DataAccessPointAccount": "111122223333" } }
    }
  ]
}
```

| Requirement | Choice |
| --- | --- |
| Many teams, different prefixes of one bucket, bucket policy near its size limit | One access point per team, each with its own policy |
| Data reachable only from a VPC | Access point with network origin `VPC`; SCP denying `s3:CreateAccessPoint` unless `s3:AccessPointNetworkOrigin` is `VPC` |
| Limit an interface endpoint to one secret or one stream | Endpoint policy on the PrivateLink endpoint |

<!-- section: managed-unmanaged | objectives: 4.1.6 -->
## Managed and unmanaged services

In a **managed** (or serverless) service AWS runs the infrastructure, operating system and engine; you configure the service and access. In an **unmanaged** service on EC2 you install, patch, scale and secure everything above the hypervisor.

| Concern | Unmanaged (on EC2) | Managed |
| --- | --- | --- |
| Examples | Kafka, Spark, Airflow or PostgreSQL on EC2 | Amazon MSK, EMR Serverless or AWS Glue, Amazon MWAA, Amazon RDS |
| Patching, OS hardening | You | AWS (maintenance windows you choose for some services) |
| Authentication | OS users, SSH keys, engine users, Kerberos or LDAP you operate | IAM (MSK IAM access control, Glue and EMR Serverless job roles, RDS IAM authentication), plus engine users where needed |
| Network | Security groups, plus everything on the instance | Security groups and endpoints of the service |
| Credentials | Stored and rotated by your scripts | Secrets Manager integrations, managed rotation |
| Scaling and availability | You design them | Built in or configured |

Between the two sit services such as EMR on EC2 or MSK provisioned: AWS manages the cluster software and replaces failed nodes, but you choose instance sizes and can access the nodes.

> **Exam tip.** "Least operational overhead" with security requirements usually means the managed service with IAM authentication, because it removes credentials to store, OS patching and key distribution.

<!-- section: unified-studio | objectives: 4.1.7 -->
## Domains, domain units and projects in SageMaker Unified Studio

| Concept | Role |
| --- | --- |
| Domain | Top-level organizing entity that connects assets, users and their projects; one for the enterprise or one per business unit |
| Domain unit | Subdivision of the domain by business unit or team; organizes assets and delegates authority |
| Domain unit owner | Receives delegated authority; assigns authorization policies to users, groups and projects |
| Project | Container for notebooks, queries, dashboards and workflows; a business context, a collaboration boundary and a **permission boundary** |
| Project profile | Template made of blueprints that sets which tools and resources a project gets (for example SQL analytics, all capabilities) |
| Blueprint | Configuration that creates resources such as tooling, a lakehouse database, Redshift Serverless, EMR Serverless or workflows |
| Project member | User or group with a designation: **Owner** (manages members, modifies or deletes the project) or **Contributor**; custom designations possible |
| Associated account | Another AWS account linked to the domain so projects can use its data and resources |

Authorization policies on a domain unit:

| Assigned to | Policies |
| --- | --- |
| Users and groups | Domain unit creation, project creation, project membership, domain unit ownership assumption, project ownership assumption |
| Projects | Glossary creation, metadata forms creation, custom asset type creation |

Users sign in to the portal with IAM Identity Center (corporate identity provider), SAML, or IAM credentials. Work stays inside the project until it is published to the business data catalog, where other projects subscribe to it.

> **Exam trap.** A domain unit organizes and delegates; it does not hold data or compute. "Let the finance team's lead decide who can create projects for finance" is a domain unit for finance, its owner, and a project creation policy on that unit.

<!-- section: key-points -->
## Key points

- Security groups are stateful and allow-only; reference security groups as sources; Glue connections need a self-referencing all-TCP inbound rule.
- Roles, not users, for every pipeline component; groups are not principals; service-linked roles cannot be edited.
- Gateway endpoints for S3 and DynamoDB; interface endpoints (PrivateLink) for Glue, Kinesis, Secrets Manager, KMS, STS and more.
- Secrets Manager rotation: managed for RDS, Aurora and Redshift admin passwords, Lambda otherwise; every four hours at most; alternating users avoids downtime. MSK SCRAM secrets: `AmazonMSK_` prefix and a customer managed key.
- Lambda execution role, API Gateway credentials role, CLI profiles with `role_arn`, CloudFormation service role with `iam:PassRole`.
- Endpoint policies and `aws:SourceVpce` restrict private paths; access points delegate per-consumer policies with `s3:DataAccessPointAccount`.
- Managed services shift patching and credential handling to AWS and favor IAM authentication.
- SageMaker Unified Studio: domain, domain units with owners and policies, projects built from project profiles and blueprints, Owner and Contributor designations.
