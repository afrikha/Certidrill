Data in transit questions combine three requirements: every client connection must use TLS (and sometimes a specific version, FIPS or post-quantum key exchange), traffic to AWS services and internal applications must stay on private paths, and traffic between the nodes of a cluster must be encrypted too. The answers are mostly configuration settings and policy conditions; the traps are defaults that differ between the console and the API, and settings that cannot be changed after creation.

<!-- section: require-encryption | objectives: 5.1.1 -->
## Requiring encryption for connections to resources

| Resource | How to require TLS |
| --- | --- |
| Application Load Balancer | HTTPS listener with a TLS security policy; HTTP listener that only redirects to HTTPS |
| Network Load Balancer | TLS listener (terminates TLS with a security policy), or TCP listener on 443 to pass encrypted traffic to targets |
| CloudFront | Viewer protocol policy `redirect-to-https` or `https-only`, a viewer security policy (for example `TLSv1.2_2021`, `TLSv1.2_2025`, `TLSv1.3_2025`), origin protocol policy `https-only` |
| API Gateway REST API | Security policy on the custom domain or API (`TLS_1_2`, or an enhanced `SecurityPolicy_*` policy with an endpoint access mode); disable the default `execute-api` endpoint so clients must use the custom domain |
| API Gateway HTTP and WebSocket APIs | `TLS_1_2` only |
| Amazon S3, SQS, SNS | Resource policy denying requests where `aws:SecureTransport` is `false`; for S3, `s3:TlsVersion` for a minimum version |
| RDS for PostgreSQL | `rds.force_ssl` = 1 in a custom parameter group (default 1 from PostgreSQL 15), `ssl_min_protocol_version` |
| RDS for MySQL | `require_secure_transport` = ON |
| OpenSearch Service | Require HTTPS on the domain endpoint, with a TLS security policy |
| Amazon MSK | Client-broker encryption `TLS` (default), not `TLS_PLAINTEXT` or `PLAINTEXT` |

**Elastic Load Balancing security policies** choose protocols and ciphers between clients and the load balancer:

- The console default for new HTTPS listeners is `ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09` (TLS 1.2 and 1.3, restricted ciphers, post-quantum hybrid key exchange). The default through the API, CLI, CloudFormation and CDK is still `ELBSecurityPolicy-2016-08`, which accepts TLS 1.0 and 1.1.
- TLS 1.3 only: `ELBSecurityPolicy-TLS13-1-3-2021-06`, or `ELBSecurityPolicy-TLS13-1-3-PQ-2025-09` with post-quantum key exchange.
- FIPS 140 endpoints: policies with `FIPS` in the name (for example `ELBSecurityPolicy-TLS13-1-2-FIPS-PQ-2025-09`).

```bash
aws elbv2 modify-listener \
  --listener-arn arn:aws:elasticloadbalancing:eu-west-3:111122223333:listener/app/portal/0123456789abcdef/fedcba9876543210 \
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09
```

**Mutual TLS** authenticates clients by certificate: on an ALB, *verify* mode checks client certificates against a trust store (CA bundle in S3, optional revocation lists) and *passthrough* mode forwards the certificate chain to targets in HTTP headers; API Gateway custom domains also support mTLS with a trust store in S3.

**End to end**: an ALB terminates TLS and re-encrypts to HTTPS targets, so it can inspect and apply AWS WAF; when no intermediate may decrypt the traffic, use an NLB TCP listener and terminate TLS on the targets.

A bucket policy that refuses clear-text requests and old TLS versions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::example-claims", "arn:aws:s3:::example-claims/*"],
      "Condition": { "Bool": { "aws:SecureTransport": "false" } }
    },
    {
      "Sid": "DenyTlsBelow12",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::example-claims", "arn:aws:s3:::example-claims/*"],
      "Condition": { "NumericLessThan": { "s3:TlsVersion": "1.2" } }
    }
  ]
}
```

Detective controls: AWS Config rules such as `s3-bucket-ssl-requests-only` and `alb-http-to-https-redirection-check`, and CloudTrail records without `tlsDetails` to spot HTTP attempts.

> **Exam trap.** An HTTPS listener created with the CLI or CloudFormation without an explicit `SslPolicy` gets `ELBSecurityPolicy-2016-08` and still negotiates TLS 1.0. When the requirement is "TLS 1.2 or later", set the policy explicitly in the template.

> **Exam trap.** `rds.force_ssl` cannot be changed in a default parameter group: create a custom parameter group, set the value and associate it (reboot if the instance is running).

<!-- section: private-access | objectives: 5.1.2 -->
## Secure and private access to resources

| Mechanism | Gives | Key facts |
| --- | --- | --- |
| Gateway VPC endpoint | Private access to S3 and DynamoDB from a VPC | Route table entries with a prefix list, no security group, no charge, not usable from on-premises or peered VPCs |
| Interface VPC endpoint (PrivateLink) | Private IP addresses in your subnets for an AWS service, a partner service or your own endpoint service | Security groups, private DNS (needs DNS hostnames and DNS resolution on the VPC), reachable over Direct Connect, VPN or peering |
| Endpoint service | Expose your own application behind a Network Load Balancer or Gateway Load Balancer to other VPCs and accounts | Allowed principals, acceptance of connection requests, one-way (consumers initiate), overlapping CIDRs allowed |
| Resource endpoint | Private access to a single resource (database, IP address, domain name) in another VPC or on-premises, without a load balancer | Resource configuration attached to a resource gateway, shared with AWS RAM; TCP only |
| AWS Client VPN | Remote users into VPC and on-premises networks | Managed OpenVPN-based endpoint, authorization rules per destination CIDR |
| AWS Verified Access | Remote users to specific applications, no VPN | Per-request Cedar policies on identity and device (see chapter 33) |
| Systems Manager Session Manager | Shell or port forwarding to instances | No inbound ports, IAM authorization, TLS 1.2, logged sessions |

**Endpoint policies** default to full access. Restrict them to the organization's principals and resources (`aws:PrincipalOrgID`, `aws:ResourceOrgID`) and pair them with resource policies that require the endpoint (`aws:SourceVpce`) or the VPC (`aws:SourceVpc`).

**Client VPN**:

- Authentication: Active Directory, mutual (certificate) authentication, or SAML federated authentication; mutual authentication can be combined with AD or SAML, and both must then succeed. A server certificate in ACM is always required. MFA comes from the directory or the SAML IdP.
- **Authorization rules** grant access to a destination CIDR for all users or for a group (AD group SID or SAML group attribute). Access is denied by default, rules can only grant, the longest prefix match wins and `0.0.0.0/0` is evaluated last.
- Security groups on the target network associations, split tunnel to send only VPC routes through the tunnel, connection logs to CloudWatch Logs, and a client connect handler (Lambda) for extra checks at connection time.

> **Exam trap.** `aws:SourceIp` never matches requests that arrive through a VPC endpoint, because they carry private addresses. A bucket policy that allows only the corporate public range breaks after moving traffic to an endpoint; use `aws:SourceVpce` or `aws:VpcSourceIp`.

> **Exam tip.** Gateway endpoints cannot be reached from on-premises. "On-premises servers must reach S3 privately over Direct Connect" requires an S3 interface endpoint.

<!-- section: inter-node-encryption | objectives: 5.1.3 -->
## Encryption between resources and cluster nodes

**Nitro encryption.** Some Nitro-based instance types (for example C6i, M6i, R6i, C7g, M7i and newer generations) automatically encrypt traffic between instances with 256-bit AEAD, with no performance impact, when **all** of these are true: both instances are of a supported type, they are in the same Region, they are in the same VPC or peered VPCs, and the traffic does not pass through a virtual network device or service such as a load balancer or a transit gateway. Independently, AWS encrypts traffic between Availability Zones and between Regions at the physical layer, and cross-Region peering traffic is bulk-encrypted.

```bash
aws ec2 describe-instance-types \
  --filters Name=network-info.encryption-in-transit-supported,Values=true \
  --query "InstanceTypes[].InstanceType" --output text
```

| Service | Inter-node encryption |
| --- | --- |
| Amazon EMR | Security configuration with in-transit encryption: TLS for the open-source endpoints that support it; certificates managed by EMR, a PEM zip in S3, or a custom certificate provider class; some endpoints use SASL and need Kerberos; EMRFS traffic to S3 always uses TLS |
| Amazon EKS | Supported Nitro instance types for node-to-node traffic; mTLS between pods with a service mesh (for example Istio or Linkerd) and certificates from AWS Private CA through cert-manager; TLS on the ALB or NLB with ACM certificates at ingress |
| SageMaker AI | `EnableInterContainerTrafficEncryption` on training and hyperparameter tuning jobs, with self-referencing security group rules for UDP 500 and ESP (protocol 50); can lengthen distributed deep learning jobs, no effect on single-instance jobs |
| OpenSearch Service | Node-to-node encryption (TLS 1.2), required for fine-grained access control; can be enabled on existing domains, never disabled |
| Amazon MSK | Encryption between brokers on by default, chosen at cluster creation |

EMR security configuration with PEM certificates:

```json
{
  "EncryptionConfiguration": {
    "EnableInTransitEncryption": true,
    "EnableAtRestEncryption": false,
    "InTransitEncryptionConfiguration": {
      "TLSCertificateConfiguration": {
        "CertificateProviderType": "PEM",
        "S3Object": "s3://example-emr-config/certs/cluster-certs.zip"
      }
    }
  }
}
```

For EKS, AWS Private CA in short-lived certificate mode suits frequent mTLS certificate issuance, with validity aligned on pod lifetimes. Kubernetes network policies and security groups for pods control which pods talk to each other, but they do not encrypt.

> **Exam trap.** Nitro encryption stops at the first load balancer or transit gateway. When traffic between supported instances crosses a transit gateway, or when instance types are older, application-level TLS or a service mesh is still needed.

> **Exam tip.** "Encrypt the data exchanged between training instances in a distributed SageMaker AI job" is `EnableInterContainerTrafficEncryption`, not a KMS key on the training volume or the output bucket.

<!-- section: key-points -->
## Key points

- ELB: console default `ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09`, API and IaC default `ELBSecurityPolicy-2016-08`; TLS 1.3, FIPS and post-quantum policies exist; ALB mTLS verify or passthrough.
- CloudFront viewer and origin protocol policies; API Gateway enhanced security policies for REST APIs, `TLS_1_2` only for HTTP and WebSocket APIs.
- Resource policies with `aws:SecureTransport` and `s3:TlsVersion`; `rds.force_ssl` in a custom parameter group.
- Private access: gateway endpoints (S3, DynamoDB, VPC only), interface endpoints and endpoint services (PrivateLink), resource endpoints, endpoint policies, `aws:SourceVpce`.
- Client VPN: AD, certificate or SAML authentication, authorization rules deny by default with longest prefix match; Verified Access per application.
- Inter-node: Nitro encryption in the same or peered VPC without intermediate devices; EMR security configurations; EKS service mesh with Private CA; SageMaker AI inter-container encryption; OpenSearch node-to-node.
