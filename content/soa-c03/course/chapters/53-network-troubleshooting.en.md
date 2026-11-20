Network troubleshooting questions give a symptom (timeout, 502, stale page, tunnel down, slow users) and evidence (a route table, a log line, a metric). Follow the packet hop by hop, name the component that drops or delays it, and pick the smallest fix or the right tool. A timeout usually means something silently dropped the traffic; an HTTP error means the traffic arrived and something answered.

<!-- section: vpc-path | objectives: 5.3.1 -->
## Troubleshooting VPC configurations

Check the path in this order, in both directions:

| Hop | What to verify | Typical fault |
| --- | --- | --- |
| Route table of the source subnet | A route for the destination (`local`, internet gateway, NAT gateway, peering, transit gateway, virtual private gateway, endpoint) | Missing route to the peer CIDR; private instance routed to an internet gateway |
| Security group (stateful) | Inbound rule on the destination port from the source (CIDR, prefix list or security group); return traffic is automatic | Rule allows the wrong port or the wrong source security group |
| Network ACL (stateless, rules evaluated by number, first match wins) | Inbound and outbound rules in both subnets, including **ephemeral ports 1024-65535** for responses | Custom NACL allows port 443 inbound but not ephemeral ports outbound |
| Public access | Public subnet, public IPv4 or Elastic IP, internet gateway attached | Instance in a "public" subnet without a public IP |

Component-specific faults:

- **NAT gateway**: in a public subnet whose route table sends `0.0.0.0/0` to the internet gateway; private subnets route `0.0.0.0/0` to it. Idle connections time out after 350 seconds (RST): enable TCP keepalive. `ErrorPortAllocation` above zero means port exhaustion (55,000 concurrent connections per IPv4 address to one destination): add secondary IPv4 addresses or more NAT gateways.
- **VPC peering**: routes on both sides, rules allowing the peer CIDR, no overlapping CIDRs, no transitive or edge-to-edge routing.
- **Transit gateway**: the VPC subnet route table must point to the `tgw-` ID; the attachment must be **associated** with a transit gateway route table that has a route to the destination (propagated or static), and the destination attachment must have a route back. A blackhole route drops matching traffic. Give the attachment a subnet in every AZ that sends traffic; enable **appliance mode** for stateful appliances in an inspection VPC.

Diagnostic tools:

| Tool | Answers |
| --- | --- |
| VPC Reachability Analyzer | Is there a path from this source to this destination? It analyzes configuration only, sends no packets, and names the blocking component (route table, security group, NACL, load balancer) |
| Network Access Analyzer | Which unintended paths exist (for example every path from the internet to a database subnet)? |
| VPC Flow Logs | Did packets actually reach the ENI, and were they accepted or rejected? |

```bash
aws ec2 create-network-insights-path \
  --source i-0123456789abcdef0 \
  --destination i-0fedcba9876543210 \
  --protocol tcp --destination-port 5432

aws ec2 start-network-insights-analysis \
  --network-insights-path-id nip-0a1b2c3d4e5f67890
```

> **Exam trap.** A security group can't deny: it only allows. To block one malicious IP range, add a DENY rule with a lower rule number in the network ACL (or use AWS WAF for HTTP traffic).

<!-- section: vpc-flow-logs | objectives: 5.3.2 -->
## Collecting and reading VPC Flow Logs

Flow logs capture IP traffic metadata (not payloads) for a VPC, a subnet or a network interface, published to **CloudWatch Logs**, **Amazon S3** or **Amazon Data Firehose** (transit gateways have their own flow logs). The maximum aggregation interval is 10 minutes or 1 minute. A flow log's configuration and format can't be changed: delete and recreate it.

Default format fields, in order: `version account-id interface-id srcaddr dstaddr srcport dstport protocol packets bytes start end action log-status`. Protocol 6 is TCP, 17 UDP, 1 ICMP.

```text
2 111122223333 eni-0a1b2c3d4e5f60001 198.51.100.24 10.20.1.15 51544 443 6 12 3120 1763560200 1763560260 ACCEPT OK
2 111122223333 eni-0a1b2c3d4e5f60001 10.20.1.15 198.51.100.24 443 51544 6 10 8420 1763560200 1763560260 REJECT OK
2 111122223333 eni-0a1b2c3d4e5f60002 203.0.113.77 10.20.2.40 40112 22 6 3 180 1763560200 1763560260 REJECT OK
```

Reading them:

- Inbound ACCEPT then outbound REJECT of the response (lines 1 and 2): the stateful security group allowed the request and the **network ACL** blocked the response on the ephemeral port.
- A single inbound REJECT (line 3): the security group or the NACL denied the request.
- `NODATA`: no traffic in the interval; `SKIPDATA`: records skipped (capacity).
- Behind a NAT gateway or load balancer, the custom fields `pkt-srcaddr` and `pkt-dstaddr` show the original addresses; `tcp-flags` and `flow-direction` separate requests from responses.

Not captured: traffic to the Amazon DNS server, instance metadata (`169.254.169.254`), Amazon Time Sync (`169.254.169.123`), DHCP, ARP, Windows license activation, the reserved VPC router address, and traffic between an endpoint ENI and an NLB ENI.

Query flow logs in CloudWatch Logs Insights (or in S3 with Athena):

```text
fields @timestamp, srcAddr, dstAddr, dstPort, action
| filter action = "REJECT" and dstPort = 443
| stats count(*) as rejects by srcAddr
| sort rejects desc
| limit 20
```

> **Exam tip.** Flow logs tell you whether traffic was accepted or rejected, not why: a REJECT doesn't say whether the security group or the NACL decided. Combine it with the statefulness rule above, or run Reachability Analyzer to name the component.

<!-- section: service-logs | objectives: 5.3.2 -->
## Load balancer, AWS WAF, CloudFront and container logs

| Source | Enable and destination | What it shows |
| --- | --- | --- |
| ALB access logs | Off by default; S3 bucket in the same Region whose bucket policy lets Elastic Load Balancing write; one file per node every 5 minutes | Client and target IP, the three processing times, `elb_status_code`, `target_status_code`, `error_reason` |
| NLB access logs | S3, only for TLS listeners | TLS connection details |
| AWS WAF logs | CloudWatch Logs, S3 or Firehose; the log group, bucket or stream name must start with `aws-waf-logs-`; one destination per web ACL | `action`, `terminatingRuleId`, matched rules and labels, `httpRequest` (client IP, country, URI, headers); filters keep or drop records, redaction hides fields |
| CloudFront standard logs | v2: CloudWatch Logs, S3 or Firehose (stream in us-east-1); legacy: S3 | One line per request: `sc-status`, `x-edge-result-type`, `x-edge-detailed-result-type`, `time-taken`, URI and query string |
| CloudFront real-time logs | Kinesis Data Streams, sampling rate 1 to 100 %, delivered within seconds | Selected fields, including origin first-byte latency |
| ECS containers | `awslogs` log driver to CloudWatch Logs (the task execution role needs `logs:CreateLogStream` and `logs:PutLogEvents`), or FireLens with Fluent Bit | Container `stdout` and `stderr` |
| EKS containers | Amazon CloudWatch Observability EKS add-on (CloudWatch agent, Fluent Bit) | `/aws/containerinsights/<cluster>/application` and other log groups |

Interpreting ALB records:

| Evidence | Meaning |
| --- | --- |
| `elb_status_code` 502, `target_status_code` `-` | Target reset or closed the connection, or sent a malformed response; check keep-alive shorter than the ALB idle timeout |
| 503, no target status | No registered or healthy targets in the target group |
| 504, `target_processing_time` -1 | Target didn't respond before the idle timeout, or the 10-second connection timeout expired (security group, NACL ephemeral ports) |
| `elb_status_code` equal to `target_status_code` (for example 500) | The application produced the error, not the load balancer |

Metrics separate the two sides: `HTTPCode_ELB_5XX_Count` versus `HTTPCode_Target_5XX_Count`.

```json
{
  "logConfiguration": {
    "logDriver": "awslogs",
    "options": {
      "awslogs-group": "/ecs/orders-api",
      "awslogs-region": "eu-west-1",
      "awslogs-stream-prefix": "orders",
      "awslogs-create-group": "true"
    }
  }
}
```

> **Exam trap.** Legitimate users get HTTP 403 after AWS WAF is attached: read the WAF logs for `terminatingRuleId`, then override that one managed rule to Count (or add a scope-down statement) instead of removing the whole rule group. Flow logs and ALB access logs can't show which WAF rule matched.

<!-- section: cloudfront-caching | objectives: 5.3.3 -->
## Identifying and fixing CloudFront caching issues

The **cache key** decides whether two requests share a cached object. It is set by the **cache policy** (TTLs, plus the headers, cookies and query strings included in the key). The **origin request policy** adds values sent to the origin without fragmenting the cache. Managed policies such as `CachingOptimized` and `CachingDisabled` cover common cases.

TTL rules (cache policy or legacy settings):

| Origin sends | CloudFront caches for |
| --- | --- |
| No `Cache-Control` or `Expires` | Default TTL (86,400 seconds in the legacy default) or the minimum TTL if higher |
| `max-age` or `s-maxage` (`s-maxage` wins for CloudFront) | That value, clamped between minimum and maximum TTL |
| `no-cache`, `no-store` or `private` | Not cached if minimum TTL is 0, otherwise the minimum TTL (all three TTLs at 0 disable caching) |

Symptoms and fixes:

| Symptom | Cause | Fix |
| --- | --- | --- |
| Low cache hit ratio, origin overloaded | Cache key includes all headers, cookies or query strings, `User-Agent`, or parameters in varying order or case | Key only on values that change the response (`CloudFront-Is-Mobile-Viewer` instead of `User-Agent`); separate static and dynamic behaviors; Origin Shield |
| Old version still served after a deployment | Object cached until its TTL expires | Create an invalidation, or better, use versioned file names (`app.3f9c.js`) |
| Dynamic or per-user pages are cached | Origin sends no `Cache-Control` and the default TTL applies, or minimum TTL above 0 overrides `no-store` | Return `Cache-Control: private, no-store` with minimum TTL 0, or use a behavior with `CachingDisabled` |
| An error page persists after the origin recovers | Errors are cached for the error caching minimum TTL (10 seconds by default), or a custom error response TTL | Lower the error caching minimum TTL |
| HTTP 502 or 504 on cache misses | 502: origin TLS failure (certificate doesn't match the origin domain, expired or incomplete chain). 504: origin unreachable or slower than the response timeout (30 seconds by default) | Fix the certificate; allow the CloudFront prefix list; speed up the origin before raising the timeout |

Invalidations: paths are case sensitive; `*` is a wildcard only as the last character; a wildcard path counts as **one path**; the first 1,000 paths per month are free per account.

```bash
aws cloudfront create-invalidation \
  --distribution-id E2EXAMPLE7QK9L \
  --paths "/index.html" "/assets/*"
```

Evidence: the `X-Cache` response header (`Hit from cloudfront`, `Miss from cloudfront`, `RefreshHit from cloudfront`) and `Age`; `x-edge-result-type` in logs (`Hit`, `RefreshHit`, `Miss`, `Error`) and `x-edge-detailed-result-type` for the exact error (`OriginDnsError`, `OriginConnectError`). **CacheHitRate** and **OriginLatency** are paid additional metrics, enabled per distribution and published in us-east-1.

> **Exam trap.** Forwarding a header "to the origin" through an origin request policy doesn't make it part of the cache key. If responses vary by that header, viewers get each other's variants until the header is added to the cache policy.

<!-- section: hybrid-private | objectives: 5.3.4 -->
## Hybrid and private connectivity issues

**AWS Site-to-Site VPN** (two tunnels per connection):

| Symptom | Check |
| --- | --- |
| Tunnel DOWN | IKE phase 1 or 2 parameters (encryption, integrity, DH group, lifetime), pre-shared key, UDP 500 and 4500 open, NAT-T when the customer gateway is behind NAT; dead peer detection timeouts |
| Tunnel UP but no traffic | VPC route table: enable **route propagation** from the virtual private gateway or add static routes; transit gateway route table propagation for a VPN attachment; security groups and NACLs allowing the on-premises CIDR |
| BGP session not established | TCP 179 reachable on the customer gateway, ASN, inside tunnel addresses (`169.254.x.x/30`) |
| Only one tunnel carries traffic, failover is slow | Configure both tunnels on the device; prefer BGP, whose liveness detection moves traffic to the second tunnel |

Enable **Site-to-Site VPN logs** to CloudWatch Logs: tunnel activity logs show IKE phase states, DPD and messages such as a pre-shared key mismatch; BGP logs show session status and routes. `TunnelState` is 1 (up), 0 (down) or a fraction when only some tunnels are up.

Route selection: the most specific prefix wins, the VPC `local` route always wins, a static route beats a propagated route with the same CIDR, and for identical prefixes a virtual private gateway prefers Direct Connect BGP routes, then VPN static routes, then VPN BGP routes (shortest AS PATH, then lowest MED).

**AWS Direct Connect**: check `ConnectionState` (1 up, 0 down), the light levels (`ConnectionLightLevelTx`, `ConnectionLightLevelRx`) and `ConnectionErrorCount` for the physical link, then BGP on the virtual interface. Advertising more than **100 prefixes** per BGP session on a private or transit virtual interface (default limit) puts the session DOWN: summarize routes.

**AWS Client VPN**: a client reaches a network only with an **authorization rule** for its CIDR and a **route** in the endpoint route table through an associated subnet; internet access needs an authorization rule for `0.0.0.0/0` and a default route in the associated subnet (internet or NAT gateway). The client CIDR (between `/22` and `/12`) can't overlap the VPC CIDR and can't be changed after creation.

**Private connectivity**:

| Symptom | Cause |
| --- | --- |
| SDK call still goes to the public endpoint | Interface endpoint without private DNS, or VPC without `enableDnsSupport` and `enableDnsHostnames` |
| Timeout to an interface endpoint | Endpoint security group doesn't allow TCP 443 from the clients |
| `AccessDenied` through an endpoint | Endpoint policy (default allows all) or a bucket policy with `aws:SourceVpce` that names another endpoint |
| On-premises or peered clients can't use the S3 gateway endpoint | Gateway endpoints don't extend beyond the VPC: use an S3 interface endpoint |
| PrivateLink consumer stuck in `pendingAcceptance` | The provider must accept the connection |

> **Exam trap.** Overlapping CIDR blocks between on premises and a VPC can't be fixed with routes or security groups. PrivateLink still works across overlapping ranges because the consumer connects to an endpoint IP in its own VPC.

<!-- section: network-monitoring | objectives: 5.3.5 -->
## CloudWatch network monitoring services

| Service | Monitors | How | Output |
| --- | --- | --- | --- |
| Network Flow Monitor | TCP flows between EC2 instances or EKS workloads, and to S3, DynamoDB or another Region | Agents on the instances; monitors on chosen flows; top contributors | Packet loss and latency, and a **network health indicator** that says whether AWS caused the degradation |
| Internet Monitor | Performance and availability between internet users and an application | No agents: AWS connectivity data; add VPCs, NLBs, CloudFront distributions or WorkSpaces directories to a monitor | Scores per **city-network** (location plus ASN), health events to EventBridge, measurements in CloudWatch Logs and optionally S3 |
| Network Synthetic Monitor | Hybrid paths from a VPC subnet to on-premises IP addresses | Managed ICMP or TCP probes, aggregation 30 or 60 seconds; nothing installed on premises | Round-trip time, packet loss, network health indicator (100 or 0) on Direct Connect paths |

Choose by where the problem is: inside AWS (Network Flow Monitor), between internet users and AWS (Internet Monitor), between AWS and the data center (Network Synthetic Monitor).

Alarm on service metrics too: `TunnelState`, `ConnectionState`, NAT gateway `ErrorPortAllocation` and `PacketsDropCount`, ELB `UnHealthyHostCount`. TCP probes change their source port within 1024-65535, so the on-premises firewall must allow that whole range to the destination port.

```bash
aws networkmonitor create-monitor \
  --monitor-name dc-paris-links \
  --aggregation-period 30 \
  --probes sourceArn=arn:aws:ec2:eu-west-3:111122223333:subnet/subnet-0a1b2c3d4e5f60789,destination=172.16.20.10,protocol=TCP,destinationPort=443,packetSize=56
```

> **Exam tip.** "Users in some cities and ISPs report slowness" is Internet Monitor; "latency to the data center over Direct Connect without installing agents" is Network Synthetic Monitor; "packet loss between microservices in two AZs" is Network Flow Monitor. Use the network health indicator to decide whether to open an AWS support case or to fix your own configuration.

<!-- section: key-points -->
## Key points

- Path: route table, security group (stateful, allow only), NACL (stateless, ephemeral ports), public IP. Reachability Analyzer names the blocker without sending packets.
- NAT gateway: 350-second idle timeout, `ErrorPortAllocation` = port exhaustion. Transit gateway: VPC route, association, propagation, return route.
- Flow logs: ACCEPT then REJECT on the response = NACL; immutable; no DNS or metadata traffic.
- ALB: 502 target reset, 503 no targets, 504 timeout. WAF logs: `aws-waf-logs-` prefix, `terminatingRuleId`.
- CloudFront: cache policy = cache key and TTLs; versioned names over invalidations; wildcard = one path; 1,000 free paths per month.
- VPN: IKE, PSK, UDP 500/4500, route propagation, `TunnelState`. Direct Connect: `ConnectionState`, 100-prefix limit. Client VPN: authorization rule plus route.
- Network Flow Monitor (inside AWS), Internet Monitor (users), Network Synthetic Monitor (hybrid).
