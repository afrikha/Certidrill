## saac03-1a-region-az-facts (type: multi)

A solutions architect is preparing a design review for a company that will run regulated workloads on AWS. The review must state how AWS Regions and Availability Zones isolate resources and data.

Which statements are correct? (Choose two.)


Choose 2.

- [A] Data stored in a Region is automatically copied to a second Region for durability.

- [B] An Availability Zone name such as eu-west-1a always identifies the same physical zone in every AWS account.

- [C] Each public Region contains at least three physically separate Availability Zones.

- [D] A failure of a service in one Region also stops that service in all other Regions.

- [E] Resources created in one Region do not exist in another Region unless they are explicitly replicated or copied.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1a-role-session-duration (type: single)

Data engineers run long data processing scripts from their laptops by using the AWS CLI. They obtain credentials by assuming an IAM role in an analytics account directly with their federated identity. The scripts fail after one hour because the credentials expire. The scripts take up to 8 hours, and the engineers must not be prompted again during a run.

Which solution will meet these requirements?


- [A] Have the scripts assume a second role from the first role session to get new credentials every hour.

- [B] Request an increase of the AWS STS request quota for the analytics account in the Region.

- [C] Set the role's maximum session duration to 9 hours and request 9-hour sessions when assuming it.

- [D] Create IAM users with access keys for the engineers to use only for the long-running scripts.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-roles-anywhere-onprem (type: single)

A manufacturing company runs batch applications on servers in its own data center. The applications upload results to Amazon S3. The company has an internal public key infrastructure (PKI) that already issues an X.509 certificate to every server. The company wants the applications to use short-term AWS credentials and the same IAM roles and policies as its workloads that run on AWS.

Which solution will meet these requirements?


- [A] Use an Amazon Cognito identity pool with developer-authenticated identities for each server.

- [B] Register the company's CA as a trust anchor in IAM Roles Anywhere and create a profile for the role.

- [C] Attach an instance profile that contains the IAM role to each of the on-premises servers.

- [D] Store an IAM user's access keys in AWS Secrets Manager and have the applications read them at startup.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-root-mfa-resilience (type: single)

A bank's root user of its AWS Organizations management account is protected by a virtual MFA app on one administrator's phone. The security team wants phishing-resistant MFA for this root user, and the company must not lose root access if one MFA device is lost or one person is unavailable. No single person may be able to sign in as root alone.

Which solution will meet these requirements?


- [A] Register one hardware TOTP token and store it in a safe with the root password written on paper.

- [B] Register two FIDO security keys held by different custodians, and keep the root password with a separate group.

- [C] Replace the virtual MFA app with SMS text message MFA sent to a shared team phone number.

- [D] Install the same virtual MFA app on the phones of all administrators and share the root password with each of them.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-root-only-task (type: single)

A company's administrators sign in with an IAM role that has the AdministratorAccess policy. They need to complete several tasks in a standalone AWS account that is not part of an organization.

Which task requires the administrators to sign in as the root user?


- [A] Configuring MFA Delete on an Amazon S3 bucket.

- [B] Creating an IAM role for Amazon EC2 instances.

- [C] Enabling a multi-Region AWS CloudTrail trail.

- [D] Attaching a permissions boundary to an IAM user.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-root-usage-alerts (type: multi)

A company's security team must be alerted within minutes whenever the root user of any production account signs in or makes an API call. The alerts must go to the team's email distribution list.

Which solutions will meet these requirements? (Choose two.)


Choose 2.

- [A] Create an IAM Access Analyzer unused access analyzer and review its findings for the root user.

- [B] Generate the IAM credential report every day and email the password_last_used value of the root user.

- [C] Enable Amazon GuardDuty and send its root credential usage findings to an Amazon SNS topic through EventBridge.

- [D] Create an Amazon EventBridge rule that matches root user activity recorded by CloudTrail and sends it to an Amazon SNS topic.

- [E] Turn on the AWS Trusted Advisor check for root MFA and subscribe the team to its weekly email.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1a-root-user-new-account (type: single)

A startup has just created its first AWS account. The founders currently use the root user for all daily administration, including deployments from the AWS CLI. They want to secure the account according to AWS best practices.

Which solution will meet these requirements?


- [A] Share the root user password among the founders through a password manager, and enable MFA on a phone that they all can use.

- [B] Enable MFA on the root user, use an administrative user in IAM Identity Center daily, and keep root for root-only tasks.

- [C] Delete the root user after creating an IAM user with the AdministratorAccess policy for each founder.

- [D] Create access keys for the root user for the CLI deployments, store them in AWS Secrets Manager, and rotate them every 90 days.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-saml-trust-condition (type: single)

A university federates its SAML 2.0 identity provider with a single AWS account by using an IAM SAML identity provider. Staff and students both authenticate through the identity provider, which sends an affiliation attribute in the SAML assertion. Only users whose affiliation is staff must be able to assume the IAM role that administers the research Amazon EC2 instances.

Which solution will meet these requirements?


- [A] Add a condition on the SAML affiliation attribute to the permissions policy of the role.

- [B] Create an IAM user group named staff and add the role to the group.

- [C] Attach a permissions boundary to the role that allows EC2 actions only for staff users.

- [D] Add a condition on the SAML affiliation attribute to the trust policy of the role.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-session-policy-tenant (type: single)

A SaaS company stores the data of each tenant under a separate prefix in one Amazon S3 bucket. A backend service on Amazon ECS handles requests for thousands of tenants. For each request, the service must use credentials that can access only the current tenant's prefix, to limit the impact of a bug. The company adds tenants every day and does not want to create or update any IAM role or policy when a tenant is added.

Which solution will meet these requirements?


- [A] Create an IAM user per tenant and have the service load that user's access keys for each request.

- [B] Create one IAM role per tenant with a policy for its prefix, and have the service assume the tenant's role for each request.

- [C] Attach a permissions boundary for the current tenant's prefix to the ECS task role before each request.

- [D] Have the service assume one shared role for each request and pass an inline session policy limited to the tenant's prefix.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-source-identity (type: single)

Employees of a company sign in through a SAML identity provider and assume roles in several AWS accounts. Some automation then assumes further roles from these sessions. The security team must be able to see, in AWS CloudTrail, which employee is behind every action, including actions taken in chained role sessions. Employees must not be able to choose a value that impersonates someone else.

Which solution will meet these requirements?


- [A] Have the identity provider set a source identity and require sts:SourceIdentity in the trust policies.

- [B] Enable CloudTrail data events for all Amazon S3 buckets and Lambda functions in every account.

- [C] Ask each employee to set their user name as the role session name whenever they assume a role.

- [D] Pass the employee name as a session tag that is not marked as transitive in the role chain.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-srm-ec2-guest-os (type: single)

A company is migrating a custom application from its data center to Amazon EC2 instances that run Linux. The company's auditors ask which security task the company remains responsible for under the AWS shared responsibility model.

Which task is the company's responsibility?


- [A] Controlling physical access to the data centers that host the instances.

- [B] Replacing failed disks and network devices in the AWS infrastructure.

- [C] Patching the hypervisor of the hosts that run the instances.

- [D] Applying security patches to the guest operating system of the instances.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-srm-fargate-shift (type: multi)

A company runs containerized microservices on Amazon ECS with the EC2 launch type. The operations team patches the container instances and manages the Auto Scaling group that provides cluster capacity. The company plans to move the services to AWS Fargate.

Which responsibilities will move from the company to AWS after the migration? (Choose two.)


Choose 2.

- [A] Provisioning and scaling the cluster of virtual machines that run the containers.

- [B] Updating the operating system packages inside the container images.

- [C] Defining least-privilege IAM task roles for each of the services.

- [D] Patching the operating system and kernel of the hosts that run the tasks.

- [E] Configuring the security groups that are attached to the tasks.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1a-srm-lambda-container-image (type: single)

A company packages an AWS Lambda function as a container image that is built from an AWS-provided Lambda base image. AWS has released a new runtime version that contains security fixes. The security team wants the function to run on the patched runtime.

What must the company do?


- [A] Change the runtime update mode of the function to Function update.

- [B] Rebuild the image from the updated base image and deploy the new image to the function.

- [C] Nothing, because Lambda updates the runtime of container image functions in the Auto update mode.

- [D] Open an AWS Support case to have the runtime of the function patched.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-srm-lambda-customer (type: multi)

A company is moving a scheduled job from Amazon EC2 to AWS Lambda. The function uses a Lambda-managed Python runtime with the default runtime update mode, and it is deployed as a .zip file archive that includes third-party libraries. The security team must document the responsibilities that stay with the company after the move.

Which responsibilities remain with the company? (Choose three.)


Choose 3.

- [A] Securing the function code.

- [B] Updating the third-party libraries in the deployment package.

- [C] Applying security patches to the managed Python runtime.

- [D] Patching the operating system of the hosts that run the function.

- [E] Adding servers to handle more concurrent invocations.

- [F] Granting least-privilege permissions to the function's execution role.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1a-srm-patch-windows (type: single)

A company uses Amazon RDS for MySQL and Amazon DynamoDB for an order processing application. A new internal policy states that database patching must not occur during business hours, from 08:00 to 20:00 local time. The company wants to meet this policy with the LEAST operational effort while keeping the databases patched.

Which solution will meet these requirements?


- [A] Set the RDS maintenance window outside business hours, apply mandatory updates early, and take no patching action for DynamoDB.

- [B] Set a preferred maintenance window outside business hours for both the RDS DB instance and each DynamoDB table.

- [C] Turn off automatic minor version upgrades on the RDS DB instance so that AWS never applies any patch without approval.

- [D] Convert the RDS DB instance to a Multi-AZ deployment so that patches cause no downtime at any time of day.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-srm-rds-aws-task (type: single)

A company runs its customer database on Amazon RDS for PostgreSQL. A new security officer wants to know which security task AWS performs for the DB instance so that the company does not duplicate the work.

Which task does AWS perform?


- [A] Applying operating system and database engine patches during the maintenance window.

- [B] Configuring the security group rules that control which clients can connect to the DB instance.

- [C] Choosing whether the DB instance storage is encrypted at rest.

- [D] Creating the database users and granting them privileges on the tables.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-sts-regional-endpoints (type: single)

A company runs applications in the US East (N. Virginia) and Asia Pacific (Hong Kong) Regions. The Hong Kong Region is enabled for the account. The applications call the global AWS STS endpoint, sts.amazonaws.com, to assume roles, and the credentials that they receive are rejected in Hong Kong. The company also wants to reduce STS latency for the Hong Kong application and remove its dependency on a single Region for credential issuance.

Which solution will meet these requirements?


- [A] Disable and re-enable the Hong Kong Region for the account so that STS issues new tokens.

- [B] Replace the roles with IAM users in the Hong Kong Region and give the application long-term access keys.

- [C] Change the session token version of the global endpoint to version 2 tokens, which are valid in all Regions.

- [D] Configure each application to call the AWS STS Regional endpoint of the Region where it runs.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-switch-role-replaces (type: single)

An administrator signs in to the AWS Management Console with an IAM user in account A. The user's policies allow full access to an Amazon S3 bucket in account A. The administrator switches to a read-only role in account B to review resources there. While still using the role, the administrator can no longer upload objects to the bucket in account A.

What is the reason for this behavior?


- [A] While the role is active, its permissions replace the user's permissions instead of adding to them.

- [B] Switching roles automatically adds an explicit deny for account A to the user's policies.

- [C] The bucket policy in account A blocks requests from principals in other accounts by default.

- [D] Console sessions that use a role from another account expire after 15 minutes.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-temporary-credentials (type: multi)

During a security review, a company finds IAM user access keys in configuration files on Amazon EC2 instances and in the laptops of its administrators. The company wants to reduce the risk of leaked long-term credentials and follow AWS security best practices.

Which actions should the company take? (Choose two.)


Choose 2.

- [A] Replace the individual IAM users with one shared IAM user whose keys are rotated every 90 days.

- [B] Have the administrators sign in through IAM Identity Center and use temporary credentials for the AWS CLI.

- [C] Create access keys for the root user and give them to the administrators instead.

- [D] Encrypt the configuration files that contain the access keys with an AWS KMS customer managed key.

- [E] Attach IAM roles to the EC2 instances through instance profiles and remove the access keys from the instances.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1a-unused-access-analyzer (type: single)

A company has hundreds of IAM roles and IAM users across the accounts of its organization. The security team must be notified continuously about roles that are no longer used, access keys and passwords that are unused, and services and actions that are granted but not used, so that it can remove them. The solution must require the LEAST custom development.

Which solution will meet these requirements?


- [A] Export the last accessed information of every role and user each month and review it manually.

- [B] Generate the IAM credential report in each account every week and compare the reports with a script.

- [C] Create an IAM Access Analyzer unused access analyzer for the organization and act on its findings.

- [D] Query the CloudTrail logs of all accounts with Amazon Athena every day to list the principals that made no calls.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-validate-policies-pipeline (type: multi)

A company deploys IAM policies through an infrastructure as code pipeline. Before any deployment, the pipeline must reject policies that contain grammar errors or that break AWS policy best practices. It must also reject any updated policy that grants more access than the currently approved version of the same policy. Problems must be detected before the policies reach AWS accounts.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Deploy an AWS Config managed rule that flags IAM policies that grant administrator access.

- [B] Run IAM Access Analyzer policy validation in the pipeline and fail the build on errors and security warnings.

- [C] Review the AWS Trusted Advisor security checks of each target account after every deployment.

- [D] Enable an IAM Access Analyzer external access analyzer in each account that receives the policies.

- [E] Run an IAM Access Analyzer custom policy check that fails when an updated policy grants new access.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1a-vpc-sharing-ou (type: single)

A media company uses AWS Organizations. A networking account owns a VPC with subnets, route tables and network ACLs that the network team manages. Application teams in an organizational unit (OU) each have their own account and must launch Amazon EC2 instances into these centrally managed subnets. The instances must be owned by and billed to each application account, and the company wants to keep the number of VPCs to a minimum.

Which solution will meet these requirements?


- [A] Share the subnets with the OU by using AWS Resource Access Manager (AWS RAM) with sharing enabled for AWS Organizations.

- [B] Create a VPC in each application account and attach every VPC to a transit gateway in the networking account.

- [C] Create an IAM role in the networking account that application teams assume to launch their instances in the networking VPC.

- [D] Create a VPC in each application account and connect each VPC to the networking VPC with VPC peering.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-ad-connector-no-cloud-directory (type: single)

A company wants employees to use their on-premises Active Directory credentials to sign in to the AWS Management Console through IAM role-based access. A security policy forbids running any directory or domain controller in AWS: every authentication request must be forwarded to the on-premises domain controllers. Existing password policies and RADIUS-based MFA must keep applying. The on-premises network connects to a VPC through AWS Site-to-Site VPN.

Which solution will meet these requirements?


- [A] Launch EC2 instances in the VPC as additional domain controllers of the on-premises domain.

- [B] Deploy AWS Managed Microsoft AD in the VPC and create a two-way forest trust with the on-premises domain.

- [C] Deploy Simple AD in the VPC and synchronize it with the on-premises domain.

- [D] Deploy AD Connector in the VPC and point it to the on-premises domain controllers.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-alb-authenticate-oidc (type: single)

A company runs an internal web application on Amazon EC2 instances behind an Application Load Balancer (ALB) that has an HTTPS listener. The application has no authentication logic. Employees must sign in through the corporate OpenID Connect (OIDC) identity provider before any request reaches the instances. The company does not want to modify the application code.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Add an authenticate-oidc action for the corporate IdP to the HTTPS listener rule, before the forward action.

- [B] Associate a security group with the ALB that allows HTTPS only from the IP addresses of authenticated users.

- [C] Create an Amazon Cognito identity pool, and require browsers to sign each request with temporary AWS credentials.

- [D] Place Amazon API Gateway with a Lambda authorizer that validates OIDC tokens in front of the instances.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-alb-https-redirect (type: multi)

A company runs a public website on Amazon EC2 instances behind an Application Load Balancer that has only an HTTP listener on port 80. The company must encrypt all traffic between users and the load balancer. Users who type an http:// address must be sent automatically to the HTTPS site, and the certificate must renew automatically.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Upload a self-signed certificate to IAM, and attach it to a new HTTPS listener on port 443 of the load balancer.

- [B] Change the default action of the HTTP listener to a redirect to HTTPS on port 443 with status code HTTP_301.

- [C] Install certificates on the EC2 instances, and keep only the HTTP listener on the load balancer.

- [D] Delete the HTTP listener, and remove the port 80 inbound rule from the load balancer's security group.

- [E] Request a public certificate from AWS Certificate Manager (ACM), and attach it to a new HTTPS listener on port 443.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1b-apigw-lambda-authorizer (type: single)

A company exposes a REST API in Amazon API Gateway to partner applications. Partners authenticate against the company's existing proprietary token service, which issues opaque tokens that can be validated only by calling that service. The company must reject requests with invalid tokens at API Gateway before they reach the backend, and it must not move partner identities to another system.

Which solution will meet these requirements?


- [A] Create a Lambda authorizer that validates each token by calling the token service and returns an IAM policy.

- [B] Create an Amazon Cognito user pool authorizer, and import the partner accounts into the user pool.

- [C] Require an API key on every method, and give each partner its own API key in a usage plan.

- [D] Attach a resource policy that allows execute-api:Invoke only for requests that include an Authorization header.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-apigw-resource-policy-ip (type: single)

A company has a Regional REST API in Amazon API Gateway. The API must accept requests only from the company's two office networks, which use known public CIDR ranges. Requests from any other source must be rejected by API Gateway before they reach the backend. The company does not want to change the backend code.

Which solution will meet these requirements?


- [A] Attach a resource policy to the API that denies execute-api:Invoke when aws:SourceIp is not in the two CIDR ranges.

- [B] Associate a security group with the API stage that allows inbound HTTPS only from the two CIDR ranges.

- [C] Add logic to the backend that reads the X-Forwarded-For header and rejects requests from other sources.

- [D] Create a usage plan that requires API keys, and give the keys only to users in the two office networks.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-bucket-policy-sourcevpce (type: single)

A company stores confidential files in an S3 bucket. Applications in one VPC access the bucket through a gateway endpoint with the ID vpce-1a2b3c4d. A new requirement states that the bucket must reject every request that does not arrive through this endpoint, even from IAM principals that have S3 permissions.

Which solution will meet this requirement?


- [A] Add a bucket policy statement that denies all S3 actions when aws:SourceIp is not in the VPC CIDR range.

- [B] Add a bucket policy statement that denies all S3 actions when aws:SourceVpce is not vpce-1a2b3c4d.

- [C] Enable S3 Block Public Access on the bucket and at the account level.

- [D] Attach an endpoint policy to vpce-1a2b3c4d that allows S3 actions only on this bucket.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-cloudfront-oac (type: single)

A company serves static images from an S3 bucket through an Amazon CloudFront distribution. Users can also download the images directly from the bucket's S3 URLs, which bypasses CloudFront. The company wants users to access the images only through CloudFront, and the bucket must stay private.

Which solution will meet these requirements?


- [A] Add a bucket policy that allows s3:GetObject from the published CloudFront IP address ranges.

- [B] Turn on S3 Transfer Acceleration, and remove public access from the bucket.

- [C] Configure origin access control (OAC) on the distribution, and allow only that distribution in the bucket policy.

- [D] Enable S3 static website hosting, and configure the website endpoint as a custom origin of the distribution.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-cloudfront-signed-cookies (type: single)

A training company streams video courses to paying subscribers through Amazon CloudFront. Each course consists of hundreds of HLS segment files. Only signed-in subscribers must be able to view the files, and the company does not want to change the URLs of the existing files.

Which solution will meet these requirements?


- [A] Issue CloudFront signed cookies at sign-in, and require a trusted key group on the distribution.

- [B] Generate S3 presigned URLs for every segment file, and let subscribers download from S3 directly.

- [C] Generate a CloudFront signed URL for every segment file when a subscriber opens a course.

- [D] Add an AWS WAF rule to the distribution that allows requests only from the subscribers' IP addresses.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-cognito-identity-pool-prefix (type: single)

A company is building a mobile app. Users sign in with their Google or Apple accounts. After sign-in, the app must upload photos directly to an S3 bucket, and each user must be able to write only under a prefix that belongs to that user. The app must not contain long-term AWS credentials.

Which solution will meet these requirements?


- [A] Create one IAM user per app user at first sign-in, and send that user's access keys to the app over HTTPS.

- [B] Use IAM Identity Center with Google as the external identity provider, and assign a permission set to the app users.

- [C] Use an Amazon Cognito identity pool for Google and Apple, with a role policy scoped by ${cognito-identity.amazonaws.com:sub}.

- [D] Create an Amazon Cognito user pool federated with Google and Apple, and sign the S3 requests with the user pool ID token.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-cognito-user-pool-customers (type: single)

A company is building a customer-facing web application. Customers must be able to sign up with an email address, sign in with a password or with their Google account, and use multi-factor authentication (MFA). The application must receive standard tokens that identify the signed-in user. The company does not want to build or operate its own user directory.

Which solution will meet these requirements?


- [A] Use IAM Identity Center with Google as the external identity provider and MFA enabled.

- [B] Use an Amazon Cognito user pool with Google as a federated identity provider and MFA enabled.

- [C] Use an Amazon Cognito identity pool that allows unauthenticated (guest) access to the application.

- [D] Create an IAM user for each customer, and require MFA for every customer through an IAM policy.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-control-tower-landing-zone (type: single)

A startup is planning a new multi-account AWS environment. It needs a dedicated account for centralized logs, a dedicated account for security audits, single sign-on for its engineers, and preconfigured governance rules that are applied automatically to every new account. The company wants to set up and operate this environment with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Publish an account template in AWS Service Catalog and create IAM users in each account for the engineers.

- [B] Set up a landing zone with AWS Control Tower and provision every new account with Account Factory.

- [C] Use AWS CloudFormation StackSets to deploy IAM users with the same password policy in each account.

- [D] Create the organization and accounts manually in AWS Organizations, then write SCPs and AWS Config rules for each new account.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-control-tower-proactive (type: single)

A company governs its multi-account environment with AWS Control Tower. All infrastructure is deployed with AWS CloudFormation stacks. The security team wants to stop noncompliant resources, such as S3 buckets that lack required configuration properties, from being provisioned. The check must evaluate the resource configuration before the resources are created, not after.

Which solution will meet these requirements?


- [A] Enable the AWS Foundational Security Best Practices standard in AWS Security Hub CSPM for all accounts.

- [B] Enable Control Tower preventive controls, which are implemented with SCPs, on the OUs.

- [C] Enable Control Tower proactive controls, which are implemented with CloudFormation hooks, on the OUs.

- [D] Enable Control Tower detective controls, which are implemented with AWS Config rules, on the OUs.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-detective-investigation (type: single)

Amazon GuardDuty reports a finding that an EC2 instance is communicating with an unusual IP address. A security analyst must investigate the root cause: which API calls, network flows and IAM roles were related to the instance over the past weeks. The analyst wants linked, visual data and does not want to write custom log queries.

Which AWS service should the analyst use?


- [A] Amazon Detective

- [B] AWS Config

- [C] AWS Security Hub CSPM

- [D] Amazon Inspector

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-ec2-instance-profile (type: single)

A web application on Amazon EC2 instances reads and writes objects in an S3 bucket. A developer stored the access key ID and secret access key of an IAM user in the application's configuration file. The security team wants to remove all long-term credentials from the instances without changing how the AWS SDK is called in the code.

Which solution will meet these requirements?


- [A] Create an IAM role with the required S3 permissions and attach it to the instances through an instance profile.

- [B] Encrypt the configuration file with AWS KMS and rotate the IAM user's access keys every 90 days.

- [C] Move the access keys from the configuration file to environment variables set in the instance user data.

- [D] Store the access keys in a private S3 bucket that only the instances can read at startup.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-ecs-secret-injection (type: multi)

A company runs an application on Amazon ECS with AWS Fargate. The container reads a database password from an environment variable named DB_PASSWORD, which is currently written in plain text in the task definition. The password is now stored in AWS Secrets Manager and is encrypted with a customer managed AWS KMS key. The company must stop exposing the password in the task definition without changing the application code.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Grant the task execution role secretsmanager:GetSecretValue on the secret and kms:Decrypt on the customer managed key.

- [B] Copy the password into the container image at build time, and remove it from the task definition.

- [C] Replace the DB_PASSWORD environment entry with a secrets entry whose valueFrom is the secret's ARN.

- [D] Turn on automatic rotation so that running tasks receive each new password value without being restarted.

- [E] Grant secretsmanager:GetSecretValue and kms:Decrypt to the task IAM role so that ECS can inject the secret.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1b-ecs-task-role (type: single)

A company runs two containerized services as Amazon ECS tasks on the same Amazon EC2 container instances. The orders service must write items to an Amazon DynamoDB table, and the reporting service must read objects from an S3 bucket. Each service must receive only the permissions that it needs.

Which solution will meet these requirements?


- [A] Add the DynamoDB and S3 permissions to the task execution role that both task definitions use.

- [B] Pass the access keys of a different IAM user to each service as environment variables in the task definitions.

- [C] Create a separate task IAM role for each service with only its permissions, and set it in that service's task definition.

- [D] Add both sets of permissions to the IAM role in the container instances' instance profile.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-endpoint-policy-approved-buckets (type: single)

Amazon EC2 instances in private subnets access Amazon S3 only through a gateway endpoint. To reduce the risk of data exfiltration, the security team requires that the instances be able to access only the company's three approved buckets, even if the instances' IAM role allows access to other buckets.

Which solution will meet these requirements?


- [A] Change the instances' security group to allow outbound HTTPS only to the S3 prefix list of the Region.

- [B] Add a bucket policy to each of the three approved buckets that allows access only from the gateway endpoint.

- [C] Attach an endpoint policy to the gateway endpoint that allows S3 actions only on the three approved buckets.

- [D] Add network ACL rules that allow outbound HTTPS only to the IP addresses of the three approved buckets.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-firewall-manager-sg-audit (type: single)

A company has 150 accounts in AWS Organizations. The security team must find and automatically remediate security group rules that allow SSH (TCP 22) from 0.0.0.0/0 in every account, including accounts created in the future. The team wants to manage this from a single administrator account with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Enable Amazon Inspector in every account to report instances that are reachable on port 22.

- [B] Attach an SCP to the root that denies ec2:AuthorizeSecurityGroupIngress in all member accounts.

- [C] Create an AWS Firewall Manager content audit security group policy with automatic remediation for the organization.

- [D] Deploy a Lambda function in each account that scans security groups every hour and deletes the offending rules.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-gateway-endpoint-services (type: multi)

A company wants workloads in private subnets to reach AWS services without a NAT gateway. To avoid hourly endpoint charges, the company plans to use gateway VPC endpoints wherever they are available, and interface endpoints only for the other services.

Which AWS services support gateway VPC endpoints? (Choose two.)


Choose 2.

- [A] Amazon Elastic Container Registry (Amazon ECR)

- [B] Amazon SQS

- [C] Amazon DynamoDB

- [D] Amazon S3

- [E] AWS Secrets Manager

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1b-guardduty-delegated-admin (type: multi)

A company has 120 accounts in AWS Organizations and creates new accounts every week. The security team must enable Amazon GuardDuty in every existing and future account in the Regions that the company uses. The team must review all findings from a dedicated security tooling account. The solution must require the LEAST operational overhead.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Attach an SCP to the organization root that requires GuardDuty to be enabled in every member account.

- [B] In the delegated administrator account, configure GuardDuty to auto-enable all organization member accounts, including new ones.

- [C] From the management account, designate the security tooling account as the GuardDuty delegated administrator in each Region used.

- [D] Deploy a CloudFormation StackSet that enables GuardDuty and an EventBridge rule that forwards findings in every account.

- [E] Enable GuardDuty in the management account and send an invitation from it to each member account.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1b-guardduty-malware-s3 (type: single)

A company lets external partners upload files to an S3 bucket. Every newly uploaded file must be scanned for malware automatically. The scan result must be recorded on each object so that a downstream process can move only clean files to the processing bucket. The company wants a fully managed solution with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Enable Amazon Macie automated sensitive data discovery on the bucket, and act on its findings.

- [B] Activate Amazon Inspector scanning, and include the bucket in the scan scope.

- [C] Invoke a Lambda function on each upload that runs an open source antivirus engine from a container image.

- [D] Enable GuardDuty Malware Protection for S3 on the bucket, with tagging of scanned objects turned on.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-iam-roles-anywhere (type: single)

A company runs a batch application on servers in its on-premises data center. The application uploads files to an S3 bucket by using the access keys of an IAM user. The company already operates a private certificate authority (CA) that issues X.509 certificates to its servers. The company wants to remove the long-term access keys and use temporary credentials, with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Create an Amazon Cognito identity pool and register each server as an unauthenticated identity.

- [B] Connect the data center with AWS Site-to-Site VPN, and attach an IAM instance profile to each on-premises server.

- [C] Configure IAM Roles Anywhere with the private CA as a trust anchor, and use the server certificates to get role credentials.

- [D] Store the access keys in AWS Secrets Manager, and rotate them automatically every 30 days with a Lambda function.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-identity-center-abac (type: single)

A company uses IAM Identity Center with its corporate identity provider (IdP) as the identity source. In the IdP, each of the 400 developers has a project attribute. The developers belong to 40 project teams, and each team must access only the AWS resources tagged with its project name. Teams are created and reorganized often, and the cloud team does not want to create or update permission sets when that happens.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Create one SCP per project team that denies access to resources that do not carry the team's tag.

- [B] Map project as an attribute for access control, and use one permission set that matches aws:PrincipalTag/project to the resource tag.

- [C] Create one permission set per project team, and assign each permission set to the matching IdP group in every account.

- [D] Create one IAM role per developer in each account, with a policy that lists the ARNs of the team's resources.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-identity-center-ad-connector (type: single)

A company has 2,000 employees whose identities are stored in an on-premises Microsoft Active Directory. The on-premises network connects to AWS through AWS Direct Connect. The company uses 25 AWS accounts in AWS Organizations. Employees must sign in to the AWS accounts with their existing Active Directory credentials, and administrators must assign access by Active Directory group. The company wants the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Connect IAM Identity Center to Active Directory through AD Connector, and assign permission sets to Active Directory groups.

- [B] Create IAM users in each account with the same names as in Active Directory, and add them to IAM groups.

- [C] Configure a SAML identity provider and IAM roles in each of the 25 accounts, and map groups to roles in every account.

- [D] Create an Amazon Cognito user pool, import the Active Directory users into it, and map pool groups to IAM roles.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-identity-center-entra-scim (type: single)

A company manages its workforce identities in Microsoft Entra ID and has 30 AWS accounts in AWS Organizations. Employees must sign in to the AWS access portal with their Entra ID credentials. When HR adds or removes an employee in Entra ID, the change must be reflected in AWS automatically, without manual user management in AWS.

Which solution will meet these requirements?


- [A] Set Microsoft Entra ID as the external identity provider of IAM Identity Center, and enable automatic provisioning with SCIM.

- [B] Create an IAM SAML identity provider for Entra ID in each account, and create an IAM user for each employee.

- [C] Deploy AD Connector in a shared VPC and point it to the Microsoft Entra ID tenant.

- [D] Keep the Identity Center directory as the identity source, and import the users every night with a CSV script.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-inspector-vulnerabilities (type: single)

A company runs workloads on Amazon EC2 instances, stores container images in Amazon ECR, and uses AWS Lambda functions. The security team needs continuous, automated detection of known software vulnerabilities (CVEs) in these resources. Resources must be rescanned automatically when a new CVE is published or a package changes.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Enable Amazon GuardDuty with Runtime Monitoring for the workloads.

- [B] Run an open source CVE scanner from a scheduled AWS Lambda function.

- [C] Activate Amazon Inspector for EC2, Amazon ECR and Lambda scanning.

- [D] Enable Amazon Macie automated sensitive data discovery for the account.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-interface-endpoint-private-dns (type: single)

Applications on Amazon EC2 instances in private subnets call AWS Secrets Manager and AWS KMS by using the default endpoints of the AWS SDK. The VPC has no internet gateway and no NAT gateway, and DNS resolution and DNS hostnames are enabled. The company does not want to change the application code or the SDK configuration.

Which solution will meet these requirements?


- [A] Create gateway VPC endpoints for Secrets Manager and AWS KMS, and add them to the private route tables.

- [B] Create a VPC peering connection to a shared services VPC that has a NAT gateway, and route to it.

- [C] Create interface VPC endpoints for both services with private DNS disabled, and allow HTTPS from the instances in their security group.

- [D] Create interface VPC endpoints for both services with private DNS enabled, and allow HTTPS from the instances in their security group.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-kms-aws-managed-key-sharing (type: single)

A company stores exported data in an S3 bucket in its production account. The objects are encrypted with SSE-KMS by using the AWS managed key aws/s3. An analytics team in another AWS account has been granted s3:GetObject on the bucket through the bucket policy and through an IAM policy in its own account, but every download fails with an access denied error. The objects must remain encrypted with SSE-KMS.

Which solution will meet these requirements?


- [A] Edit the key policy of the aws/s3 key to allow kms:Decrypt for the analytics team's IAM role in the other account.

- [B] Add kms:Decrypt on the aws/s3 key ARN to the IAM policy of the analytics team's role in its own account.

- [C] Change the bucket's default encryption to SSE-S3 for new objects and keep the existing objects unchanged.

- [D] Re-encrypt the objects with a customer managed key, and allow the analytics role to use the key in both policies.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-lambda-resource-policy (type: single)

A company runs an AWS Lambda function in account A. An application in account B must invoke the function directly by using its own IAM role. The application role already has an identity-based policy that allows lambda:InvokeFunction on the function's ARN. The company must follow the principle of least privilege.

Which additional configuration will meet these requirements?


- [A] Add the application role's ARN to the trust policy of the function's execution role.

- [B] Attach an SCP to account B that allows lambda:InvokeFunction on the function's ARN.

- [C] Create an IAM role in account A with lambda:* permissions that the application assumes before each invocation.

- [D] Add a statement to the function's resource-based policy that allows lambda:InvokeFunction for the application role's ARN.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-macie-guardduty-pair (type: multi)

A retail company has two new security requirements. First, it must identify S3 objects that contain credit card numbers or other personal data. Second, it must detect activity that suggests compromised IAM credentials, such as API calls from known malicious IP addresses. The company wants managed AWS services that require no agents.

Which AWS services will meet these requirements? (Choose two.)


Choose 2.

- [A] AWS Config

- [B] Amazon Macie

- [C] Amazon Inspector

- [D] Amazon GuardDuty

- [E] AWS Trusted Advisor

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1b-managed-ad-trust (type: single)

A company is migrating Windows applications that rely on Active Directory features such as Kerberos authentication and Group Policy to Amazon EC2. The applications must keep authenticating users even if the network link to the on-premises data center fails. On-premises users must be able to access the migrated applications with their existing domain accounts. The company does not want to manage domain controllers.

Which solution will meet these requirements?


- [A] Install Active Directory Domain Services on EC2 instances and promote them to domain controllers of the on-premises domain.

- [B] Deploy Simple AD and recreate the on-premises users and groups in it.

- [C] Deploy AWS Managed Microsoft AD, join the instances to it, and create a trust relationship with the on-premises domain.

- [D] Deploy AD Connector and join the instances to the on-premises domain through it.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-nacl-block-ip (type: single)

A company's web application runs on Amazon EC2 instances in a public subnet, without a load balancer. Logs show repeated malicious requests from a single public IP address. The security team must block all traffic from that IP address to the subnet immediately, and all other internet clients must keep their access.

Which solution will meet these requirements?


- [A] Remove the inbound rule that allows HTTPS from 0.0.0.0/0 from the security group of the instances.

- [B] Add an inbound deny rule for the IP address to the subnet's network ACL, numbered lower than the allow rules.

- [C] Enable Amazon GuardDuty in the account so that it blocks the malicious IP address automatically.

- [D] Add an inbound deny rule for the IP address to the security group that is attached to the instances.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-nacl-ephemeral-ports (type: multi)

Web servers in a public subnet serve HTTPS (TCP 443) to clients on the internet. The company associates a new custom network ACL with the subnet. The network ACL contains only its default rules, which deny all inbound and outbound traffic. The security groups already allow the required traffic. The company must add only the network ACL rules that are needed for internet clients to reach the web servers.

Which network ACL rules should the company add? (Choose two.)


Choose 2.

- [A] An outbound rule that allows TCP 1024-65535 to 0.0.0.0/0

- [B] An inbound rule that allows TCP 1024-65535 from 0.0.0.0/0

- [C] An outbound rule that allows all ICMP traffic to 0.0.0.0/0

- [D] An inbound rule that allows TCP 443 from 0.0.0.0/0

- [E] An outbound rule that allows TCP 443 to 0.0.0.0/0

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1b-network-firewall-domain-egress (type: single)

Workloads in private subnets of several VPCs reach the internet through a central egress VPC that contains NAT gateways. A new policy requires that outbound HTTPS traffic be allowed only to a list of approved domain names, such as .example-partner.com, and that all other outbound web traffic be dropped. The company wants a managed service that inspects the traffic in the network path without decrypting it.

Which solution will meet these requirements?


- [A] Associate an AWS WAF web ACL with the NAT gateways, with a rule that matches the approved domain names.

- [B] Deploy AWS Network Firewall in the egress VPC with a stateful domain list rule group for the approved domains.

- [C] Add network ACL rules in the egress VPC that allow outbound traffic only to the approved domain names.

- [D] Configure the workloads' security groups with outbound rules that reference the approved domain names.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-parameter-store-standard (type: single)

A company has 300 configuration values for its microservices, such as feature flags, endpoint URLs, and a few third-party API keys that must be stored encrypted. Each value is smaller than 2 KB. The values change rarely, and none of them needs automatic rotation or expiration. The applications must read the values through an AWS API.

Which solution is the MOST cost-effective?


- [A] Store the values as standard parameters in Parameter Store, using the SecureString type for the API keys.

- [B] Store every value as a separate secret in AWS Secrets Manager.

- [C] Store the values in an encrypted table of an Amazon RDS for MySQL DB instance.

- [D] Store the values as advanced parameters in Parameter Store, using the SecureString type for the API keys.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-privatelink-endpoint-service (type: single)

A software company provides an API that runs on Amazon EC2 instances behind a Network Load Balancer in its VPC. Hundreds of customers must consume the API from VPCs in their own AWS accounts, and many of those VPCs use CIDR ranges that overlap with the provider VPC. Traffic must not traverse the internet, and customers must not be able to reach any other resource in the provider VPC.

Which solution will meet these requirements?


- [A] Share a transit gateway with the customers through AWS RAM, and attach every customer VPC to it.

- [B] Expose the API through a public Application Load Balancer that allows only the customers' NAT gateway IP addresses.

- [C] Create a VPC endpoint service for the Network Load Balancer, and have customers create interface endpoints to it.

- [D] Create a VPC peering connection with each customer VPC, and restrict access with security groups.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-rcp-data-perimeter (type: single)

A company has 200 member accounts in AWS Organizations. Developers in the member accounts write their own S3 bucket policies. The security team must ensure that no principal outside the organization can access any S3 bucket in the member accounts, even when a bucket policy grants that access to a specific external account. The control must be enforced centrally and must not require changes to existing bucket policies.

Which solution will meet these requirements?


- [A] Enable IAM Access Analyzer in each account to report buckets that are shared with external entities.

- [B] Enable S3 Block Public Access at the account level in every member account of the organization.

- [C] Attach an SCP to the root that denies S3 actions when aws:PrincipalOrgID does not equal the organization ID.

- [D] Attach an RCP to the root that denies S3 actions when aws:PrincipalOrgID does not equal the organization ID.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-rds-iam-auth (type: single)

An application on Amazon EC2 connects to an Amazon RDS for MySQL DB instance. The security team requires that no database password be stored anywhere, including in a secrets store, and that database access be controlled through IAM. The application opens few new connections.

Which solution will meet these requirements?


- [A] Store an encrypted password in the instance user data, and decrypt it with AWS KMS when the application starts.

- [B] Enable IAM database authentication, and have the application generate an authentication token with the instance's IAM role.

- [C] Enable Kerberos authentication with AWS Managed Microsoft AD, and join the EC2 instances to the directory.

- [D] Store the password in AWS Secrets Manager with automatic rotation, and allow the instance role to read the secret.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-s3-cross-account-role (type: multi)

Example Corp has two AWS accounts. Account A owns an S3 bucket that stores reports encrypted with SSE-S3. An application in account B runs on Amazon EC2 instances that use an IAM role named ReportReader. The application must read objects from the bucket. The solution must follow the principle of least privilege.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] In account A, attach an SCP that allows account B to read the objects in the bucket.

- [B] In account A, add a bucket policy statement that allows s3:GetObject on the bucket's objects for the ReportReader role ARN.

- [C] In account B, attach an identity-based policy to the ReportReader role that allows s3:GetObject on the bucket's objects.

- [D] In account B, add a statement to the ReportReader role's trust policy that trusts account A.

- [E] In account A, create an IAM user with s3:GetObject permissions and store its access keys on the EC2 instances.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1b-s3-enforce-tls (type: single)

A healthcare company stores patient documents in an S3 bucket. A compliance audit requires that every request to the bucket use HTTPS (TLS) and that every request sent over plain HTTP be rejected, whichever principal sends it.

Which solution will meet these requirements?


- [A] Enable default encryption with SSE-KMS on the bucket by using a customer managed key.

- [B] Add a bucket policy statement that denies all S3 actions when aws:SecureTransport is false.

- [C] Enable S3 Block Public Access on the bucket and at the level of the account.

- [D] Enable S3 Object Lock in compliance mode with a default retention period on the bucket.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-s3-gateway-endpoint-cost (type: single)

Amazon EC2 instances in private subnets download large datasets from an S3 bucket in the same Region through a NAT gateway. The NAT gateway's data processing charges are high. The company wants the traffic to S3 to stay on the AWS network.

Which solution is the MOST cost-effective?


- [A] Replace the NAT gateway with a NAT instance that runs on a smaller EC2 instance type.

- [B] Create a gateway VPC endpoint for Amazon S3, and associate it with the route tables of the private subnets.

- [C] Move the instances to public subnets, and assign them public IP addresses to reach Amazon S3.

- [D] Create an interface VPC endpoint for Amazon S3 in each private subnet, and use the endpoint DNS names.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-s3-interface-endpoint-onprem (type: single)

A company's on-premises data center connects to a VPC through an AWS Direct Connect private virtual interface. On-premises servers must upload data to Amazon S3 over this connection by using private IP addresses, without traversing the internet. The VPC already has a gateway endpoint for S3 that EC2 instances use.

Which solution will meet these requirements?


- [A] Create an interface VPC endpoint for Amazon S3 in the VPC, and have the on-premises servers use it over Direct Connect.

- [B] Advertise the S3 prefix list to the on-premises routers so that traffic flows through the existing gateway endpoint.

- [C] Attach a transit gateway to the VPC, and route the on-premises traffic to the gateway endpoint through it.

- [D] Create a Direct Connect public virtual interface, and send the uploads to the public S3 endpoints over it.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-s3-presigned-upload (type: single)

A mobile app lets users upload profile pictures. The backend runs on AWS Lambda behind Amazon API Gateway, and large images exceed the API's maximum payload size. The company wants the app to upload images directly to a private S3 bucket, without giving AWS credentials to the app users.

Which solution will meet these requirements?


- [A] Enable S3 Transfer Acceleration on the bucket, and send unsigned upload requests to the accelerated endpoint.

- [B] Make the bucket publicly writable, and limit the allowed origins to the app's domain with a CORS configuration.

- [C] Have the Lambda function create an S3 presigned URL for a PUT request, and have the app upload the image with that URL.

- [D] Create an IAM user for the app, and embed the user's access keys in the app package.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-saml-federation-single-account (type: multi)

A company has a single AWS account and an on-premises identity provider (IdP) that supports SAML 2.0. The company does not plan to use AWS Organizations or IAM Identity Center. Employees must access the AWS Management Console with their corporate credentials, with permissions based on their IdP groups. The company must not create an IAM user for each employee.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Create a SAML identity provider in IAM by uploading the metadata document of the corporate IdP.

- [B] Create an Amazon Cognito identity pool that gives the corporate IdP users unauthenticated guest access.

- [C] Deploy AD Connector in the account, and register it in IAM as the SAML identity provider for the console.

- [D] Create one IAM user per department and share its password with the department's employees.

- [E] Create IAM roles whose trust policies allow sts:AssumeRoleWithSAML from the provider, and map IdP groups to the roles.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1b-scp-management-account (type: single)

A company uses AWS Organizations. The security team attached an SCP to the organization root that denies cloudtrail:StopLogging and cloudtrail:DeleteTrail. During an audit, the team discovers that an administrator stopped logging on a trail in the management account, where several production workloads also run. The company must ensure that the protection applies to all of its workloads.

Which solution will meet these requirements?


- [A] Add an aws:PrincipalAccount condition with the management account ID to the SCP so that it also matches that account.

- [B] Move the workloads from the management account to member accounts, and limit access to the management account to a few administrators.

- [C] Replace the SCP with a resource control policy (RCP) attached to the root so that the trails in every account are protected.

- [D] Attach the same SCP directly to the management account so that it applies there in addition to the root attachment.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-scp-no-grant (type: single)

A company uses AWS Organizations. A member account is in an OU that has an allow-list SCP that permits only Amazon S3 and Amazon DynamoDB actions. A developer in this account uses a new IAM role that has no permissions policies attached. The developer receives AccessDenied errors when listing the objects of an S3 bucket in the same account. The bucket has no bucket policy. The company must keep the SCP in place.

Which solution will meet these requirements?


- [A] Add an explicit Allow statement for s3:ListBucket on the bucket to the SCP attached to the OU.

- [B] Move the member account directly under the organization root so that the OU's SCP no longer applies.

- [C] Attach the FullAWSAccess SCP directly to the member account in addition to the OU's SCP.

- [D] Attach an identity-based policy to the developer's IAM role that allows s3:ListBucket on the bucket.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-scp-region-restriction (type: single)

A financial services company uses AWS Organizations to manage 40 AWS accounts in several organizational units (OUs). A new regulation requires that workloads in all member accounts run only in the eu-west-1 and eu-central-1 Regions. Administrators in the member accounts have full IAM permissions in their own accounts. The company must enforce the requirement centrally, including for accounts that join the organization later.

Which solution will meet these requirements?


- [A] Create an IAM policy in the management account that denies actions outside the two approved Regions and assign it to every member account.

- [B] Attach an SCP to the organization root that denies actions when aws:RequestedRegion is not one of the two approved Regions.

- [C] Deploy an AWS Config rule in every account that flags resources created outside the two approved Regions.

- [D] Attach a permissions boundary to every IAM role in the member accounts that denies actions outside the two approved Regions.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-secret-cross-account (type: multi)

A company stores database credentials as a secret in AWS Secrets Manager in a shared services account. The secret is encrypted with the AWS managed key aws/secretsmanager. An application in a separate workload account must read the secret by using its IAM role. The workload account will update the role's identity-based policy to allow secretsmanager:GetSecretValue on the secret and kms:Decrypt on the key that encrypts it.

Which combination of steps must the company take in the shared services account? (Choose two.)


Choose 2.

- [A] Encrypt the secret with a customer managed key whose key policy allows kms:Decrypt for the application role.

- [B] Turn on automatic rotation so that each new version is shared with the workload account.

- [C] Configure Secrets Manager replication to copy the secret into the workload account.

- [D] Attach a resource-based policy to the secret that allows secretsmanager:GetSecretValue for the application role.

- [E] Update the key policy of aws/secretsmanager to allow kms:Decrypt for the application role.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1b-secrets-manager-rotation (type: single)

An application on Amazon EC2 connects to an Amazon RDS for PostgreSQL database. The database password is hardcoded in the application's configuration file. A security review requires that the password be removed from the file, stored encrypted, and rotated automatically every 30 days. The solution must require the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Store the password in AWS Secrets Manager with automatic rotation every 30 days, and retrieve it at run time.

- [B] Encrypt the configuration file with an AWS KMS key, and store it in an S3 bucket with versioning enabled.

- [C] Store the password as a SecureString parameter in Parameter Store, and run a custom script on a schedule to change it.

- [D] Store the password on an encrypted EBS volume attached to the instance, and change it manually every month.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-security-hub-cspm-standards (type: single)

A company has 60 accounts in AWS Organizations and uses Amazon GuardDuty, Amazon Inspector and Amazon Macie. The security team wants one place to view the findings of these services from all accounts. The team also needs continuous automated checks of the accounts against the AWS Foundational Security Best Practices standard.

Which solution will meet these requirements?


- [A] Review the security checks of AWS Trusted Advisor for all accounts from the organization's management account.

- [B] Enable AWS Security Hub CSPM with a delegated administrator, and enable the AWS Foundational Security Best Practices standard.

- [C] Create an organization trail in AWS CloudTrail, and query the trail's logs with Amazon Athena from one account.

- [D] Enable Amazon Detective with a delegated administrator account, and add all member accounts to the behavior graph.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-session-manager-no-ssh (type: single)

Administrators connect to Linux EC2 instances in private subnets through a bastion host that allows TCP 22 from the corporate IP range. The private subnets reach the internet through a NAT gateway. The security team wants to close all inbound ports on every instance, remove the bastion host and the SSH keys, control access with IAM, and log every session to Amazon S3.

Which solution will meet these requirements?


- [A] Use EC2 Instance Connect with a public IP address on each instance, and allow TCP 22 from the corporate range.

- [B] Use Systems Manager Session Manager with an instance profile that allows Systems Manager, and enable session logging to S3.

- [C] Replace the bastion host with an AWS Client VPN endpoint, and keep the SSH keys and port 22 on the instances.

- [D] Move the bastion host to a private subnet, and allow TCP 22 on it only from a Network Load Balancer.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-sg-reference-app-tier (type: single)

A company runs a web tier and an application tier in two separate Auto Scaling groups in the same VPC. The application servers listen on TCP port 8080. Only the web servers must be able to reach the application servers on that port. Instance IP addresses change as the groups scale in and out.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Add an inbound rule to the application servers' security group that allows TCP 8080 from the web servers' security group.

- [B] Add an inbound rule to the application servers' security group that allows TCP 8080 from the CIDR ranges of the web subnets.

- [C] Add an outbound rule to the web servers' security group that allows TCP 8080 to the application subnets, and no other rule.

- [D] Add network ACL rules to the application subnets that allow TCP 8080 from each web server's IP address.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1b-sqs-policy-for-sns (type: single)

A company subscribes an Amazon SQS standard queue to an Amazon SNS topic in the same account. The queue is not encrypted. Messages that are published to the topic never arrive in the queue. The company wants to fix the issue while following the principle of least privilege.

Which solution will meet these requirements?


- [A] Add a statement to the queue policy that allows sqs:* for every principal ("*") without any condition.

- [B] Add a queue policy statement that allows sqs:SendMessage for sns.amazonaws.com with aws:SourceArn set to the topic ARN.

- [C] Attach an IAM policy that allows sqs:SendMessage on the queue to the IAM user who created the SNS topic.

- [D] Add a statement to the topic policy that allows sqs:ReceiveMessage on the queue ARN for the SNS service principal.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-accelerated-vpn-branches (type: single)

A company has branch offices in South America, Africa and Asia that connect to VPCs in a single AWS Region with Site-to-Site VPN connections over the internet. The VPCs are attached to a transit gateway. The branches experience unstable VPN performance because of long and congested internet paths. The company wants the VPN traffic to enter the AWS global network as close to each branch as possible, without ordering new circuits.

Which solution will meet these requirements?


- [A] Put an Amazon CloudFront distribution in front of the transit gateway to route the VPN traffic through edge locations.

- [B] Create new accelerated Site-to-Site VPN connections attached to the transit gateway, and move each branch's customer gateway to its new connection.

- [C] Create accelerated Site-to-Site VPN connections that terminate on a virtual private gateway in each VPC.

- [D] Turn on acceleration for the existing VPN connections in the transit gateway attachment settings.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-alb-cognito-social (type: single)

A fitness company runs a members-only web application on Amazon EC2 instances behind an Application Load Balancer (ALB) with an HTTPS listener. The company wants members to sign in with their existing social media accounts before any request reaches the application. The development team cannot change the application code.

Which solution will meet these requirements?


- [A] Put an Amazon API Gateway REST API in front of the ALB and write an AWS Lambda authorizer that validates the social media tokens.

- [B] Create an Amazon Cognito user pool federated with the social identity providers, and add an authenticate-cognito action to the ALB HTTPS listener rules.

- [C] Create an Amazon Cognito identity pool for the social identity providers, and have the application exchange member tokens for temporary AWS credentials.

- [D] Associate an AWS WAF web ACL with the ALB that blocks requests without a valid social media session cookie.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-alb-public-private-multiaz (type: multi)

A company is deploying a customer portal on Amazon EC2 instances behind an internet-facing Application Load Balancer (ALB). The portal must remain available if one Availability Zone fails. The instances must not have public IP addresses, must not be directly reachable from the internet, and must download software updates through the NAT gateways that already serve the VPC's private subnets.

Which combination of actions will meet these requirements? (Choose two.)

Each correct answer presents part of the solution.


Choose 2.

- [A] Create the ALB in a single public subnet and enable cross-zone load balancing.

- [B] Assign an Elastic IP address to each instance and allow inbound traffic only from the ALB security group.

- [C] Launch the instances in private subnets in the same two Availability Zones and register them with the ALB target group.

- [D] Create the ALB in one public subnet in each of two Availability Zones.

- [E] Launch the instances in public subnets in two Availability Zones and disable public IP address assignment.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1c-api-waf-secrets-combo (type: single)

A company exposes a public REST API built with Amazon API Gateway and AWS Lambda functions that query an Amazon Aurora MySQL DB cluster. A penetration test found SQL injection attempts against the API and database credentials stored in plaintext in the Lambda environment variables. The company must block SQL injection requests before they reach the functions, remove the credentials from the function configuration, and rotate the credentials automatically.

Which solution will meet these requirements?


- [A] Associate an AWS WAF web ACL with the SQL database managed rule group with the API stage, and store the credentials in AWS Secrets Manager with rotation turned on for the functions to retrieve at runtime.

- [B] Associate an AWS WAF web ACL with the SQL database managed rule group with the API stage, and encrypt the environment variables with a customer managed AWS KMS key.

- [C] Protect the API stage with AWS Shield Advanced, and store the credentials in AWS Secrets Manager with rotation turned on for the functions to retrieve at runtime.

- [D] Attach a security group to the functions that blocks SQL injection payloads, and store the credentials in AWS Secrets Manager with rotation turned on.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-aurora-backtrack (type: single)

A ticketing company runs an Amazon Aurora MySQL DB cluster that was created with Backtrack enabled and a target backtrack window of 24 hours. An operator ran an UPDATE statement without a WHERE clause 20 minutes ago. The company must return the whole cluster to its state just before the statement within minutes, and the application must keep using the same cluster endpoint.

Which solution will meet these requirements?


- [A] Backtrack the DB cluster to a time just before the statement was run.

- [B] Promote an Aurora Replica of the cluster to be the new writer instance.

- [C] Restore the cluster to a point in time just before the statement, and point the application to the new cluster.

- [D] Restore the most recent automated DB cluster snapshot to a new cluster.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-backup-airgapped-vault (type: single)

A company backs up its Amazon EC2 instances and Amazon EBS volumes with AWS Backup in a production account. To prepare for a ransomware incident, the company requires that backups cannot be deleted before their retention ends by anyone, including the root user of the production account. If the production account is compromised, a separate recovery account must be able to restore directly from the backups without first copying them.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Apply AWS Backup Vault Lock in governance mode to the backup vault in the production account.

- [B] Apply AWS Backup Vault Lock in compliance mode to the backup vault in the production account, and copy the backups to the recovery account before each restore.

- [C] Create a Recycle Bin retention rule for EBS snapshots and AMIs in the production account.

- [D] Copy the backups to a logically air-gapped vault, and share the vault with the recovery account through AWS Resource Access Manager (AWS RAM).

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-backup-vault-lock-compliance (type: single)

A bank uses AWS Backup to protect its databases and file systems. Its retention policy states that every backup in the vault must be kept for at least 35 days and no more than 365 days, and that no one, including the root user, can delete a backup early or change these limits. The compliance team wants a few days to test the configuration and remove it if needed before it becomes permanent.

Which solution will meet these requirements?


- [A] Attach a service control policy that denies backup:DeleteRecoveryPoint to all accounts, and set a 35-day retention in the backup plan.

- [B] Apply AWS Backup Vault Lock in compliance mode with a grace time of 3 days, a minimum retention of 35 days and a maximum retention of 365 days.

- [C] Enable S3 Object Lock in compliance mode on the backup vault with a default retention of 35 days.

- [D] Apply AWS Backup Vault Lock in governance mode with a minimum retention of 35 days and a maximum retention of 365 days.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-block-public-access-facts (type: multi)

A company is defining a data governance standard for Amazon S3. The standard will require S3 Block Public Access on all accounts, buckets and access points. Before the standard is approved, the security team asks a solutions architect to confirm how Block Public Access behaves.

Which statements about S3 Block Public Access are correct? (Choose two.)


Choose 2.

- [A] The Block Public Access settings of an access point can be changed at any time after the access point is created.

- [B] Turning on BlockPublicPolicy rewrites existing bucket policies to remove the statements that grant public access.

- [C] Account-level Block Public Access settings apply only to buckets that are created after the settings are turned on.

- [D] When the account, bucket and access point settings differ, Amazon S3 applies the most restrictive combination of them.

- [E] RestrictPublicBuckets limits a bucket with a public policy to AWS service principals and authorized users of the owner account.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1c-client-vpn-saml (type: single)

A consulting company has 300 consultants who work from client sites and home offices. They need secure access from their laptops to internal applications that run in private subnets of a VPC. Consultants must authenticate with the company's existing SAML 2.0 identity provider. The company does not want to deploy or maintain VPN servers.

Which solution will meet these requirements?


- [A] Deploy a bastion host in a public subnet that allows SSH from 0.0.0.0/0, and give each consultant an SSH key pair.

- [B] Create an AWS Client VPN endpoint associated with the VPC that uses SAML-based federated authentication with the identity provider.

- [C] Order an AWS Direct Connect hosted connection and share it with the consultants through their home internet providers.

- [D] Create an AWS Site-to-Site VPN connection for each consultant and configure each laptop as a customer gateway.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-ddos-resilient-edge (type: multi)

A travel company hosts its booking website on Amazon EC2 instances in an Auto Scaling group behind an internet-facing Application Load Balancer (ALB) in one AWS Region. The website has been the target of DDoS attacks at both the network layer and the HTTP layer. The company wants to absorb volumetric attacks as far as possible from the origin and to block abusive HTTP request rates.

Which combination of actions will meet these requirements? (Choose two.)

Each correct answer presents part of the solution.


Choose 2.

- [A] Move the instances to public subnets and assign an Elastic IP address to each instance to spread the traffic.

- [B] Enable Amazon Inspector on the instances so that it blocks the IP addresses that send attack traffic.

- [C] Serve the website through an Amazon CloudFront distribution that uses the ALB as its origin.

- [D] Associate an AWS WAF web ACL that contains rate-based rules with the CloudFront distribution.

- [E] Replace the ALB with a Network Load Balancer and associate an AWS WAF web ACL with the Network Load Balancer.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1c-ddos-udp-global-accelerator (type: single)

A game studio runs a multiplayer game server fleet on Amazon EC2 instances behind Network Load Balancers in two AWS Regions. The game uses a custom UDP protocol. Players worldwide must connect to a single pair of static IP addresses that partner networks can allowlist, and traffic must enter the AWS network close to the players. The studio also needs DDoS protection with access to the Shield Response Team.

Which solution will meet these requirements?


- [A] Associate an AWS WAF web ACL with rate-based rules with each load balancer, and subscribe to AWS Shield Advanced for both Regions.

- [B] Create an AWS Global Accelerator standard accelerator with the load balancers as endpoints, and protect the accelerator with AWS Shield Advanced.

- [C] Assign Elastic IP addresses to the load balancers, protect them with AWS Shield Advanced, and use Amazon Route 53 latency-based routing between the Regions.

- [D] Create an Amazon CloudFront distribution with the load balancers as origins, associate an AWS WAF web ACL, and protect the distribution with AWS Shield Advanced.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-dualstack-egress-only (type: single)

A company is migrating an application to a dual-stack VPC. The application servers run in private subnets and have both IPv4 addresses and globally unique IPv6 addresses. The servers must reach external APIs over both IPv4 and IPv6. The routing design itself must prevent internet hosts from initiating connections to the servers over either protocol, independently of the security group rules.

Which solution will meet these requirements?


- [A] In the private subnets' route table, route both 0.0.0.0/0 and ::/0 to an egress-only internet gateway.

- [B] In the private subnets' route table, route 0.0.0.0/0 to a public NAT gateway and route ::/0 to the internet gateway.

- [C] In the private subnets' route table, route both 0.0.0.0/0 and ::/0 to the internet gateway, and remove all inbound security group rules.

- [D] In the private subnets' route table, route 0.0.0.0/0 to a public NAT gateway and route ::/0 to an egress-only internet gateway.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-dx-macsec (type: single)

A trading firm connects its data center to AWS with a 100 Gbps AWS Direct Connect dedicated connection. A new regulation requires the firm to encrypt traffic on the link between its router at the Direct Connect location and the AWS device. The firm needs to keep close to the full line rate, which rules out tunneling the traffic through IPsec VPN connections.

Which solution will meet these requirements?


- [A] Replace the connection with a 10 Gbps hosted connection from a Direct Connect partner and enable MACsec on it.

- [B] Create a public virtual interface and send all traffic through AWS Site-to-Site VPN tunnels to a virtual private gateway.

- [C] Rely on the default encryption that Direct Connect applies to all traffic on dedicated connections.

- [D] Enable MAC Security (MACsec) on the dedicated connection, using a MACsec-capable router at the Direct Connect location.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-dx-maximum-resiliency (type: single)

A payment processor runs a critical workload that exchanges data between its data centers and AWS over AWS Direct Connect. The connectivity must survive the complete failure of a Direct Connect location and, at the same time, the failure of a single device at the remaining location, while keeping the consistent performance of Direct Connect during failover. The company wants the design that AWS associates with a 99.99% Direct Connect SLA.

Which solution will meet these requirements?


- [A] Use one Direct Connect connection as the primary path and an AWS Site-to-Site VPN connection over the internet as the backup path.

- [B] Use two separate connections that terminate on separate devices at a single Direct Connect location.

- [C] Use separate connections that terminate on separate devices at more than one Direct Connect location.

- [D] Use one connection at each of two Direct Connect locations, with one connection per location.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-dynamodb-pitr (type: single)

A gaming company stores player profiles in an Amazon DynamoDB table. A faulty deployment could corrupt items at any time. The company needs to restore the table data to its state at any point in time in the last 35 days, with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Convert the table to a global table with a replica in a second AWS Region.

- [B] Stream item changes with DynamoDB Streams to an AWS Lambda function that writes each change to Amazon S3.

- [C] Schedule a daily on-demand backup of the table with an Amazon EventBridge rule.

- [D] Turn on point-in-time recovery for the table with a recovery period of 35 days.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-ebs-snapshot-share-cmk (type: single)

A company must share an Amazon EBS snapshot of a database volume with a partner's AWS account so that the partner can create a volume from it. The snapshot is encrypted with the AWS managed key aws/ebs. The data must stay encrypted, and only the partner account may receive access.

Which solution will meet these requirements?


- [A] Edit the key policy of the aws/ebs key to allow the partner account to use the key, and then share the snapshot.

- [B] Modify the create volume permissions of the snapshot to share it directly with the partner account.

- [C] Make the snapshot public for a short period, and ask the partner to copy it into its own account during that period.

- [D] Copy the snapshot with a customer managed key, allow the partner account in the key policy, and share the copy.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-firewall-manager-waf-org (type: single)

A company has 60 AWS accounts in an organization in AWS Organizations, with AWS Config enabled in all accounts. Application teams create new Application Load Balancers and Amazon CloudFront distributions every week. The security team must ensure that a baseline set of AWS WAF rules is automatically applied to every existing and future load balancer and distribution in all accounts.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Designate an AWS Firewall Manager administrator account and create an AWS WAF policy that applies to load balancers and distributions across the organization.

- [B] Attach a service control policy to the organization root that denies the creation of load balancers and distributions without a web ACL.

- [C] Use AWS CloudFormation StackSets to deploy a web ACL to every account, and ask the teams to associate it with their resources.

- [D] Subscribe all accounts to AWS Shield Advanced so that a baseline web ACL is added to each new load balancer and distribution.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-identity-center-workforce (type: single)

A company has 40 AWS accounts in an organization in AWS Organizations. Its employees already sign in to internal applications through a SAML 2.0 identity provider. The company wants employees to use their existing corporate credentials to access the AWS accounts, with permissions managed centrally by job function. The solution must require the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Enable an organization instance of IAM Identity Center, connect the SAML identity provider as the identity source, and assign permission sets to groups for each account.

- [B] Create an IAM user for each employee in every account and attach IAM policies that match each job function.

- [C] Create an Amazon Cognito user pool federated with the SAML identity provider and use it to sign employees in to the AWS Management Console.

- [D] Create an IAM SAML identity provider and a set of IAM roles in each of the 40 accounts, and maintain the trust settings in each account.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-isolated-db-subnets (type: single)

A healthcare company runs application servers in private subnets that reach the internet through a NAT gateway. The company is adding Amazon EC2 instances that run a self-managed database. A compliance rule states that the database tier must have no network path to destinations outside the VPC, not even outbound, and that this must be enforced by routing rather than by instance-level firewall rules.

Which solution will meet these requirements?


- [A] Launch the database instances in new subnets whose route table sends 0.0.0.0/0 to a private NAT gateway.

- [B] Launch the database instances in the application servers' private subnets and add a network ACL outbound deny rule for 0.0.0.0/0.

- [C] Launch the database instances in new subnets associated with a route table that contains only the local route of the VPC.

- [D] Launch the database instances in the application servers' private subnets and remove all outbound rules from the database security group.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-kms-cloudhsm-key-store (type: single)

A government contractor encrypts Amazon EBS volumes and Amazon RDS databases with AWS KMS. A new contract requires that the key material be stored in single-tenant hardware security modules (HSMs) that the contractor owns and manages. The key material may stay inside AWS. The contractor wants to keep using the native AWS KMS integration of EBS and RDS without changing applications.

Which solution will meet these requirements?


- [A] Create an AWS CloudHSM cluster, connect it to an AWS CloudHSM key store in AWS KMS, and create the KMS keys in that key store.

- [B] Create an external key store in AWS KMS that uses an XKS proxy to reach HSMs in the contractor's data center.

- [C] Create an AWS CloudHSM cluster and change the applications to encrypt data with keys stored in the cluster through PKCS #11.

- [D] Create customer managed KMS keys in the standard AWS KMS key store, which uses FIPS 140-3 Level 3 validated HSMs.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-kms-cross-account-decrypt (type: multi)

A data provider stores files in an Amazon S3 bucket in account A. The objects are encrypted with SSE-KMS by using a customer managed key in account A. An analytics role in account B must read the objects. The bucket policy already allows the role to call s3:GetObject, but requests fail with an access denied error from AWS KMS.

Which combination of changes will allow the role to read the objects while following the principle of least privilege? (Choose two.)

Each correct answer presents part of the solution.


Choose 2.

- [A] In account A, add a statement to the key policy that allows all principals (*) to use kms:Decrypt on the key.

- [B] In account B, create an alias that points to the key in account A, and grant the role access to the alias.

- [C] In account A, add a statement to the key policy that allows the account B role to use kms:Decrypt on the key.

- [D] In account B, attach an IAM policy to the role that allows kms:Decrypt on the ARN of the key in account A.

- [E] In account A, enable automatic rotation of the key so that account B receives the new key material.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1c-kms-envelope-encryption (type: single)

A video analytics application running on Amazon EC2 must encrypt 2 GB files on local disk before it sends them to a partner over SFTP. The company's policy requires that the encryption keys be protected by an AWS KMS customer managed key and that the root key never leave AWS KMS unencrypted.

Which solution will meet these requirements?


- [A] Export the key material of the customer managed key to the instance and use it to encrypt the files locally.

- [B] Call the AWS KMS Encrypt operation with the customer managed key on each 2 GB file.

- [C] Call GenerateDataKey with the customer managed key, encrypt each file locally with the plaintext data key, and store the encrypted data key with the file.

- [D] Upload each file to an S3 bucket that uses SSE-KMS with the customer managed key, and download it before sending it over SFTP.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-kms-multi-region-keys (type: single)

A payments company runs an active-active application in us-east-1 and eu-west-1. The application uses client-side encryption with the AWS Encryption SDK to encrypt records before it writes them to a data store that replicates between the Regions. Records encrypted in one Region must be decrypted in the other Region without a cross-Region call to AWS KMS and without re-encrypting the data. The company currently uses a single-Region customer managed key in us-east-1.

Which solution will meet these requirements?


- [A] Keep the key in us-east-1, and have the application in eu-west-1 call the AWS KMS endpoint in us-east-1 to decrypt.

- [B] Create a new multi-Region primary key in us-east-1, replicate it to eu-west-1, and use the related keys in each Region for new records.

- [C] Create a new single-Region key in eu-west-1 with the same alias, and have each Region's application use its local key.

- [D] Convert the existing single-Region key to a multi-Region key, and replicate it to eu-west-1.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-lake-formation-row-column (type: single)

A retail company has a data lake in Amazon S3 that is cataloged in the AWS Glue Data Catalog and queried with Amazon Athena. A `sales` table contains customer email addresses and a `region` column. Regional analysts must query only the rows of their own region and must never see the email column. The company wants to manage these permissions centrally with the LEAST effort.

Which solution will meet these requirements?


- [A] Write S3 bucket policies that grant each analyst group access to the prefix of its region, and remove the email column from the files.

- [B] Run Amazon Macie on the bucket and configure it to hide the email column from the analysts.

- [C] Create an Athena workgroup for each region and attach IAM policies that limit each workgroup to its region's queries.

- [D] Register the data lake with AWS Lake Formation and grant each analyst group SELECT through a data filter that excludes the email column and filters rows on the region.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-lifecycle-glacier-ir-expire (type: single)

A company's retention policy requires that application audit logs in Amazon S3 be kept for exactly 1 year and then deleted. The logs are read often during the first 30 days. After 30 days, auditors open them only a few times a year, but they must get them within milliseconds. The company wants the MOST cost-effective solution.

Which solution will meet these requirements?


- [A] Use a lifecycle rule that transitions objects to S3 Glacier Flexible Retrieval after 30 days and expires them after 365 days.

- [B] Keep the objects in S3 Standard and run a daily AWS Lambda function that deletes objects older than 365 days.

- [C] Use a lifecycle rule that transitions objects to S3 Glacier Instant Retrieval after 30 days and expires them after 365 days.

- [D] Use a lifecycle rule that transitions objects to S3 Glacier Deep Archive after 30 days and expires them after 365 days.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-macie-automated-discovery (type: single)

A healthcare company has more than 300 Amazon S3 buckets created by different teams over several years. The compliance team must classify the data and find out which buckets contain personally identifiable information (PII), and it wants continuous visibility as new data is added. The company wants a managed service with the LEAST effort.

Which solution will meet these requirements?


- [A] Enable Amazon GuardDuty S3 Protection on all accounts and review its findings for buckets that contain PII.

- [B] Turn on S3 Inventory for each bucket and query the inventory reports with Amazon Athena to find PII.

- [C] Enable Amazon Inspector on all accounts and review its findings for buckets that contain PII.

- [D] Enable Amazon Macie with automated sensitive data discovery for the S3 buckets.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-macie-custom-identifier-tagging (type: multi)

An insurance company uses Amazon Macie to classify data in its Amazon S3 buckets. Its documents also contain internal policy numbers in a proprietary format (two letters followed by ten digits) that the managed data identifiers do not detect. When Macie finds policy numbers in an object, the company wants the object to be tagged automatically as confidential so that its retention rules apply.

Which combination of actions will meet these requirements? (Choose two.)

Each correct answer presents part of the solution.


Choose 2.

- [A] Add the policy number format to a Macie allow list so that Macie reports matching text as sensitive data in its findings.

- [B] Create a Macie custom data identifier with a regular expression that matches the policy number format.

- [C] Configure Macie to write its classification results automatically into the object metadata of each affected object.

- [D] Turn on S3 Inventory for the buckets so that the inventory reports flag the objects that contain policy numbers.

- [E] Create an Amazon EventBridge rule for Macie sensitive data findings that invokes an AWS Lambda function to tag the objects.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1c-nacl-deny-rule-order (type: single)

A company's web servers run in a public subnet. The subnet's network ACL has inbound rule 100, which allows TCP port 443 from 0.0.0.0/0. The security team has identified a CIDR block, 198.51.100.0/24, that is sending malicious traffic to the web servers. All other internet clients must keep access.

Which solution will block traffic from this CIDR block?


- [A] Add inbound rule 90 to the network ACL that denies all traffic from 198.51.100.0/24.

- [B] Add a route for 198.51.100.0/24 to the subnet's route table that targets the local route.

- [C] Add an inbound deny rule for 198.51.100.0/24 to the web servers' security group.

- [D] Add inbound rule 110 to the network ACL that denies all traffic from 198.51.100.0/24.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-nacl-ephemeral-outbound (type: single)

A company hosts a public website on Amazon EC2 instances in a public subnet. The instances' security group allows inbound HTTPS from 0.0.0.0/0 and keeps the default outbound rule. The company associated a new custom network ACL with the subnet. The network ACL has one inbound rule that allows TCP port 443 from 0.0.0.0/0 and no other rules except the default deny rules.

Users report that connections to the website time out. Which change will resolve the issue?


- [A] Add an inbound rule to the network ACL that allows TCP ports 1024-65535 from 0.0.0.0/0.

- [B] Add an outbound rule to the network ACL that allows TCP ports 1024-65535 to 0.0.0.0/0.

- [C] Add an outbound rule to the security group that allows TCP ports 1024-65535 to 0.0.0.0/0.

- [D] Add an outbound rule to the network ACL that allows TCP port 443 to 0.0.0.0/0.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-nat-gateway-private-egress (type: single)

A logistics company runs batch-processing Amazon EC2 instances in private subnets of a VPC. The instances use IPv4 only and must download software updates from the internet. Hosts on the internet must not be able to initiate connections to the instances. The company wants a managed solution with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Launch a NAT instance from a Linux AMI in a public subnet and add a 0.0.0.0/0 route to it in the private subnets' route table.

- [B] Attach an egress-only internet gateway to the VPC and add a 0.0.0.0/0 route to it in the private subnets' route table.

- [C] Create a public NAT gateway and add a 0.0.0.0/0 route to the NAT gateway in the private subnets' route table.

- [D] Add a 0.0.0.0/0 route to the internet gateway in the private subnets' route table and assign public IPv4 addresses to the instances.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-nat-gateway-routing-pair (type: multi)

A company is designing a VPC for an application whose Amazon EC2 instances run in private subnets. The instances must send outbound requests to a payment provider on the internet through a zonal public NAT gateway. The instances must not have public IP addresses.

Which configurations are required for this design? (Choose two.)

Each correct answer presents part of the solution.


Choose 2.

- [A] Associate a security group with the NAT gateway that allows outbound HTTPS to the payment provider.

- [B] Add a 0.0.0.0/0 route to the internet gateway in the private subnets' route table.

- [C] Create the NAT gateway in a public subnet whose route table has a 0.0.0.0/0 route to an internet gateway.

- [D] Add a 0.0.0.0/0 route to the NAT gateway in the private subnets' route table.

- [E] Create the NAT gateway in one of the private subnets so that it is close to the instances.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1c-network-firewall-egress-subnets (type: single)

A financial services company runs workloads in private subnets that reach the internet through NAT gateways. A new policy requires that all outbound internet traffic from these subnets be inspected with intrusion prevention signatures and that HTTPS connections be allowed only to an approved list of partner domain names, based on the TLS Server Name Indication (SNI). The company wants a managed AWS service.

Which solution will meet these requirements?


- [A] Add outbound security group rules that allow HTTPS only to the approved partner domain names, and enable Amazon GuardDuty to detect intrusions.

- [B] Associate an AWS WAF web ACL that allows only the approved domain names and uses the IP reputation rule group with each NAT gateway.

- [C] Create an Amazon Route 53 Resolver DNS Firewall rule group that allows only the approved domain names, associate it with the VPC, and block all other queries.

- [D] Deploy AWS Network Firewall with a domain allow list and IPS rules in dedicated firewall subnets, and route the private subnets' internet traffic through it.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-object-lock-compliance-worm (type: single)

A brokerage firm must store trade confirmations in Amazon S3 in a write-once-read-many (WORM) format for 7 years. Regulators require that no user, including the root user of the AWS account, can overwrite or delete a confirmation or shorten its retention during those 7 years.

Which solution will meet these requirements?


- [A] Enable S3 Object Lock on the bucket with a default retention of 7 years in governance mode.

- [B] Enable S3 Object Lock on the bucket and place a legal hold on each confirmation when it is uploaded.

- [C] Enable S3 Object Lock on the bucket with a default retention of 7 years in compliance mode.

- [D] Enable S3 Versioning with MFA delete on the bucket, and add a lifecycle rule that expires objects after 7 years.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-object-lock-legal-hold (type: single)

A company stores contracts in an S3 bucket that has S3 Object Lock enabled with a 1-year default retention in governance mode. The legal department has been notified of litigation and must preserve 200 specific contracts until the case is closed. Nobody knows how long the case will last, and the retention of the other contracts must not change.

Which solution will meet these requirements?


- [A] Transition the 200 contracts to the S3 Glacier Deep Archive storage class with a lifecycle rule.

- [B] Place a legal hold on the 200 contract object versions, and remove it when the case is closed.

- [C] Change the bucket's default retention to compliance mode with a 10-year retention period.

- [D] Set a retention period of 100 years in compliance mode on the 200 contract object versions.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-object-ownership-enforced (type: single)

A company receives daily files from three partner AWS accounts, which upload objects to a bucket in the company's account. Some uploaded objects remain owned by the partner accounts, so the company cannot manage access to them with its bucket policy. The company wants to own every object in the bucket and to control access only with policies.

Which solution will meet these requirements?


- [A] Create an S3 access point for each partner account with its own access point policy.

- [B] Enable S3 Versioning on the bucket so that each upload creates a version owned by the bucket owner.

- [C] Set S3 Object Ownership on the bucket to Object writer.

- [D] Set S3 Object Ownership on the bucket to Bucket owner enforced.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-private-ip-vpn-dx (type: multi)

A bank connects its data center to AWS through AWS Direct Connect. Compliance now requires IPsec encryption for all traffic between the data center and its VPCs. The security team does not allow a public virtual interface, because it would open access between the data center and all AWS public services, and the IPsec tunnel endpoints must use private IP addresses only. The VPCs are attached to a transit gateway.

Which combination of steps will meet these requirements? (Choose two.)

Each correct answer presents part of the solution.


Choose 2.

- [A] Create a Site-to-Site VPN attachment on the transit gateway that uses private IP addresses and the Direct Connect gateway attachment as its transport.

- [B] Enable MACsec on the existing hosted connection to encrypt traffic end to end between the data center and the VPCs.

- [C] Create an accelerated Site-to-Site VPN connection on the transit gateway and route it over the Direct Connect connection.

- [D] Create a public virtual interface and a Site-to-Site VPN connection that terminates on the public tunnel endpoints of the transit gateway.

- [E] Create a transit VIF to a Direct Connect gateway associated with the transit gateway, with the transit gateway CIDR in the allowed prefixes.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1c-public-subnet-definition (type: single)

A solutions architect is reviewing a VPC that has four subnets. The architect must identify which subnets are public subnets so that the team can confirm that no database is deployed in them.

Which characteristic makes a subnet a public subnet?


- [A] The route table associated with the subnet has a direct route to an internet gateway.

- [B] The route table associated with the subnet has a route to a NAT gateway.

- [C] The subnet's network ACL allows all inbound and outbound traffic from 0.0.0.0/0.

- [D] The subnet has a route to a Site-to-Site VPN connection through a virtual private gateway.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-rds-pitr-cross-region-copy (type: multi)

A logistics company runs an Amazon RDS for PostgreSQL DB instance. The company must be able to restore the database to any point in time within the last 14 days in the primary AWS Region. It must also keep daily backups in a second Region for 30 days so that it can recover if the primary Region becomes unavailable.

Which combination of actions will meet these requirements? (Choose two.)

Each correct answer presents part of the solution.


Choose 2.

- [A] Create a read replica of the DB instance in the same Availability Zone as the primary instance.

- [B] Convert the DB instance to a Multi-AZ deployment with a standby in another Availability Zone.

- [C] Create an AWS Backup plan that copies daily backups to a vault in the second Region with a 30-day retention.

- [D] Take a manual DB snapshot every 14 days and copy each snapshot to the second Region.

- [E] Set the backup retention period of the DB instance's automated backups to 14 days.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1c-recycle-bin-snapshots (type: single)

A company keeps thousands of Amazon EBS snapshots that an Amazon Data Lifecycle Manager policy creates. Twice this year, an administrator deleted the wrong snapshots, and the data was lost. The company needs to be able to restore snapshots for 14 days after they are deleted, without changing the existing backup process and with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Create a Recycle Bin retention rule for EBS snapshots with a retention period of 14 days.

- [B] Archive all snapshots to the EBS Snapshots Archive tier so that they cannot be deleted.

- [C] Copy every snapshot to a second AWS Region with an AWS Lambda function that runs after each Data Lifecycle Manager run.

- [D] Enable EBS fast snapshot restore on the snapshots in each Availability Zone.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-s2s-vpn-quick-encrypted (type: single)

A manufacturing company needs to connect its on-premises data center to a single VPC within a few days. The traffic must be encrypted in transit and can travel over the company's existing internet connection. The company wants a managed AWS service on the AWS side.

Which solution will meet these requirements?


- [A] Order an AWS Direct Connect dedicated connection and create a private virtual interface to the VPC.

- [B] Create an AWS Site-to-Site VPN connection between a customer gateway and a virtual private gateway attached to the VPC.

- [C] Create an AWS Client VPN endpoint and install the VPN client on every server in the data center.

- [D] Create a VPC peering connection between the VPC and the data center network.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-s3-access-grants-directory (type: single)

A media company's employees sign in through IAM Identity Center, which is connected to the corporate directory. An internal application lets employees open files in Amazon S3. Access must be granted per S3 prefix based on the employees' directory groups, and auditors require that each AWS CloudTrail data event for Amazon S3 identify the individual employee on whose behalf the data was accessed. The company does not want to map each user to a separate IAM role.

Which solution will meet these requirements?


- [A] Use S3 Access Grants with grants for directory groups on each prefix, integrated with IAM Identity Center trusted identity propagation.

- [B] Create an Amazon Cognito identity pool that maps directory groups to IAM roles with prefix-based policies.

- [C] Create one IAM role for each directory group, and have the application assume the role that matches the user's group before it calls Amazon S3.

- [D] Create an S3 access point for each employee with an access point policy that allows the employee's prefixes.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-s3-access-point-vpc (type: single)

A research institute stores shared genomics datasets in one Amazon S3 bucket used by 40 project teams. The bucket policy has become hard to manage and is close to its size limit. Each team needs its own permissions on its datasets, and some teams must be able to access their data only from a specific VPC. The institute wants to delegate access management per team without copying the data.

Which solution will meet these requirements?


- [A] Split the bucket policy into several smaller bucket policies, one for each team, and attach all of them to the same bucket.

- [B] Enable ACLs on the bucket and grant each team's IAM role access to its objects through object ACLs.

- [C] Create an S3 access point per team with its own policy, and use a VPC network origin for the teams that need VPC-only access.

- [D] Use S3 Same-Region Replication to copy each team's datasets to a dedicated bucket with its own bucket policy.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-s3-presigned-url (type: single)

An architecture firm stores project drawings in a private Amazon S3 bucket. The firm occasionally needs to let an external client, who has no AWS account, download one specific drawing for a few hours. The bucket must stay private and no new long-term credentials may be created.

Which solution will meet these requirements?


- [A] Generate a presigned URL for the object with an expiration time of a few hours and send it to the client.

- [B] Add a bucket policy statement that allows s3:GetObject on the object to all principals, and remove it after a few hours.

- [C] Create an IAM user for the client with read access to the object, and delete the user after the download.

- [D] Enable S3 Transfer Acceleration on the bucket and send the accelerated endpoint of the object to the client.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-s3-versioning-recover (type: single)

A publishing company stores manuscripts in an Amazon S3 bucket. Editors sometimes overwrite a manuscript with the wrong file or delete it by mistake. The company needs to be able to recover the previous content of any object after an accidental overwrite or delete.

Which solution will meet these requirements?


- [A] Turn on S3 Transfer Acceleration for the bucket.

- [B] Set S3 Object Ownership on the bucket to Bucket owner enforced.

- [C] Turn on default encryption with SSE-KMS for the bucket.

- [D] Turn on S3 Versioning for the bucket.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-secrets-manager-rds-rotation (type: single)

A company's web application on Amazon EC2 reads the user name and password of its Amazon RDS for MySQL database from a configuration file on each instance. A security audit requires that the database credentials be removed from the instances and rotated automatically on a schedule. The company wants the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Store the credentials in AWS Secrets Manager, turn on rotation for the secret, and have the application retrieve the secret at runtime.

- [B] Pass the credentials to the instances in the EC2 user data and replace the launch template every month.

- [C] Store the credentials as an AWS Systems Manager Parameter Store SecureString and have the application read the parameter at startup.

- [D] Encrypt the configuration file with an AWS KMS key and decrypt it when the application starts.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-sg-reference-db-tier (type: single)

A company runs a three-tier application in a VPC. An Application Load Balancer sends traffic to application servers in an Auto Scaling group, and the application servers connect to an Amazon RDS for PostgreSQL DB instance on port 5432. Application servers are launched and terminated many times a day, and their private IP addresses change. Other workloads run in the same subnets as the application servers.

Only the application servers must be able to connect to the database, with the LEAST administrative effort. Which solution will meet these requirements?


- [A] Add an inbound rule to the network ACL of the database subnets that allows port 5432 from the CIDR blocks of the application subnets.

- [B] Add an inbound rule to the database security group that allows port 5432 from the CIDR blocks of the application subnets.

- [C] Add an inbound rule to the database security group that allows port 5432 from the security group of the application servers.

- [D] Run an AWS Lambda function on each scaling event that adds the private IP address of each new server to the database security group.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-shield-advanced-srt-cost (type: single)

A media company streams live sports events through an Amazon CloudFront distribution and uses Amazon Route 53 for DNS. During a previous large DDoS attack, the company's AWS bill increased sharply because of the extra data transfer. The company wants access to AWS DDoS experts during attacks and protection against DDoS-related spikes in its AWS bill.

Which solution will meet these requirements?


- [A] Associate an AWS WAF web ACL that contains rate-based rules with the CloudFront distribution.

- [B] Rely on AWS Shield Standard, which is already active on the CloudFront distribution and the Route 53 hosted zone.

- [C] Enable Amazon GuardDuty and send its DDoS findings to an Amazon SNS topic that the operations team monitors.

- [D] Subscribe to AWS Shield Advanced and add the CloudFront distribution and the hosted zone as protected resources.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-shield-auto-l7 (type: single)

A gaming news company subscribes to AWS Shield Advanced and protects its Amazon CloudFront distribution, which has an AWS WAF web ACL associated with it. During recent HTTP floods, the security team had to write and deploy AWS WAF rules by hand while the attack was in progress.

The company wants application layer DDoS attacks against the distribution to be mitigated with AWS WAF rules that are created and managed for it during the attack, without manual intervention.

Which solution will meet these requirements?


- [A] Turn on proactive engagement so that the Shield Response Team contacts the company when an attack is detected.

- [B] Create an AWS Firewall Manager security group policy that applies to the distribution's origin.

- [C] Associate an Amazon Route 53 health check with the protected distribution to enable health-based detection.

- [D] Turn on Shield Advanced automatic application layer DDoS mitigation for the protected distribution.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-sse-kms-customer-managed (type: single)

A financial company stores reports in an Amazon S3 bucket. Its security policy requires that the company control the key policy of the encryption key, audit every use of the key in AWS CloudTrail, and be able to disable the key immediately if a breach is suspected.

Which encryption option will meet these requirements?


- [A] Server-side encryption with AWS KMS keys (SSE-KMS) that uses a customer managed key.

- [B] Server-side encryption with customer-provided keys (SSE-C).

- [C] Server-side encryption with Amazon S3 managed keys (SSE-S3).

- [D] Server-side encryption with AWS KMS keys (SSE-KMS) that uses the AWS managed key aws/s3.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-tgw-isolated-shared (type: single)

A company has 25 VPCs for separate business units and one shared services VPC that hosts directory and logging servers. The on-premises data center connects to AWS through a single Site-to-Site VPN connection. The business unit VPCs must not be able to communicate with each other, but each of them must reach the shared services VPC and the on-premises network. The company expects to add more VPCs and wants the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Create a VPC peering connection between each business unit VPC and the shared services VPC, and terminate the VPN connection on a virtual private gateway attached to the shared services VPC.

- [B] Attach all VPCs and the VPN connection to a transit gateway that uses its default route table, with route propagation enabled for every attachment.

- [C] Attach all VPCs and the VPN connection to a transit gateway with two route tables: business unit VPCs associate with one table, and shared services and VPN attachments associate with the other and propagate to both.

- [D] Create a separate Site-to-Site VPN connection from the data center to a virtual private gateway in each VPC, and peer each business unit VPC with the shared services VPC.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-three-tier-subnet-placement (type: single)

An insurance company is deploying a three-tier web application in a new VPC: an internet-facing Application Load Balancer (ALB), application servers on Amazon EC2, and an Amazon RDS database. Customers must reach the application only through the ALB. The application servers and the database must not be directly reachable from the internet.

Which subnet design will meet these requirements?


- [A] Place the ALB in public subnets, and place the application servers and the database in private subnets.

- [B] Place the ALB, the application servers and the database in public subnets, and restrict access with security groups.

- [C] Place the ALB and the application servers in public subnets, and place the database in private subnets.

- [D] Place an internal ALB, the application servers and the database in private subnets without any internet gateway.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-waf-ip-reputation-bots (type: multi)

An online marketplace serves its website through an Amazon CloudFront distribution that has an AWS WAF web ACL associated with it. The company sees two problems: requests from IP addresses that AWS threat intelligence associates with malicious activity, and scrapers that copy product prices. The company wants to address both problems with AWS managed protections instead of writing and maintaining its own rules.

Which combination of actions will meet these requirements? (Choose two.)

Each correct answer presents part of the solution.


Choose 2.

- [A] Deploy AWS Network Firewall in front of the CloudFront distribution with a managed threat signature rule group.

- [B] Add the AWS WAF Bot Control managed rule group to the web ACL.

- [C] Configure CloudFront geographic restrictions with a block list of the countries where scrapers are detected.

- [D] Add the AWS managed Amazon IP reputation list rule group to the web ACL.

- [E] Enable Amazon GuardDuty and let it update the web ACL with the IP addresses in its findings.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1c-waf-rate-login-scope (type: single)

An online banking portal is served through an Amazon CloudFront distribution with an Application Load Balancer as the origin. The `/login` page is receiving an HTTP request flood from thousands of IP addresses in many countries, which locks out legitimate customers. Customers in all countries must keep access to the portal.

The company needs to limit how many requests each client IP address can send to the `/login` path without affecting the rest of the site, with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Add deny rules for the attacking IP addresses to the network ACL of the subnets that contain the load balancer.

- [B] Configure CloudFront geographic restrictions to block the countries where most of the attacking IP addresses are located.

- [C] Add a rate-based rule that aggregates by IP address with a scope-down statement on the `/login` URI path to a web ACL on the distribution.

- [D] Enable AWS Shield Standard on the distribution so that it rate limits requests sent to the login page.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1c-waf-sqli-alb (type: single)

A retail company runs an order-tracking web application on Amazon EC2 instances behind an Application Load Balancer (ALB). The application queries an Amazon RDS for MySQL database. A security review shows that attackers are sending requests with SQL injection patterns in query strings and form fields.

The company needs to block these requests before they reach the instances, with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Rely on AWS Shield Standard, which inspects requests to the ALB and drops those that contain SQL injection patterns.

- [B] Associate an AWS WAF web ACL with the ALB and add the AWS managed SQL database rule group to the web ACL.

- [C] Add inbound rules to the instances' security group that deny requests containing SQL keywords on port 443.

- [D] Enable Amazon GuardDuty so that it detects the SQL injection attempts and blocks the source IP addresses.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-acm-alb-https (type: single)

A retail company runs its public website on Amazon EC2 instances in an Auto Scaling group behind an Application Load Balancer (ALB). The website currently accepts only HTTP. The company's domain is hosted in Amazon Route 53.

The company must encrypt traffic between browsers and the website with a certificate that browsers trust. Certificate renewal must be automatic, with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Request a private certificate in ACM from an AWS Private CA and add an HTTPS listener with it to the ALB.

- [B] Buy a certificate from a third-party certificate authority and install it on every EC2 instance through the launch template.

- [C] Generate a self-signed certificate, import it into ACM, and add an HTTPS listener with it to the ALB.

- [D] Request a public certificate in AWS Certificate Manager (ACM) with DNS validation and add an HTTPS listener with it to the ALB.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-acm-dns-renewal-failure (type: multi)

A company requested public AWS Certificate Manager (ACM) certificates with DNS validation for several domains. The company expected ACM to renew all of them automatically. The operations team received an AWS Health event saying that ACM could not automatically validate one of the domains for renewal.

Which issues could prevent ACM from renewing this certificate automatically? (Choose two.)


Choose 2.

- [A] The certificate is no longer associated with any AWS service, such as a load balancer or a CloudFront distribution.

- [B] The HTTPS listener that uses the certificate uses a security policy that does not allow TLS 1.3.

- [C] Automatic key rotation is disabled on the customer managed AWS KMS keys of the account.

- [D] The CNAME validation record that ACM provided was deleted from the public DNS zone of the domain.

- [E] The certificate is used in a Region that is different from the Region of the Route 53 hosted zone.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1d-acm-email-to-dns (type: single)

A company uses a public AWS Certificate Manager (ACM) certificate on the HTTPS listener of an Application Load Balancer. The certificate was issued with email validation. Last year, the renewal email went to a former employee and the certificate almost expired. The company's domain is hosted in Amazon Route 53.

The company wants future renewals to happen without any human action.

Which solution will meet this requirement?


- [A] Request a new public ACM certificate with DNS validation, add its CNAME records in Route 53, and use it on the listener.

- [B] Request a private certificate from an AWS Private CA in ACM and replace the certificate on the listener.

- [C] Export the certificate from ACM, then reimport it into ACM every year after renewing it with the certificate authority.

- [D] Create an Amazon CloudWatch alarm on the DaysToExpiry metric of the certificate that notifies the security team.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-air-gapped-vault (type: single)

A company uses AWS Organizations and AWS Backup. Its security plan assumes that an attacker could gain administrator access to a production account. Backups of the production account must be immutable, must survive a compromise of that account, and must be restorable directly from a separate recovery account to reduce the recovery time objective (RTO).

The company wants the solution with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Copy the backups to a logically air-gapped vault and share the vault with the recovery account through AWS Resource Access Manager (AWS RAM).

- [B] Share daily Amazon EBS snapshots and RDS snapshots of the production account with the recovery account by using snapshot permissions.

- [C] Copy the backups to a standard vault in a central backup account and copy them again into the recovery account during an incident.

- [D] Copy the backups to a vault in another Region of the production account and apply AWS Backup Vault Lock in governance mode.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-artifact-audit-reports (type: single)

A healthcare company runs its patient portal on AWS. An external auditor asks the company for the current AWS SOC 2 Type II report and the AWS ISO 27001 certification to verify the controls that AWS operates under the shared responsibility model.

The company must provide these documents with the LEAST effort.

Which solution will meet these requirements?


- [A] Deploy an AWS Config conformance pack in every account and export its compliance report.

- [B] Open an AWS Support case to ask AWS to email the SOC 2 and ISO 27001 reports to the auditor.

- [C] Enable the CIS AWS Foundations Benchmark standard in AWS Security Hub CSPM and export the findings.

- [D] Download the SOC 2 report and the ISO 27001 certification on demand from AWS Artifact.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-asymmetric-key-rotation (type: single)

A software company signs its release packages with an asymmetric RSA AWS KMS key. The signing service references the key through the alias alias/release-signing. A new policy requires the signing key to be rotated every year. The company's verification service calls the AWS KMS Verify operation for customers, and it must still be able to verify packages that were signed before a rotation.

Which solution will meet these requirements?


- [A] Each year, create a new asymmetric key, point the alias to it, and keep the previous key enabled for verification.

- [B] Call the on-demand rotation operation on the asymmetric key once a year.

- [C] Each year, create a new asymmetric key, point the alias to it, and schedule the deletion of the previous key.

- [D] Enable automatic key rotation on the asymmetric key with a rotation period of 365 days.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-aws-backup-plan (type: single)

A logistics company runs workloads on Amazon EC2 instances with Amazon EBS volumes, Amazon RDS DB instances, Amazon DynamoDB tables and Amazon EFS file systems. Today, each team scripts its own backups. A new policy requires daily backups of every resource tagged backup=daily, retention of 35 days, and a copy of each backup in a second AWS Region.

The company wants a central solution with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Configure the native backup feature of each service separately and copy the backups to the second Region with S3 Cross-Region Replication.

- [B] Schedule AWS Lambda functions with Amazon EventBridge to create and copy snapshots and backups of each service through the AWS SDK.

- [C] Create Amazon Data Lifecycle Manager policies that target the backup=daily tag and copy snapshots to the second Region.

- [D] Create an AWS Backup plan with a daily rule, 35-day retention and a cross-Region copy, and assign resources by the backup=daily tag.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-aws-managed-key-share (type: single)

A research company stores 2 TB of datasets in an Amazon S3 bucket. The bucket default encryption is SSE-KMS with the AWS managed key aws/s3, and all existing objects use that key. A partner organization in another AWS account must now be able to read all the datasets, existing and new. The bucket policy already grants the partner account s3:GetObject, but the partner's requests are denied.

Which solution will meet these requirements?


- [A] Edit the key policy of the aws/s3 key to allow the partner account to use kms:Decrypt, and keep the current default encryption of the bucket.

- [B] Create a customer managed key that allows the partner account, make it the bucket default, and re-encrypt existing objects with S3 Batch Operations.

- [C] Ask the partner to attach an IAM policy that allows kms:Decrypt on the ARN of the aws/s3 key to the roles that read the datasets.

- [D] Create a customer managed key that allows the partner account, and set it as the default encryption key of the bucket for all uploads.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-backup-vault-lock (type: single)

A company uses AWS Backup to protect its production databases. After a ransomware incident at a competitor, the company requires that recovery points stored in its backup vault cannot be deleted or have their retention shortened by anyone, including administrators and the root user, until each retention period ends.

Which solution will meet these requirements?


- [A] Add a vault access policy that denies backup:DeleteRecoveryPoint to every principal in the account.

- [B] Apply AWS Backup Vault Lock in compliance mode to the vault and let the grace time expire.

- [C] Add a copy rule to the backup plan that copies every recovery point to a vault in a second Region.

- [D] Apply AWS Backup Vault Lock in governance mode to the vault and restrict the IAM permissions that can remove the lock.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-block-public-access-account (type: single)

A company's AWS account contains 120 Amazon S3 buckets that store internal data, and teams create new buckets every week. None of the buckets should ever be publicly accessible. The company must prevent public access even if a user later attaches a public bucket policy or a public ACL to any existing or future bucket in the account.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Turn on S3 Block Public Access on each existing bucket and add the setting to the bucket creation procedure of each team.

- [B] Turn on all four S3 Block Public Access settings at the account level.

- [C] Deploy the s3-bucket-public-read-prohibited AWS Config rule and review the noncompliant buckets each week.

- [D] Enable Amazon Macie and send its bucket policy findings about public buckets to the security team.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-bucket-policy-source-vpce (type: single)

A healthcare company runs an application on Amazon EC2 instances in private subnets. The instances access an Amazon S3 bucket of medical images through a gateway VPC endpoint. A security review requires that the bucket deny every request that does not arrive through this specific VPC endpoint.

Which solution will meet this requirement?


- [A] Add a network ACL rule to the private subnets that denies outbound traffic to the public IP ranges of Amazon S3.

- [B] Add a bucket policy statement that denies all S3 actions when aws:SourceIp is not the CIDR block of the private subnets.

- [C] Associate a security group with the gateway endpoint that allows HTTPS only from the security group of the instances.

- [D] Add a bucket policy statement that denies all S3 actions when aws:SourceVpce is not the ID of the gateway endpoint.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-cloudfront-acm-region (type: single)

A company hosts a web application behind an Application Load Balancer in the eu-west-1 Region. The company requested a public AWS Certificate Manager (ACM) certificate for www.example.com in eu-west-1 and attached it to the HTTPS listener of the load balancer. The company is now creating an Amazon CloudFront distribution in front of the load balancer, but the certificate does not appear when the company configures the alternate domain name of the distribution.

Viewers must connect to www.example.com over HTTPS through CloudFront.

Which solution will meet these requirements?


- [A] Share the eu-west-1 certificate with the CloudFront service by using AWS Resource Access Manager (AWS RAM).

- [B] Set the viewer protocol policy of the default cache behavior to Redirect HTTP to HTTPS.

- [C] Request a public ACM certificate for www.example.com in the us-east-1 Region and associate it with the distribution.

- [D] Associate the eu-west-1 certificate with the distribution by passing its ARN in an AWS CLI update-distribution call.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-cloudhsm-key-store (type: single)

A bank stores transaction archives in Amazon S3 with SSE-KMS. A new regulation requires that the key material protecting the archives be generated and used only in single-tenant hardware security modules (HSMs) that the bank owns and manages. The bank must continue to use SSE-KMS so that the applications that write to S3 do not change.

Which solution will meet these requirements?


- [A] Create a customer managed KMS key with imported key material that the bank generates on premises, and use it for SSE-KMS.

- [B] Create a multi-Region customer managed KMS key and use it for SSE-KMS in the Region of the bucket.

- [C] Create an AWS CloudHSM key store backed by a CloudHSM cluster that the bank manages, and use a KMS key from it for SSE-KMS.

- [D] Create an AWS CloudHSM cluster and change the applications to encrypt the archives with the PKCS #11 library before upload.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-cloudtrail-tamper-proof (type: multi)

A company must retain the AWS CloudTrail logs of all the accounts in its organization for 7 years to meet a financial regulation. Auditors must be able to prove that no log file was modified or deleted after delivery. No user, including the root user of the log archive account, can be able to delete a log file during the retention period.

The logs will be delivered to a new Amazon S3 bucket in a dedicated log archive account.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Configure the trail to encrypt the log files with SSE-KMS by using a customer managed key.

- [B] Enable S3 Object Lock on the bucket with a default retention of 7 years in governance mode.

- [C] Create an organization trail with log file integrity validation enabled that delivers to the bucket.

- [D] Add an S3 Lifecycle rule that transitions the log files to S3 Glacier Deep Archive after 90 days.

- [E] Enable S3 Object Lock on the bucket with a default retention of 7 years in compliance mode.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1d-cmk-disable-access (type: single)

A legal services company stores case files in an Amazon S3 bucket. The security team must be able to make all objects in the bucket unreadable immediately, during an incident, by taking one action on the encryption key, and must be able to review every use of that key in AWS CloudTrail. The applications that read and write the objects must not change.

Which solution will meet these requirements?


- [A] Use SSE-KMS default encryption with a customer managed key and disable that key during an incident.

- [B] Use SSE-KMS default encryption with the AWS managed key aws/s3 and disable that key during an incident.

- [C] Use client-side encryption with keys stored in AWS Secrets Manager and delete the secret during an incident.

- [D] Use SSE-S3 default encryption and deny s3:GetObject in the bucket policy during an incident.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-config-conformance-pack (type: single)

A company uses AWS Organizations with 40 member accounts. To prepare for a HIPAA assessment, the company must continuously evaluate the configuration of its resources in every account against a set of rules mapped to HIPAA requirements. Noncompliant resources, such as S3 buckets that accept unencrypted HTTP requests, must be fixed automatically.

The company wants to deploy and manage the rules and the fixes as a single unit with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Deploy an AWS Config conformance pack across the organization with rules and Systems Manager Automation remediation actions.

- [B] Write AWS Lambda functions that inspect each resource daily and correct its configuration through the AWS SDK.

- [C] Enable Amazon Inspector in every account and send its findings to an Amazon SNS topic for the operations team.

- [D] Create an organization trail in AWS CloudTrail and run scheduled Amazon Athena queries that flag noncompliant API calls.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-direct-connect-encryption (type: multi)

A company connects its data center to its VPCs through a 10 Gbps AWS Direct Connect dedicated connection. The Direct Connect location and the company's router support MACsec. A new regulation requires all traffic between the data center and AWS over this connection to be encrypted.

Which solutions will meet this requirement? (Choose two.)


Choose 2.

- [A] Enable jumbo frames on the private virtual interfaces so that traffic is encapsulated end to end.

- [B] Create a private IP AWS Site-to-Site VPN over a transit virtual interface to a transit gateway.

- [C] Enable MACsec on the dedicated connection with a CKN/CAK pair and set the encryption mode to must_encrypt.

- [D] Configure BGP MD5 authentication on the virtual interfaces of the connection.

- [E] Replace the dedicated connection with a hosted connection from a Direct Connect partner and enable MACsec on it.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1d-dsse-kms-two-layers (type: single)

A defense contractor stores technical documents in an Amazon S3 bucket. A contract requires every object to be protected at rest by two independent layers of encryption, with the encryption keys controlled in AWS KMS by the contractor.

The solution must have the LEAST operational overhead and must not require changes to the applications that upload the documents.

Which solution will meet these requirements?


- [A] Change the applications to encrypt each document with the Amazon S3 Encryption Client before uploading it to an SSE-KMS bucket.

- [B] Set the default encryption of the bucket to SSE-KMS with a customer managed key and enable S3 Bucket Keys.

- [C] Set the default encryption of the bucket to DSSE-KMS with a customer managed key.

- [D] Keep the default SSE-S3 encryption of the bucket and enable S3 Versioning and S3 Object Lock.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-ebs-encryption-default (type: single)

A company's development teams launch Amazon EC2 instances in the us-east-1 Region from many different launch templates and scripts. A security review found that some new Amazon EBS volumes are not encrypted.

All new EBS volumes in the Region must be encrypted at rest. The existing launch templates and scripts must keep working without changes, with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Enable Amazon EBS encryption by default in the us-east-1 Region for the account.

- [B] Attach an SCP that denies ec2:CreateVolume and ec2:RunInstances requests that create unencrypted volumes.

- [C] Ask every team to update its launch templates and scripts so that each block device mapping sets encryption.

- [D] Deploy the encrypted-volumes AWS Config managed rule and notify each team when it reports a noncompliant volume.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-encrypt-requires-new (type: multi)

An audit of a company's AWS account found the resources listed in the options. The company must encrypt the data at rest of each resource with a customer managed AWS KMS key.

For which resources must the company create a new resource and copy, replicate or restore the data into it to meet this requirement? (Choose three.)


Choose 3.

- [A] An Amazon SQS queue with server-side encryption disabled

- [B] An unencrypted Amazon Aurora MySQL DB cluster

- [C] An Amazon S3 bucket whose default encryption is SSE-S3, for objects written from now on

- [D] An unencrypted Amazon EBS volume attached to an EC2 instance

- [E] An unencrypted Amazon EFS file system

- [F] An Amazon DynamoDB table that uses the default AWS owned key

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1d-imported-cert-expiry (type: single)

A company uses an extended validation certificate from a third-party certificate authority on an Amazon CloudFront distribution. The certificate was imported into AWS Certificate Manager (ACM) in the us-east-1 Region. The security team must start an automated renewal workflow, implemented as an AWS Lambda function, when the certificate approaches expiration.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Create an AWS CloudTrail trail and a metric filter on RenewCertificate API calls that invokes the function.

- [B] Create an Amazon EventBridge rule for the ACM Certificate Approaching Expiration event that invokes the function.

- [C] Schedule the function every day to list the certificates in ACM, compare their expiration dates, and start the workflow when needed.

- [D] Rely on ACM managed renewal to renew the certificate and invoke the function when the renewal completes.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-key-policy-enable-iam (type: single)

A company created a customer managed AWS KMS key with the AWS CLI and supplied a custom key policy whose only statement gives full access to an IAM role named KeyAdmins. A developer then attached an IAM policy that allows kms:Decrypt on the key ARN to the IAM role of a Lambda function. The function still receives an AccessDeniedException when it calls Decrypt.

The company wants to manage access to the key for application roles by using IAM policies from now on.

Which solution will meet these requirements?


- [A] Add a key policy statement that allows kms:* to the account principal so that IAM policies take effect.

- [B] Enable automatic key rotation so that AWS KMS generates new key material that the IAM policy applies to.

- [C] Attach a permissions boundary that allows kms:* on the key ARN to the IAM role of the Lambda function.

- [D] Add kms:Decrypt to an SCP attached to the account so that the IAM policy of the Lambda role takes effect.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-kms-admins-vs-users (type: single)

A company encrypts sensitive data with a customer managed AWS KMS key. The security team requires separation of duties: the IAM role used by the key administrators must be able to manage the key (edit the key policy, enable rotation, schedule deletion) but must not be able to decrypt data. The IAM role of the application must be able to encrypt and decrypt data but must not be able to manage the key.

Which solution will meet these requirements?


- [A] Attach an SCP that grants kms:Encrypt and kms:Decrypt to the application role and kms:PutKeyPolicy to the administrator role.

- [B] Encrypt the data with the AWS managed key for the service and grant each role access through its IAM policy.

- [C] Write a key policy that allows management actions to the administrator role and cryptographic actions to the application role.

- [D] Attach the AWSKeyManagementServicePowerUser managed policy to both roles and rely on the default key policy.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-kms-cross-account (type: multi)

Account A (111122223333) owns an Amazon S3 bucket whose objects are encrypted with SSE-KMS by using a customer managed key in account A. An analytics IAM role in account B (444455556666) must read and decrypt the objects. The bucket policy already allows the role to call s3:GetObject on the bucket, but the requests fail with an access denied error from AWS KMS.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] In account B, attach an IAM policy to the analytics role that allows kms:Decrypt on the ARN of the key in account A.

- [B] In account B, attach an SCP to the account that allows kms:Decrypt on all KMS keys.

- [C] In account B, create an alias that points to the key in account A and reference it in the analytics code.

- [D] In account A, add a statement to the key policy that allows account B or the analytics role to use kms:Decrypt.

- [E] In account A, enable automatic rotation of the key so that account B receives a copy of the key material.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1d-kms-grant-temporary (type: single)

A company runs a nightly batch job that needs to decrypt data with a customer managed AWS KMS key. The job's IAM role must have permission to use the key only while the job runs. The orchestration script must give and remove the permission programmatically at the start and at the end of each run, without editing the key policy or any IAM policy.

Which solution will meet these requirements?


- [A] Attach an IAM policy to the job role that allows kms:Decrypt with an aws:CurrentTime condition for the nightly window.

- [B] Have the script add the job role to the key policy at the start of the run and remove it at the end.

- [C] Have the script enable the key at the start of the run and disable the key at the end.

- [D] Have the script create a KMS grant that allows Decrypt for the job role at the start of the run and retire the grant at the end.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-kms-rotation-effects (type: single)

A company plans to enable automatic rotation on the customer managed AWS KMS key that protects an Amazon DynamoDB table and several Amazon S3 buckets. Several applications reference the key by its ARN. The operations team asks what will happen to these applications and to the data that is already encrypted when the first rotation occurs.

Which statement describes the result of the rotation?


- [A] AWS KMS creates a new key with a new ARN, so the applications must be updated to reference the new key.

- [B] AWS KMS also rotates every data key it generated in the past, so the services re-encrypt their data automatically.

- [C] The key ID and ARN stay the same, but the existing data must be re-encrypted with the new key material before the old material is deleted.

- [D] The key ID and ARN stay the same, and AWS KMS uses the retained previous key material to decrypt existing data without re-encryption.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-kms-rotation-period (type: single)

A company encrypts application data with a symmetric customer managed AWS KMS key whose key material was generated by AWS KMS. A new security standard requires the key material to be rotated every 180 days. Data encrypted before a rotation must stay decryptable, and the application must not change.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Schedule an AWS Lambda function every 180 days that re-encrypts all the data with a newly created key.

- [B] Enable automatic key rotation on the key with a rotation period of 180 days.

- [C] Switch the application to the AWS managed key of the service, which AWS KMS rotates automatically.

- [D] Create a new KMS key every 180 days, point the application's alias to it, and keep the old key enabled.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-kms-via-service (type: single)

A company stores confidential reports in an Amazon S3 bucket encrypted with SSE-KMS and a customer managed key in the us-west-2 Region. A reporting IAM role needs to read the objects through Amazon S3. The security team wants to make sure that the role cannot call AWS KMS Decrypt directly with the key, for example on ciphertext copied out of another system, and can use the key only when S3 makes the request on its behalf.

Which key policy change will meet these requirements?


- [A] Allow kms:Decrypt to the role only with a condition that aws:SourceIp matches the CIDR block of the company's VPC.

- [B] Allow kms:Decrypt to the role only with a condition that kms:GrantIsForAWSResource is true.

- [C] Allow kms:Decrypt to the role only with a condition that kms:ViaService equals s3.us-west-2.amazonaws.com.

- [D] Allow kms:Decrypt to the role only with a condition that kms:CallerAccount equals the company's account ID.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-lifecycle-archive-expire (type: single)

An insurance company stores scanned claim documents in an Amazon S3 bucket. Documents are read often during the first 90 days and almost never afterward; retrieval within 48 hours is acceptable after 90 days. A data retention policy requires each document to be deleted 7 years after its creation.

Which solution will meet these requirements MOST cost-effectively with the LEAST operational overhead?


- [A] Enable S3 Object Lock in compliance mode with a default retention of 7 years and store the objects in S3 Glacier Deep Archive.

- [B] Schedule an AWS Lambda function each day that copies 90-day-old objects to S3 Glacier Deep Archive and deletes 7-year-old objects.

- [C] Add an S3 Lifecycle rule that transitions objects to S3 Glacier Deep Archive after 90 days and expires them after 7 years.

- [D] Store the objects in S3 Intelligent-Tiering with the Archive Access tier activated for objects not accessed for 90 days.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-macie-pii-discovery (type: single)

A financial services company stores customer documents in more than 300 Amazon S3 buckets across several accounts. A new privacy regulation requires the company to identify continuously which buckets contain personally identifiable information (PII), such as passport numbers and credit card numbers.

The solution must have the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Enable Amazon GuardDuty S3 Protection in every account and review the findings it generates.

- [B] Run scheduled Amazon Athena queries that apply regular expressions to the objects in every bucket.

- [C] Enable Amazon Inspector in every account and scan the buckets for sensitive data.

- [D] Enable Amazon Macie with automated sensitive data discovery, managed centrally through AWS Organizations.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-nlb-tls-passthrough (type: single)

A payment company runs an API on Amazon EC2 instances in multiple Availability Zones. Each instance holds the private key of the API's TLS certificate. A compliance requirement states that client traffic must be encrypted end to end and that no intermediate component may decrypt it, including the load balancer. The API must remain highly available behind a single endpoint.

Which solution will meet these requirements?


- [A] Use an Amazon CloudFront distribution with the HTTPS only viewer protocol policy and the instances as a custom HTTPS origin.

- [B] Use an Application Load Balancer with an HTTPS listener and an ACM certificate that forwards traffic to an HTTPS target group.

- [C] Use a Network Load Balancer with a TLS listener on port 443 and an ACM certificate that forwards traffic to a TLS target group.

- [D] Use a Network Load Balancer with a TCP listener on port 443 that forwards traffic to a TCP target group of the instances.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-noncurrent-version-cleanup (type: multi)

A company stores configuration snapshots in an Amazon S3 bucket with S3 Versioning enabled. The application overwrites and deletes objects many times each day, and storage costs keep growing. The company must still be able to recover any overwritten or deleted object for 30 days, after which old data must be removed permanently. Delete markers that no longer have any version under them must be cleaned up.

Which combination of S3 Lifecycle actions will meet these requirements? (Choose two.)


Choose 2.

- [A] An ExpiredObjectDeleteMarker action that removes expired object delete markers

- [B] A NoncurrentVersionExpiration action with NoncurrentDays set to 30

- [C] An Expiration action that expires current versions 30 days after creation

- [D] A Transition action that moves current versions to S3 Glacier Deep Archive after 30 days

- [E] A NoncurrentVersionTransition action that moves noncurrent versions to S3 Standard-IA after 30 days

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1d-object-lock-legal-hold (type: single)

A company stores contracts in an Amazon S3 bucket that has S3 Object Lock enabled with no default retention. The legal department receives a litigation notice: about 2,000 specific contract versions must be protected from deletion and overwrite until the case is closed. Nobody knows how long the case will last, and the legal team must be able to release the protection as soon as the case ends.

Which solution will meet these requirements?


- [A] Place a legal hold on the contract versions and give the legal team the s3:PutObjectLegalHold permission.

- [B] Apply a retention period of 1 year in governance mode to the contract versions and extend it each year.

- [C] Apply a retention period of 10 years in compliance mode to the contract versions.

- [D] Enable MFA delete on the bucket so that deleting any object version requires multi-factor authentication.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-object-ownership-enforced (type: single)

A company created an Amazon S3 bucket several years ago with ACLs enabled and the Object writer ownership setting. Several partner accounts upload files to it. The company's own analytics roles cannot read many of the partner files because those objects are owned by the partner accounts.

The company wants to own every object in the bucket and to manage all access only with policies.

Which solution will meet these requirements?


- [A] Change S3 Object Ownership to Bucket owner enforced after confirming that the bucket policy grants the partners' access.

- [B] Turn on S3 Block Public Access for the bucket so that the partner ACLs no longer apply to the objects.

- [C] Keep the Object writer setting and add a bucket policy that requires the bucket-owner-full-control ACL on every upload.

- [D] Enable S3 Versioning so that each new version of a partner file is owned by the bucket owner.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-rds-encrypt-existing (type: single)

A company runs a production Amazon RDS for MySQL DB instance that was created without encryption at rest. An auditor requires the database storage, its automated backups and its snapshots to be encrypted with a customer managed AWS KMS key. A maintenance window of 2 hours is approved for the change.

Which solution will meet these requirements?


- [A] Create a read replica that is encrypted with the customer managed key, then promote the read replica and switch the application to it.

- [B] Modify the DB instance to enable storage encryption with the customer managed key, and apply the change immediately during the window.

- [C] Enable Amazon EBS encryption by default in the Region with the customer managed key, then reboot the DB instance.

- [D] Copy a snapshot with encryption and the customer managed key, restore a new DB instance from the copy, and switch the application to it.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-rds-force-ssl (type: single)

A company runs an Amazon RDS for PostgreSQL 14 DB instance that uses the default DB parameter group. Some reporting tools still connect without SSL/TLS. A new compliance rule requires the database to reject every client connection that is not encrypted in transit.

Which solution will meet this requirement?


- [A] Copy a snapshot of the DB instance with encryption enabled and restore a new encrypted DB instance from it.

- [B] Set rds.force_ssl to 1 in a custom DB parameter group, associate the group with the DB instance, and reboot it.

- [C] Change the security group of the DB instance to allow port 5432 only from the subnets of the reporting tools.

- [D] Modify the DB instance to use the latest certificate authority (CA) for its server certificate.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-s3-batch-replication (type: single)

A company configured a replication rule on an Amazon S3 bucket that already contained 40 million objects. New objects now appear in the destination bucket, but none of the objects that existed before the rule was created have been replicated. The company must replicate the existing objects to the destination with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Run an S3 Batch Replication job with a manifest generated by Amazon S3 from the replication configuration.

- [B] Enable delete marker replication on the rule so that S3 re-evaluates the existing objects.

- [C] Enable S3 Replication Time Control on the rule so that all objects are replicated within 15 minutes.

- [D] Delete the replication rule and create it again with a higher priority so that it applies to all objects.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-s3-bucket-keys-cost (type: single)

A media company stores millions of small images in an Amazon S3 bucket. The bucket uses SSE-KMS with a customer managed key, which the security team requires. The application reads and writes thousands of objects each second, and the monthly AWS KMS request charges have become a large part of the bill.

The company must reduce the KMS request costs without changing the application code and while keeping the customer managed key.

Which solution will meet these requirements?


- [A] Change the default encryption of the bucket to SSE-S3 and re-encrypt the existing objects with S3 Batch Operations.

- [B] Request an increase of the AWS KMS request rate quota for cryptographic operations in the Region.

- [C] Enable S3 Bucket Keys in the default encryption configuration of the bucket.

- [D] Change the default encryption of the bucket to DSSE-KMS with the same customer managed key.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-s3-crr-prerequisites (type: multi)

A company stores product images in an Amazon S3 bucket in the us-east-1 Region. For disaster recovery, every new object must be copied automatically to a bucket in the eu-west-1 Region owned by the same account. Neither bucket uses S3 Object Lock.

Which combination of steps must the company take to configure the replication? (Choose two.)


Choose 2.

- [A] Provide an IAM role that Amazon S3 assumes to replicate objects to the destination bucket.

- [B] Enable S3 Versioning on both the source bucket and the destination bucket.

- [C] Create an S3 Lifecycle rule on the source bucket that copies new objects to the destination bucket.

- [D] Configure both buckets to use the same storage class and the same default encryption.

- [E] Enable S3 Transfer Acceleration on the destination bucket to receive the replicas.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1d-s3-replication-time-control (type: single)

A financial company replicates trade confirmation files from an Amazon S3 bucket in one AWS Region to a bucket in another Region. A regulator requires that new files be replicated within 15 minutes under a service level agreement, and the operations team must receive an event whenever a file takes longer than that.

The company wants the solution with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Invoke an AWS Lambda function on each PUT event that copies the object to the other Region and publishes delays to Amazon SNS.

- [B] Enable S3 Replication Time Control (S3 RTC) on the replication rule and subscribe to the OperationMissedThreshold event.

- [C] Run an S3 Batch Replication job every 15 minutes and alert the team when a job reports failed objects.

- [D] Enable S3 Transfer Acceleration on both buckets and create an Amazon CloudWatch alarm on the replication latency.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-s3-secure-transport (type: single)

A company stores payroll exports in an Amazon S3 bucket. Several internal applications and partner scripts access the bucket. A security policy requires that the bucket reject any request that is not sent over an encrypted (HTTPS) connection.

Which solution will meet this requirement?


- [A] Create a gateway VPC endpoint for S3 and route the application subnets through it.

- [B] Set the default encryption of the bucket to SSE-KMS with a customer managed key.

- [C] Turn on all four S3 Block Public Access settings for the bucket.

- [D] Add a bucket policy statement that denies all S3 actions when aws:SecureTransport is false.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1d-scp-data-residency (type: single)

A European company uses AWS Organizations. A data residency regulation requires that no workload in any member account, including accounts created in the future, runs outside the eu-central-1 and eu-west-1 Regions. Administrators of the member accounts must not be able to bypass the control.

The company must prevent the creation of resources in other Regions, not only detect it.

Which solution will meet these requirements?


- [A] Attach an IAM policy to every IAM role in each member account that denies actions outside the two Regions.

- [B] Attach an SCP to the organization root that denies actions when aws:RequestedRegion is not one of the two Regions.

- [C] Create an AWS Organizations tag policy that requires a Region tag with one of the two approved values on every resource.

- [D] Deploy an AWS Config rule in every account that detects resources outside the two Regions and notifies the security team.

ANSWER FORMAT: {"optionId": "<letter>"}
