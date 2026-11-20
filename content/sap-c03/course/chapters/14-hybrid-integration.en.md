Hybrid questions describe an organization that keeps data centers, branch sites or legacy platforms while it builds on AWS. They test whether the design survives a failure, moves data at the right pace, resolves names both ways and runs compute where it must run. Look for the deciding constraint: an availability target, an encryption rule, a route count, a protocol that cannot change or a site that may lose its link to the Region.

<!-- section: hybrid-connectivity | objectives: 1.3.1 -->
## Redundant hybrid connectivity

The building blocks combine rather than compete:

| Component | Role in a hybrid design |
| --- | --- |
| AWS Direct Connect connection | Physical port at a Direct Connect location, dedicated (1, 10, 100 or 400 Gbps) or hosted through a partner |
| Virtual interface (VIF) | Private VIF to one virtual private gateway or a Direct Connect gateway, transit VIF to a Direct Connect gateway associated with transit gateways, public VIF to AWS public endpoints |
| Direct Connect gateway | Global resource that acts as a set of BGP route reflectors outside the data path; associates with up to 6 transit gateways or up to 20 virtual private gateways, or with an AWS Cloud WAN core network |
| AWS Transit Gateway | Regional router that joins VPC, Site-to-Site VPN, Direct Connect gateway, Connect and peering attachments with route tables for segmentation |
| AWS Site-to-Site VPN | Two IPsec tunnels per connection, each up to 1.25 Gbps (standard) or 5 Gbps (large bandwidth tunnel) |

**Direct Connect resiliency models** (Resiliency Toolkit wording, SLA only if the SLA requirements are met):

| Model | Topology | Survives | SLA target |
| --- | --- | --- | --- |
| Maximum resiliency | Separate connections terminating on separate devices in more than one Direct Connect location | Device, connection and complete location failure | 99.99% |
| High resiliency | One connection at each of two or more locations | Fiber cut, device failure, location failure | 99.9% |
| Development and test | Separate connections on separate devices in one location | Device failure only | None stated |

The Resiliency Toolkit enforces equal speeds, refuses two dedicated connections on one device, and runs failover tests that bring a BGP session down to prove the backup path.

**Route selection.** On a transit gateway, the longest prefix wins first. For the same prefix, static routes beat propagated ones, and among propagated routes the order is VPC, then Direct Connect gateway, then Connect, then Site-to-Site VPN over private Direct Connect, then Site-to-Site VPN. A VPN that advertises the same prefixes as Direct Connect is therefore a passive backup by default: its routes appear only when the Direct Connect routes are withdrawn. Within one attachment type, BGP attributes decide (shorter AS path, then lower MED; default MED 0 on Direct Connect, 100 on VPN). To steer traffic from AWS towards one of two Direct Connect paths, advertise a more specific prefix, prepend the AS path on the backup, or tag routes with the local preference communities `7224:7100` (low), `7224:7200` (medium) and `7224:7300` (high).

ECMP aggregates VPN tunnels on a transit gateway only with BGP, never across attachment types. A 10 Gbps Direct Connect backed by one VPN loses most of its bandwidth on failover: "same throughput during failover" requires a second Direct Connect connection.

**Encryption and route scale.**

- Direct Connect is not encrypted by default. Use MACsec on supported dedicated connections, or a **private IP Site-to-Site VPN**: IPsec over a transit VIF to a transit gateway, with private tunnel addresses, no third-party appliance, and 5,000 routes towards the customer gateway and 1,000 from it.
- Quotas that decide designs: 100 routes per BGP session from on premises on a private or transit VIF by default (up to 1,000 with prefix controls); 200 prefixes per transit gateway from AWS to on premises on a transit VIF; up to 5,000 prefixes advertised when the Direct Connect gateway attaches to a Cloud WAN core network. Exceeding the configured allocation puts the BGP session down, so summarize routes.

| Requirement | Design |
| --- | --- |
| 99.99% availability for hybrid traffic | Two Direct Connect locations, two devices, separate connections (maximum resiliency) |
| Lowest cost backup, degraded bandwidth accepted | Direct Connect plus Site-to-Site VPN on the same transit gateway |
| Encryption over Direct Connect without public IP addresses | Private IP VPN over a transit VIF to the transit gateway |
| Many VPCs in several Regions over one Direct Connect | Transit VIF, Direct Connect gateway, one transit gateway per Region (or Cloud WAN) |

> **Exam trap.** Two connections in the same Direct Connect location, even on separate devices, are the development and test model. Any stem that asks to survive a location failure needs a second location.

<!-- section: data-synchronization | objectives: 1.3.2 -->
## Data synchronization for hybrid workloads

Choose by direction, protocol and whether on-premises users keep working on the data:

| Service | What it does | Fits |
| --- | --- | --- |
| AWS DataSync | Scheduled or on-demand copy jobs between NFS, SMB, HDFS or object storage and S3, EFS or FSx; also between AWS storage services and from other clouds | Migrations, recurring replication, archive to S3 Glacier storage classes, feeding cloud processing |
| Amazon S3 File Gateway | NFS or SMB share on premises, files stored as S3 objects, local cache for recent data | On-premises applications that write files that cloud services must read in S3 |
| Volume Gateway | iSCSI block volumes; cached mode keeps primary data in AWS, stored mode keeps it on premises with asynchronous backups as EBS snapshots | Block storage backup and disaster recovery |
| Tape Gateway | Virtual tape library for existing backup software, tapes archived in AWS | Replacing physical tapes without changing the backup application |
| AWS Transfer Family | Managed SFTP, FTPS, FTP and AS2 endpoints in front of S3 or EFS, web apps for browser access, managed workflows after upload | Partners and B2B flows that must keep their protocol and clients |
| AWS Data Transfer Terminal | Physical facility where you bring your own storage devices and upload over its network | Large datasets captured in the field when the network is too slow |

DataSync details that decide answers:

- An agent (VM or EC2 instance) is needed for NFS, SMB, HDFS and on-premises object storage; it can use a VPC endpoint over Direct Connect or VPN.
- **Enhanced mode** lists, transfers and verifies in parallel with virtually unlimited objects per execution; **Basic mode** has file quotas and is required for S3 on Outposts. The mode is fixed at task creation.
- Tasks copy changed data only, verify integrity, encrypt in transit and can be throttled.

Amazon FSx File Gateway is no longer available to new customers: on-premises users reach FSx for Windows File Server directly over Direct Connect or VPN. Snow Family devices are not offered to new customers: for offline transfer, use Data Transfer Terminal. NetApp filers replicate to FSx for NetApp ONTAP with SnapMirror.

> **Exam trap.** DataSync moves data; it does not present a share. If on-premises applications must keep writing through NFS or SMB while the cloud reads the same data in S3, the answer is S3 File Gateway. If the files only need to land in AWS on a schedule, DataSync is simpler.

<!-- section: legacy-integration | objectives: 1.3.3 -->
## Integration patterns to modernize legacy systems

Legacy systems rarely change their interface, so the integration layer adapts the data:

| Legacy constraint | Pattern |
| --- | --- |
| SOAP or XML backend, consumers want JSON REST | API Gateway REST API with mapping templates (VTL, up to 300 KB) that transform request and response, or a Lambda function that converts formats |
| Backend reachable only on the private network | REST API private integration through a VPC link to an NLB, which reaches on premises over Direct Connect or VPN |
| Applications speak JMS, AMQP, MQTT, STOMP or OpenWire | Amazon MQ (ActiveMQ Classic or RabbitMQ): migrate the broker without rewriting messaging code |
| Cloud-native consumers must react to broker messages | EventBridge Pipes with Amazon MQ as source, optional filtering, enrichment and input transformation, then a target such as Step Functions or an event bus |
| Legacy database is the only source of change events | AWS DMS change data capture into Kinesis Data Streams, consumed by Lambda |
| Replace a monolith gradually | Strangler fig: API Gateway or an ALB routes migrated paths to new services, the rest to the legacy system |
| Mainframe or .NET Framework code itself must be modernized | AWS Transform (mainframe, VMware, .NET transformations) |

API Gateway limits: integration timeout 50 ms to 29 seconds, raisable through Service Quotas for Regional and private REST APIs (not edge-optimized); payload 10 MB. For a legacy call that runs for minutes, return `202 Accepted`, queue the request in SQS and let a worker call the backend while the client polls.

Amazon MQ offers active/standby ActiveMQ brokers across two AZs, RabbitMQ clusters with quorum queues, and cross-Region data replication for ActiveMQ. For new designs without a broker protocol, prefer SQS, SNS or EventBridge: serverless, no broker sizing.

> **Exam tip.** "Without changing the application code" plus an existing JMS or AMQP application points to Amazon MQ, not SQS. "Transform the payload between XML and JSON with the least code" points to API Gateway mapping templates.

<!-- section: hybrid-dns | objectives: 1.3.4 -->
## DNS for hybrid environments

Route 53 Resolver, documented today as **Route 53 VPC Resolver**, answers at the VPC base address +2 for VPC names, private hosted zones and public names. Hybrid resolution adds endpoints and rules:

| Need | Component |
| --- | --- |
| On-premises clients resolve private hosted zones | **Inbound endpoint**: on-premises DNS servers conditionally forward the AWS zone to the endpoint IP addresses |
| VPC workloads resolve on-premises names | **Outbound endpoint** plus a **forwarding rule** for the on-premises domain, associated with each VPC |
| One domain under a forwarded parent must stay in AWS | **System rule** for the subdomain (the most specific rule wins) |
| Many accounts reuse the same rules | Share rules with AWS RAM; each account associates them with its VPCs in the same Region |
| Same private hosted zones, rules and DNS Firewall rule groups for hundreds of VPCs | **Route 53 Profiles** shared through RAM (up to 1,000 VPCs per Profile, 2 Profiles per VPC) |
| Same name answers differently inside and outside | **Split-horizon**: public and private hosted zones with the same domain name |

Design rules:

- Endpoints are Regional, need at least two IP addresses (place them in different AZs) and accept up to 6. Each IP address handles up to 10,000 UDP queries per second, much less when security groups track connections; add addresses as query volume grows.
- Centralize: endpoints in a shared networking VPC, rules shared with the organization, workload VPCs connected to the hub by a transit gateway.
- A private hosted zone associates with up to 300 VPCs, including VPCs of other accounts (authorize in the zone account, then associate from the VPC account); beyond that, use Profiles.
- Split-horizon behavior: inside an associated VPC, the private zone answers. A name missing from the private zone returns NXDOMAIN; VPC Resolver does not fall back to the public zone.

```bash
# Network account: share the outbound forwarding rule with the organization
aws ram create-resource-share \
  --name corp-dns-forwarding \
  --resource-arns arn:aws:route53resolver:eu-west-1:111122223333:resolver-rule/rslvr-rr-0example \
  --principals arn:aws:organizations::111122223333:organization/o-exampleorg

# Workload account: attach the shared rule to a local VPC
aws route53resolver associate-resolver-rule \
  --resolver-rule-id rslvr-rr-0example \
  --vpc-id vpc-0workload
```

> **Exam trap.** A transit gateway carries DNS packets but does not resolve private hosted zone names for attached VPCs. Name resolution across VPCs comes from zone associations, shared Resolver rules or Profiles, never from the transit gateway itself.

<!-- section: hybrid-compute | objectives: 1.3.5 -->
## Hybrid compute patterns

| Option | Where it runs | Control plane | Fits |
| --- | --- | --- | --- |
| AWS Outposts racks | 42U racks installed and maintained by AWS on premises | Parent Region, through the service link | Local processing, data residency, low latency to on-premises systems (EC2, EBS, S3 on Outposts, RDS, ECS, EKS, ALB) |
| AWS Outposts servers | 1U or 2U servers installed by the customer | Parent Region | Retail stores, branch sites, small capacity (EC2, ECS) |
| AWS Local Zones | AWS-operated zones in metro areas, attached to a parent Region | Parent Region | Single-digit-millisecond latency for users in a city without a Region |
| Amazon EKS Hybrid Nodes | Your servers or VMs join an EKS cluster | AWS-managed EKS control plane | Reliable connectivity to AWS, one Kubernetes operating model; not for disconnected sites |
| Amazon EKS Anywhere | vSphere, bare metal, Nutanix | Self-managed, on premises | Disconnected or air-gapped sites; optional enterprise subscription for support |
| Amazon ECS Anywhere | External instances registered with SSM Agent and the ECS agent, `EXTERNAL` launch type | ECS control plane in the Region | Running ECS tasks on existing servers |

Constraints the exam checks:

- An Outpost extends one AZ of its Region and is managed through the service link: plan redundant connectivity to the Region.
- EKS Hybrid Nodes need a reliable connection (Site-to-Site VPN, Direct Connect or your own VPN), routable remote node and pod CIDRs (up to 15 each), and use Systems Manager hybrid activations or IAM Roles Anywhere for node credentials. They are billed per vCPU-hour; running them on AWS or other clouds is not supported.
- ECS Anywhere supports `bridge`, `host` and `none` network modes only: no `awsvpc`, no Elastic Load Balancing integration, no service discovery, no EFS volumes, no capacity providers. Put your own load balancer in front of external instances.

> **Exam trap.** "Kubernetes on premises with an AWS-managed control plane" is EKS Hybrid Nodes; "must keep running with no connection to AWS" is EKS Anywhere. An ECS Anywhere service can't register its tasks with a load balancer.

<!-- section: key-points -->
## Key points

- 99.99% = separate connections and devices in at least two Direct Connect locations; one location is the development and test model.
- Transit gateway order: longest prefix, static, VPC, Direct Connect gateway, Connect, VPN over Direct Connect, VPN. A VPN backup carries traffic only after Direct Connect routes are withdrawn.
- Encrypt Direct Connect with MACsec or private IP VPN; mind the 100-route default per BGP session.
- DataSync copies, S3 File Gateway shares, Transfer Family keeps partner protocols; FSx File Gateway and Snow devices are closed to new customers.
- Legacy: mapping templates or Lambda, Amazon MQ, EventBridge Pipes, strangler fig, asynchronous calls beyond 29 seconds.
- DNS: inbound endpoint (on premises to AWS), outbound endpoint and rules (AWS to on premises), RAM or Profiles to scale.
- EKS Hybrid Nodes need connectivity, EKS Anywhere runs disconnected; ECS Anywhere has no `awsvpc` and no load balancer integration.
