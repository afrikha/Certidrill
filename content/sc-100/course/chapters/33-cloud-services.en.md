Every cloud service shifts part of the security work to Microsoft, but never all of it. For SC-100 you specify what the customer must still secure for each service model, which baseline describes it, and which controls protect IoT, web, container, Kubernetes and AI workloads. Questions give a workload and a constraint (no secrets in code, no public exposure, multicloud clusters, least administrative effort) and expect the requirement set that fits.

<!-- section: service-baselines | objectives: 3.3.1 -->
## Security baselines for SaaS, PaaS and IaaS

The **shared responsibility model** decides what a baseline must cover:

| Layer | SaaS | PaaS | IaaS |
| --- | --- | --- | --- |
| Information and data, devices, accounts and identities | Customer | Customer | Customer |
| Identity and directory infrastructure | Shared | Shared | Customer |
| Applications | Microsoft | Shared | Customer |
| Network controls | Microsoft | Shared | Customer |
| Operating system | Microsoft | Microsoft | Customer |
| Physical hosts, network, datacenter | Microsoft | Microsoft | Microsoft |

**Azure security baselines** apply the Microsoft cloud security benchmark to each Azure service. Each baseline entry gives the MCSB control ID, the feature, whether it is **supported**, whether it is **enabled by default**, the **configuration responsibility** (Customer, Microsoft or Shared), configuration guidance and whether Defender for Cloud monitors it. Controls that don't fit a model are marked not applicable: OS configuration management doesn't apply to a PaaS service. Baselines such as the Key Vault one are based on MCSB v1.0 and point to the service's own security guidance (for example, Secure your Azure Key Vault) for current advice.

Where each baseline comes from and how it is enforced:

| Service model | Baseline | Assessment and enforcement |
| --- | --- | --- |
| IaaS (VMs, disks, networks) | MCSB service baselines plus the OS baseline | Defender for Cloud recommendations, Azure Policy, machine configuration inside the guest |
| PaaS (App Service, Azure SQL, Storage, Key Vault, AI services) | MCSB service baseline of each service | Defender for Cloud recommendations, Azure Policy deny and DeployIfNotExists effects at the management group |
| SaaS (Microsoft 365, Salesforce, ServiceNow, GitHub) | Vendor recommendations and Microsoft Secure Score | **Defender for Cloud Apps** app connectors with SaaS security posture management recommendations in Microsoft Secure Score; Microsoft Entra SSO and Conditional Access for access |

> **Exam trap.** A baseline line marked "Microsoft" responsibility needs no action; "Customer" or "Shared" lines are your requirements. And the posture of a SaaS app such as Salesforce is assessed by Defender for Cloud Apps through Secure Score, not by Defender for Cloud.

<!-- section: iot-workloads | objectives: 3.3.2 -->
## Security requirements for IoT workloads

An IoT workload has three security zones: the **device**, the **edge** and the **cloud** (Azure IoT Hub, Device Provisioning Service, downstream storage and analytics).

| Zone | Requirements |
| --- | --- |
| Device identity | One identity per device in IoT Hub; X.509 certificates issued from a CA chain (root CA kept offline, subordinate CAs sign device certificates); the certificate subject must match the device ID; self-signed certificates and shared symmetric keys only for testing |
| Provisioning | **Device Provisioning Service** with enrollment groups, so devices are provisioned at scale with their attestation (X.509 or TPM) and no hub credentials are baked into the image |
| Service access | Microsoft Entra ID and Azure RBAC for back-end applications instead of shared access policies; managed identities for message routing to Storage or Event Hubs |
| Network | Private endpoints and IP filtering on the hub, TLS for all connections, segmentation of OT and IT following Purdue or ISA-95 layers |
| Edge (Azure IoT Operations on Arc-enabled Kubernetes) | Your own CA for TLS certificates, MQTT broker authentication and least-privilege topic authorization, secrets synchronized from Azure Key Vault, Microsoft-signed images, controlled Arc upgrades |
| Monitoring | Defender for IoT for device and network threats, Defender for Containers for edge clusters, logs to Microsoft Sentinel |

Treat cloud dashboards of operational data as informational: safety-critical decisions must not rely on them alone.

> **Exam tip.** "Thousands of devices must be provisioned without a hub connection string in the firmware" means DPS with X.509 or TPM attestation. "Back-end apps must not use shared keys" means Microsoft Entra ID with Azure RBAC on IoT Hub.

<!-- section: web-workloads | objectives: 3.3.3 -->
## Security requirements for web workloads

| Requirement | Control |
| --- | --- |
| Block SQL injection, cross-site scripting and bots at the edge, globally | Azure Front Door **Premium** with a WAF policy (managed rule set, bot protection) |
| Regional web app behind a WAF in a virtual network | Application Gateway **WAF_v2** |
| Only the WAF can reach the app | Private endpoint on the app (Front Door Premium Private Link), or access restrictions with the `AzureFrontDoor.Backend` service tag plus the `X-Azure-FDID` header |
| Users must sign in before reaching the code | App Service built-in authentication with Microsoft Entra ID |
| Encrypted transport only | HTTPS Only, minimum TLS 1.2 |
| No secrets in configuration | Managed identity plus Key Vault references |
| Outbound calls to private resources | Virtual network integration |
| No clear-text deployment credentials | Basic authentication disabled for FTP and SCM |
| Protect and throttle APIs | Azure API Management policies (JWT validation, rate limits, IP filtering) and Defender for APIs |
| Volumetric attacks on public IPs | Azure DDoS Protection |
| Threat detection on the hosting platform | Defender for App Service |
| Vulnerabilities found before deployment | DevOps security in Defender for Cloud (code, secrets and infrastructure-as-code scanning in pipelines) |

> **Exam trap.** Azure Firewall doesn't protect a web app against SQL injection: that is a layer 7 WAF. And a Front Door **Standard** profile has custom WAF rules only; managed rule sets and bot protection need **Premium**.

<!-- section: containers | objectives: 3.3.4 -->
## Security requirements for containers

Container security is a **supply chain**: base image, build, registry, deployment, runtime.

| Stage | Requirements |
| --- | --- |
| Base image | Minimal, trusted base images from an approved source; rebuild when the base is patched |
| Build | No secrets in images or Dockerfiles (use managed identities and Key Vault at run time); run as non-root; scan in the pipeline |
| Registry | Private Azure Container Registry; Microsoft Entra authentication with AcrPull and AcrPush roles; admin user disabled; private endpoint and public access disabled (Premium) |
| Vulnerabilities | Defender for Containers or Defender CSPM: agentless scanning of registry images and running containers, rescanned daily |
| Integrity | Sign images with the **Notary Project** and verify signatures before deployment |
| Deployment | Gated deployment in Defender for Containers to audit or block images that break vulnerability rules; supported on AKS 1.31 or later only (Linux, commercial clouds) |
| Runtime | Defender sensor for runtime threat detection (crypto miners, binary drift) |

Docker Content Trust is deprecated in Azure Container Registry: since **May 31, 2026** it can't be enabled on registries that didn't use it, and it is removed on **March 31, 2028**. New designs specify Notary Project signatures.

For serverless containers, the same identity and network rules apply: managed identities to pull images and reach other services, virtual network deployment for Azure Container Apps environments, and no public ingress unless required.

> **Exam trap.** Vulnerability scanning tells you an image is vulnerable; it doesn't stop it from running. Blocking vulnerable or unsigned images at deployment needs an admission control (gated deployment or signature verification).

<!-- section: container-orchestration | objectives: 3.3.5 -->
## Security requirements for container orchestration

For Azure Kubernetes Service (AKS) and other Kubernetes clusters, the requirements cover the control plane, identities, the network, workloads and threat detection:

| Requirement | Control |
| --- | --- |
| API server not reachable from the internet | Private cluster, or authorized IP ranges for a public API server |
| Kubernetes permissions managed with Microsoft Entra groups | Microsoft Entra integration with Azure RBAC for Kubernetes authorization |
| No static admin credentials | Local accounts disabled |
| Pods reach Azure services without secrets | Microsoft Entra Workload ID |
| Restrict east-west traffic between pods | Kubernetes network policies |
| Control egress from the cluster | User-defined route to Azure Firewall in the hub |
| Forbid privileged containers and host mounts | **Azure Policy for Kubernetes** (Pod Security Standards initiatives) |
| Secrets in etcd encrypted with a customer key | KMS etcd encryption with Azure Key Vault |
| Runtime threat detection and posture for AKS, EKS, GKE | Defender for Containers (sensor, Kubernetes API access, agentless discovery) |
| Clusters on-premises or in other clouds governed from Azure | Azure Arc-enabled Kubernetes with Azure Policy and Defender for Containers |
| Nodes patched | Automatic node OS image upgrades |

Multicloud: Defender for Containers covers Amazon EKS and Google GKE through the AWS and GCP connectors, with the same recommendations, vulnerability findings and runtime alerts as AKS.

> **Exam trap.** Network policies filter traffic between pods inside the cluster; NSGs filter traffic to the nodes' subnet. "Pods of namespace A must not talk to namespace B" is a network policy, not an NSG. And "deny privileged pods" is enforced by Azure Policy for Kubernetes, not by the Defender sensor.

<!-- section: ai-services | objectives: 3.3.6 -->
## Evaluating Azure AI services security

AI services (Microsoft Foundry, Azure OpenAI models, Azure AI Search, the Foundry Tools) follow the same identity, network and data rules as other PaaS services, plus controls specific to prompts and models.

| Area | Requirement and solution |
| --- | --- |
| Identity | Microsoft Entra ID authentication with managed identities; **disable key (local) authentication**, enforced at scale with the built-in Azure Policy; data roles such as Foundry User for applications that build with or call the project's deployments, or Foundry Agent Consumer, the least-privileged role for principals that only interact with agent endpoints; not Contributor |
| Network | Private endpoints with public network access disabled; private endpoints for connected Storage, Azure Cosmos DB and Azure AI Search too; agents reaching private resources need virtual network injection; for hosted agents it must be included when the Foundry account is created, because it can't be added to an existing account |
| Data | Customer-managed keys where required, sensitivity labels and DLP on grounding data, least-privilege access to indexes |
| Content and prompts | **Guardrails** in Foundry (Azure AI Content Safety): harmful content, user prompt attacks (jailbreak), indirect prompt injection in documents and tool output, protected material |
| Gateway | **AI Gateway** in Azure API Management: authentication, per-project token limits, logging of model traffic |
| Threat detection | **Defender for AI services**: alerts on jailbreak attempts, data leakage and credential theft, optionally with prompt evidence, correlated in Defender XDR |
| Posture | **AI security posture management** in Defender CSPM: AI bill of materials, misconfiguration recommendations and attack paths across Azure, AWS (Amazon Bedrock) and GCP (Vertex AI) |
| Data security and compliance | **Microsoft Purview** data security posture management for AI: classify, audit and govern prompts and responses |

> **Exam trap.** Azure RBAC is bypassed by an API key: "only identities with a role may call the model" requires disabling local authentication. And Defender for AI services **alerts** on a jailbreak; blocking it before it reaches the model is a Foundry guardrail.

<!-- section: key-points -->
## Key points

- Shared responsibility decides the baseline; Azure security baselines map MCSB controls to each service, with a responsibility column.
- SaaS posture: Defender for Cloud Apps connectors and Secure Score; IaaS and PaaS: Defender for Cloud and Azure Policy.
- IoT: X.509 from a CA chain, DPS, Entra ID for back-end access, private endpoints, Defender for IoT.
- Web: Front Door Premium or Application Gateway WAF_v2, private endpoints, built-in authentication, managed identity, Defender for App Service and APIs.
- Containers: private ACR, Entra auth, vulnerability scanning, Notary Project signatures (Docker Content Trust deprecated), gated deployment, runtime sensor.
- Kubernetes: private API server, Entra and Azure RBAC, workload identity, network policies, Azure Policy, Defender for Containers across AKS, EKS, GKE and Arc.
- AI services: keyless access, private networking, guardrails, AI Gateway, Defender for AI services, AI-SPM in Defender CSPM, Purview.
