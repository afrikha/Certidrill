This chapter covers network configuration: hybrid links that meet an SLA, multicloud and Google Cloud-to-Google Cloud connectivity, the layered controls that protect traffic, and VPC designs that reach the internet, Google APIs and managed services privately. Exam questions describe a topology and ask for the missing piece (a Cloud Router setting, a firewall layer, a route advertisement) or the configuration that meets a stated SLA with the least effort.

<!-- section: hybrid-networking | objectives: 2.1.1 -->
## Extending to on-premises environments

**HA VPN** configuration has five resources: an HA VPN gateway (two interfaces, two public IPs), a peer (external) VPN gateway, a Cloud Router, tunnels, and BGP sessions.

```bash
gcloud compute vpn-gateways create vpn-eu --network=prod-vpc --region=europe-west1
gcloud compute external-vpn-gateways create dc-paris \
  --interfaces=0=203.0.113.10,1=203.0.113.11
gcloud compute routers create cr-eu --network=prod-vpc --region=europe-west1 --asn=65010
gcloud compute vpn-tunnels create tun-0 --region=europe-west1 \
  --vpn-gateway=vpn-eu --interface=0 \
  --peer-external-gateway=dc-paris --peer-external-gateway-interface=0 \
  --ike-version=2 --shared-secret=SHARED_SECRET --router=cr-eu
gcloud compute routers add-interface cr-eu --region=europe-west1 \
  --interface-name=if-tun-0 --vpn-tunnel=tun-0 \
  --ip-address=169.254.10.1 --mask-length=30
gcloud compute routers add-bgp-peer cr-eu --region=europe-west1 \
  --peer-name=dc-paris-0 --interface=if-tun-0 \
  --peer-ip-address=169.254.10.2 --peer-asn=65020
# Repeat for tun-1 on interface 1
```

The **99.99 % SLA** needs tunnels from **both** gateway interfaces to the peer (two peer devices, or one device with two interfaces). Classic VPN (one interface, static routing, 99.9 %) is not the answer for new designs. Each tunnel carries roughly 1–3 Gbps; add tunnel pairs for more throughput.

**Cloud Interconnect** provisioning:

| Step | Dedicated Interconnect | Partner Interconnect |
| --- | --- | --- |
| 1 | Order the connection in a colocation facility | Choose a supported service provider |
| 2 | Receive the LOA-CFA, give it to the facility for the cross-connect | Create a VLAN attachment, get a **pairing key** |
| 3 | Google tests the circuit | Give the pairing key to the provider, who provisions the link |
| 4 | Create VLAN attachments on a Cloud Router | Activate the attachment, configure BGP (Layer 2 partner) or the provider does it (Layer 3) |

```bash
gcloud compute interconnects attachments partner create attach-par-1 \
  --region=europe-west9 --router=cr-par \
  --edge-availability-domain=availability-domain-1
```

Topologies:

| Target | Dedicated Interconnect topology |
| --- | --- |
| 99.9 % | Two connections in one metro, in different edge availability domains |
| 99.99 % | Four connections, two in each of two metros (both edge availability domains in each), four VLAN attachments across two regions, a Cloud Router in each region, VPC **global dynamic routing** |
| 99.99 % in one metro (qualifying metros only) | Four connections across two facility and edge availability domain combinations, ordered through a connection group with the `PRODUCTION_CRITICAL` intended topology; four VLAN attachments in the metro's low-latency region, at least one Cloud Router, regional or global routing |

Routing details tested:

- **Global dynamic routing mode** makes routes learned by a Cloud Router in one region usable from every region; otherwise only the router's region learns them.
- Cloud Router advertises all subnets by default. Use **custom advertisement mode** to add ranges such as 199.36.153.8/30 (Private Google Access for on-premises hosts) or summary routes.
- Cloud Interconnect isn't encrypted: add **HA VPN over Cloud Interconnect** (IPsec on the VLAN attachments) or MACsec on supported circuits when encryption is required.
- Prefer one path with **advertised route priority (MED)**: lower values are preferred, for active/passive designs.
- Hybrid DNS: inbound server policy (on-premises resolvers query Cloud DNS) and outbound forwarding zones (Cloud DNS forwards to on-premises). On-premises firewalls must allow 35.199.192.0/19, the source of Cloud DNS forwarded queries.

> **Exam trap.** Without global dynamic routing, VMs in another region of the same VPC don't learn on-premises routes from a regional Cloud Router. When "VMs in us-east1 can't reach on-premises over the Interconnect in us-central1", the fix is the routing mode, not another attachment.

<!-- section: multicloud | objectives: 2.1.2 -->
## Multicloud and Google Cloud-to-Google Cloud connectivity

Connecting to another cloud:

| Requirement | Configuration |
| --- | --- |
| Encrypted, quick, moderate bandwidth to AWS or Azure | HA VPN to the other cloud's VPN service; to AWS, four tunnels (two AWS connections, each with two tunnels) for 99.99 % |
| High bandwidth, private, dedicated | **Cross-Cloud Interconnect** (AWS, Azure, OCI, Alibaba Cloud): you buy the ports on the remote cloud and send Google its authorization; at least two connections in different edge availability domains (99.9 %), two pairs in two metros for 99.99 % |
| No port purchase, managed by a partner | Partner Cross-Cloud Interconnect |
| Route between two other clouds or sites through Google's backbone | NCC hybrid spokes with **site-to-site data transfer** |

Google Cloud-to-Google Cloud:

| Requirement | Configuration |
| --- | --- |
| Many projects, one organization, central network team | Shared VPC (one host project per environment) |
| Two networks, possibly different organizations, full route exchange | VPC Network Peering (non-transitive, no overlapping ranges) |
| Many VPCs any-to-any, transitive, plus hybrid | NCC hub with VPC spokes (other projects and organizations allowed) and hybrid spokes |
| One service shared to many consumers, overlapping ranges | Private Service Connect: producer publishes a service attachment, consumers create endpoints |
| Traffic inspection between VPCs by appliances | Network virtual appliances with multiple NICs, or NCC router appliance spokes |

> **Exam tip.** "Partner companies with overlapping IP ranges must reach one of our APIs privately" is Private Service Connect. Peering and NCC both fail on overlapping ranges.

<!-- section: network-security | objectives: 2.1.3 -->
## Security protection

Controls are layered; each answers a different threat:

| Layer | Control |
| --- | --- |
| Organization-wide baseline | Hierarchical firewall policies on the organization or folders (can `deny`, `allow` or `goto_next` to lower levels) |
| Network | Global and regional network firewall policies, VPC firewall rules; target by **secure tags** (IAM-controlled) rather than network tags |
| Inspection | Cloud NGFW tiers: Essentials (IP, ports, address groups, secure tags, no cost), Standard (FQDN and geolocation objects, which are firewall policy rule components that VPC firewall rules do not have; Google Threat Intelligence), Enterprise (intrusion detection and **prevention**, TLS inspection, URL filtering through firewall endpoints, billed per endpoint hour and per GB inspected) |
| Detection only | Cloud IDS (packet mirroring to Google-managed IDS, alerts, no blocking) |
| Edge, internet-facing apps | Cloud Armor on the load balancer: OWASP preconfigured WAF rules, rate limiting, geo and IP rules; Cloud Armor Enterprise adds Adaptive Protection and L7 DDoS features |
| Administrative access | IAP TCP forwarding (allow ingress from 35.235.240.0/20 only, grant `roles/iap.tunnelResourceAccessor` plus instance access for SSH: OS Login roles, or Compute Instance Admin (v1)), no external IPs on VMs |
| API data exfiltration | VPC Service Controls perimeters around projects, with Access Context Manager access levels |
| Guardrails | Organization policy constraints such as `compute.vmExternalIpAccess`, `compute.skipDefaultNetworkCreation`, `compute.restrictVpcPeering` |

Default evaluation order: hierarchical policies (organization, then folders top-down) → regional system firewall policies → VPC firewall rules → global network firewall policy → regional network firewall policies → implied rules (deny ingress to VMs, allow egress). Setting the network's enforcement order to `BEFORE_CLASSIC_FIREWALL` evaluates network firewall policies before VPC firewall rules.

```bash
gcloud compute firewall-policies create --organization=123456789012 \
  --short-name=org-baseline
gcloud compute firewall-policies rules create 1000 \
  --firewall-policy=org-baseline --organization=123456789012 \
  --direction=INGRESS --action=allow \
  --src-ip-ranges=35.235.240.0/20 --layer4-configs=tcp:22,tcp:3389
gcloud compute firewall-policies associations create \
  --firewall-policy=org-baseline --organization=123456789012
```

> **Exam trap.** Firewalls don't stop a user with valid credentials from copying BigQuery or Cloud Storage data to a project outside the company: that is **VPC Service Controls**. And Cloud IDS only alerts; "block known exploits inline" is Cloud NGFW Enterprise.

<!-- section: vpc-design-lb | objectives: 2.1.4 -->
## VPC design and load balancing

**Subnet and project layout**: custom-mode VPC, one subnet per region per environment, secondary ranges for GKE Pods and Services, room for growth, no overlap with on-premises or other clouds. With Shared VPC:

```bash
gcloud compute shared-vpc enable net-host-prod
gcloud compute shared-vpc associated-projects add app-orders-prod \
  --host-project=net-host-prod
# Then grant roles/compute.networkUser on the specific subnets to the service project's deployers
```

The Shared VPC Admin role (`roles/compute.xpnAdmin`) is granted at the organization or folder; Network User (`roles/compute.networkUser`) at the host project or, for least privilege, per subnet.

Access patterns:

| Destination | Configuration |
| --- | --- |
| Internet, outbound only, VMs without external IP | Cloud NAT on a Cloud Router (regional) |
| Google APIs, VMs without external IP | Private Google Access enabled **per subnet** |
| Google APIs on an internal IP you choose, also from on-premises | PSC endpoint for Google APIs (`all-apis` or `vpc-sc` bundle) |
| Cloud SQL, Memorystore, AlloyDB on private IPs | Private services access (allocated range, peering with `servicenetworking.googleapis.com`) or PSC where the service supports it |
| A partner's or another team's service | PSC endpoint to their service attachment |

```bash
gcloud compute networks subnets update app-eu --region=europe-west1 \
  --enable-private-ip-google-access
gcloud compute routers nats create nat-eu --router=cr-eu --region=europe-west1 \
  --auto-allocate-nat-external-ips --nat-all-subnet-ip-ranges
gcloud compute addresses create psc-apis-ip --global \
  --purpose=PRIVATE_SERVICE_CONNECT --addresses=10.255.255.5 --network=prod-vpc
gcloud compute forwarding-rules create pscapis --global --network=prod-vpc \
  --address=psc-apis-ip --target-google-apis-bundle=all-apis
```

**Load balancer configuration** checklist:

- Envoy-based load balancers (regional external and internal Application Load Balancers, regional proxy Network Load Balancers) need a **proxy-only subnet** in the region; cross-region internal load balancers need one in each region.
- Allow health check sources 35.191.0.0/16 and 130.211.0.0/22 in the firewall.
- Regional internal load balancers accept clients only from their region unless the forwarding rule has `--allow-global-access`.
- The global external Application Load Balancer needs Premium Tier and supports Cloud CDN, Cloud Armor, Google-managed certificates, and backend buckets for static content in Cloud Storage.
- Backends must see the client IP, or the protocol is UDP: passthrough Network Load Balancer.

> **Exam trap.** Cloud NAT never accepts inbound connections. "Allow internet users to reach a private VM" needs a load balancer (or an external IP), not Cloud NAT.

<!-- section: key-points -->
## Key points

- HA VPN 99.99 %: both interfaces, BGP on Cloud Router. Interconnect 99.99 %: four connections in two metros, two regions, global dynamic routing; or four connections in one qualifying metro ordered as a `PRODUCTION_CRITICAL` connection group.
- Custom advertisements on Cloud Router expose ranges such as the Private Google Access VIPs to on-premises.
- Cross-Cloud Interconnect for dedicated links to other clouds; NCC for transitive any-to-any and site-to-site transfer.
- Shared VPC within one organization; peering is non-transitive; PSC handles overlapping ranges.
- Firewall order: hierarchical, VPC rules, network policies, implied. NGFW Enterprise prevents intrusions; Cloud IDS only detects.
- VPC Service Controls stop API data exfiltration; IAP replaces bastion hosts and external IPs.
- Private Google Access is per subnet; Cloud NAT is outbound only; Envoy-based load balancers need a proxy-only subnet.
