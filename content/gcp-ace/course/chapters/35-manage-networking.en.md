This chapter covers the networking changes an Associate Cloud Engineer makes on a running VPC: expanding a subnet, reserving static IP addresses, adding custom static routes, operating Cloud DNS and Cloud NAT, and managing VPC firewall rules and Cloud NGFW firewall policies. Questions give a symptom or a requirement and four commands; the right one uses the right resource type, scope and flag.

<!-- section: subnet-expansion | objectives: 3.3.1 -->
## Resizing a subnet's IPv4 range

A subnet running out of addresses can have its **primary IPv4 range expanded** in place, without downtime:

```bash
# 10.1.2.0/24 becomes a /20
gcloud compute networks subnets expand-ip-range web-subnet \
  --region=europe-west1 --prefix-length=20
gcloud compute networks subnets describe web-subnet --region=europe-west1 \
  --format="value(ipCidrRange)"
```

Rules:

| Rule | Consequence |
| --- | --- |
| Only expansion | A range can't be shrunk, and an expansion can't be undone |
| No overlap | The new range must not overlap another subnet range of the network, a peered network's subnets, a private services access allocation, a static route destination or connected on-premises ranges |
| Auto mode limit | In an auto mode network (or one converted from auto mode), automatically created subnets can be expanded up to `/16` only |
| Proxy-only subnets | Can't be expanded |
| Traffic | Not interrupted; expansion can take a few minutes |
| After expansion | Update firewall rules that list the old range, and GKE control plane authorized networks if relevant |

When the range can't grow, add a **new subnet** in the same region or a **secondary range** (for example for GKE Pods). Secondary ranges can be removed and replaced only while unused. Console: edit the subnet and enter a broader CIDR.

> **Exam trap.** "Reduce the subnet to a /26 to free addresses" is impossible: create a new, smaller subnet and move the workloads. Expand conservatively, because the extra space can't be given back.

<!-- section: static-ip | objectives: 3.3.2 -->
## Reserving static external and internal IP addresses

| Address | Scope | Used by | Command |
| --- | --- | --- | --- |
| Static external, regional | Region | VMs, regional load balancers, Cloud NAT (manual) | `gcloud compute addresses create NAME --region=REGION` |
| Static external, global | Global, Premium Tier | Global external load balancers only | `gcloud compute addresses create NAME --global` |
| Static internal | Region, from a subnet's primary range | VMs, internal load balancers | `gcloud compute addresses create NAME --region=REGION --subnet=SUBNET [--addresses=IP]` |

```bash
# Promote the ephemeral external IP of a running VM: no packet is dropped
gcloud compute addresses create web-ip --addresses=34.76.10.20 --region=europe-west1

# Give an existing VM a reserved external IP: replace its access config
gcloud compute instances delete-access-config web-1 --zone=europe-west1-b \
  --access-config-name="external-nat"
gcloud compute instances add-access-config web-1 --zone=europe-west1-b \
  --access-config-name="external-nat" --address=34.76.10.21

# Reserve an internal IP and use it at VM creation
gcloud compute addresses create db-ip --region=europe-west1 --subnet=data-subnet --addresses=10.20.0.10
gcloud compute instances create db-1 --zone=europe-west1-b --subnet=data-subnet \
  --private-network-ip=10.20.0.10 --no-address

# Release
gcloud compute addresses delete web-ip --region=europe-west1
gcloud compute addresses list --filter="status=RESERVED"
```

Points to remember:

- A reserved external address that is **not attached** to anything is billed at a higher rate than one in use: release what you don't need (the idle IP address recommender lists them).
- Ephemeral external IPs change when a VM is stopped and started; static ones don't.
- `--no-address` creates a VM without any external IP (pair it with Cloud NAT for outbound access).
- A reserved internal address is removed from the subnet's automatic allocation pool. `--purpose=SHARED_LOADBALANCER_VIP` lets several internal load balancer forwarding rules share one address.
- Once released, an external address may never come back to you.

> **Exam tip.** "The partner allowlists our IP and the VM's address changed after a restart" → promote or reserve a static external address. "One IP for an HTTPS load balancer serving users worldwide" → a **global** static address; a regional one can't be attached to a global load balancer.

<!-- section: static-routes | objectives: 3.3.3 -->
## Adding custom static routes

Each VPC has system-generated routes: a **default route** (`0.0.0.0/0` to the default internet gateway) and one **subnet route** per subnet range. You add **custom static routes**; Cloud Router adds **dynamic routes** learned through BGP (Cloud VPN, Cloud Interconnect).

```bash
# Send internet-bound traffic of VMs tagged "inspect" through a firewall appliance
gcloud compute routes create egress-via-fw --network=prod-vpc \
  --destination-range=0.0.0.0/0 \
  --next-hop-instance=fw-1 --next-hop-instance-zone=europe-west1-b \
  --tags=inspect --priority=800

# Reach an on-premises range through a Classic VPN tunnel
gcloud compute routes create to-onprem --network=prod-vpc \
  --destination-range=192.168.0.0/16 \
  --next-hop-vpn-tunnel=onprem-tunnel --next-hop-vpn-tunnel-region=europe-west1

# Through an internal passthrough Network Load Balancer (appliance pool)
gcloud compute routes create via-ilb --network=prod-vpc \
  --destination-range=172.16.0.0/12 --next-hop-ilb=fw-ilb-rule --next-hop-ilb-region=europe-west1

gcloud compute routes list --filter="network=prod-vpc"
```

| Topic | Rule |
| --- | --- |
| Next hops | Instance (`--next-hop-instance` or `--next-hop-address`), internal passthrough Network Load Balancer (`--next-hop-ilb`), Classic VPN tunnel, default internet gateway (`--next-hop-gateway=default-internet-gateway`) |
| Selection | Subnet routes first (a broader static route never overrides them), then the **most specific destination**, then the lowest **priority** number (default `1000`); equal routes share traffic (ECMP) |
| Scope | Whole network by default; `--tags` limits a static route to VMs with those network tags |
| Instance next hop | The appliance VM must be created with `--can-ip-forward`; routes to a stopped or deleted instance are ignored |
| HA VPN and Interconnect | Use dynamic routes through Cloud Router, not static routes |

> **Exam trap.** A static route `10.0.0.0/8` with priority 100 does not beat a `/24` route with priority 1000 for traffic to that `/24`: the most specific prefix wins first, and priority only breaks ties between routes with the same destination length. Deleting the default route cuts internet access for VMs with external IPs and for Cloud NAT.

<!-- section: cloud-dns | objectives: 3.3.4 -->
## Using Cloud DNS

| Zone type | Answers | Typical use |
| --- | --- | --- |
| Public | The internet | Your domain; point the registrar at the zone's four name servers |
| Private | Only the authorized VPC networks | Internal names such as `db.corp.internal` |
| Forwarding | Sends queries to target name servers | Resolve on-premises names from Google Cloud |
| Peering | Lets one VPC resolve with another VPC's DNS view | Hub-and-spoke or Shared VPC designs |
| Managed reverse lookup | PTR answers from Compute Engine data | Reverse lookups of internal IPs |

```bash
# Public zone and a record
gcloud dns managed-zones create example-public --dns-name=example.com. \
  --description="Public zone"
gcloud dns record-sets create www.example.com. --zone=example-public \
  --type=A --ttl=300 --rrdatas=34.120.10.5
gcloud dns record-sets update www.example.com. --zone=example-public \
  --type=A --ttl=60 --rrdatas=34.120.10.6

# Private zone visible to one VPC
gcloud dns managed-zones create corp-internal --dns-name=corp.internal. \
  --description="Internal names" --visibility=private --networks=prod-vpc

# Forward corp.example.local queries to on-premises DNS servers
gcloud dns managed-zones create onprem-fwd --dns-name=corp.example.local. \
  --description="To on-prem" --visibility=private --networks=prod-vpc \
  --forwarding-targets=192.168.10.53,192.168.10.54

# Let on-premises resolvers query Cloud DNS (inbound forwarding)
gcloud dns policies create inbound-dns --description="From on-prem" \
  --networks=prod-vpc --enable-inbound-forwarding
```

- A private zone can share its name with a public zone (**split horizon**): VMs in the authorized VPC get the private answer, the internet gets the public one.
- VMs must use the metadata server (`169.254.169.254`) as resolver to see private zones.
- Forwarded queries to private targets come from `35.199.192.0/19`: the on-premises firewall must allow that range, and the route back must go through the VPN or Interconnect.
- A lower TTL before a migration makes clients pick up the new record faster. DNSSEC is enabled per public zone (`--dnssec-state=on`).

<!-- section: cloud-nat | objectives: 3.3.4 -->
## Using Cloud NAT

Cloud NAT lets resources **without external IP addresses** open **outbound** connections (Public NAT to the internet; Private NAT between private networks). It never accepts unsolicited inbound connections. It is regional and software-defined: no proxy VM, and the **Cloud Router** only groups the NAT configuration (no BGP session, no traffic through the router).

```bash
gcloud compute routers create nat-router --network=prod-vpc --region=europe-west1
gcloud compute routers nats create nat-eu --router=nat-router --region=europe-west1 \
  --nat-all-subnet-ip-ranges --auto-allocate-nat-external-ips \
  --enable-logging --log-filter=ERRORS_ONLY

# Fixed source IPs that a partner can allowlist
gcloud compute addresses create nat-ip-1 nat-ip-2 --region=europe-west1
gcloud compute routers nats update nat-eu --router=nat-router --region=europe-west1 \
  --nat-external-ip-pool=nat-ip-1,nat-ip-2

gcloud compute routers get-status nat-router --region=europe-west1
gcloud compute routers get-nat-mapping-info nat-router --region=europe-west1
```

| Setting | Default / rule |
| --- | --- |
| Served resources | Compute Engine VMs, GKE nodes and Pods, Cloud Run and Cloud Run functions (through Direct VPC egress or Serverless VPC Access), App Engine standard |
| Subnets | All ranges (`--nat-all-subnet-ip-ranges`), primary ranges only, or a custom list |
| NAT IPs | Automatic allocation, or a manual pool for a fixed source address |
| Ports per VM | Static allocation: minimum 64 by default. Dynamic allocation: minimum 32, maximum up to 65,536 |
| Capacity | About 64,512 TCP and 64,512 UDP ports per NAT IP |
| Logging | Off by default; `ALL`, `ERRORS_ONLY` or `TRANSLATIONS_ONLY` |

> **Exam trap.** Dropped outbound connections under load usually mean port exhaustion: raise `--min-ports-per-vm`, enable dynamic port allocation or add NAT IPs, and turn on `ERRORS_ONLY` logging to confirm. A VM that has its own external IP doesn't use Cloud NAT. Cloud NAT is not a way to publish a service: inbound access needs an external IP or a load balancer.

<!-- section: firewall-rules | objectives: 3.3.5 -->
## Managing VPC firewall rules

VPC firewall rules belong to one network and are enforced on each VM interface. They are **stateful**: return traffic of an allowed connection is allowed.

| Element | Values |
| --- | --- |
| Direction | `INGRESS` (default) or `EGRESS` |
| Action | `--allow` / `--action=ALLOW` or `DENY`, with `--rules=tcp:443,udp:53` |
| Priority | 0 to 65535, default **1000**; lowest number wins; at equal priority **deny wins** |
| Targets | All instances, `--target-tags` (network tags) or `--target-service-accounts` |
| Sources (ingress) | `--source-ranges`, `--source-tags`, `--source-service-accounts` |
| Implied actions | Allow all egress, deny all ingress; apply only when no rule matches; can't be logged |

```bash
# SSH through IAP only, to tagged VMs
gcloud compute firewall-rules create allow-iap-ssh --network=prod-vpc \
  --direction=INGRESS --action=ALLOW --rules=tcp:22 \
  --source-ranges=35.235.240.0/20 --target-tags=ssh-iap --priority=1000

# Load balancer health checks to the web backends
gcloud compute firewall-rules create allow-health-checks --network=prod-vpc \
  --action=ALLOW --rules=tcp:80 --source-ranges=35.191.0.0/16 \
  --target-service-accounts=web-sa@example-prj.iam.gserviceaccount.com

# Block egress to a range, log matches
gcloud compute firewall-rules create deny-egress-bad --network=prod-vpc \
  --direction=EGRESS --action=DENY --rules=all --destination-ranges=203.0.113.0/24 \
  --priority=500 --enable-logging

gcloud compute firewall-rules update allow-iap-ssh --disabled          # test without deleting
gcloud compute firewall-rules list --filter="network=prod-vpc" --sort-by=priority
```

The `default` network comes with `default-allow-internal`, `default-allow-ssh`, `default-allow-rdp` and `default-allow-icmp` at priority 65534; custom networks have only the implied rules. Traffic to the metadata server (`169.254.169.254`) is always allowed.

> **Exam trap.** Prefer `--target-service-accounts` to network tags when the requirement says that developers who can edit VMs must not be able to change which rules apply: anyone with permission to edit an instance can change its tags, but attaching a service account requires `iam.serviceAccounts.actAs`.

<!-- section: firewall-policies | objectives: 3.3.5 -->
## Managing Cloud NGFW firewall policies

Firewall policies group rules and attach them at a higher level than one network:

| Policy | Attached to | Typical owner |
| --- | --- | --- |
| Hierarchical firewall policy | Organization or folder; applies to every VPC below | Central security team |
| Global network firewall policy | One VPC network, all regions | Network team |
| Regional network firewall policy | One VPC network, one region | Network team |

Default evaluation order for a packet: hierarchical policies (organization, then each folder down the path) → regional system firewall policies → VPC firewall rules → global network firewall policy → regional network firewall policy → implied rules. Setting the network's `--network-firewall-policy-enforcement-order=BEFORE_CLASSIC_FIREWALL` evaluates the network policies before the VPC firewall rules (default `AFTER_CLASSIC_FIREWALL`).

Policy rule actions: `allow` and `deny` stop the evaluation; `goto_next` hands the packet to the next level (for example, a hierarchical policy delegating a decision to the project's rules); `apply_security_profile_group` sends it to Cloud NGFW Enterprise inspection. Each rule has a unique priority from 0 to 2,147,483,547.

```bash
# Organization-wide: block RDP from the internet, delegate everything else
gcloud compute firewall-policies create --organization=123456789012 --short-name=org-baseline
gcloud compute firewall-policies rules create 1000 --firewall-policy=org-baseline \
  --organization=123456789012 --direction=INGRESS --action=deny \
  --src-ip-ranges=0.0.0.0/0 --layer4-configs=tcp:3389 --enable-logging
gcloud compute firewall-policies associations create --firewall-policy=org-baseline \
  --organization=123456789012

# Global network firewall policy using a secure tag
gcloud compute network-firewall-policies create prod-policy --global
gcloud compute network-firewall-policies rules create 100 --firewall-policy=prod-policy \
  --global-firewall-policy --direction=INGRESS --action=allow \
  --src-ip-ranges=10.0.0.0/8 --layer4-configs=tcp:5432 \
  --target-secure-tags=tagValues/281484836404786
gcloud compute network-firewall-policies associations create --firewall-policy=prod-policy \
  --network=prod-vpc --global-firewall-policy
```

**Secure tags** (Resource Manager tags with purpose `GCE_FIREWALL`) are IAM-controlled: binding a tag value to a VM needs Tag User (`roles/resourcemanager.tagUser`). They work only in firewall **policies**; VPC firewall rules use network tags. A tag key's purpose and scope can't be changed after creation.

| Cloud NGFW tier | Adds | Cost |
| --- | --- | --- |
| Essentials | IP ranges, protocols and ports, address groups, secure tags, service accounts | No charge |
| Standard | FQDN objects, geolocation objects, threat intelligence lists | Per GiB evaluated (internet traffic) |
| Enterprise | Intrusion detection and prevention (IDPS) through firewall endpoints and security profile groups | Per endpoint hour and per GiB inspected |

> **Exam tip.** "Enforce a rule on every project of the organization that project owners can't override" → hierarchical firewall policy with `deny` (or `allow`) at the organization; use `goto_next` only where projects may decide. "Allow egress only to `*.example-partner.com`" → an FQDN object in a network firewall policy (Standard tier); VPC firewall rules can't match names.

<!-- section: key-points -->
## Key points

- `gcloud compute networks subnets expand-ip-range --prefix-length`: expand only, never shrink or undo; auto mode subnets stop at `/16`.
- Static IPs: regional for VMs and regional load balancers, global for global load balancers; promote an ephemeral IP with `addresses create --addresses`; unused reserved external IPs cost more.
- Routes: subnet routes first, then most specific prefix, then lowest priority (default 1000); `--tags` scopes a route; instance next hops need `--can-ip-forward`.
- Cloud DNS: public, private, forwarding and peering zones; inbound server policy for on-premises clients; allow `35.199.192.0/19` for forwarding.
- Cloud NAT: outbound only, regional, on a Cloud Router; 64 ports per VM by default; manual NAT IPs for allowlisting.
- Firewall rules: stateful, lower number wins, deny wins ties, implied deny ingress and allow egress.
- Firewall policies: hierarchical → VPC rules → global → regional → implied; `goto_next` delegates; secure tags only in policies.
