Network questions at the specialty level rarely ask what a security group is. They describe traffic that must be allowed, blocked, inspected or proven absent, often across accounts, on-premises sites and another cloud, and ask for the control placed at the right layer: a stateful rule on an interface, a stateless rule on a subnet, deep inspection in a firewall, an encrypted link, per-request access to one application, or an analysis that proves no unintended path exists. This chapter follows that order: traffic controls, hybrid links, workload access from hybrid environments, segmentation, and finding network access that should not exist.

<!-- section: traffic-controls | objectives: 3.3.1 -->
## Controls that permit or prevent traffic

| Control | Layer and scope | Behaviour | Typical use |
| --- | --- | --- | --- |
| Security group | Network interface (instances, endpoints, load balancers, Lambda in a VPC, RDS) | Stateful, allow rules only, all rules evaluated together | Least-privilege access per tier, referencing other security groups |
| Network ACL | Subnet | Stateless, numbered allow and deny rules, lowest number first, final `*` deny | Block an address range for a whole subnet, coarse guardrails |
| AWS Network Firewall | Firewall endpoints in dedicated subnets, traffic steered by route tables | Stateful inspection with Suricata-compatible rules, domain filtering, optional TLS inspection | Egress filtering by domain, IPS signatures, central inspection between VPCs |
| Route 53 Resolver DNS Firewall | DNS queries leaving a VPC through the Resolver | Domain lists with ALLOW, BLOCK or ALERT actions | Block known malicious domains and DNS exfiltration |
| AWS WAF | HTTP layer on CloudFront, ALB, API Gateway, AppSync, Cognito, Verified Access | Rules on requests (managed, rate-based, custom) | Web exploits, bots, layer 7 floods |

**Security groups.** A new security group has no inbound rule and one outbound rule allowing everything. Rules can reference a prefix list or another security group. Inbound references work in the same VPC, across a VPC peering connection or across a transit gateway; outbound references work only in the same VPC or across peering. The default quotas are 60 inbound and 60 outbound rules per group and 5 groups per network interface (up to 16), and the product of the two cannot exceed 1,000.

**Network ACLs.** The default network ACL allows all traffic in both directions; a custom network ACL denies everything until you add rules. Because they are stateless, return traffic needs its own rule, usually the ephemeral port range `1024-65535` outbound for a server and inbound for a client. The default quota is 20 rules per direction, adjustable up to 40.

**Network Firewall.** Each firewall has an endpoint in each Availability Zone you select, in a dedicated subnet that holds nothing else, and you insert it in the path by editing route tables (including an internet gateway edge-associated route table for inbound inspection). Two policy kinds exist: **Next Generation** policies, recommended for new firewalls, use a firewall engine (drop by default) for access control and an IPS engine (pass by default) for threat detection, without stateless rule groups; **Classic** policies, still fully supported, combine a stateless engine and a stateful engine. A firewall uses one kind or the other. Stateful rules can allow or block domains by TLS SNI or HTTP Host header; TLS inspection decrypts traffic with certificates from AWS Certificate Manager when the payload itself must be inspected.

Troubleshooting order for "traffic does not arrive": route tables (a symmetric path through the firewall), network ACLs of both subnets in both directions, security groups on both ends, firewall rules and alert logs. VPC Flow Logs show `REJECT` records for traffic denied by security groups or network ACLs.

> **Exam trap.** Removing a security group rule does not cut existing tracked connections: they continue until they time out. To stop traffic from a compromised host immediately, add deny rules in the subnet's network ACL (stateless rules apply to every packet). Switching the instance to an empty isolation security group alone leaves tracked sessions open.

> **Exam tip.** "Deny one IP address range" is never a security group answer, because security groups have no deny rule. Use a network ACL for a subnet, AWS WAF for HTTP requests, or Network Firewall for inspected paths.

<!-- section: hybrid-connectivity | objectives: 3.3.2 -->
## Secure connectivity for hybrid and multi-cloud networks

| Requirement | Design |
| --- | --- |
| Encrypted link over the internet, quick to set up | AWS Site-to-Site VPN: IPsec, two tunnels per connection terminated in different Availability Zones, to a virtual private gateway or a transit gateway |
| Consistent bandwidth and latency, private path | AWS Direct Connect (dedicated or hosted connection) with private or transit virtual interfaces |
| Direct Connect plus IPsec encryption, no public IP addresses | Private IP Site-to-Site VPN over a transit virtual interface, terminated on a transit gateway |
| Direct Connect encrypted at layer 2, at line rate | MACsec on a dedicated connection |
| Another cloud provider | Site-to-Site VPN between the transit gateway and the other cloud's VPN gateway, or Direct Connect through a colocation or partner, encrypted with IPsec |

**Direct Connect is not encrypted by default.** Two ways to encrypt it:

- **MACsec** (IEEE 802.1AE) encrypts the Ethernet link between your router and the AWS device. It is available on dedicated connections of 10, 100 and 400 Gbps at selected locations, on LAGs of MACsec-capable connections of the same bandwidth, and through partner interconnects, but **not on hosted connections**. You generate a CKN/CAK pair (static CAK mode only); Direct Connect stores it in AWS Secrets Manager, and a keychain holds up to three pairs for rotation. The encryption mode `should_encrypt` (default) falls back to clear traffic if negotiation fails; `must_encrypt` drops traffic instead. MACsec protects the hop to AWS, not the end-to-end path.
- **Private IP VPN**: IPsec tunnels over a transit virtual interface, with private (RFC 1918 or RFC 6598) tunnel addresses on both sides. You need a transit gateway with a private CIDR for the connection, a Direct Connect gateway associated with it (the CIDR in the allowed prefixes) and a customer gateway device. It avoids the older design of a VPN over a public virtual interface, which exposes public endpoints and needs public IP addresses.

> **Exam trap.** "Encrypt traffic on the existing 1 Gbps hosted Direct Connect connection" cannot be MACsec. The answer is an IPsec VPN over Direct Connect (private IP VPN with a transit gateway).

> **Exam tip.** Regulators who require encryption "without traversing the public internet and without public IP addresses" point to private IP VPN over Direct Connect, not a standard Site-to-Site VPN.

<!-- section: hybrid-workload-access | objectives: 3.3.3 -->
## Workload access between hybrid environments and AWS

A VPN or Direct Connect link joins whole networks; the exam asks you to narrow access to what each workload needs.

**AWS Verified Access** gives users access to specific applications in AWS without a VPN, evaluating **every request** against identity and device posture:

- **Instance**: evaluates requests. It has **one user-identity trust provider** (IAM Identity Center or an OIDC provider) and can have **several device trust providers** (CrowdStrike, Jamf, JumpCloud).
- **Groups** collect endpoints with the same security requirements; the **group policy** applies to all of them, and an **endpoint policy** can add conditions for one application. Policies are written in Cedar against the trust data (claims such as email, group, device OS version, risk score).
- **Endpoints**: load balancer, network interface, network CIDR, or Amazon RDS (instance, cluster or proxy).
- HTTP(S) applications are reached from a browser; non-HTTP applications (SSH, RDP, database clients over TCP) through the **Connectivity Client** (Windows and macOS) and a TCP endpoint.
- Requests are **denied by default** until a policy allows them, every attempt is logged (CloudWatch Logs, S3 or Data Firehose), and AWS WAF can protect HTTP endpoints.

```text
permit(principal, action, resource)
when {
  context.idc.groups has "8f3e1a2b-4c5d-4e6f-9a0b-1c2d3e4f5a6b" &&
  context.idc.user.email.verified == true &&
  context.jamf.risk == "LOW"
};
```

Other hybrid workload controls:

| Need | Control |
| --- | --- |
| On-premises servers call AWS APIs without the internet | Interface VPC endpoints reached over Direct Connect or VPN, with Route 53 Resolver inbound endpoints for DNS |
| Administrators reach EC2 without inbound ports or bastions | Systems Manager Session Manager (TLS 1.2, IAM authorization, session logs) |
| On-premises workloads need AWS credentials | IAM Roles Anywhere with X.509 certificates (see chapter 42) |
| Only the corporate network can reach a resource | Security groups on the AWS side limited to on-premises CIDRs or prefix lists, plus `aws:SourceVpce` or `aws:SourceIp` in resource policies |
| Inspect traffic between the data center and VPCs | Network Firewall or a Gateway Load Balancer appliance in an inspection VPC attached to the transit gateway |

> **Exam trap.** Verified Access authorizes access to applications; it does not connect networks or carry server-to-server traffic. Replication between a data center and a VPC still needs VPN or Direct Connect, restricted by security groups and routing.

<!-- section: segmentation | objectives: 3.3.4 -->
## Network segmentation

**North/south** traffic crosses the boundary of your network (internet, partners, on-premises); **east/west** traffic moves between VPCs, subnets or workloads inside it.

| Direction | Controls |
| --- | --- |
| Inbound from the internet | Only load balancers or CloudFront in public subnets; AWS WAF and Shield Advanced on the entry point; Network Firewall with an internet gateway route table for packet inspection |
| Outbound to the internet | NAT gateway in a central egress VPC, Network Firewall with domain allow lists, DNS Firewall; no direct internet route from workload subnets |
| Between VPCs | Separate transit gateway route tables per environment (production cannot route to development), blackhole routes, an inspection VPC with Network Firewall and **appliance mode** on its attachment for symmetric flows, or a transit gateway-attached firewall; AWS Cloud WAN segments for global networks |
| Between tiers in a VPC | Security groups that reference each other (web to app to database), network ACLs as a coarse layer |
| Between pods | Kubernetes network policies (VPC CNI with network policy enabled) and security groups for pods |

**Isolated subnets** have a route table with only the `local` route (and gateway endpoint prefix lists): no internet gateway, no NAT gateway. Workloads reach AWS services through VPC endpoints. To make "no internet access" an account-wide control rather than a routing convention, enable **VPC Block Public Access** in each Region:

- **Bidirectional** mode blocks all traffic through internet gateways and egress-only internet gateways.
- **Ingress-only** mode blocks inbound internet traffic but keeps outbound connections through NAT gateways and egress-only internet gateways.
- **Exclusions** let a specific VPC or subnet keep bidirectional or egress-only access.

AWS Firewall Manager applies the same security group, Network Firewall, DNS Firewall, WAF and Shield Advanced policies to every account of an organization, including accounts created later.

> **Exam trap.** A transit gateway with one route table that propagates every attachment gives full east/west connectivity. Segmentation needs separate route tables (associations and propagations per environment); security groups alone do not stop routing between production and development.

<!-- section: unnecessary-access | objectives: 3.3.5 -->
## Identifying unnecessary network access

| Tool | Answers | Notes |
| --- | --- | --- |
| Network Access Analyzer | Which paths violate my intent (for example, anything reachable from an internet gateway except the web tier)? | Network Access Scopes with `MatchPaths` and `ExcludePaths`; criteria on resource IDs, types, tags, CIDRs, ports, protocols; billed per network interface analyzed |
| Amazon Inspector network reachability findings | Which ports of my EC2 instances are reachable from the VPC edge? | EC2 only; paths from internet gateways (including behind ALB or Classic Load Balancer), VPC peering, VPN through a virtual private gateway; rescanned every 12 hours |
| AWS Config rules and Security Hub CSPM controls | Which security groups allow `0.0.0.0/0` to SSH, RDP or high-risk ports? | Managed rules such as `restricted-ssh`, `vpc-sg-open-only-to-authorized-ports`; auto-remediation with Systems Manager Automation |
| Firewall Manager security group policies | Which rules are overly permissive (content audit) or which groups are unused or redundant (usage audit)? | Organization-wide, with optional automatic remediation |
| VPC Flow Logs | Which allowed rules carry no traffic, and who probes what? | Evidence before removing a rule |
| Verified Access | How do I remove broad VPN reachability for users? | Per-application access instead of network access |

Network Access Analyzer proves segmentation requirements ("production and development are isolated", "every path to the internet goes through the firewall"), and its findings are the paths that match a `MatchPaths` entry and no `ExcludePaths` entry:

```bash
aws ec2 create-network-insights-access-scope \
  --match-paths '[{"Source":{"ResourceStatement":{"ResourceTypes":["AWS::EC2::InternetGateway"]}}}]' \
  --exclude-paths '[{"Destination":{"ResourceStatement":{"Resources":["sg-0web1234567890abc"]}}}]'

aws ec2 start-network-insights-access-scope-analysis \
  --network-insights-access-scope-id nis-0123456789abcdef0
```

> **Exam trap.** Reachability Analyzer tests one source and one destination ("why can't A reach B?"). Network Access Analyzer searches all paths that break a policy ("show everything reachable from the internet"). Questions about proving the absence of unintended paths across a VPC point to Network Access Analyzer.

> **Exam tip.** Inspector network reachability findings are the answer when the requirement is continuous detection of EC2 ports open to the internet together with vulnerability findings for the same instances.

<!-- section: key-points -->
## Key points

- Security groups: stateful, allow only, references across peering and (inbound) transit gateways; network ACLs: stateless, ordered, deny capable, need ephemeral ports.
- Removing a security group rule keeps tracked connections; a network ACL deny cuts traffic immediately.
- Network Firewall: Next Generation policies recommended for new firewalls, Classic still supported; domain filtering by SNI or Host; TLS inspection with ACM certificates; appliance mode for central inspection.
- Direct Connect is unencrypted by default: MACsec on dedicated 10/100/400 Gbps connections (not hosted), or private IP VPN over a transit virtual interface.
- Verified Access: one identity trust provider, several device trust providers, Cedar group and endpoint policies, deny by default, Connectivity Client for TCP.
- Segmentation: separate transit gateway route tables, inspection VPCs, isolated subnets with endpoints, VPC Block Public Access, Firewall Manager across the organization.
- Unnecessary access: Network Access Analyzer for intent-based path analysis, Inspector for EC2 ports reachable from the edge, Config and Firewall Manager audits for permissive rules.
