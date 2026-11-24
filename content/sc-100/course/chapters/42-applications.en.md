Application security on SC-100 covers the whole life of an application: assessing the portfolio you already run, modeling threats to the critical ones, building security into every phase of development, then choosing the run-time controls: identities for the code, a managed API front door, and a web application firewall. Questions ask which tool, framework or service meets a requirement with the least effort or the least privilege.

<!-- section: portfolio-posture | objectives: 4.2.1 -->
## Evaluating the posture of an application portfolio

Start with an inventory ranked by business criticality, then measure each application against a baseline (the Microsoft cloud security benchmark and the security pillar of the Azure Well-Architected Framework).

| Requirement | Tool |
| --- | --- |
| Misconfigurations of the Azure, AWS or GCP resources that host the applications | Defender for Cloud **foundational CSPM** (recommendations, secure score, MCSB) |
| Exploitable paths from the internet to an application's data, risk prioritized by context | **Defender CSPM**: attack path analysis, cloud security explorer |
| Code, secret, dependency and infrastructure-as-code findings across Azure DevOps, GitHub and GitLab | Defender for Cloud **DevOps security** (connectors) |
| Link a production container or resource back to the repository and pipeline that built it | Defender CSPM **code to cloud mapping** |
| Inventory of APIs, including unauthenticated or unused ones | **Defender for APIs**; Azure API Center for APIs outside API Management |
| SaaS applications used by the organization and over-privileged OAuth apps | Defender for Cloud Apps: Cloud Discovery, app governance |
| Run-time threats against App Service, containers or APIs | Defender for App Service, Defender for Containers, Defender for APIs |

DevOps security in Defender for Cloud:

| Capability | Foundational CSPM | Defender CSPM |
| --- | --- | --- |
| Inventory of DevOps resources, recommendations for DevOps environment misconfigurations | Yes | Yes |
| Recommendations for code vulnerabilities, IaC misconfigurations, exposed secrets, open-source vulnerabilities | Yes (needs a scanner: GitHub Advanced Security, Microsoft Security DevOps or agentless code scanning, in preview; GitLab needs GitLab Ultimate) | Yes |
| Pull request annotations (Azure DevOps), SBOM queries (Azure DevOps and GitHub, after an agentless code scan), code to cloud mapping | No | Yes |
| Attack path analysis and cloud security explorer including DevOps context | No | Yes |

> **Exam trap.** Connecting GitHub to Defender for Cloud doesn't scan anything by itself: secret and dependency findings come from GitHub Advanced Security, and pull request annotations and attack paths require Defender CSPM.

<!-- section: threat-modeling | objectives: 4.2.2 -->
## Threat modeling business-critical applications

Threat modeling is the **design** activity of the Security Development Lifecycle: you draw the application as a data flow diagram (processes, data stores, external entities, data flows), mark the **trust boundaries** where data crosses privilege levels, enumerate threats on each element, then rate and mitigate them. Doing it at design time is the cheapest moment to fix a flaw. The **Microsoft Threat Modeling Tool** is built for non-security experts: it guides the drawing, generates threats with **STRIDE per element**, and tracks mitigations and reports.

| STRIDE threat | Property violated | Typical mitigation on Azure |
| --- | --- | --- |
| Spoofing | Authentication | Microsoft Entra ID, MFA, managed identities, certificate authentication |
| Tampering | Integrity | TLS, signed artifacts, immutable storage, input validation |
| Repudiation | Non-repudiation | Audit logs, Azure Monitor, Microsoft Sentinel, tamper-proof log retention |
| Information disclosure | Confidentiality | Encryption, Key Vault, private endpoints, sensitivity labels |
| Denial of service | Availability | Azure DDoS Protection, WAF rate limiting, API Management throttling, autoscale |
| Elevation of privilege | Authorization | Least-privilege RBAC, PIM, input validation, sandboxing |

Prioritize threats on the most critical assets and on trust boundaries exposed to the internet; revisit the model whenever the architecture changes (new integration, new data flow, an AI component that reads untrusted content).

> **Exam tip.** "Identify threats during design, before code exists" is threat modeling. Code scanning, penetration tests and Defender for Cloud find issues later, in implementation, verification or production.

<!-- section: app-lifecycle | objectives: 4.2.3 -->
## A full lifecycle strategy for application security

The Microsoft SDL organizes security work in phases; a lifecycle strategy maps a control to each phase and makes it mandatory through policy and pipelines.

| Phase | Security activity | Microsoft technologies |
| --- | --- | --- |
| Training | Role-based security and privacy training | Microsoft Learn paths, internal standards |
| Requirements | Security and privacy requirements, compliance obligations | MCSB, Well-Architected security pillar, Compliance Manager |
| Design | Threat model, secure architecture decisions | Microsoft Threat Modeling Tool, MCRA |
| Implementation | Secure coding, approved tools, no secrets in code | GitHub Advanced Security, Key Vault, managed identities |
| Verification | Static analysis, dependency checks, IaC scanning, dynamic testing, reviews | Code scanning, dependency review, Microsoft Security DevOps, pull request gates |
| Release | Gradual deployment in rings (safe deployment process), signed artifacts | Deployment rings, environments with approvals, Azure Policy |
| Response | Logging, monitoring, incident response, fixes back into the backlog | Defender for Cloud, Microsoft Sentinel, Defender XDR |

Principles that drive design answers: **shift left** (find issues where they are cheapest to fix), automate controls in pipelines instead of relying on manual reviews, apply **defense in depth** at run time, and close the loop by turning production findings into backlog items owned by the development team.

<!-- section: secure-development | objectives: 4.2.4 -->
## Standards for a secure development process

| Standard | Implementation |
| --- | --- |
| No credentials in source code | Secrets in **Azure Key Vault**, workloads use **managed identities** or **workload identity federation**; **secret scanning** with push protection |
| Find vulnerabilities in your own code | **Code scanning** (static analysis, for example CodeQL) on every pull request |
| Control open-source dependencies | **Dependency review** and alerts, software bill of materials (SBOM) |
| Catch misconfigured templates before deployment | IaC scanning of Bicep, ARM and Terraform in the pipeline |
| Only reviewed code reaches the main branch | Branch protection: required reviewers, required status checks |
| Pipelines can't be abused to reach production | Service connections with workload identity federation, least-privilege roles per environment, approvals and checks |
| Developers see findings where they work | Pull request annotations (Defender CSPM, Azure DevOps), alerts in the repository |
| Security teams see all findings in one place | Defender for Cloud DevOps security across Azure DevOps, GitHub and GitLab |

GitHub Advanced Security runs in GitHub; **GitHub Advanced Security for Azure DevOps** brings code scanning, secret scanning and dependency scanning to Azure Repos. Both feed Defender for Cloud through the DevOps connectors.

> **Exam trap.** Storing a secret in a pipeline variable or a Key Vault reference still leaves a secret to rotate. "No secrets to manage" means a managed identity (Azure-hosted workload) or workload identity federation (pipeline, GitHub Actions, another cloud).

<!-- section: map-technologies | objectives: 4.2.5 -->
## Mapping technologies to application security requirements

| Requirement | Technology |
| --- | --- |
| Employees sign in to a line-of-business app | Microsoft Entra ID, Conditional Access |
| Customers sign in with social or local accounts | Microsoft Entra External ID |
| The app reads secrets, keys or certificates | Azure Key Vault with Azure RBAC |
| The app authenticates to Azure services without credentials | Managed identity |
| Block SQL injection and cross-site scripting at the edge | Azure WAF on Front Door or Application Gateway |
| Publish, authenticate, throttle and version APIs | Azure API Management |
| Absorb volumetric network attacks | Azure DDoS Protection |
| Remove public exposure of back-end PaaS services | Private endpoints, public network access disabled |
| Restrict which clients reach an App Service app | Access restrictions, private endpoint, virtual network integration for outbound |
| Detect attacks against the running workload | Defender for App Service, Defender for Containers, Defender for APIs |
| Enforce configuration standards on every deployment | Azure Policy (`Deny`, `DeployIfNotExists`) |
| Protect data the app stores | Encryption with customer-managed keys, sensitivity labels, Defender for Storage and Defender for Databases |

<!-- section: workload-identities | objectives: 4.2.6 -->
## Workload identities for applications

A **workload identity** is the identity of software: an **application** (global object), its **service principal** (instance in a tenant) or a **managed identity** (a service principal whose credentials Azure manages).

| Requirement | Recommendation |
| --- | --- |
| Code on Azure (App Service, Functions, VMs, AKS, Container Apps) calls Azure resources | **Managed identity** with an Azure RBAC role at the narrowest scope |
| One identity shared by several resources, permissions granted before the resource exists, resources recycled often | **User-assigned** managed identity (recommended type for Microsoft services) |
| Identity that must disappear with its single resource | **System-assigned** managed identity |
| GitHub Actions, Kubernetes, Google Cloud, AWS or Azure Pipelines access Azure | **Workload identity federation**: trust the external token on an app registration or a user-assigned managed identity (no secret) |
| Nothing else is possible | App registration with a **certificate** (not a client secret), stored in Key Vault and rotated |

Federation exchanges a token from the external identity provider for a Microsoft Entra access token; the issuer, subject and audience must match the federated credential exactly.

Protecting workload identities (Microsoft Entra Workload ID):

| Control | Fact |
| --- | --- |
| Conditional Access for workload identities | **Workload Identities Premium** license; **single-tenant service principals** only (not managed identities, not multitenant apps); conditions: location and service principal risk; grant: **Block** only; service principals selected directly in the policy (a policy assigned to a group that contains them isn't enforced), target **All resources** |
| ID Protection for workload identities | Detects risks such as leaked credentials |
| Access reviews | Review service principals assigned to privileged directory roles; the way to govern managed identities |

**Agent identities** (Microsoft Entra Agent ID) are a distinct category for AI agents: created from an agent identity blueprint, with a required human **sponsor** and governed life cycle. Use a workload identity for deterministic code; use an agent identity for an autonomous AI agent.

> **Exam trap.** A Conditional Access policy that blocks access from outside the corporate IP ranges can't protect a managed identity. Restrict a managed identity with least-privilege RBAC and network controls, and govern it with access reviews.

<!-- section: api-security | objectives: 4.2.7 -->
## API management and security

**Azure API Management** is the gateway in front of APIs: one place to authenticate, authorize, throttle, validate and log. Map the OWASP API Security Top 10 to its controls:

| Threat | API Management control |
| --- | --- |
| Broken authentication | Validate Microsoft Entra tokens (`validate-azure-ad-token`) or other JWTs (`validate-jwt`); client certificates; secure the developer portal with Microsoft Entra ID |
| Broken function level authorization | Require subscriptions or an authorization policy on all APIs, no wildcard operations, `ip-filter` allowlists |
| Broken object property level authorization | `validate-content` against the schema, transformation policies that remove unneeded properties |
| Unrestricted resource consumption | `rate-limit-by-key`, `quota-by-key`, payload size limits, caching; Front Door or Application Gateway WAF in front for bots |
| Security misconfiguration | TLS 1.2, private endpoint or internal virtual network mode, secrets in Key Vault named values, Azure Policy |
| Improper inventory management | Separate instances per environment, versions and revisions, **Azure API Center** as the central inventory |
| Unsafe consumption of APIs | Managed identity or credential manager to call back ends, response validation |

Object-level authorization stays the back end's job: the gateway can't know whether user A may read order 42.

To serve internal and external consumers from one instance and expose only a subset of APIs to the internet, deploy API Management in an **internal virtual network** behind **Application Gateway WAF_v2**: internal clients reach it directly, external clients only through the WAF.

**Defender for APIs** is a separate Defender for Cloud plan for **APIs published in Azure API Management**: inventory, findings on external, unauthenticated or inactive APIs (no traffic in 30 days), classification of APIs that handle sensitive data, and run-time detection of threats including the OWASP API Top 10. With Defender CSPM, its data appears in cloud security explorer.

> **Exam trap.** Defender for APIs detects and recommends; it doesn't enforce. Throttling, token validation and schema validation are API Management policies.

<!-- section: azure-waf | objectives: 4.2.8 -->
## Securing applications with Azure Web Application Firewall

Azure WAF protects HTTP and HTTPS applications against common exploits (SQL injection, cross-site scripting) with central policies, so a vulnerability is mitigated once for every app behind it.

| Platform | Choose it when | WAF features |
| --- | --- | --- |
| Azure Front Door **Premium** | Global users, multiregion origins, block attacks at the edge | Managed Default Rule Set, Bot Manager, custom and rate limit rules, geo-filtering |
| Azure Front Door **Standard** | Global delivery with only custom rules | Custom rules only, which include rate limit and geo-filtering rules |
| Application Gateway **WAF_v2** | Regional or internal applications, per-site or per-URI policies in a virtual network | Managed rule sets, Bot Manager, custom and rate limit rules |
| Application Gateway for Containers | Kubernetes ingress | WAF policy attached to Gateway API resources: Default Rule Set 2.1 only (no CRS), Bot Manager |

Design rules:

- Layer Front Door at the edge and Application Gateway in the region when both global protection and private, path-specific policies are needed; lock the origin so it accepts traffic only from Front Door.
- Deploy in **Detection** mode, tune false positives with exclusions, then switch to **Prevention**.
- Application Gateway v1 retired on April 28, 2026: designs use WAF_v2. Front Door (classic) retires on March 31, 2027: the migration to Standard or Premium has no downtime, a classic WAF policy with managed rules moves the profile to Premium (no downgrade afterward), and the endpoint cutover must be complete by March 31, 2028.
- WAF covers layer 7 only: Azure DDoS Protection handles volumetric attacks, Azure Firewall and NSGs filter other protocols.
- Send WAF logs to Log Analytics and Microsoft Sentinel; Defender for Cloud recommends WAF for internet-facing apps.

> **Exam trap.** "Managed OWASP rules on Front Door" requires the **Premium** tier; a Standard profile offers custom rules only.

<!-- section: key-points -->
## Key points

- Portfolio posture: foundational CSPM for recommendations, Defender CSPM for attack paths and code to cloud, DevOps security for code findings, Defender for APIs for API inventory.
- Threat modeling = design phase, data flow diagram, trust boundaries, STRIDE per element.
- SDL phases: training, requirements, design, implementation, verification, release, response; automate controls in pipelines.
- Managed identity on Azure, workload identity federation elsewhere, certificate as last resort; Conditional Access for workload identities covers single-tenant service principals only.
- API Management enforces; Defender for APIs detects. WAF: Front Door Premium for managed rules at the edge, Application Gateway WAF_v2 regionally, Detection before Prevention.
