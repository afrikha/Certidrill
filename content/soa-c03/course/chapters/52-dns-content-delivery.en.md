An operator does not design the global DNS architecture; on the exam you are asked to make names resolve where they should, steer users with the right Route 53 record, prove what was queried with logs, and configure the edge services that sit in front of an application. Most questions turn on one setting that is missing or misplaced: a VPC attribute, a rule association, a health check, a certificate in the wrong Region or a cache behavior.

<!-- section: vpc-dns-resolver | objectives: 5.2.1 -->
## DNS inside a VPC and Route 53 Resolver

Every VPC has a built-in recursive resolver, which the Route 53 documentation now calls **Route 53 VPC Resolver** (the exam guide says Route 53 Resolver). Instances reach it at the VPC base address plus two (`10.0.0.2` in `10.0.0.0/16`) or at `169.254.169.253`. It answers for associated private hosted zones and VPC-specific names (EC2 DNS hostnames), forwards the domains that match a Resolver rule, and resolves every other public name recursively on the internet.

Two VPC attributes control it:

| Attribute | Effect | Needed for |
| --- | --- | --- |
| `enableDnsSupport` | The Amazon-provided resolver answers in the VPC | Everything below; without it nothing resolves through VPC+2 |
| `enableDnsHostnames` | Instances with public IPs get public DNS hostnames | Private hosted zones and interface endpoint private DNS (both attributes must be `true`) |

```bash
aws ec2 modify-vpc-attribute --vpc-id vpc-0a1b2c3d4e5f60789 --enable-dns-support "{\"Value\":true}"
aws ec2 modify-vpc-attribute --vpc-id vpc-0a1b2c3d4e5f60789 --enable-dns-hostnames "{\"Value\":true}"
```

**Private hosted zones** hold records visible only to the VPCs associated with them. Facts the exam uses:

- Split-view DNS: a public and a private hosted zone can share a name (`example.com`); the VPC sees the private records, the internet sees the public ones.
- With overlapping zones, the most specific zone wins (`accounting.example.com` over `example.com`). If the matching private zone has no record for the name and type, the resolver returns NXDOMAIN; it does not fall back to the public zone.
- Associating a VPC owned by another account cannot be done in the console: the zone owner runs `create-vpc-association-authorization`, the VPC owner runs `associate-vpc-with-hosted-zone`, then the zone owner can delete the authorization (the association stays).

**Hybrid DNS** uses Resolver endpoints, elastic network interfaces in your subnets:

| Need | Component | Configuration |
| --- | --- | --- |
| On-premises servers resolve private hosted zone records | Inbound endpoint | On-premises DNS servers forward the zone (conditional forwarder) to the endpoint IP addresses over VPN or Direct Connect |
| VPC workloads resolve on-premises names (`corp.example.internal`) | Outbound endpoint plus a forwarding rule | Rule type `FORWARD`, domain name, target IPs of the on-premises DNS servers, then associate the rule with each VPC |
| Same forwarding in many accounts | Share the rule through AWS RAM | Recipient accounts associate the shared rule with their VPCs; they can't edit or delete it |
| Same DNS settings on many VPCs | Route 53 Profiles | One Profile groups private hosted zones, Resolver rules, DNS Firewall rule groups, interface endpoints and query logging configurations; share it with AWS RAM |

Endpoint requirements: at least two IP addresses (AWS recommends two Availability Zones), and a security group allowing **TCP and UDP port 53** (plus 443 if you enable DNS over HTTPS on an inbound endpoint). The default `Recursive` rule (Internet Resolver) can't be deleted; system rules are created automatically for VPC names and reverse lookups.

```bash
aws route53resolver create-resolver-rule \
  --creator-request-id corp-fwd-01 \
  --name corp-forward \
  --rule-type FORWARD \
  --domain-name corp.example.internal \
  --target-ips "Ip=192.168.10.53,Port=53" "Ip=192.168.11.53,Port=53" \
  --resolver-endpoint-id rslvr-out-0a1b2c3d4e5f6789a

aws route53resolver associate-resolver-rule \
  --resolver-rule-id rslvr-rr-0a1b2c3d4e5f6789a \
  --vpc-id vpc-0a1b2c3d4e5f60789
```

> **Exam trap.** When a forwarding rule and a private hosted zone cover the same domain, the **rule wins**: queries go to on premises instead of the private zone. A rule that exists but is not associated with the VPC does nothing.

**Route 53 Resolver DNS Firewall** filters outbound DNS queries from VPCs. A rule group, associated with VPCs, contains rules with a domain list (your own or AWS managed lists such as `AWSManagedDomainsMalwareDomainList` and `AWSManagedDomainsBotnetCommandandControl`) and an action: **ALLOW**, **ALERT** (let through and log) or **BLOCK** with a response of NODATA, NXDOMAIN or OVERRIDE (a custom `CNAME`). Test a new block rule with ALERT first. The failure mode is **closed by default**: if DNS Firewall doesn't answer, the resolver returns SERVFAIL; enable fail open to favor availability.

<!-- section: routing-policies | objectives: 5.2.2 -->
## Records, routing policies and health checks

Record choice comes before routing policy:

| | Alias record | CNAME record |
| --- | --- | --- |
| Zone apex (`example.com`) | Allowed | Not allowed |
| Targets | AWS resources: ELB, CloudFront, S3 website, API Gateway, another record in the same zone... | Any DNS name |
| Query charge | None for alias queries to AWS resources | Charged |
| TTL | Not settable when the target is an AWS resource | You set it |

Routing policies:

| Policy | Behavior | Typical requirement |
| --- | --- | --- |
| Simple | One record, one or more values, no health check on the record | Single resource |
| Weighted | Proportional answers; weight 0 to 255 per record | Canary, gradual migration, A/B |
| Latency | Answer from the Region with the lowest latency for the resolver | Multi-Region app, fastest Region |
| Failover | Primary answered while healthy, otherwise secondary | Active-passive, maintenance page |
| Geolocation | By continent, country or US state; smallest area wins | Content or compliance by country |
| Geoproximity | By distance, adjusted with a bias from -99 to 99 | Shift traffic between locations gradually |
| IP-based | By client CIDR blocks grouped in a CIDR collection | Route a known ISP or office range |
| Multivalue answer | Up to eight healthy records chosen at random | Simple client-side load spreading with health checks |

In a private hosted zone you can use simple, failover, multivalue answer, weighted, latency, geolocation and geoproximity, but not IP-based routing.

Geolocation without a **default** location record returns "no answer" for unmatched locations and for IP addresses Route 53 can't map: always add a default record.

Health checks drive every policy except simple:

| Type | Checks | Use |
| --- | --- | --- |
| Endpoint | HTTP, HTTPS or TCP to an IP or domain, every 30 seconds (or 10 with fast interval), optional string match in the first 5,120 bytes | Public endpoints; Route 53 health checkers must reach it (allow their IP ranges) |
| Calculated | State of child health checks (for example healthy if 2 of 3) | Composite service health |
| CloudWatch alarm | State of an alarm's data stream | Private resources, or health based on any metric |

Route 53 health checkers run outside your VPC. To fail over a private resource, the classic answer is a health check on a CloudWatch alarm (for example on `StatusCheckFailed`); Route 53 also offers private endpoint health checks that run from a health check source you create in the VPC. For alias records pointing to an ELB, set **Evaluate target health** to `true` instead of creating a health check.

```json
{
  "Comment": "Primary record of an active-passive pair",
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "shop.example.com",
        "Type": "A",
        "SetIdentifier": "shop-primary",
        "Failover": "PRIMARY",
        "AliasTarget": {
          "HostedZoneId": "ZEXAMPLEELBZONE",
          "DNSName": "dualstack.shop-alb-1234567890.eu-west-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
```

> **Exam trap.** A record set with weights 0 and 100 never sends traffic to the 0 record while the other is healthy; and a weighted or failover record without health checking keeps answering with a dead endpoint. "Fail over automatically" always needs a health check or Evaluate target health.

<!-- section: zone-configuration-logging | objectives: 5.2.2 -->
## Hosted zone configuration and query logging

Configuration points that break resolution:

- **Delegation**: a domain registered elsewhere (or a recreated hosted zone, which gets four new name servers) resolves only after the registrar's NS records list the hosted zone's name servers. For a subdomain, create NS records in the parent zone pointing to the child zone's name servers.
- **TTL**: lower the TTL of a record before a planned change, so resolvers drop the old answer quickly.
- **DNSSEC signing** uses a key-signing key backed by an asymmetric customer managed KMS key with the `ECC_NIST_P256` key spec in **us-east-1**; after enabling signing, add the DS record at the parent zone (or registrar). Resolver-side DNSSEC validation is a separate VPC setting.

Two different query logs:

| | Public DNS query logging | Resolver query logging |
| --- | --- | --- |
| Logs | Queries that public resolvers send to Route 53 for a public hosted zone | Queries made from your VPCs (and through inbound or outbound endpoints), including DNS Firewall actions |
| Destination | CloudWatch Logs only, log group in **us-east-1** | CloudWatch Logs, Amazon S3 or Amazon Data Firehose |
| Caching effect | Queries answered from a resolver's cache never reach Route 53 | Answers served from the VPC Resolver cache are not logged |
| Fields | Hosted zone ID, name, type, response code, protocol, edge location, resolver IP, EDNS client subnet | VPC ID, source IP, instance ID, name, type, response code, answer, firewall action |
| Configure | On the hosted zone, with a resource policy that lets Route 53 write to the log group | A query logging configuration associated with VPCs; shareable with AWS RAM |

Use a CloudWatch Logs metric filter or Logs Insights on these logs to count NXDOMAIN responses, find which instance queries a suspicious domain, or confirm that a forwarding rule is used.

> **Exam tip.** "Which EC2 instance resolved a malicious domain" is Resolver query logging (it records the source instance), not public query logging and not VPC Flow Logs, which don't record traffic to the Amazon-provided DNS server.

<!-- section: cloudfront-configuration | objectives: 5.2.3 -->
## Configuring CloudFront distributions

A distribution combines origins and an ordered list of cache behaviors (path patterns, the last one being `*`). Operator settings:

| Setting | What to configure |
| --- | --- |
| Origins | S3 bucket with **origin access control (OAC)** and a bucket policy for the CloudFront service principal; custom origins (ALB, HTTP server) with origin protocol policy HTTP only, HTTPS only or Match viewer; **VPC origins** for an internal ALB, NLB or EC2 instance in a private subnet |
| Origin timeouts | Connection timeout 10 seconds (1 to 10), connection attempts 3, response timeout 30 seconds by default |
| Origin failover | Origin group: primary and secondary origin, failover status codes; applies to `GET`, `HEAD` and `OPTIONS` |
| Cache behavior | Path pattern, viewer protocol policy (Redirect HTTP to HTTPS, HTTPS only), allowed methods, cache policy, origin request policy, function associations |
| Alternate domain name | Certificate that covers the name in its SAN, from ACM in **us-east-1**; then an alias record to the distribution |
| Access control | Signed URLs (one file) or signed cookies (many files), geographic restrictions (allow or block list of countries), AWS WAF web ACL |
| Cost and reach | Price class (all edge locations, or a subset of cheaper regions) |
| Logs | Standard logging, real-time logs (see the troubleshooting chapter) |

To lock a custom origin to CloudFront, allow only the AWS-managed prefix list `com.amazonaws.global.cloudfront.origin-facing` in its security group, or require a secret custom header that CloudFront adds and the ALB checks in a listener rule.

```bash
aws acm request-certificate \
  --region us-east-1 \
  --domain-name www.example.com \
  --subject-alternative-names static.example.com \
  --validation-method DNS
```

> **Exam trap.** An ACM certificate requested in the Region of the ALB can't be attached to the distribution: CloudFront only lists certificates from us-east-1. If CloudFront connects to the ALB over HTTPS, the ALB still needs its own certificate in its own Region.

<!-- section: global-accelerator | objectives: 5.2.3 -->
## Configuring AWS Global Accelerator

A **standard accelerator** gives two static anycast IPv4 addresses (four with dual-stack) that enter the AWS network at the nearest edge location, then reach endpoints over the AWS backbone. Configuration hierarchy:

```text
Accelerator (static IPs, DNS name a1234abcd.awsglobalaccelerator.com)
  Listener (TCP or UDP, port ranges, client affinity NONE or SOURCE_IP)
    Endpoint group per Region (traffic dial 0-100 %, health check settings)
      Endpoints: ALB, NLB, EC2 instance, Elastic IP address (weight 0-255)
```

| Need | Setting |
| --- | --- |
| Drain a Region for maintenance or blue/green between Regions | Traffic dial of the endpoint group (0 % sends nothing) |
| Shift traffic between endpoints in one Region | Endpoint weights |
| Keep a user on the same endpoint | Client affinity `SOURCE_IP` |
| Applications must see the user's IP | Client IP address preservation (ALB, EC2 instances, NLB with security groups; not Elastic IP endpoints) |
| Map users to specific EC2 instances and ports (game sessions) | Custom routing accelerator |

Health: for ALB and NLB endpoints, Global Accelerator uses the load balancer's own health checks (an ALB is healthy if each target group has a healthy target); the endpoint group's health check settings apply only to EC2 instance and Elastic IP endpoints, and the checks come from Route 53 health checker ranges, which security groups must allow. If no endpoint is healthy, traffic is sent to all endpoints.

> **Exam tip.** CloudFront distributes cacheable HTTP content and needs DNS; Global Accelerator distributes TCP and UDP services through fixed IPs with failover in seconds and no DNS cache delay. "Allowlist two IP addresses" or "UDP game traffic" points to Global Accelerator.

<!-- section: key-points -->
## Key points

- VPC Resolver at VPC+2 or `169.254.169.253`; private hosted zones need `enableDnsSupport` and `enableDnsHostnames`.
- Inbound endpoint: on premises resolves AWS names. Outbound endpoint plus associated `FORWARD` rule: VPC resolves on-premises names. Port 53 TCP and UDP, two IPs minimum. Rules beat private zones; share rules with AWS RAM.
- DNS Firewall: ALLOW, ALERT, BLOCK (NODATA, NXDOMAIN, OVERRIDE); fail closed by default.
- Alias at the apex and for AWS targets; routing policy follows the requirement; health checks or Evaluate target health make failover work; geolocation needs a default record.
- Public query logs: CloudWatch Logs in us-east-1. Resolver query logs: CloudWatch Logs, S3 or Firehose, with source instance.
- CloudFront: OAC, VPC origins, origin groups, cache and origin request policies, ACM certificate in us-east-1, managed prefix list on origin security groups.
- Global Accelerator: static anycast IPs, traffic dial per Region, weights per endpoint, client IP preservation, ELB health checks for load balancer endpoints.
