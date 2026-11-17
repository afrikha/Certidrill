Microsoft Defender for Cloud tells you how well your cloud resources are configured and warns you when one of them is attacked. The exam expects you to separate posture management (CSPM) from workload protection, and to know how policies, standards and recommendations move the secure score.

<!-- section: defender-for-cloud | objectives: 3.2.1 -->
## Microsoft Defender for Cloud

**Microsoft Defender for Cloud** is a **cloud-native application protection platform (CNAPP)**: one service that protects cloud applications from the code to the running workload. It covers resources in **Azure**, in other clouds (**Amazon Web Services** and **Google Cloud Platform**) and **on-premises** machines.

| Pillar | What it does |
| --- | --- |
| **DevSecOps** | Unifies security management at the code level across pipelines such as GitHub and Azure DevOps: findings from code, secrets and dependency scans in one place |
| **Cloud security posture management (CSPM)** | Continuously assesses how resources are configured and surfaces the actions that prevent a breach |
| **Cloud workload protection platform (CWPP)** | Protections specific to servers, containers, storage, databases and other workloads, with security alerts when a threat is detected |

Defender for Cloud also discovers and protects generative AI workloads, and it is integrated into the Microsoft Defender portal, where its alerts join the incidents of Microsoft Defender XDR.

> **Exam trap.** Despite living in Azure, Defender for Cloud is not limited to Azure resources: it is the multicloud and hybrid answer (Azure, AWS, GCP, on-premises).

<!-- section: cspm | objectives: 3.2.2 -->
## Cloud security posture management

**Cloud security posture management (CSPM)** finds **misconfigurations** and weaknesses before an attacker does, and gives hardening guidance. Its central indicator is the **secure score**: Defender for Cloud continually assesses your resources and aggregates the findings into a single score. **The higher the score, the lower the identified risk.**

| | Foundational CSPM | Defender CSPM |
| --- | --- | --- |
| Cost | Free, enabled automatically on onboarded subscriptions and accounts | Paid, optional plan |
| Asset inventory, security recommendations, secure score, Microsoft cloud security benchmark | Yes | Yes |
| Attack path analysis | No | Yes |
| Cloud security explorer | No | Yes |
| Agentless scanning of virtual machines (vulnerabilities, secrets) | No | Yes |
| Governance: assign a recommendation to an owner with a due date | No | Yes |
| Data security posture management (DSPM) | No | Yes |
| AI security posture management | No | Yes |
| Regulatory compliance assessments | No | Yes |

- **Attack path analysis** models how an attacker could chain weaknesses to reach a high-value resource, for example from an internet-exposed virtual machine to a storage account that holds sensitive data.
- **Cloud security explorer** runs graph-based queries to hunt for risks proactively.
- **DSPM** discovers the datastores that contain sensitive data and assesses their exposure.

<!-- section: policies-standards-recommendations | objectives: 3.2.3 -->
## Security policies, standards and recommendations

Posture improves through a continuous cycle: policies define the rules, standards group them, recommendations drive the fixes.

| Element | Role |
| --- | --- |
| **Security policy** | A rule about a security condition that you want controlled. Defender for Cloud policies are backed by **Azure Policy** |
| **Security standard** | A set of controls and rules that resources are assessed against. Three kinds: security benchmarks, regulatory compliance standards, custom standards |
| **Microsoft cloud security benchmark (MCSB)** | The default standard, applied automatically when Defender for Cloud is enabled. Microsoft-authored guidance for Azure and multicloud, built on CIS and NIST controls |
| **Security recommendation** | Produced when a resource does not meet a control: description of the issue, remediation steps, affected resources, severity |
| **Regulatory compliance dashboard** | For each standard applied, shows every control and how many resources pass or fail it |

Regulatory standards such as ISO 27001, SOC 2, NIST SP 800-53 and PCI DSS can be added next to the MCSB, and one recommendation often improves compliance with several standards at once.

Recommendations are grouped into **security controls**. Remediating them raises the secure score. Only the built-in MCSB recommendations count toward the score; recommendations flagged as preview do not.

> **Exam trap.** Three scores, three products. **Secure score** in Defender for Cloud: posture of cloud resources. **Microsoft Secure Score** in the Microsoft Defender portal: posture of Microsoft 365 identities, devices and apps. **Compliance score** in Compliance Manager: progress on regulatory improvement actions.

<!-- section: cloud-workload-protection | objectives: 3.2.4 -->
## Cloud workload protection

**Cloud workload protection** detects and helps resolve threats to resources, workloads and services. It is delivered by paid **Defender plans**, enabled per type of resource; several plans can run at the same time. When a plan detects a threat, it raises a **security alert** with the nature and severity of the attack.

| Plan | Protects |
| --- | --- |
| **Defender for Servers** | Windows and Linux machines; includes Microsoft Defender for Endpoint for endpoint detection and response |
| **Defender for Containers** | Kubernetes clusters and container registries: hardening, vulnerability assessment, run-time threat detection |
| **Defender for Storage** | Storage accounts, against potentially harmful activity |
| **Defender for Databases** | Azure SQL, SQL servers on machines, open-source relational databases, Azure Cosmos DB |
| **Defender for App Service** | Applications running on App Service |
| **Defender for Key Vault** | Key vaults (advanced threat protection for Azure Key Vault) |
| **Defender for Resource Manager** | Resource management operations in the organization |
| **Defender for APIs** | Business-critical APIs |
| **Defender for AI Services** | Generative AI workloads, against prompt injection, data leakage and credential theft |

Enhanced security features brought by the plans:

- **Endpoint detection and response (EDR)** and **vulnerability scanning** of virtual machines, container registries and SQL resources.
- **Multicloud and hybrid security**: the same protections for connected AWS and GCP accounts and for on-premises machines.
- **Threat protection alerts** for networks, machines and cloud services, enriched with threat intelligence.
- **Access and application controls**, including **just-in-time access** to the management ports of virtual machines, which reduces the exposure to brute-force attacks.

| Requirement | Answer |
| --- | --- |
| Find misconfigured resources and get hardening guidance | CSPM: recommendations and secure score |
| Be alerted when a virtual machine, a database or a storage account is under attack | Cloud workload protection: a Defender plan |
| Show how the environment stands against PCI DSS or ISO 27001 | Regulatory compliance dashboard |
| See which route an attacker could take to sensitive data | Attack path analysis (Defender CSPM) |
| Review security findings from code repositories and pipelines | DevSecOps (DevOps security) |

> **Exam trap.** CSPM **prevents**: it assesses configuration and produces recommendations. Cloud workload protection **detects and responds**: it watches running workloads and produces alerts.

<!-- section: key-points -->
## Key points

- Defender for Cloud is a CNAPP with three pillars: DevSecOps, CSPM, CWPP. It covers Azure, AWS, GCP and on-premises.
- CSPM: continuous assessment, recommendations, secure score (higher is better). Foundational CSPM is free; Defender CSPM adds attack path analysis, cloud security explorer, agentless scanning, governance and DSPM.
- Policies (Azure Policy) are grouped into standards; the MCSB is the default standard; a non-compliant resource produces a recommendation.
- The regulatory compliance dashboard shows the status against each standard, control by control.
- Cloud workload protection: paid Defender plans per resource type (Servers, Containers, Storage, Databases, App Service, Key Vault, Resource Manager, APIs, AI Services) that raise security alerts.
- Defender for Servers includes Microsoft Defender for Endpoint.
