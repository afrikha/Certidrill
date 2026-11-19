Secure workload questions start from an application architecture (web tier, application tier, database, sometimes an on-premises site) and ask how to remove stored credentials, keep traffic private, filter what reaches each tier or block an attack. This chapter covers credentials and configuration, service endpoints, VPC traffic controls, network segmentation, edge protection against external threats, the security services and their use cases, and secure connections to on-premises networks.

<!-- section: credentials-config | objectives: 1.2.1 -->
## Application credentials and configuration

The rule: **no long-term credentials in code, AMIs, environment variables or configuration files**. Workloads get temporary credentials from a role (instance profile on EC2, task role on ECS, execution role on Lambda), delivered automatically and rotated by AWS. On EC2, require **IMDSv2** (`HttpTokens` set to `required`), which protects the instance metadata service, and therefore the role credentials, against server-side request forgery; an account-level default per Region applies it to new instances.

Secrets that can't be avoided (a database password, a third-party API key) go to a managed store:

| Feature | AWS Secrets Manager | Systems Manager Parameter Store |
| --- | --- | --- |
| Main use | Database credentials, API keys, tokens | Configuration values, feature flags, endpoints; `SecureString` for sensitive values |
| Encryption | Always, with AWS KMS | `SecureString` parameters, with AWS KMS |
| Automatic rotation | Yes: managed rotation (Amazon RDS, Aurora, Redshift, DocumentDB master credentials) or a Lambda rotation function; as often as every 4 hours | None |
| Cost | Per secret per month plus API calls | Standard tier free (up to 10,000 parameters, 4 KB); advanced tier charged (8 KB, parameter policies, cross-account sharing) |
| Other | Replication of a secret to other Regions, resource-based policies | Hierarchies (`/app/prod/db-endpoint`), integration with CloudFormation and ECS |

```bash
# The application reads the secret at runtime with its role; nothing is stored in the code
aws secretsmanager get-secret-value --secret-id prod/orders/db
```

> **Exam trap.** "Rotate the database password automatically every 30 days with the least operational overhead" is Secrets Manager. Parameter Store `SecureString` encrypts but never rotates; a Lambda function scheduled to update it is the overhead the qualifier rules out.

<!-- section: service-endpoints | objectives: 1.2.2 -->
## AWS service endpoints

Every AWS service is reached through public **service endpoints** (`s3.eu-west-1.amazonaws.com`), over HTTPS. A resource in a private subnet reaches them through a NAT gateway, or privately through a **VPC endpoint**:

| | Gateway endpoint | Interface endpoint (AWS PrivateLink) |
| --- | --- | --- |
| Services | Amazon S3 and DynamoDB only | Most AWS services (including S3 and DynamoDB), endpoint services of other accounts, partner SaaS |
| How it works | A route to the service's prefix list in the selected route tables | Elastic network interfaces with private IP addresses in your subnets |
| Cost | No charge | Hourly per Availability Zone, plus data processed |
| Reachable from on-premises (VPN, Direct Connect) or peered VPCs | No | Yes |
| Access control | Endpoint policy | Endpoint policy and security groups |

An **endpoint policy** limits what the endpoint can be used for (for example, only the company's buckets), and a bucket policy can require the endpoint with `aws:SourceVpce`. Private DNS on interface endpoints lets applications keep the default service names, so no code changes.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyUnlessThroughVpcEndpoint",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::example-corp-records", "arn:aws:s3:::example-corp-records/*"],
      "Condition": { "StringNotEquals": { "aws:SourceVpce": "vpce-0a1b2c3d4e5f67890" } }
    }
  ]
}
```

> **Exam trap.** "Instances in a private subnet must reach S3 without the internet, at the lowest cost" is a gateway endpoint. If the traffic comes from on-premises over Direct Connect, a gateway endpoint can't be used: choose an S3 interface endpoint.

<!-- section: vpc-traffic-controls | objectives: 1.2.3, 1.2.7 -->
## Controlling ports, protocols and traffic in a VPC

| | Security group | Network ACL |
| --- | --- | --- |
| Applies to | Network interfaces (instances, load balancers, endpoints, Lambda in a VPC) | A subnet: every resource in it |
| Rules | Allow only | Allow and deny, numbered, first match wins |
| State | Stateful: return traffic is allowed automatically | Stateless: return traffic needs its own rule (ephemeral ports 1024–65535) |
| Default | New group: no inbound rule, all outbound allowed | Default ACL allows everything; a new custom ACL denies everything |
| Typical use | Allow 443 from the load balancer's security group to the application tier | Block a malicious IP range for a whole subnet |

Security groups can reference **other security groups** as a source: "allow 3306 only from the application tier's security group" keeps working when instances scale in and out, with no IP addresses to maintain. Network ACLs can't reference security groups or prefix lists, and they don't filter traffic to the Amazon DNS resolver or the instance metadata service.

Other components of a secure VPC:

| Component | Role |
| --- | --- |
| Route table | Decides where a subnet's traffic goes; a route to an internet gateway makes the subnet public |
| Internet gateway | Two-way internet access for resources with public IP addresses |
| NAT gateway | Outbound-only IPv4 internet access for private subnets; no inbound connection can be initiated from the internet |
| Egress-only internet gateway | Outbound-only access for IPv6 |
| AWS Network Firewall | Managed stateful firewall and intrusion prevention for a VPC: domain filtering, deep packet inspection |
| Route 53 Resolver DNS Firewall | Blocks DNS queries to malicious or unapproved domains |
| VPC Flow Logs | Records accepted and rejected IP traffic for analysis |

A **zonal NAT gateway** lives in a public subnet of one Availability Zone and needs an Elastic IP address; for high availability, create one per zone and point each zone's private route table to its own. A **regional NAT gateway** needs no public subnet, expands automatically to every zone where you have workloads and is used by one route entry for all zones; it doesn't support private NAT.

> **Exam trap.** One zonal NAT gateway shared by all zones is a single point of failure and adds cross-zone data charges. "Highly available outbound internet access" means one zonal NAT gateway per Availability Zone, or a regional NAT gateway.

<!-- section: segmentation | objectives: 1.2.8 -->
## Network segmentation

A **public subnet** has a route to an internet gateway; a **private subnet** doesn't. Segment by tier, in at least two Availability Zones:

| Tier | Subnet | Inbound allowed from |
| --- | --- | --- |
| Load balancer, NAT gateway (zonal) | Public | The internet, on 443 |
| Application instances, containers | Private, route to a NAT gateway if updates or APIs are needed | The load balancer's security group |
| Database | Private, no route to the internet | The application tier's security group |

- Administer instances without a bastion: **Systems Manager Session Manager** needs no inbound port, no SSH key, and logs sessions; private instances reach it through a NAT gateway or interface endpoints.
- Separate environments or business units with separate VPCs and accounts. Connect them with **VPC peering** (non-transitive, one-to-one) or **AWS Transit Gateway** (hub, with route tables that isolate, for example, development from production).
- Expose a service to other VPCs without opening networks to each other: **AWS PrivateLink** (a Network Load Balancer behind an endpoint service).

> **Exam tip.** "Database must not be reachable from the internet" is solved by placement (private subnet without a route to an internet gateway) plus a security group that only allows the application tier. A network ACL alone doesn't make a subnet private.

<!-- section: edge-protection | objectives: 1.2.4, 1.2.6, 1.2.9 -->
## Protecting applications against external threats

| Threat | Layer | AWS answer |
| --- | --- | --- |
| Volumetric and protocol DDoS (SYN floods, UDP reflection) | 3 and 4 | AWS Shield Standard, automatic and free; CloudFront, Route 53 and Global Accelerator absorb attacks at the edge |
| HTTP floods | 7 | AWS WAF rate-based rules; Shield Advanced automatic application layer mitigation |
| SQL injection, cross-site scripting | 7 | AWS WAF managed rule groups (core rule set, SQL database rules) |
| Bots, scrapers, credential stuffing | 7 | AWS WAF Bot Control, CAPTCHA and challenge actions |
| Traffic from specific countries or IP addresses | 7 | AWS WAF geo match and IP set rules |

**AWS WAF** protection packs (web ACLs) attach to CloudFront distributions, Application Load Balancers, API Gateway REST APIs, AWS AppSync APIs, Amazon Cognito user pools, AWS App Runner services, AWS Verified Access instances and AWS Amplify apps. It doesn't attach to a Network Load Balancer or an EC2 instance: put CloudFront or an ALB in front.

| | AWS Shield Standard | AWS Shield Advanced |
| --- | --- | --- |
| Cost | Included for every customer | Subscription, billed to the organization's payer account and covering every subscribed account |
| Resources | All, strongest on CloudFront, Route 53 and Global Accelerator | Resources you explicitly protect: CloudFront, Route 53 hosted zones, Global Accelerator, Elastic IP addresses (EC2, NLB), ALB, Classic Load Balancer |
| Extras | None | Automatic application layer DDoS mitigation, standard AWS WAF charges covered for protected resources, Shield Response Team, DDoS cost protection |

Secure application access also means:

- **HTTPS only**: TLS listeners on the ALB or CloudFront with certificates from ACM, HTTP redirected to HTTPS.
- **Authentication at the load balancer**: an ALB HTTPS listener can authenticate users with an Amazon Cognito user pool or any OIDC provider before forwarding requests, with no code in the application.
- **Private origins**: CloudFront **origin access control (OAC)** lets only the distribution read an S3 bucket; the bucket stays private.
- **Central management**: **AWS Firewall Manager** applies WAF rules, Shield Advanced protections, security groups and Network Firewall policies to every account of the organization, including new ones.

> **Exam trap.** Shield Standard already protects every customer against common layer 3 and 4 attacks. Choose Shield Advanced only when the stem asks for DDoS response team support, cost protection against scaling charges, or advanced protection of specific resources.

<!-- section: security-services | objectives: 1.2.5, 1.2.9 -->
## Security services and their use cases

| Service | What it does | Keyword in the stem |
| --- | --- | --- |
| Amazon GuardDuty | Threat detection from CloudTrail management events, VPC Flow Logs and DNS logs (no setup of those sources needed), plus optional protection plans (S3, EKS, runtime, malware, RDS, Lambda); findings only, it doesn't block | "detect compromised instances, crypto mining, unusual API calls" |
| Amazon Macie | Discovers sensitive data (PII, financial data, credentials) in S3 buckets and evaluates bucket security | "find PII in S3" |
| Amazon Inspector | Continuous vulnerability scanning of EC2 instances, ECR container images and Lambda functions: CVEs and unintended network exposure | "scan for software vulnerabilities" |
| Amazon Detective | Investigates the root cause of findings with graphs built from logs | "investigate", "root cause" |
| AWS Security Hub | Correlates and prioritizes findings from GuardDuty, Inspector, Macie, Security Hub CSPM and IAM Access Analyzer; Security Hub CSPM checks resources against standards (AWS Foundational Security Best Practices, CIS, PCI DSS) | "single view of security findings across accounts" |
| Amazon Cognito | User pools authenticate application users and issue JWTs; identity pools exchange tokens for temporary AWS credentials | "users of the mobile app sign in", "social sign-in" |
| AWS Secrets Manager | Stores and rotates secrets | "rotate credentials" |
| IAM Identity Center | Workforce sign-in to AWS accounts and applications | "employees", "single sign-on" |
| AWS WAF, AWS Shield, AWS Firewall Manager, AWS Network Firewall | Layer 7 filtering; DDoS protection; central policy management; VPC-level stateful firewall | See the previous sections |

Detection services feed **Amazon EventBridge**: a rule on a GuardDuty finding can start a Lambda function or a Systems Manager automation that isolates an instance. That is how a "detect and respond automatically" requirement is met.

> **Exam trap.** GuardDuty finds threats; Inspector finds vulnerabilities; Macie finds sensitive data. None of them blocks traffic by itself.

<!-- section: hybrid-connections | objectives: 1.2.10 -->
## Securing connections to and from on-premises networks

| Option | What it is | Security and performance facts |
| --- | --- | --- |
| AWS Site-to-Site VPN | IPsec tunnels over the internet between a customer gateway device and a virtual private gateway (one VPC) or a transit gateway | Two tunnels per connection for redundancy; up to 1.25 Gbps per tunnel, up to 5 Gbps with large bandwidth tunnels on a transit gateway; set up in minutes |
| Accelerated Site-to-Site VPN | The VPN enters the AWS network at the nearest edge through AWS Global Accelerator | Lower and more consistent latency for distant sites; transit gateway attachments only |
| AWS Direct Connect | A private dedicated or hosted connection from a Direct Connect location to AWS | Consistent bandwidth and latency, no internet path; traffic isn't encrypted by IPsec, so add MACsec or a VPN for encryption |
| MACsec on Direct Connect | Layer 2 encryption on the link between your router and AWS | Dedicated 10, 100 and 400 Gbps connections at selected locations; not on hosted connections |
| Private IP VPN over Direct Connect | IPsec over a Direct Connect transit virtual interface to a transit gateway, with private IP addresses | Encryption end to end over Direct Connect without public IP addresses |
| AWS Client VPN | Managed OpenVPN-based remote access for individual users | Authentication with Active Directory, SAML federation or mutual certificates; authorization rules per group |

| Requirement | Answer |
| --- | --- |
| Encrypted connection to the VPC, quickly, at low cost | Site-to-Site VPN |
| Consistent, high-bandwidth private connectivity | Direct Connect |
| Private connectivity that is also encrypted | Direct Connect with MACsec, or a VPN over Direct Connect |
| Backup path if the Direct Connect connection fails | Site-to-Site VPN as a backup, or a second Direct Connect connection at another location |
| Remote employees reach private applications | Client VPN |

> **Exam trap.** Direct Connect is private, not encrypted. "Data in transit must be encrypted over the dedicated connection" eliminates Direct Connect alone.

<!-- section: key-points -->
## Key points

- Roles and IMDSv2 instead of stored keys; Secrets Manager rotates, Parameter Store doesn't.
- Gateway endpoints: S3 and DynamoDB, free, route tables, not reachable from on-premises. Interface endpoints: PrivateLink, hourly, reachable from on-premises.
- Security groups: stateful, allow-only, can reference each other. Network ACLs: stateless, ordered allow and deny rules per subnet.
- One zonal NAT gateway per Availability Zone, or a regional NAT gateway, for high availability.
- Public subnet = route to an internet gateway; databases in private subnets; Session Manager instead of bastions.
- Shield Standard is free and automatic; WAF blocks SQL injection, XSS and floods on CloudFront, ALB and API Gateway, never on an NLB.
- GuardDuty threats, Inspector vulnerabilities, Macie sensitive data, Security Hub aggregation.
- VPN is encrypted over the internet; Direct Connect is private but needs MACsec or a VPN for encryption.
