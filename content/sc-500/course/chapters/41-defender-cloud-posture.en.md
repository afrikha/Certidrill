Microsoft Defender for Cloud combines posture management (CSPM: find and prioritize misconfigurations and risks) and workload protection (CWP: detect threats on servers, storage, databases, containers and other resources) across Azure, AWS, GCP and on-premises machines. Exam questions ask which plan provides a capability, what must be connected or enabled first, and which setting controls vulnerability scanning and external exposure.

<!-- section: defender-cspm | objectives: 4.1.1 -->
## Identify security risks with Defender CSPM

**Foundational CSPM** is free; **Defender CSPM** is paid, billed per billable resource (VMs, storage accounts, database servers, function and web apps, container apps...).

| Capability | Foundational CSPM | Defender CSPM |
| --- | --- | --- |
| Asset inventory, secure score, recommendations, MCSB | Yes | Yes |
| Remediation, workflow automation, continuous export, workbooks | Yes | Yes |
| Regulatory compliance standards beyond MCSB | No | Yes |
| Attack path analysis, cloud security explorer, risk prioritization | No | Yes |
| Agentless VM vulnerability and secrets scanning | No | Yes |
| Agentless discovery for Kubernetes, container vulnerability assessment | No | Yes |
| Sensitive data discovery (data security posture) | No | Yes |
| AI security posture management | No | Yes |
| External attack surface (EASM) and internet exposure analysis | No | Yes |
| Governance rules, critical assets, custom recommendations | No | Yes |

Tools of Defender CSPM:

- **Cloud security graph**: the context engine behind the other features (resources, identities, network exposure, data sensitivity, vulnerabilities).
- **Attack path analysis**: computes paths an attacker could follow, for example from an internet-exposed VM with a high-severity vulnerability to a storage account with sensitive data, and gives the recommendations that break the path.
- **Cloud security explorer**: graph queries (templates or custom), for example "internet-exposed VMs with high-severity vulnerabilities that can authenticate to a key vault".
- **Risk prioritization**: recommendations get a risk level computed from exploitability and business impact; **critical assets** raise the priority of what matters most.
- **Governance rules**: assign an owner and a due date to recommendations automatically, by scope or condition.

Defender CSPM components (extensions) are set in **Environment settings** > subscription > **Defender CSPM** > **Settings**: agentless scanning for machines, sensitive data discovery, permissions management (CIEM), agentless discovery for Kubernetes, container vulnerability assessment.

> **Exam trap.** The secure score and the MCSB recommendations are free. A question that needs **attack paths**, **cloud security explorer**, **sensitive data** context or **internet exposure** requires Defender CSPM; enabling Defender for Servers doesn't provide them.

<!-- section: regulatory-compliance | objectives: 4.1.2 -->
## Evaluate compliance with security frameworks

The **Regulatory compliance** dashboard shows each standard, its controls and the assessments behind each control. The **Microsoft cloud security benchmark (MCSB)** is assigned by default to every Azure subscription, AWS account and GCP project connected to Defender for Cloud. Adding other standards (for example NIST SP 800-53, PCI DSS, ISO 27001, CIS benchmarks, AWS and GCP standards) requires a paid plan; in **Environment settings** > scope > **Security policies**, enable the standard.

| Assessment type | Behavior |
| --- | --- |
| Automated | Evaluated from resource configuration (Azure Policy and Defender for Cloud assessments); failing resources link to remediation |
| Manual | Needs customer evidence: select the assessment > **Attest**, attach evidence and save |

Permissions:

| Task | Role |
| --- | --- |
| View compliance data | Reader on the subscription (**Security Reader is not enough** to read policy compliance data) |
| Add or remove standards | At minimum Resource Policy Contributor and Security Admin |

Reporting options:

- **Download report**: PDF (or CSV) summary of one standard by control.
- **Audit reports**: Microsoft's own certification reports (ISO, SOC, PCI) for Azure and Dynamics.
- **Continuous export** of regulatory compliance data to Event Hubs or a Log Analytics workspace, streaming or weekly snapshots.
- **Workflow automation**: a Logic Apps workflow triggered when a compliance assessment changes state.
- Compliance data also appears in Microsoft Purview Compliance Manager.

> **Exam trap.** Compliance at 100 % for a standard isn't certification: controls with manual assessments stay unassessed until attested, and some controls have no automated assessment at all.

<!-- section: workload-protection | objectives: 4.1.3 -->
## Enable and configure workload protection plans

Plans are enabled in **Environment settings** > subscription (or AWS account, GCP project) > **Defender plans**, by setting each plan **On**, then **Settings** for its components.

| Plan | Protects | Main configurable settings |
| --- | --- | --- |
| Servers (Plan 1 / Plan 2) | Windows and Linux machines in Azure, AWS, GCP, on-premises | Plan choice, Defender for Endpoint, vulnerability assessment, agentless scanning, file integrity monitoring |
| App Service | Apps on App Service | |
| Databases | Azure SQL, SQL servers on machines, open-source relational databases, Azure Cosmos DB | Selection of database types |
| Storage | Blob Storage, Azure Files, Data Lake Storage | On-upload malware scanning with monthly cap, sensitive data threat detection |
| Containers | Kubernetes clusters, registries | Sensor, Azure Policy, registry access, Kubernetes API access |
| Key Vault | Unusual vault access | |
| Resource Manager | Suspicious management operations | |
| APIs | APIs published in API Management | |
| AI services | Generative AI applications | Prompt evidence, data security for AI interactions |

Defender for DNS alerts are now part of Defender for Servers Plan 2 for new subscriptions.

Defender for Storage details that the exam uses:

- Priced per storage account, plus per GB for malware scanning.
- Malware scanning cap: **10,000 GB per storage account per month** by default, configurable for the subscription or per account; an alert fires at 75 % and when scanning pauses.
- Enable at subscription level (covers existing and future accounts; exclude or override settings per account) or at storage account level.
- Malicious blob results can drive Event Grid, Azure Functions or Logic Apps to delete or quarantine the blob.

Enabling at scale: Azure Policy built-in definitions can enable plans on all subscriptions of a management group (DeployIfNotExists with a remediation task). Defender for Servers Plan 1 and Defender for Storage can also be set per resource; Plan 2 can only be disabled per resource.

> **Exam trap.** Turning on a plan at the subscription protects **new** resources automatically. To leave out one storage account or one VM, use the resource-level override, not a second subscription.

<!-- section: multicloud-connectors | objectives: 4.1.4 -->
## Connect AWS, GCP and hybrid environments

Path: **Environment settings** > **Add environment** > **Amazon Web Services** or **Google Cloud Platform**. The connector is an Azure resource: choose its subscription, resource group and location, a scan interval of **4, 6, 12 or 24 hours**, and the plans (Defender CSPM, Servers, Containers, databases).

| Item | AWS | GCP |
| --- | --- | --- |
| Scope | Single account, or **management account** (member accounts discovered and onboarded automatically) | Single project, or **organization** (through a management project) |
| Deployment in the other cloud | CloudFormation template (or Terraform); StackSet for an organization | `gcloud` script run in Cloud Shell |
| Authentication | Federated trust with short-lived credentials (IAM roles), no stored keys | Workload identity federation and service account impersonation, no stored keys |
| Permissions type | Default access or Least privilege access | Default access or Least privilege access |

Azure-side prerequisites: **Contributor** on the subscription that hosts the connector; for CIEM (permissions management in Defender CSPM), also **Security Admin** and the `Application.ReadWrite.All` permission in the tenant. Check health in the **Connectivity status** column; recommendations appear within a few hours. When you enable a new plan on the connector, update and rerun the template or script.

With Defender for Servers on a connector, EC2 instances and GCP VMs are onboarded as **Azure Arc-enabled servers** automatically. On-premises machines are connected by installing the Azure Arc Connected Machine agent (see the servers chapter).

> **Exam trap.** For an AWS organization, connect the **management account**; delegated administrator accounts aren't supported. Adding a plan to an existing connector isn't complete until the updated CloudFormation template is deployed in AWS.

<!-- section: mdvm-settings | objectives: 4.1.5 -->
## Configure Defender Vulnerability Management for Azure VMs

Vulnerability assessment for machines is built on **Microsoft Defender Vulnerability Management** and is on by default with Defender for Servers.

| Mode | Requires | How it collects |
| --- | --- | --- |
| Agent-based | Defender for Servers Plan 1 or 2 + Defender for Endpoint integration | The Defender for Endpoint sensor on the machine |
| Agentless | Defender for Servers Plan 2 or Defender CSPM + agentless scanning | Disk snapshots every 24 hours |

Settings: **Environment settings** > subscription > Servers > **Settings** > **Vulnerability assessment for machines** On > **Edit configuration** > select Microsoft Defender Vulnerability Management > **Apply** > **Save**. A single VM can also be enabled with the REST resource `Microsoft.Security/serverVulnerabilityAssessments/mdetvm`. Deploying the scanner requires Owner on the resource group; viewing findings requires Security Reader.

Working with findings:

- **Recommendations** > **Vulnerabilities**, group by resource, then open each recommendation: affected machine, CVEs, CVSS, fixed version and remediation.
- Export at scale with Azure Resource Graph (`securityresources`, type `microsoft.security/assessments`).
- To accept a risk, use a **recommendation exemption** (waiver or mitigated, with an expiration date). Disable rules on the recommendation **Machines should have vulnerability findings resolved** (by CVE, ID, category, CVSS score, minimum severity, patchable status) are being deprecated in favor of exemptions.
- With Plan 2, **Defender Vulnerability Management premium features** are available in the Microsoft Defender portal.

```kusto
securityresources
| where type == "microsoft.security/assessments"
| where properties.resourceDetails.ResourceType =~ "microsoft.compute/virtualmachines"
| where properties.metadata.recommendationCategory == "SoftwareUpdate"
| project name, Severity = tostring(properties.metadata.severity)
```

> **Exam trap.** A machine with Endpoint protection turned off still gets vulnerability findings if agentless scanning is on (Plan 2 or Defender CSPM); with Plan 1 only, findings need the Defender for Endpoint sensor.

<!-- section: easm | objectives: 4.1.6 -->
## Discover unprotected assets with Defender EASM

**Microsoft Defender External Attack Surface Management (EASM)** looks at the organization from the outside, like an attacker: starting from **discovery seeds** (known domains, IP blocks, hosts, email contacts, ASNs, Whois organizations), it recursively discovers related internet-facing infrastructure, scans it and reports vulnerabilities, exposed services and hygiene issues.

Two ways to use it:

| Option | What you get |
| --- | --- |
| Defender CSPM integration | Included in Defender CSPM, no EASM licence: outside-in discovery of internet-facing **cloud** resources, attack paths starting from exposed IPs, cloud security explorer queries |
| Standalone Defender EASM resource | Deployed in a resource group (you choose the region for customer data); full inventory of the organization's internet assets, including shadow IT outside the clouds, dashboards on vulnerabilities, compliance and hygiene |

Asset states in the standalone inventory:

| State | Meaning |
| --- | --- |
| Approved Inventory | Owned by you; shown in dashboards and **rescanned daily** |
| Candidate | Related to the seeds but not confirmed; scanned only during discovery; review and approve if owned |
| Requires Investigation | Like Candidate, flagged by confidence scores for manual validation |
| Dependency | Third-party infrastructure that supports your assets |
| Monitor Only | Relevant but not controlled by you (for example a franchisee) |

Roles on the EASM resource: Owner and Contributor create and edit resources and assets, Reader views. Cross-tenant access (including Azure Lighthouse) isn't supported. A deleted resource can't be restored.

> **Exam trap.** A newly discovered asset that you own stays out of dashboards and daily scans while it is **Candidate**: change its state to **Approved Inventory**. And internet exposure of Azure, AWS and GCP resources in attack paths comes with Defender CSPM, without deploying a separate EASM resource.

<!-- section: key-points -->
## Key points

- Foundational CSPM: secure score, recommendations, MCSB. Defender CSPM: attack paths, security explorer, agentless scanning, sensitive data, AI posture, EASM insights, governance.
- MCSB is default; other standards need a paid plan; manual controls are attested; Security Reader can't read compliance data.
- Plans are enabled per subscription, AWS account or GCP project; Storage malware scanning cap 10,000 GB per account per month.
- AWS connector: CloudFormation, management account for organizations. GCP: `gcloud` script, workload identity federation. Contributor on the Azure subscription.
- Vulnerability assessment = Defender Vulnerability Management, agent-based (Plan 1/2) or agentless (Plan 2/Defender CSPM); exemptions replace disable rules.
- EASM: seeds, discovery, Approved Inventory scanned daily; CSPM includes EASM insights for cloud resources.
