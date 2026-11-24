Monitoring questions give a symptom and a list of tools: you pick the one that answers that exact question. Network Watcher diagnoses one flow or one gateway, flow logs and traffic analytics record what happened, Azure Monitor network insights shows the health of everything, DDoS Protection telemetry tells whether you're under attack, and Microsoft Defender for Cloud ranks network weaknesses by risk.

<!-- section: network-watcher-configuration | objectives: 1.4.1 -->
## Configuring Network Watcher monitoring, diagnostics and logs

Network Watcher is **regional**. It's enabled automatically in a region when you create or update a virtual network there, as an instance named `NetworkWatcher_<region>` in the resource group **NetworkWatcherRG**; one instance per region and subscription. If the subscription opted out of automatic enablement, create the instance yourself before using any tool in that region. Deleting an instance deletes its flow logs, connection monitors and packet captures in that region.

```bash
az network watcher configure --resource-group NetworkWatcherRG --locations westeurope --enabled
```

**Flow logs** record IP flows (5-tuple, direction, state, bytes and packets) every minute in JSON, in a storage account:

| | Virtual network flow logs | NSG flow logs |
| --- | --- | --- |
| Status | Current | Retire on September 30, 2027; new NSG flow logs can no longer be created. Migrate |
| Target | Virtual network, subnet or network interface (precedence NIC, then subnet, then virtual network) | One network security group |
| Records | Every flow in the scope, allowed or denied by NSG rules or Virtual Network Manager security admin rules; encryption status | Flows evaluated by that NSG |

Storage account rules: **same region** as the target, same subscription or a subscription of the same Microsoft Entra tenant, **Standard** performance (not Premium). Rotating a customer-managed key on the account stops logging until you disable and re-enable the flow log.

**Traffic analytics** processes the flow logs into a **Log Analytics workspace** (table `NTANetAnalytics` for virtual network flow logs) and adds geography, topology and security context: top talkers, open ports, malicious IPs. Processing interval: **every 60 minutes** (default) or **every 10 minutes**.

```bash
az network watcher flow-log create --location westeurope --resource-group RG1 --name fl-vnet1 \
  --vnet VNet1 --storage-account stflowlogs01 \
  --traffic-analytics true --workspace law-network --interval 10
```

**Connection monitor** continuously tests reachability and latency (checks failed %, round-trip time) from sources to destinations:

- Sources: Azure VMs and scale sets with the **Network Watcher extension** (installed for you by the portal), and on-premises machines enabled with **Azure Arc** plus the **Azure Monitor Agent**. The portal enables the monitoring extensions, but you enable the Arc agent on each on-premises host yourself, and the **Network Performance Monitoring** solution must be enabled in the Log Analytics workspace (**+ Enable Non-Azure**). The Log Analytics agent is no longer supported.
- Destinations: VMs, URLs, FQDNs, IP addresses, Microsoft 365 URLs; no agent needed.
- Structure: a regional connection monitor contains **test groups**; each test group has sources, destinations and **test configurations** (TCP, HTTP or ICMP, port, frequency, thresholds). Every source × destination × configuration is one test.
- Limits per region and subscription: 100 connection monitors; per monitor: 20 test groups, 100 sources and destinations, 20 test configurations.

Resource logs and metrics of network resources (VPN gateway, load balancer, application gateway, public IP) are collected with a **diagnostic setting** to a Log Analytics workspace, a storage account or an event hub.

<!-- section: network-watcher-troubleshooting | objectives: 1.4.2 -->
## Troubleshooting with Network Watcher

| Question in the stem | Tool |
| --- | --- |
| Is TCP/UDP traffic between VM1 and an address allowed, and which rule decides? | **IP flow verify** (NSG and Virtual Network Manager admin rules of one VM network interface) |
| Same question for ICMP, for a scale set or an application gateway v2, or for a service tag or prefix | **NSG diagnostics** (can also add a higher-priority rule) |
| Which rules apply to a network interface (subnet NSG + NIC NSG, aggregated)? | **Effective security rules** |
| Where does traffic to this address go? | **Next hop** (next hop type, IP, route table) |
| Can VM1 reach this FQDN on port 1433 now, and what blocks it? | **Connection troubleshoot** (point-in-time test; latency, hops, NSG, UDR, guest firewall, CPU) |
| Must reachability and latency be tracked over time with alerts? | **Connection monitor** |
| What exactly is on the wire? | **Packet capture** |
| Why is a site-to-site tunnel down? | **VPN troubleshoot** |
| What is connected to what? | **Topology** |

```bash
az network watcher test-ip-flow --resource-group RG1 --vm VM1 --nic vm1-nic \
  --direction Outbound --protocol TCP --local 10.1.0.4:60000 --remote 13.107.21.200:80
az network watcher troubleshooting start --resource-group RG1 --resource VNet1toSite1 \
  --resource-type vpnConnection --storage-account $storageId \
  --storage-path https://stdiag01.blob.core.windows.net/vpnts
```

Details that decide answers:

- **Packet capture** needs the `AzureNetworkWatcherExtension` VM extension. Output to the VM's disk or a storage blob; filters by IP, port and protocol; default time limit 18,000 seconds (5 hours); **continuous** capture uses a ring buffer of files for up to seven days. Up to 10,000 sessions per region and subscription.
- **VPN troubleshoot** supports route-based VPN gateways and IPsec or VNet-to-VNet connections, not ExpressRoute, policy-based gateways or point-to-site connections. It writes logs to a storage account and returns fault types such as `Authentication` (preshared key mismatch), `PeerReachability` and `IkePolicyMismatch`. One operation at a time per subscription. With Azure CLI, the gateway and the storage account must be in the same resource group; otherwise use PowerShell or the portal.
- **Connection troubleshoot** runs from a VM, scale set, Azure Bastion host or application gateway v2; its agentless mode (preview) doesn't need the extension.
- Every tool needs a Network Watcher instance in the region of the resource.

> **Exam trap.** IP flow verify says **Access allowed**, yet the connection fails: the problem isn't an NSG. Check the route with next hop, then the guest firewall and the application with connection troubleshoot.

<!-- section: azure-monitor-network-insights | objectives: 1.4.3 -->
## Monitoring networks with Azure Monitor network insights

Azure Monitor **network insights** (Azure Monitor > Networks) is a ready-made view of every network resource across the selected subscriptions, **with no configuration**:

| Area | What you get |
| --- | --- |
| Topology | Interactive map of virtual networks and connected resources across subscriptions, regions and resource groups; drill down into a resource |
| Network health and metrics | One tile per resource type with instance count and Resource Health status (for example, 4 of 6 VPN and ExpressRoute connections healthy), alerts, and links to metrics |
| Resource view | For onboarded resources (application gateway, for example): how frontends, listeners, rules and backend pools connect, with backend health |
| Connectivity | Results of every Connection monitor test: reachability against your thresholds of checks failed % and RTT |
| Traffic | Flow log and traffic analytics configuration per region; search the NSGs that apply to an IP address |
| Diagnostic toolkit | Shortcuts to packet capture, VPN troubleshoot, connection troubleshoot, next hop and IP flow verify |

Typical answers: "find all unhealthy VPN connections in five subscriptions" uses network health; "see which backend pool makes an application gateway unhealthy" uses the resource view; "alert when a connection's latency exceeds a threshold" uses Connection monitor metrics with an Azure Monitor alert rule.

<!-- section: ddos-protection | objectives: 1.4.4 -->
## Activating and monitoring DDoS protection

Every Azure public IP address gets **DDoS infrastructure protection** at no cost and without configuration. Azure DDoS Protection adds layer 3 and 4 mitigation tuned to your traffic, telemetry and alerts. Layer 7 attacks need a WAF (Application Gateway or Azure Front Door).

| | DDoS Network Protection | DDoS IP Protection |
| --- | --- | --- |
| Enabled on | A **DDoS protection plan** linked to virtual networks: every public IP address of resources in those networks is protected | Each public IP address, no plan |
| Scope | One plan for the tenant; virtual networks in any subscription of the same Microsoft Entra tenant | Per IP |
| Pricing | Per plan, covering 100 public IP addresses | Per protected IP |
| DDoS Rapid Response, cost protection, WAF discount | Yes | No |
| Basic public IP | Protected | Not supported |

Common to both: always-on monitoring, three auto-tuned mitigation policies per public IP (TCP SYN, TCP, UDP), metrics, alerts, mitigation reports and flow logs. A DDoS Protection custom policy (preview) can set fixed detection thresholds per protocol on Standard Load Balancer frontend IP addresses. A public IP attached to a NAT gateway can't be protected; DDoS Protection for the public IPs of a StandardV2 NAT gateway is in preview.

```bash
az network ddos-protection create --resource-group RG1 --name ddos-plan-contoso
az network vnet update --resource-group RG1 --name VNet1 \
  --ddos-protection-plan ddos-plan-contoso --ddos-protection true
az network public-ip update --resource-group RG1 --name app-pip --ddos-protection-mode Enabled
```

Monitoring is done on the **public IP address** resource:

| Signal | Use |
| --- | --- |
| Metric **Under DDoS attack or not** | 0 = no attack, 1 = attack. Alert rule: Maximum, greater than or equal to 1 |
| Metrics **Inbound packets dropped DDoS**, **Inbound packets forwarded DDoS**, **Inbound packets DDoS** | Scrubbed, forwarded and total traffic during mitigation |
| Log `DDoSProtectionNotifications` | Start and end of mitigation |
| Log `DDoSMitigationFlowLogs` | Dropped and forwarded flows during an attack, for Microsoft Sentinel or a SIEM |
| Log `DDoSMitigationReports` | Attack reports in five-minute increments; retiring: Learn gives mid-August 2026 for the end of this category and September 2026 for the old pipeline (approximate dates), so rebuild these reports from `DDoSMitigationFlowLogs`, whose column names also change |

Logs require a **diagnostic setting** on the public IP address. Telemetry and alerts exist only while a public IP is protected.

> **Exam trap.** "Get help from Microsoft experts during an attack and service credits for the scale-out costs it causes": DDoS **Network** Protection. IP Protection has the same mitigation but no Rapid Response and no cost protection.

<!-- section: defender-secure-score | objectives: 1.4.5 -->
## Evaluating network recommendations in the secure score

Microsoft Defender for Cloud evaluates resources against the **Microsoft cloud security benchmark** and lists **recommendations**. The free **Foundational CSPM** plan already includes the secure score, recommendations and asset inventory.

How the classic secure score (Azure portal) moves:

- Recommendations are grouped into **security controls**, each with a **Max score**. Points per resource = max score ÷ (healthy + unhealthy resources).
- A control gives all its points only when **every** recommendation in it is remediated on every resource. **Potential score increase** shows the gain.
- Recommendations marked **Preview** don't count until they're generally available.
- Scores are recalculated about every eight hours.
- Across several subscriptions, the overall score is a weighted sum, not an average of the per-subscription percentages. The Microsoft Defender portal shows a different model, the risk-based **Cloud Secure Score**; the classic score stays in the Azure portal (**Recommendations** > **Switch to classic view**).

| Network control (max score) | Remediation that earns its points |
| --- | --- |
| Secure management ports (8) | Just-in-time VM access and network security groups |
| Restrict unauthorized network access (4) | Network security groups, Azure Private Link for PaaS services, Azure Firewall on virtual networks |
| Protect applications against DDoS attacks (2) | Azure DDoS Protection and a web application firewall |

| Network recommendation | Severity |
| --- | --- |
| Internet-facing virtual machines should be protected with network security groups | High |
| All network ports should be restricted on network security groups associated to your virtual machine | High |
| Management ports of virtual machines should be protected with just-in-time network access control | High |
| Management ports should be closed on your virtual machines | Medium |
| IP forwarding on your virtual machine should be disabled | Medium |
| Azure DDoS Protection Standard should be enabled | Medium |
| Non-internet-facing virtual machines should be protected with network security groups | Low |
| (Enable if required) Subnets should be associated with a network security group | Low |

To raise the score: remediate (manually or with **Fix** when available), and use **Enforce** or **Deny** so that new resources comply.

> **Exam tip.** The fastest gain is the control with the highest potential increase, not the recommendation with the most unhealthy resources: a control pays only when all its recommendations are fixed.

<!-- section: attack-path-analysis | objectives: 1.4.6 -->
## Evaluating network risks with attack path analysis

Attack path analysis searches the **cloud security graph** for exploitable paths that start **outside** the organization (an internet-exposed, vulnerable VM, for example), follow lateral movement (network connections, attached identities and their permissions) and reach a critical **target** such as a database with sensitive data.

| Requirement | Detail |
| --- | --- |
| Plan | **Defender CSPM** (not included in Foundational CSPM) |
| Data | Agentless scanning for VMs, or vulnerability assessment from Defender for Servers |
| Roles | Security Reader, Security Admin, Reader, Contributor or Owner |

Working through a path in the Azure portal: **Defender for Cloud** > **Attack path analysis** > select a path (sorted by risk) > select a node to see its **Insight** and **Recommendations**, or open **Remediation**:

- **Recommendations** break the path; **Additional recommendations** lower the risk without fully breaking it. Fix the first ones first.
- Typical network breaks: close the exposed management port or restrict the NSG rule, remove the public IP address, put the resource behind a firewall or a private endpoint.
- A resolved path can take up to 24 hours to leave the list. An empty list is possible: only real, externally exploitable paths are shown.

<!-- section: cloud-security-explorer | objectives: 1.4.7 -->
## Finding network resources with cloud security explorer

Cloud security explorer runs graph queries over the same cloud security graph to find resources proactively, before an attack path exists: inventory, internet exposure, permissions, lateral movement, across Azure, AWS and GCP.

- Requires **Defender CSPM** (and agentless scanning); with only Defender for Servers Plan 2 you can query keys and secrets, not use the full explorer. Same roles as attack path analysis. Configuration data is refreshed daily.
- **Defender for Cloud** > **Cloud Security Explorer**: select a resource type, select **+** to add conditions and sub-filters (for example on internet exposure or connections to other resources), then **Search**.
- **Query templates** at the bottom of the page give ready-made questions; open one, adjust it, run it.
- **Share query link** copies the query; **Download CSV report** exports the results.

| Need | Tool |
| --- | --- |
| Score and prioritized list of misconfigurations | Secure score and recommendations (Foundational CSPM) |
| Which exposures actually lead to a critical asset? | Attack path analysis (Defender CSPM) |
| Ad hoc question: "which VMs are exposed to the internet and can reach a storage account with sensitive data?" | Cloud security explorer (Defender CSPM) |

<!-- section: key-points -->
## Key points

- Network Watcher: one instance per region (`NetworkWatcher_<region>`, NetworkWatcherRG); each tool needs it in the resource's region.
- Virtual network flow logs replace NSG flow logs (retiring September 30, 2027); storage account in the same region, Standard; traffic analytics in Log Analytics every 10 or 60 minutes.
- IP flow verify for one VM and TCP/UDP; NSG diagnostics for ICMP, scale sets and service tags; next hop for routing; connection troubleshoot now, Connection monitor over time; VPN troubleshoot needs a storage account.
- Network insights: health, topology, connectivity and traffic views with no setup.
- DDoS Network Protection = plan per tenant linked to virtual networks, with Rapid Response and cost protection; IP Protection = per public IP. Alert on **Under DDoS attack or not**.
- Secure score and recommendations are free; attack path analysis and cloud security explorer need Defender CSPM.
