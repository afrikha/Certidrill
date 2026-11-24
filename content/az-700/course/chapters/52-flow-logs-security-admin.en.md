This chapter covers the tools that record, test and enforce traffic filtering beyond a single NSG: virtual network flow logs and how to read them, IP flow verify, the NSG rules that Azure Bastion needs, and security admin rules deployed by Azure Virtual Network Manager. Exam questions give you a log extract, a set of rules or a governance requirement and ask what happened to a flow or what to configure.

<!-- section: vnet-flow-logs | objectives: 5.1.6 -->
## Implementing virtual network flow logs

**Virtual network flow logs** are a Network Watcher feature that records the IP flows going through a virtual network (Layer 4: 5-tuple, direction, state, allowed or denied, bytes and packets). They replace **NSG flow logs**: NSG flow logs no longer accept new creations and retire on **September 30, 2027**, when Azure deletes the remaining NSG flow log resources (existing log blobs stay in storage).

| | NSG flow logs (retiring) | Virtual network flow logs |
| --- | --- | --- |
| Enabled on | A network security group | A virtual network, a subnet or a network interface |
| Records decisions of | NSG rules | NSG rules **and** Virtual Network Manager security admin rules |
| Encryption status (virtual network encryption) | No | Yes |
| VPN gateway, ExpressRoute gateway, Application Gateway traffic | No | Yes |
| New creation | No longer supported | Yes |

Prerequisites and rules to know:

- The **Microsoft.Insights** resource provider must be registered in the subscription.
- The flow log is a child resource of the regional Network Watcher (portal: **Network Watcher > Logs > Flow logs > Create**, flow log type **Virtual network**, then select a virtual network, subnet or network interface as target).
- The **storage account** must be in the **same region** as the virtual network, in the same subscription or one associated with the same Microsoft Entra tenant, and **Standard** performance (Premium isn't supported). Any redundancy works (LRS, ZRS, GRS, GZRS).
- **Retention (days)** is available only with Standard general-purpose v2 accounts; **0** keeps logs until you delete them.
- If you enable flow logs at several levels, the more specific one is used: **NIC > subnet > virtual network**.
- Rotating the storage account's customer-managed key stops the flow logs: disable and re-enable them.
- **Traffic analytics** (optional, **Analytics** tab) processes the logs into a Log Analytics workspace every **10 minutes** or every **1 hour** (default). Flow log collection has a free tier of 5 GB per month per subscription; traffic analytics has none.
- Flows from VMs to an ExpressRoute circuit aren't recorded when logging is enabled only on the gateway subnet (and FastPath traffic bypasses the gateway): log the VM's subnet or NIC instead.
- Some services don't support virtual network flow logs, for example App Service, Azure Functions, Logic Apps, Azure Container Instances, Azure Container Apps, Azure DNS Private Resolver and Azure SQL Managed Instance.

```bash
az provider register --namespace Microsoft.Insights

az network watcher flow-log create --location westeurope \
  --resource-group RG-Net --name fl-vnet-hub \
  --vnet VNet-Hub --storage-account stflowlogsweu \
  --traffic-analytics true --workspace law-network --interval 10
```

At scale, use the built-in Azure Policy definitions: **Audit flow logs configuration for every virtual network** (audit only) and **Deploy a flow log resource with target virtual network** (DeployIfNotExists, with a managed identity and a remediation task for existing virtual networks).

> **Exam trap.** A requirement to "start logging flows for the NSG of Subnet1" is answered with a virtual network flow log on the subnet (or virtual network), not with a new NSG flow log. Disable any remaining NSG flow log on the same workloads to avoid duplicate records.

<!-- section: interpret-flow-logs | objectives: 5.1.7 -->
## Interpreting virtual network flow logs

Records are collected every minute and written as JSON to block blobs (one blob per hour) in the storage account. Each record carries the target resource, the MAC address of the network interface and a hierarchy: `flowRecords` > `flows` (one entry per evaluating ACL, identified by `aclID`: an NSG or Virtual Network Manager) > `flowGroups` (one per `rule`) > `flowTuples`.

A version 2 tuple has 13 comma-separated fields:

| Position | Field | Values |
| --- | --- | --- |
| 1 | Time stamp | UNIX epoch |
| 2–3 | Source IP, destination IP | |
| 4–5 | Source port, destination port | |
| 6 | Protocol | IANA number: 6 = TCP, 17 = UDP, 1 = ICMP |
| 7 | Direction | `I` inbound, `O` outbound |
| 8 | Flow state | `B` begin, `C` continuing, `E` end, `D` deny |
| 9 | Encryption | `X` encrypted, `NX` unencrypted (default), `NX_...` reasons |
| 10–13 | Packets sent, bytes sent, packets received, bytes received | Source to destination, then destination to source |

Example records in a flow group whose `rule` is `UserRule_Deny-RDP-Internet`:

```text
1763372400,203.0.113.50,10.1.2.4,51234,3389,6,I,D,NX,0,0,0,0
1763372410,10.1.2.4,198.51.100.20,40100,443,6,O,B,NX,0,0,0,0
1763372470,10.1.2.4,198.51.100.20,40100,443,6,O,E,NX,12,1830,10,9620
```

Reading them:

- Line 1: an inbound TCP connection from the internet to port 3389 of 10.1.2.4 was **denied** (`D`) by the rule named in the flow group. Denied flows have zero counters.
- Lines 2–3: an outbound HTTPS flow from 10.1.2.4 was allowed: `B` opens it, `E` closes it, and the end record counts what was exchanged since the previous record of that flow (`C` records appear for long flows; add the counters of `C` and `E` records to get the total).
- Rule names show where the decision came from: NSG rules appear as `UserRule_` or `DefaultRule_` followed by the rule name (for example `DefaultRule_DenyAllInBound`), security admin rules under their own name with the Virtual Network Manager configuration as `aclID`, and a **platform rule** marks traffic the platform handles without a configured rule (informational only).

With traffic analytics, query the `NTANetAnalytics` table (it replaces `AzureNetworkAnalytics_CL` used by NSG flow logs):

```kusto
NTANetAnalytics
| where SubType == "FlowLog" and FlowStatus == "D"
| summarize DeniedFlows = count() by SrcIp, DestIp, DestPort, AclRule
| top 10 by DeniedFlows
```

> **Exam tip.** To find "which rule blocked the traffic", read the `rule` of the flow group containing the `D` tuple. To find "how much data was transferred", add the byte counters of the `C` and `E` tuples of the same 5-tuple.

<!-- section: ip-flow-verify | objectives: 5.1.8 -->
## Verifying IP flow

**IP flow verify** (Network Watcher) tests whether a packet is allowed or denied to or from a virtual machine. You give the VM (and its NIC if it has several), the **direction**, the **protocol** (TCP or UDP), the **local IP and port** and the **remote IP and port**. It evaluates the effective rules of all NSGs on the NIC and its subnet, plus the Virtual Network Manager security admin rules applied to the virtual network, and returns **Access allowed** or **Access denied** with the name of the rule (and a link to the NSG, except for default rules).

Constraints:

- A Network Watcher instance must exist in the VM's subscription and region.
- The VM must be **running** (stopped VMs can't be selected).
- TCP and UDP only. For ICMP, scale set instances or Application Gateway v2, use **NSG diagnostics**.
- It checks security rules only, not routing: a UDR that sends traffic to an appliance doesn't change its answer.

```bash
az network watcher test-ip-flow --resource-group RG-App --vm VM1 \
  --direction Inbound --protocol TCP \
  --local 10.1.2.4:3389 --remote 203.0.113.50:60000
```

| Question | Network Watcher tool |
| --- | --- |
| Is this flow allowed or denied, and by which rule? | IP flow verify |
| Same question for ICMP, a scale set or an application gateway | NSG diagnostics |
| Which rules apply to this NIC after merging subnet and NIC NSGs? | Effective security rules |
| Where does a packet go (next hop type and IP)? | Next hop |
| Can VM1 reach this address and port end to end, with latency? | Connection troubleshoot |
| What flows happened over time? | Virtual network flow logs |

> **Exam trap.** IP flow verify answering "allowed" while the connection still fails points to routing (UDR, appliance) or to the guest OS firewall, not to an NSG.

<!-- section: bastion-nsg | objectives: 5.1.9 -->
## Configuring NSGs for remote administration with Azure Bastion

Azure Bastion lets administrators open RDP and SSH sessions to VMs over TLS from the portal or a native client, so VMs need no public IP and port 3389 or 22 never faces the internet. Every SKU except **Developer** is deployed in a dedicated subnet named **AzureBastionSubnet**, **/26 or larger**, containing nothing else.

An NSG on AzureBastionSubnet is optional, but if you associate one it must contain **all** these rules (missing ones break connectivity or platform updates):

| Direction | Source | Destination | Ports | Purpose |
| --- | --- | --- | --- | --- |
| Inbound | Internet (or specific public IPs) | Any | TCP 443 | User sessions |
| Inbound | GatewayManager | Any | TCP 443 | Control plane |
| Inbound | AzureLoadBalancer | Any | TCP 443 | Health probes |
| Inbound | VirtualNetwork | VirtualNetwork | 8080, 5701 | Bastion host communication |
| Outbound | Any | VirtualNetwork | 22, 3389 | Sessions to target VMs |
| Outbound | Any | AzureCloud | TCP 443 | Diagnostics and metering |
| Outbound | VirtualNetwork | VirtualNetwork | 8080, 5701 | Bastion host communication |
| Outbound | Any | Internet | 80 | Session and certificate validation |

On the **target VM subnet** (or NIC) NSG, allow inbound 3389 or 22 (or the custom port used with the Standard or Premium SKU) from the **AzureBastionSubnet address range**. No inbound rule from the internet is needed on the VM side. With the custom port feature, the AzureBastionSubnet NSG must also let the sessions out on the custom ports: allow egress to the **VirtualNetwork** service tag instead of only 22 and 3389 to the VM subnets.

**Just-in-time (JIT) VM access** (Microsoft Defender for Servers Plan 2) is the other NSG-based pattern: Defender for Cloud adds *deny all inbound* rules for the selected management ports, and on an approved request it temporarily allows the requester's IP for the chosen duration, then restores the NSG. JIT doesn't support firewalls managed by Firewall Manager (classic rules only).

> **Exam trap.** Port 3389 or 22 isn't needed inbound on AzureBastionSubnet: users reach Bastion on 443. And the VM-side rule must allow the Bastion subnet range, not the user's public IP, because the session reaches the VM from Bastion's private IP.

<!-- section: avnm-security-admin | objectives: 5.1.10 -->
## Enforcing security with Azure Virtual Network Manager

**Azure Virtual Network Manager** centrally manages virtual networks across subscriptions. Its **scope** is a list of management groups and/or subscriptions; you enable **features** (configuration types): Connectivity, **Security admin**, Routing. Overlapping network managers are allowed only with different features; on a conflict, the network manager with the higher scope wins.

Building blocks:

1. **Network group**: a global set of virtual networks. Membership is **static** (you pick virtual networks) or **dynamic** (conditions such as a tag or name, evaluated by an **Azure Policy** definition that the network group creates).
2. **Security admin configuration**: contains **rule collections**, each targeting one or more network groups and containing **security admin rules**.
3. **Deployment**: nothing applies until you deploy the configuration to selected **regions**. Only **one security admin configuration per region** at a time (use several rule collections inside it). The deployment sets the region's goal state: deploying a new set replaces the previous one, and deploying **None** removes them. Changing rules requires redeploying; a virtual network joining a group later (static or dynamic) receives the deployed rules automatically.

A security admin rule has a **priority** (1 to 4,096, lower first), an **action**, a direction, a protocol (TCP, UDP, ICMP, ESP, AH or Any), and optional sources, destinations (IP prefixes or service tags) and ports. Security admin rules are evaluated **before NSG rules**:

| Action | Effect |
| --- | --- |
| Allow | Traffic continues to NSG evaluation, which can still deny it |
| Deny | Traffic is dropped; NSGs aren't evaluated |
| Always Allow | Traffic is delivered; NSGs can't deny it |

Typical pattern: a **Deny** rule for high-risk ports (for example 22 and 3389 from the internet) on an "all virtual networks" group, plus a higher-priority **Always Allow** for the virtual networks that need an exception, so application teams keep NSGs for their own filtering but can't open what governance closes.

Security admin rules apply at the virtual network level, with exceptions: they aren't applied by default to virtual networks containing Azure SQL Managed Instance or Azure Databricks (with `AllowRulesOnly` set in the security admin configuration, only its Allow rules are applied there), they don't apply to private endpoints in a managed virtual network, and they don't apply to subnets of Application Gateway (without network isolation), Azure Bastion, Azure Firewall, Azure Route Server, VPN Gateway, Virtual WAN and ExpressRoute gateways. Rules arrive with **eventual consistency** (short delay); on a VM's **Networking** page they appear below the NSG rules.

> **Exam trap.** "Ensure that no team can open port 3389 from the internet, even by editing its NSG" is a security admin rule with **Deny**, not an Azure Policy on NSGs and not an NSG managed centrally. "Ensure monitoring traffic always reaches the VMs whatever the NSGs say" is **Always Allow**.

<!-- section: key-points -->
## Key points

- Create virtual network flow logs (VNet, subnet or NIC; NIC wins over subnet over VNet); NSG flow logs can't be created anymore and retire on September 30, 2027.
- Flow log storage: same region, same tenant, Standard performance; retention needs general-purpose v2; traffic analytics every 10 or 60 minutes into `NTANetAnalytics`.
- Tuple: time, IPs, ports, protocol (6 TCP, 17 UDP), `I`/`O`, state `B`/`C`/`E`/`D`, encryption, then counters; the flow group's `rule` tells which rule decided.
- IP flow verify: running VM, TCP/UDP, NSG plus security admin rules, returns allow or deny and the rule; it ignores routing.
- Bastion: AzureBastionSubnet /26 or larger; its NSG needs 443 from Internet, GatewayManager and AzureLoadBalancer, 8080/5701 within VirtualNetwork, and outbound 22/3389, 443 to AzureCloud, 80 to Internet; VM subnets allow 22/3389 from the Bastion subnet.
- Security admin rules (Virtual Network Manager) are evaluated before NSGs: Deny and Always Allow are final, Allow defers to NSGs; one configuration per region, effective only after deployment.
