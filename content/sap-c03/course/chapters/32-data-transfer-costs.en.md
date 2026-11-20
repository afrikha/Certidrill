In a multi-account, multi-Region estate, data transfer is often the line item that nobody owns: every gigabyte that crosses an Availability Zone, a Region, a NAT gateway, a transit gateway or an endpoint carries its own charge, and the charge lands in the account that sends it. SAP-C03 questions describe a traffic flow between accounts, Regions or on-premises sites and ask for the topology that keeps the requirement (privacy, availability, residency, RPO) at the lowest network cost. Prices below are AWS examples for US Regions; learn the structure and the relative order, not the cents.

<!-- section: content-delivery | objectives: 3.2.1 -->
## Content delivery, origins and caching

Amazon CloudFront lowers cost in two ways: origin fetches from AWS origins (S3, ELB, EC2) are not charged as data transfer out, and every cache hit is a request the origin never serves.

**Origin selection.**

| Content | Origin design |
| --- | --- |
| Static assets, downloads, video segments | S3 bucket reached only through origin access control |
| Dynamic application in private subnets | ALB or EC2 as a CloudFront VPC origin, no public exposure |
| Active-active application in two Regions | Route 53 latency-based record as the origin domain name, or per-request origin selection in Lambda@Edge |
| Origin outside AWS with limited bandwidth | Custom origin with Origin Shield in front of it |

**Caching strategy.** The cache key decides the hit ratio. Include in it only the headers, cookies and query strings that really change the response (a cache policy); forward anything else the origin needs through an origin request policy, which does not fragment the cache. Turn on compression, set long TTLs on versioned file names instead of paying for invalidations, and separate cache behaviors by path (`/static/*` long TTL, `/api/*` no caching).

**Origin Shield** adds one caching layer in front of an origin, in the Region with the lowest latency to it (the origin's own Region when supported). All regional edge caches go through it, so concurrent misses for the same object are collapsed into as few as one origin request. That reduces origin load and the cost of just-in-time packaging, image transformation and origin data transfer out.

- Charged per request that reaches Origin Shield as an extra layer; dynamic requests (PUT, POST, PATCH, DELETE, or TTL under 3,600 seconds) always pay; requests from the regional edge cache in the same Region as Origin Shield skip it at no charge.
- Good fit: viewers spread across geographies, live streaming or image processing origins, on-premises origins, multi-CDN setups. Poor fit: dynamic, low-cacheability or rarely requested content.

**Origin failover.** An origin group has a primary and a secondary origin. CloudFront fails over on configured status codes (400, 403, 404, 416, 429, 500, 502, 503, 504), on connection failure or on timeout, and only for GET, HEAD and OPTIONS requests. By default it tries the primary for up to 30 seconds (3 attempts of 10 seconds) before failing over; lower the connection timeout or attempts for faster failover. Every new request still tries the primary first. Each origin in a group can have its own Origin Shield.

```yaml
Origins:
  - Id: primary-eu-west-1
    DomainName: media-eu-west-1.s3.eu-west-1.amazonaws.com
    ConnectionAttempts: 2
    ConnectionTimeout: 5
    OriginShield:
      Enabled: true
      OriginShieldRegion: eu-west-1
```

> **Exam trap.** Origin failover does not protect writes: a POST or PUT to a failed primary is not retried on the secondary. A write path that must survive a Regional failure needs Route 53 failover or an active-active backend, not an origin group.

<!-- section: private-connectivity-costs | objectives: 3.2.2 -->
## Private connectivity and AZ-aware traffic

**Who pays for what.**

| Path | Cost structure (US example) |
| --- | --- |
| NAT gateway | $0.045 per hour per gateway (a regional NAT gateway bills per active AZ) plus $0.045 per GB processed, plus data transfer |
| Gateway endpoint for S3 or DynamoDB | No hourly or processing charge |
| Interface endpoint (PrivateLink) | About $0.01 per hour per AZ, plus $0.01 per GB for the first PB in the Region (lower tiers after) |
| Cross-AZ traffic in a VPC or over VPC peering | $0.01 per GB in each direction |
| Same-AZ traffic on private IP addresses | Free |
| Egress-only internet gateway for IPv6 | No processing charge, only data transfer out |

**Centralize or distribute?** Professional questions compare per-VPC resources with shared ones behind AWS Transit Gateway:

| Design | Saves | Adds |
| --- | --- | --- |
| Centralized egress VPC with NAT gateways reached through Transit Gateway | NAT gateway hours in every spoke VPC | Transit Gateway processing ($0.02 per GB) on top of NAT processing for every byte |
| Centralized interface endpoints in a shared services VPC, private hosted zones associated with spokes | Endpoint-hours multiplied by VPCs and AZs | Transit Gateway processing for endpoint traffic |
| Gateway endpoints in every VPC | All NAT processing for S3 and DynamoDB | Nothing (they cannot be shared across VPCs) |

Rule of thumb: many small VPCs with low traffic favor centralization (the fixed hourly charges dominate); a few VPCs pushing terabytes favor local endpoints and local NAT (the per-GB charges dominate). S3 and DynamoDB traffic should always use local gateway endpoints.

**AZ-aware architecture.** Keep a request inside the AZ where it arrived:

- One NAT gateway per AZ (or a regional NAT gateway), with each private route table pointing to its own AZ.
- Network Load Balancer cross-zone load balancing is off by default; enabling it adds cross-AZ charges.
- Use zonal DNS names of interface endpoints, and topology-aware routing in Amazon EKS, so clients reach a target in their AZ.
- Read replicas and caches per AZ for chatty read paths; place batch workers in the AZ of their data store when availability allows.

> **Exam tip.** "Reduce NAT gateway charges" with heavy S3 or DynamoDB traffic is answered by gateway endpoints, not by a centralized egress VPC: centralization removes hourly charges but adds Transit Gateway processing on every GB.

<!-- section: multi-region-replication | objectives: 3.2.3 -->
## Cost-aware multi-Region replication

Replicate only what the recovery or latency requirement needs, to only the Regions that need it, in the cheapest form that still meets the RPO.

**Amazon S3 replication charges.**

- Storage of the replica in the destination storage class, replication PUT requests and, for Cross-Region Replication, inter-Region data transfer out of the source Region.
- S3 Replication Time Control (replicates most objects within seconds, 15-minute SLA) adds a per-GB charge and replication metrics billed as CloudWatch custom metrics.
- S3 Batch Replication for existing objects adds S3 Batch Operations charges (example: $0.25 per job and $1.00 per million objects).
- Multi-Region Access Points add a data routing charge ($0.0033 per GB) on top of transfer.

Cost levers: filter rules by prefix or tag, replicate DR copies straight into a colder class (S3 Glacier Instant Retrieval or S3 Glacier Deep Archive, depending on the RTO), don't replicate delete markers when the copy is a safety net, and use RTC only when the stem states a replication time objective.

```json
{
  "Role": "arn:aws:iam::111122223333:role/s3-replication-finance",
  "Rules": [
    {
      "ID": "finance-dr-copy",
      "Status": "Enabled",
      "Priority": 1,
      "Filter": { "Prefix": "ledgers/" },
      "DeleteMarkerReplication": { "Status": "Disabled" },
      "Destination": {
        "Bucket": "arn:aws:s3:::anycompany-finance-dr-eu-central-1",
        "Account": "444455556666",
        "StorageClass": "GLACIER_IR",
        "AccessControlTranslation": { "Owner": "Destination" }
      }
    }
  ]
}
```

**Amazon DynamoDB global tables.** Each replica bills its own reads and storage, plus replicated writes: replicated write request units (on-demand) or replicated WCUs (provisioned). Cross-Region data transfer is charged. Reserved capacity can cover RCUs and WCUs of a global table but not replicated WCUs. Adding a replica bills a restore charge per GB. A replica with large, rarely read data can use the Standard-IA table class to cut storage (example: $0.10 instead of $0.25 per GB-month). Every additional Region multiplies the write bill, so a third Region should be justified by latency or a requirement, not added by default.

**Amazon Aurora Global Database.** Secondary Regions pay for their instances and storage, replicated write I/O operations (equal to the primary's writes) and data transfer. A secondary cluster sized small for DR is cheaper than a full-size one but lengthens the time to absorb production load after failover.

| Requirement | Cost-aware design |
| --- | --- |
| Object DR copy, RTO of hours | CRR of the needed prefixes to a Glacier storage class in one Region |
| Compliance needs a provable replication time | CRR with S3 RTC |
| Multi-Region writes for a global user base | DynamoDB global tables in the Regions that serve users |
| Relational DR with RPO of about a second, rare failover | Aurora Global Database with a smaller secondary |
| Existing objects must be copied once to a new Region | S3 Batch Replication |

> **Exam trap.** Same-Region Replication has no inter-Region transfer charge, but it does not survive a Regional outage. When the stem requires Regional resilience, SRR is wrong even though it is cheaper.

<!-- section: network-architecture-costs | objectives: 3.2.4 -->
## Network architecture pricing models

| Service | Hourly charge | Per-GB charge | Who pays |
| --- | --- | --- | --- |
| VPC peering | None | No processing; normal cross-AZ and inter-Region transfer rates | Each account for its own data transfer |
| AWS Transit Gateway | $0.05 per attachment-hour (US East (Ohio)) | $0.02 processing for data sent into the transit gateway from a VPC, Direct Connect, VPN or Network Firewall; none for data arriving from a peering attachment | Attachment owner pays hours; the sending side pays processing |
| AWS PrivateLink (interface endpoint) | About $0.01 per endpoint per AZ | Tiered processing from $0.01 | Consumer (endpoint owner); for cross-Region PrivateLink, the consumer also pays inter-Region transfer and the provider pays an hourly charge per active remote Region |
| Amazon VPC Lattice | $0.025 per service-hour; $0.10 per resource-hour for resource configurations | $0.025 per GB for services (inter-AZ included); $0.10 per million requests after 300,000 free per hour | Consumer pays the resource configuration charges |
| AWS Cloud WAN | $0.50 per core network edge-hour; attachment-hours (for example $0.065 per VPC attachment in US East (N. Virginia)) | $0.02 processing for data sent from VPC, VPN or Direct Connect | Billed per edge, per attachment and per GB, plus inter-Region transfer |

Transit Gateway inter-Region example: 1 GB from N. Virginia to Oregon over a peering attachment costs $0.02 of processing plus $0.02 of inter-Region transfer; the receiving transit gateway adds nothing.

| Situation | Cheapest design that meets it |
| --- | --- |
| Two VPCs exchange tens of TB a month | VPC peering (no processing charge) |
| Two hundred VPCs in many accounts need any-to-any routing | Transit Gateway shared through AWS RAM; peering would not scale to that mesh |
| One SaaS service consumed by hundreds of VPCs with overlapping CIDR ranges | PrivateLink endpoint service behind an NLB |
| Service-to-service HTTP calls across accounts with IAM authorization, no routing to manage | VPC Lattice service network |
| Global WAN across many Regions with segment policies | Cloud WAN |

Split cost allocation data can allocate NAT gateway, EC2 and VPC peering charges to the accounts that generated the traffic (see chapter 33), which makes shared network accounts easier to charge back.

> **Exam trap.** Transit Gateway is chosen for scale and central control, not price: for a single high-volume pair of VPCs it adds $0.02 per GB that peering does not charge. The "MOST cost-effective" answer for few VPCs with heavy traffic is peering.

<!-- section: ai-ml-transfer | objectives: 3.2.5 -->
## Data transfer for AI and ML workloads

**Bedrock cross-Region inference** routes requests through an inference profile to other Regions to gain throughput and resilience:

| Aspect | Geographic profile | Global profile |
| --- | --- | --- |
| Where requests run | A commercial Region within one geography (for example US, EU, APAC) | Any supported commercial Region worldwide |
| Price | Standard pricing | About 10 % savings |
| Routing cost | None; price of the Region from which you call the profile | None; same rule |
| SCP requirement | Allow every destination Region of the profile | Allow `aws:RequestedRegion` value `unspecified` |
| Choose for | Data residency rules | Cost optimization without geographic restriction |

Other facts: data stays on the AWS network and is encrypted between Regions; CloudTrail logs the request in the source Region, with `additionalEventData.inferenceRegion` showing where it ran; requests can be routed to Regions not enabled in the account; inference profiles do not support Provisioned Throughput.

**Keep data next to the model call.**

- Put the knowledge base, vector store and source documents of a RAG application in the Region from which inference is called, so retrieval does not cross Regions for every prompt.
- Stage batch inference input and output in an S3 bucket in the job's Region.
- Reach Bedrock and SageMaker AI endpoints from private subnets through interface endpoints when traffic is high: endpoint processing ($0.01 per GB) is cheaper than NAT processing ($0.045 per GB).
- Prompt cache entries live where the request was processed; cross-Region routing can write a new cache entry instead of reading one, so measure the cache hit rate before switching a cache-heavy workload to a global profile.
- Large model artifacts or training datasets should be copied once to the Region where they are used, not read across Regions by every job.

> **Exam tip.** "Lowest cost, no residency constraint" for Bedrock is a global cross-Region inference profile. "EU data must stay in the EU" is an EU geographic profile, with the organization's Region-restriction SCP updated to allow its destination Regions.

<!-- section: key-points -->
## Key points

- CloudFront: AWS origin fetches are free; tight cache keys and long TTLs on versioned names raise the hit ratio; Origin Shield collapses misses to one origin request.
- Origin groups fail over only GET, HEAD and OPTIONS; default 30 seconds before failover.
- NAT processing $0.045 per GB, interface endpoints $0.01 per GB, gateway endpoints free; cross-AZ $0.01 per GB each way.
- Centralized egress or endpoints save hourly charges but add $0.02 per GB of Transit Gateway processing.
- S3 CRR: destination storage, PUTs, inter-Region transfer, optional RTC; filter and replicate into colder classes. DynamoDB global tables multiply replicated writes per Region.
- Peering has no processing charge; Transit Gateway charges per attachment-hour and per GB sent; PrivateLink bills the consumer; VPC Lattice bills per service-hour, GB and request; Cloud WAN per edge-hour, attachment and GB.
- Bedrock cross-Region inference has no routing charge; global profiles save about 10 %, geographic profiles keep residency; SCPs must allow the destination Regions or `unspecified`.
