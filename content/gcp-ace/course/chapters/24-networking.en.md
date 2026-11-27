Networking questions on the Associate Cloud Engineer exam are concrete: which subnet mode to pick, which command expands a range or peers two networks, why a firewall rule doesn't match, how to target VMs with secure tags, which hybrid link meets a bandwidth or SLA requirement, which load balancer fits a protocol, and what Standard Tier gives up. This chapter covers VPC networks and subnets, Shared VPC and VPC Network Peering, VPC firewall rules and Cloud NGFW policies, secure tags and service accounts, Cloud VPN and Cloud Interconnect, load balancers and Network Service Tiers.

<!-- section: vpc-subnets | objectives: 2.3.1 -->
## Creating VPC networks and subnets

A **VPC network is global**, with its routes and firewall rules; **subnets are regional**. VMs in different regions of the same VPC talk over internal IPs with no extra configuration.

| Mode | Subnets | Use |
| --- | --- | --- |
| Auto mode | One subnet per region created automatically from predefined ranges in `10.128.0.0/9`, new regions added automatically | Quick tests; the `default` network of a new project is auto mode |
| **Custom mode** | You create each subnet, region and range | **Recommended for production**: no overlap with on-premises or peered networks |

An auto mode network can be converted to custom mode, never back.

```bash
gcloud compute networks create prod-vpc --subnet-mode=custom --bgp-routing-mode=global
gcloud compute networks subnets create app-eu --network=prod-vpc \
  --region=europe-west1 --range=10.10.0.0/24 \
  --secondary-range=pods=10.20.0.0/16,services=10.30.0.0/20 \
  --enable-private-ip-google-access --enable-flow-logs
gcloud compute networks subnets expand-ip-range app-eu --region=europe-west1 \
  --prefix-length=23
```

Subnet rules:

- Each subnet has a primary IPv4 range (VM primary IPs, load balancer addresses) and optional **secondary ranges** (alias IPs, for example GKE Pods and Services).
- Four addresses of each primary range are reserved: network, default gateway, second-to-last and broadcast. A `/29` (8 addresses) is the smallest range.
- A primary range can be **expanded** (smaller prefix length) but never shrunk or replaced, and the new range must not overlap any other subnet in the network or in peered networks.
- **Private Google Access** is a per-subnet setting: it lets VMs without external IPs reach Google APIs.
- The **dynamic routing mode** of the network (`regional` by default, or `global`) decides whether Cloud Routers share learned routes with every region.

**Sharing networks between projects:**

| | Shared VPC | VPC Network Peering |
| --- | --- | --- |
| Model | One **host project** owns the network; **service projects** in the same organization create resources in its subnets | Two separate networks exchange subnet routes |
| Administration | Central network team in the host project | Each network keeps its own administrators, firewall rules and routes |
| Scope | Same organization | Same or different projects and organizations |
| Key limits | Roles: Shared VPC Admin (`roles/compute.xpnAdmin`) at the organization or folder; Compute Network User (`roles/compute.networkUser`) on the host project or on specific subnets for service project users | **Not transitive**; subnet ranges must not overlap; firewall rules are not exchanged; custom routes are exchanged only with `--export-custom-routes` / `--import-custom-routes` |

```bash
# Shared VPC
gcloud compute shared-vpc enable net-host-prod
gcloud compute shared-vpc associated-projects add app-orders-prod --host-project=net-host-prod
gcloud compute networks subnets add-iam-policy-binding app-eu --region=europe-west1 \
  --project=net-host-prod --member=group:orders-devs@example.com \
  --role=roles/compute.networkUser

# VPC Network Peering: one configuration on EACH side
gcloud compute networks peerings create prod-to-data --network=prod-vpc \
  --project=app-prod --peer-project=data-prod --peer-network=data-vpc
gcloud compute networks peerings create data-to-prod --network=data-vpc \
  --project=data-prod --peer-project=app-prod --peer-network=prod-vpc
```

> **Exam trap.** A peered with B and B peered with C does not let A reach C: peering is not transitive. Either peer A and C directly, or use another design (Shared VPC, VPN between networks, Network Connectivity Center).

<!-- section: firewall-rules-policies | objectives: 2.3.2 -->
## VPC firewall rules and Cloud NGFW policies

Cloud Next Generation Firewall (Cloud NGFW) enforces two kinds of rules: classic **VPC firewall rules** (attached to one network) and rules grouped in **firewall policies**. Both are **stateful**: return traffic of an allowed connection is allowed.

VPC firewall rule attributes:

| Attribute | Values and defaults |
| --- | --- |
| Direction | `INGRESS` (default) or `EGRESS`; one direction per rule |
| Action | `allow` or `deny` |
| Priority | 0–65535, default 1000; **lower number wins**; at equal priority, deny wins over allow |
| Target | All instances in the network (default), instances with a **network tag**, or instances running as a **service account** |
| Source (ingress) | IP ranges, source tags or source service accounts |
| Destination (egress) | IP ranges |
| Protocols and ports | `tcp:80,tcp:443`, `udp:53`, `icmp`, or all |
| Logging | Off by default; `--enable-logging` |
| Enforcement | Enabled, or `--disabled` to keep the rule without applying it |

Always present: the **implied actions** **deny all ingress** and **allow all egress**. They apply only when evaluation reaches the end without any matching rule, so any rule you create overrides them. The `default` network also has four rules at priority 65534 that you can delete: `default-allow-internal`, `default-allow-ssh`, `default-allow-rdp`, `default-allow-icmp`. Traffic to the metadata server (`169.254.169.254`) is always allowed; egress to TCP port 25 on external addresses is blocked by default.

```bash
gcloud compute firewall-rules create allow-web --network=prod-vpc \
  --direction=INGRESS --action=allow --rules=tcp:80,tcp:443 \
  --source-ranges=0.0.0.0/0 --target-tags=web --priority=1000
gcloud compute firewall-rules create allow-hc --network=prod-vpc \
  --action=allow --rules=tcp:80 \
  --source-ranges=35.191.0.0/16 --target-tags=web
gcloud compute firewall-rules create deny-egress-internet --network=prod-vpc \
  --direction=EGRESS --action=deny --rules=all \
  --destination-ranges=0.0.0.0/0 --priority=2000 --enable-logging
```

**Firewall policies** group rules and apply them to many networks or a whole hierarchy:

| Policy | Attached to | Notes |
| --- | --- | --- |
| Hierarchical firewall policy | Organization or folder | Applies to every VPC network below; actions include `goto_next` to delegate the decision to lower levels |
| Global network firewall policy | One or more VPC networks | All regions |
| Regional network firewall policy | VPC networks, one region | Regional resources |

Policy rules use `--action` `allow`, `deny`, `goto_next` or `apply_security_profile_group` (intrusion prevention with Cloud NGFW Enterprise), `--layer4-configs` for protocols and ports, and add sources and targets that VPC firewall rules don't have: **secure tags**, address groups, FQDNs, geolocations and threat intelligence lists (the last three need Cloud NGFW Standard). Default evaluation order: hierarchical policies (organization, then folders), then regional system firewall policies, then VPC firewall rules, then the global network firewall policy, then regional policies, then the implied rules.

```bash
gcloud compute network-firewall-policies create prod-fw --global
gcloud compute network-firewall-policies rules create 1000 \
  --firewall-policy=prod-fw --global-firewall-policy \
  --direction=INGRESS --action=allow --layer4-configs=tcp:22 \
  --src-ip-ranges=35.235.240.0/20
gcloud compute network-firewall-policies associations create \
  --firewall-policy=prod-fw --network=prod-vpc --global-firewall-policy
gcloud compute firewall-policies create --organization=123456789012 \
  --short-name=org-baseline
```

> **Exam trap.** An allow rule at priority 1000 loses against a deny rule at priority 900 that matches the same traffic. When "the new rule has no effect", compare priorities and targets (a rule targeting tag `web` does nothing for a VM tagged `web-server`).

<!-- section: tags-service-accounts | objectives: 2.3.3 -->
## Using secure tags and service accounts in firewall rules

Three ways to select VMs in a rule:

| Selector | Where usable | Control |
| --- | --- | --- |
| Network tags (`--target-tags`, `--source-tags`) | VPC firewall rules | Plain strings on the VM: anyone who can edit the instance can add a tag and gain the rule's access |
| Service accounts (`--target-service-accounts`, `--source-service-accounts`) | VPC firewall rules and firewall policy rules | Changing a VM's service account requires stopping the VM and the right to use that service account |
| **Secure tags** (`--target-secure-tags`, `--src-secure-tags`) | Hierarchical, global and regional network firewall policies only | IAM-controlled Resource Manager tags: only holders of Tag User on the value can bind it |

A VPC firewall rule cannot mix network tags and service accounts. Each network interface can have up to 10 secure tag values that apply.

Workflow for secure tags:

1. A Tag Administrator (`roles/resourcemanager.tagAdmin`) creates a tag key with the purpose `GCE_FIREWALL`, scoped to one VPC network (`--purpose-data=network=...`) or to the organization, then its values.
2. Grant Tag User (`roles/resourcemanager.tagUser`) to the people or pipelines allowed to attach the value to VMs. They don't need Compute Security Admin to do it.
3. Bind the value to VMs (tag binding, or `--resource-manager-tags` at creation).
4. Reference the value in firewall policy rules.

```bash
gcloud resource-manager tags keys create app-tier --parent=organizations/123456789012 \
  --purpose=GCE_FIREWALL --purpose-data=network=net-host-prod/prod-vpc
gcloud resource-manager tags values create db --parent=123456789012/app-tier
gcloud resource-manager tags values create web --parent=123456789012/app-tier
gcloud resource-manager tags bindings create --location=europe-west1-b \
  --tag-value=123456789012/app-tier/db \
  --parent=//compute.googleapis.com/projects/482193405522/zones/europe-west1-b/instances/4411237655123
gcloud compute network-firewall-policies rules create 1100 \
  --firewall-policy=prod-fw --global-firewall-policy \
  --direction=INGRESS --action=allow --layer4-configs=tcp:5432 \
  --src-secure-tags=123456789012/app-tier/web \
  --target-secure-tags=123456789012/app-tier/db
```

> **Exam tip.** "Prevent developers who can edit VMs from opening database ports to their instances" rules out network tags. Use secure tags (IAM-controlled) in a network firewall policy, or target the database VMs by service account.

<!-- section: connectivity | objectives: 2.3.4 -->
## Establishing network connectivity

| Requirement | Option |
| --- | --- |
| Encrypted link to on-premises over the internet, quick to set up, moderate bandwidth | **HA VPN** (IPsec; about 1–3 Gbps per tunnel; add tunnels for more) |
| 99.99 % SLA over VPN | HA VPN with tunnels on **both** gateway interfaces, BGP through Cloud Router |
| Private, high-bandwidth link from a colocation facility, no internet | **Dedicated Interconnect**: 10, 100 or 400 Gbps circuits, up to 8 per connection |
| Private link without reaching a Google colocation facility, or less bandwidth | **Partner Interconnect** through a service provider: VLAN attachments from 50 Mbps to 50 Gbps |
| Dedicated link to another cloud (AWS, Azure, OCI, Alibaba Cloud) | **Cross-Cloud Interconnect** |
| Connect two VPC networks in Google Cloud | VPC Network Peering (see above), or HA VPN between two VPC networks |
| Encryption on Interconnect | HA VPN over Cloud Interconnect, or MACsec on supported circuits (Interconnect is not encrypted by default) |

Facts that decide answers:

- **HA VPN** has two interfaces with two external IPs and supports only dynamic routing (BGP) with **Cloud Router**. **Classic VPN** (one interface, static routing only, 99.9 %) isn't the answer for new designs.
- Interconnect also uses Cloud Router and BGP. Dedicated Interconnect topologies: 99.9 % = two connections in one metro, in different edge availability domains; 99.99 % = at least four connections, either two in each of two metros (multi-region: one Cloud Router per region, global dynamic routing required) or four in one supported metro ordered through a connection group with the `PRODUCTION_CRITICAL` topology capability (single-region: one Cloud Router is enough, regional or global dynamic routing).
- Interconnect reduces egress costs compared with VPN over the internet; VPN alone doesn't.
- On-premises and VPC ranges must not overlap.

```bash
gcloud compute vpn-gateways create vpn-eu --network=prod-vpc --region=europe-west1
gcloud compute external-vpn-gateways create dc-paris --interfaces=0=203.0.113.10,1=203.0.113.11
gcloud compute routers create cr-eu --network=prod-vpc --region=europe-west1 --asn=65010
gcloud compute vpn-tunnels create tun-0 --region=europe-west1 --vpn-gateway=vpn-eu \
  --interface=0 --peer-external-gateway=dc-paris --peer-external-gateway-interface=0 \
  --ike-version=2 --shared-secret=SHARED_SECRET --router=cr-eu
gcloud compute routers add-interface cr-eu --region=europe-west1 \
  --interface-name=if-tun-0 --vpn-tunnel=tun-0 --ip-address=169.254.10.1 --mask-length=30
gcloud compute routers add-bgp-peer cr-eu --region=europe-west1 --peer-name=dc-0 \
  --interface=if-tun-0 --peer-ip-address=169.254.10.2 --peer-asn=65020
# Repeat for tun-1 on interface 1 to reach 99.99 %
```

> **Exam trap.** "10 Gbps of private, steady traffic between the data center and Google Cloud" is Interconnect, not VPN: a single VPN tunnel tops out at about 3 Gbps and crosses the internet. "Encrypted, available tomorrow, a few hundred Mbps" is HA VPN.

<!-- section: load-balancers | objectives: 2.3.5 -->
## Choosing and deploying load balancers

Decide in this order: traffic type, external or internal, global or regional, client IP preservation.

| Requirement | Load balancer |
| --- | --- |
| HTTP(S) from the internet, backends in several regions, one anycast IP, Cloud CDN, Cloud Armor, Google-managed certificates | **Global external Application Load Balancer** (Premium Tier) |
| HTTP(S) from the internet, one region (data residency, Standard Tier) | Regional external Application Load Balancer |
| HTTP(S) between internal services | Regional or cross-region internal Application Load Balancer |
| TCP with SSL offload or TCP proxy from the internet | External proxy Network Load Balancer |
| TCP or UDP, client IP must reach the backend, or protocols such as ESP or ICMP | **External passthrough Network Load Balancer** (regional) |
| Private TCP or UDP endpoint for VPC clients | **Internal passthrough Network Load Balancer** (regional; `--allow-global-access` for clients in other regions) |

Deployment details:

- Backends: managed instance groups, network endpoint groups (including serverless NEGs for Cloud Run), or backend buckets for static content in Cloud Storage (supported by Application Load Balancers only: global external, classic, regional external, cross-region internal and regional internal).
- Allow the health check probes in the firewall: `35.191.0.0/16` for Application Load Balancers, proxy Network Load Balancers and internal passthrough Network Load Balancers with instance group backends; external passthrough Network Load Balancers can need additional ranges, listed on the Health checks overview page (older pages, such as MIG autohealing, also list `130.211.0.0/22`; allowing it does no harm).
- Envoy-based regional and internal proxy load balancers need a **proxy-only subnet** in the region.
- `--load-balancing-scheme`: `EXTERNAL_MANAGED` for global and regional external Application Load Balancers, `INTERNAL_MANAGED` for internal Application Load Balancers, `INTERNAL` for internal passthrough, `EXTERNAL` for classic and external passthrough.

```bash
gcloud compute instance-groups managed set-named-ports web-mig \
  --region=europe-west1 --named-ports=http:80
gcloud compute backend-services create web-be --global \
  --load-balancing-scheme=EXTERNAL_MANAGED --protocol=HTTP \
  --port-name=http --health-checks=web-hc --enable-cdn
gcloud compute backend-services add-backend web-be --global \
  --instance-group=web-mig --instance-group-region=europe-west1
gcloud compute url-maps create web-map --global --default-service=web-be
gcloud compute target-http-proxies create web-proxy --global --url-map=web-map
gcloud compute addresses create web-ip --global
gcloud compute forwarding-rules create web-fr --global \
  --load-balancing-scheme=EXTERNAL_MANAGED --address=web-ip \
  --target-http-proxy=web-proxy --ports=80
```

> **Exam trap.** Proxy load balancers terminate the connection, so backends see the proxy's address (the client IP is in the `X-Forwarded-For` header for HTTP). When the backend application itself must see the client IP on a UDP or TCP connection, choose a passthrough Network Load Balancer.

<!-- section: network-tiers | objectives: 2.3.6 -->
## Network Service Tiers

| | Premium Tier (default) | Standard Tier |
| --- | --- | --- |
| Path | Traffic enters and leaves Google's network at the point of presence closest to the user and travels on Google's backbone | Traffic travels over the public internet and enters Google's network in the region of the resource |
| External IPs | Global and regional | Regional only |
| Load balancers | All, including global external Application and proxy Network Load Balancers | Regional external load balancers only |
| Cloud CDN, Cloud VPN gateways | Supported | Not supported |
| Price | Higher | Lower per GB of egress |
| VM uptime SLA | 99.99 % | 99.9 % |

The tier is set per project (default for new resources) and can be overridden per resource (VM, instance template, external IP address, forwarding rule).

```bash
gcloud compute project-info update --default-network-tier=STANDARD
gcloud compute instances create batch-01 --zone=us-central1-a --network-tier=PREMIUM
gcloud compute addresses create web-eu-ip --region=europe-west1 --network-tier=STANDARD
```

> **Exam tip.** "Lowest egress cost, users in one region, performance not critical" points to Standard Tier. "Single global IP address", "Cloud CDN" or "lowest latency for users worldwide" requires Premium Tier.

<!-- section: key-points -->
## Key points

- VPC networks are global, subnets regional; custom mode for production; expand a subnet with `expand-ip-range`, never shrink it; four reserved addresses per primary range.
- Shared VPC: host and service projects in one organization, Network User per subnet. Peering: both sides configure it, not transitive, no overlapping ranges, firewall rules not shared.
- Firewall rules: stateful, priority 0–65535 (default 1000, lower wins), implied deny ingress and allow egress; targets by network tag, service account or (in policies) secure tag.
- Firewall policies: hierarchical (organization, folder), global and regional network policies; actions `allow`, `deny`, `goto_next`, `apply_security_profile_group`.
- Secure tags: purpose `GCE_FIREWALL`, Tag Admin creates, Tag User binds, only usable in firewall policies.
- HA VPN (BGP, both interfaces for 99.99 %), Dedicated Interconnect (10/100/400 Gbps circuits), Partner Interconnect (50 Mbps–50 Gbps), Cross-Cloud Interconnect for other clouds.
- Application Load Balancer for HTTP(S), proxy Network Load Balancer for TCP proxy, passthrough Network Load Balancer to keep client IPs; global ones need Premium Tier.
- Premium Tier is the default and uses Google's backbone; Standard Tier is cheaper, regional only, without Cloud CDN or Cloud VPN.
