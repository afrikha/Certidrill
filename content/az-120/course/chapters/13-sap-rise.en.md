With RISE with SAP (SAP Enterprise Cloud Services, S/4HANA Cloud Private Edition) on Azure, SAP runs the SAP landscape in an Azure subscription and tenant that SAP owns. The customer's job moves from operating SAP VMs to integrating with them: network connectivity and DNS, Azure services that exchange data with SAP, archiving, identity and security monitoring. Exam questions test what the customer can and can't do, and which connectivity or integration option fits.

<!-- section: responsibilities | objectives: 1.3.1, 1.3.3 -->
## Who does what with RISE

| Area | SAP (RISE/ECS) | Customer |
| --- | --- | --- |
| SAP landscape (VMs, storage, HANA, OS) | Decides, deploys and operates it in SAP's subscription; only SAP sees these resources | No access to the Azure resources of the SAP environment |
| SAP virtual network | Owns it, protects it with NSGs, opens the agreed ports | Protects its own virtual networks with NSGs, firewalls and routing |
| Connectivity | Approves the peering request; provides a dedicated ExpressRoute or VPN only for reaching the SAP network | Creates the peering or VPN from its hub; owns ExpressRoute to on-premises and central routing |
| Internet inbound (for example Fiori) | Exposes it through an SAP-managed application gateway with WAF, on request | Plans it with SAP |
| Azure services that use SAP data | Opens the communication paths on request | Deploys and runs them in its own subscriptions |
| Azure support | Handles issues with resources in SAP's subscriptions | Opens Azure support cases only for its own subscriptions |

Document every transfer point (address spaces, firewalls and routing, file shares, Azure services, DNS, owner of each interface) so that each side can troubleshoot its own part: there are no crossed responsibilities.

> **Exam trap.** Azure Center for SAP solutions and Azure Monitor for SAP solutions aren't supported with RISE: the customer has no access to the VMs in SAP's subscription. Monitoring and reporting come from what the SAP service description provides.

<!-- section: network-design | objectives: 1.3.1 -->
## Designing networking for RISE

| Option | When to use it | Limits |
| --- | --- | --- |
| **Virtual network peering** (preferred) | Default: most performant, lowest latency, highest throughput; cross-tenant between SAP's tenant and yours | Peering charges apply; address spaces can't overlap |
| Global virtual network peering | RISE and your workloads in different regions | Higher latency and cost; prefer the same region as your workloads |
| VNet-to-VNet VPN | A central team wants a single, secured point of entry into the customer network | Throughput limited by the gateway SKU on both sides; use zone-redundant gateways |
| Subnet peering with SAP's managed firewall service | Optional service: one RISE subnet connected to one customer subnet through firewalls | Only the selected subnets communicate; no virtual network peering |

**Hub-spoke.** The RISE virtual network becomes a spoke of the customer hub (or of a Virtual WAN hub that the customer deploys and manages). On-premises users reach SAP through the customer's existing ExpressRoute or VPN gateway in the hub: the peering uses **gateway transit**, the hub offering its gateway and the RISE network using the remote gateway. A virtual network has only one gateway, local or remote, so no gateway can be added in the RISE network in that design.

- The dedicated ExpressRoute or VPN that SAP can provide reaches the SAP-managed network only; it can't be used to reach the customer's own Azure virtual networks.
- Build ExpressRoute for resiliency (high or maximum resiliency models).
- For a global landscape, build a multi-region network in your own environment and peer RISE locally in each geography to the regional hub.
- Size connectivity for the migration and database replication phases too, not only for production traffic.

**Internet and SAP BTP.**

- Internet access to and from RISE is disabled by default; enabling inbound access (for example Fiori for external users) goes through SAP's application gateway with WAF.
- Your own applications reach the internet through your own services (Azure Firewall, NAT gateway).
- SAP BTP is reached through public endpoints; when BTP and RISE both run in Azure, the traffic stays on the Azure backbone. **SAP Private Link Service** connects BTP services privately into your Azure network, for requests that originate from BTP.
- SAP generally doesn't offer private endpoints to RISE workloads.

> **Exam tip.** "Users on premises must reach S/4HANA in RISE through the existing ExpressRoute circuit" means peering from the hub with gateway transit, not a new ExpressRoute in the SAP network.

<!-- section: network-implement | objectives: 1.3.2 -->
## Implementing networking for RISE

Peering crosses two Microsoft Entra tenants and two subscriptions:

1. Agree on non-overlapping address spaces and the ports to open with SAP.
2. Obtain the **Azure resource ID of the SAP-provided virtual network**.
3. For cross-tenant peering, add a user from the other tenant as a guest, accept the invitation, and grant the network permissions that peering requires.
4. Create the peering from your hub to the RISE network; SAP approves the peering on its side.
5. Update NSGs and routing on your side and test the open ports.

```bash
az network vnet peering create \
  --resource-group rg-hub-weu \
  --vnet-name vnet-hub-weu \
  --name peer-hub-to-rise \
  --remote-vnet "/subscriptions/<sap-subscription-id>/resourceGroups/<sap-rg>/providers/Microsoft.Network/virtualNetworks/<rise-vnet>" \
  --allow-vnet-access \
  --allow-forwarded-traffic \
  --allow-gateway-transit
```

Over the private connection, the open ports cover RFC (BAPI, IDoc), HTTPS (OData, REST, SOAP) and, when SAP agrees to direct database access, ODBC/JDBC to HANA. Any Azure service with access to your virtual network can then reach the SAP landscape on those ports.

**DNS integration.**

| Element | Owner | Role |
| --- | --- | --- |
| Delegated subdomain (for example `ecs.contoso.com`) | Customer | Provided and delegated to SAP |
| Two DNS server VMs in the RISE network | SAP | Primary (master) for the delegated zone |
| DNS servers in the hub (AD DS or BIND) | Customer | Receive the zone by **zone transfer** from SAP; your virtual networks point to them |
| Optional DNS forwarder | Customer | Forwards queries for the delegated zone to SAP's DNS servers |

> **Exam trap.** Azure-provided DNS and Azure private DNS zones don't support zone transfer, and SAP typically doesn't support external DNS providers for the delegated zone. The customer side needs DNS servers on VMs, such as AD DS or BIND, in the hub.

<!-- section: azure-services | objectives: 1.3.3 -->
## Azure compute, network and storage services with RISE

Every Azure service that integrates with RISE runs in the customer's subscription, usually on compute you deploy in a virtual network peered with RISE:

| Customer component | Runs on | Reaches SAP through |
| --- | --- | --- |
| Azure Data Factory or Synapse **self-hosted integration runtime** | Customer VMs in Azure or on premises | Peering, private IPs; NSGs limit what can connect |
| Azure Data Factory **Azure integration runtime** | Microsoft-managed | HTTPS to a public IP that RISE exposes through its application gateway |
| **On-premises data gateway** (Power BI, Power Apps, Logic Apps) | Customer VM in Azure or on premises | SAP .NET connector over RFC, BAPI and IDoc, through peering or site-to-site VPN; or REST through the RISE application gateway |
| **SAP Cloud Connector** for your own integrations to BTP | Customer VMs (when virtual network connectivity exists) | Private connection to SAP; outbound to BTP |
| Microsoft Sentinel **agentless data connector** (the containerized agent retired on September 14, 2026) | SAP Integration Suite, sending to the customer's Sentinel workspace | SAP Cloud Connector, hosted by SAP in RISE, or by the customer when virtual network connectivity exists |
| Azure API Management | Customer subscription | Governs Power Apps, Power BI, Functions and App Service calls to SAP, with throttling, quotas and SAP principal propagation |

Network services also stay on the customer side: Azure Firewall or NVAs in the hub, NAT gateway for outbound traffic, NSGs on your subnets. Inside SAP, the ABAP SDK for Azure and the Microsoft AI SDK for SAP ABAP let ABAP code call Azure services directly; installing them requires abapGit.

> **Exam trap.** A self-hosted integration runtime can't be installed on the RISE application servers: you have no access to them. Deploy it on a VM in your own virtual network that is peered with RISE.

<!-- section: data-management | objectives: 1.3.4 -->
## Integrating data management services and archiving

**Data integration.** The connector decides the runtime and the network path:

| Connector | Runtime | Notes |
| --- | --- | --- |
| SAP ECC | Azure IR or self-hosted IR | Either path |
| SAP table, SAP BW, SAP Open Hub | Self-hosted IR | SAP .NET connector and function modules over RFC; the Open Hub connector doesn't support SAP BW/4HANA |
| SAP HANA (ODBC/JDBC) | Self-hosted IR | Only if SAP agreed to direct database access and opened the user and path |

Change data capture from SAP into Microsoft Fabric (OneLake) with Azure Data Factory uses the same runtimes. Microsoft Purview scans of SAP ECC need a self-hosted IR (standard or on Kubernetes) with JDK 11, the SAP .NET connector and SAP JCo; at least 128 GB of RAM is recommended. Contact SAP for the communication paths to open and their license implications.

**Archiving.** SAP Information Lifecycle Management (ILM) manages data volumes, retention and the decommissioning of legacy systems. Its **ILM Store** can keep archive files and attachments from S/4HANA in **Azure Blob Storage**, applying ILM retention rules:

1. Register an application in Microsoft Entra ID with a client secret; SAP ILM authenticates as this service principal.
2. Create a Blob Storage account (manually or with the `sap-ilm-store` quickstart template).
3. Assign **Storage Blob Data Contributor** (or a custom role) to that application on the account.
4. Harden the account: secure transfer required, blob public access disabled, minimum TLS 1.2, **storage account key access disabled**, and no other principal with access to the account.

Archiving and data volume management move cold data out of the HANA database, which keeps memory, and therefore VM size and cost, under control.

> **Exam tip.** When the stem says "archive S/4HANA data to Azure with retention rules", think SAP ILM Store on Azure Blob Storage, accessed by a Microsoft Entra application with a data role, with shared key access disabled.

<!-- section: identity-security | objectives: 1.3.5 -->
## Identity and security services with RISE

Single sign-on works as for a self-managed SAP system, with RISE-specific limits:

| Scenario | Mechanism | Configured by |
| --- | --- | --- |
| SAP Fiori, Web GUI, Portal, HANA | SAML or OAuth with Microsoft Entra ID | Customer |
| SAP GUI | SNC with Microsoft Entra ID | Customer |
| Web GUI, SAP Enterprise Portal | SPNEGO with Active Directory | Customer and SAP |
| SAP GUI with AD/Kerberos | SAP SSO Secure Login Client on end-user devices; RISE Windows systems aren't joined to your domain, the token is read on the client | Customer, with SAP for any change |
| Third-party SSO products | May need changes on RISE systems | Customer and SAP |

- Use **Microsoft Entra ID as the identity provider** for RISE.
- **Microsoft Entra ID Governance**, with its integration with SAP Cloud Identity Services, handles SAP user lifecycle and authorizations; SAP recommends migrating from SAP Identity Management, retired by 2027, to Microsoft Entra.

**Microsoft Sentinel solution for SAP applications.**

- Deployed and managed entirely by the customer in its own Azure subscription, not by SAP.
- Covers the **SAP application layer** only (for example audit log, logons, sensitive transactions). Collection uses the agentless data connector, through SAP Cloud Connector and SAP Integration Suite; the containerized data connector agent retired on September 14, 2026.
- RISE infrastructure and OS logs are available only through the optional **SAP LogServ** service, which integrates with Microsoft Sentinel.
- The Microsoft Sentinel solution for SAP BTP adds BTP through the audit log APIs.
- Playbooks can, for example, block a suspicious user in SAP, BTP or Microsoft Entra ID; Microsoft Defender XDR and Security Copilot use the same data.

> **Exam trap.** With RISE, the customer can't install agents on SAP's VMs. Security monitoring of RISE starts from the SAP application layer (Sentinel data connector) plus LogServ for infrastructure logs.

<!-- section: key-points -->
## Key points

- SAP owns and operates the RISE subscription and VMs; the customer integrates from its own subscriptions and opens Azure support cases only for them.
- Virtual network peering (cross-tenant, same region preferred) is the default; VPN VNet-to-VNet when a single entry point is required.
- On-premises access goes through the customer hub with gateway transit; SAP's own ExpressRoute reaches only the SAP network.
- DNS: delegate a subdomain to SAP and receive it by zone transfer on VM-based DNS servers; Azure DNS private zones can't do zone transfer.
- Integration runtimes and data gateways run on customer VMs in peered networks; the Sentinel agentless data connector reaches SAP through SAP Cloud Connector and SAP Integration Suite.
- Archive with SAP ILM Store on Azure Blob Storage, accessed by a Microsoft Entra application with Storage Blob Data Contributor and shared key disabled.
- Azure Center for SAP solutions and Azure Monitor for SAP solutions don't apply to RISE.
