Microsoft's security best practices start from one assumption: an attacker will get in. A resiliency strategy therefore asks which business assets matter most, how the organization recovers them without paying a ransom, how it stops one compromised account from taking down everything, and how it keeps systems updated. Exam questions give you a hybrid or multicloud estate and ask what to protect first, which backup design survives a deliberate attack, and which update solution fits which machines.

<!-- section: resiliency-strategy | objectives: 1.1.1 -->
## A security strategy for business resiliency

Business resiliency means the business keeps operating, or recovers quickly, when an attack succeeds. It follows the Zero Trust principle of **assume breach**: design to minimize business damage, not only to keep attackers out.

The ransomware guidance distinguishes two threats:

| Threat | How it works | What it requires from you |
| --- | --- | --- |
| Commodity ransomware | Automated; spreads like a virus through phishing and malware delivery | Malware remediation on the affected devices |
| Human-operated ransomware | An active attack: criminals infiltrate the on-premises or cloud infrastructure, elevate their privileges and deploy ransomware to critical data; often steal data first | A full incident response. The attacker keeps threatening operations after the first encounter |

Prioritizing threats starts with the assets. Microsoft asks business, IT and security stakeholders three questions:

1. Which business assets would be the most damaging if compromised?
2. How do these business assets translate to IT assets: files, applications, databases, servers, control systems?
3. How can these assets be protected or isolated from attackers who have access to the general IT environment?

**Critical asset management** in Microsoft Security Exposure Management supports this work across devices, identities and cloud resources in the Microsoft Defender portal:

| Capability | What it gives you |
| --- | --- |
| Predefined classifications | Assets classified automatically: domain controllers, file servers, databases with sensitive data, privileged roles, cloud resources in Azure, AWS and GCP |
| Criticality levels | Very High, High, Medium, Low. A domain controller, a Global Administrator and Microsoft Entra ID are Very High by default; when several rules match, the highest level wins |
| Custom classifications | Your own "crown jewels" defined by query or added manually; low-confidence classifications can be reviewed |
| Use in other experiences | Criticality appears in attack paths, the attack surface map (choke points), advanced hunting and the device inventory |
| Critical Asset Protection initiative | Scores the protection of critical assets over time in exposure insights |

Exposure Management also builds **attack paths** across on-premises and cloud environments and identifies **choke points**, the assets through which many paths flow.

| Requirement | Recommendation |
| --- | --- |
| Rank remediation by business impact | Classify critical assets, then prioritize the recommendations and attack paths that reach them |
| One view of exposure across endpoints, identities, Azure, AWS and GCP | Security Exposure Management |
| Find where to break the most attack paths with one fix | Choke points on the attack surface map |

> **Exam trap.** Identifying critical assets is long, cross-team work. Microsoft says it must not delay the first two steps of the ransomware plan: secure backups and privileged access start in parallel, without waiting for the full inventory.

<!-- section: ransomware-plan | objectives: 1.1.3 -->
## The ransomware protection plan and its priorities

Microsoft's plan has three steps, in this order:

| Step | Goal | Why this rank |
| --- | --- | --- |
| 1. Prepare your ransomware recovery plan | Recover without paying; make it much harder to encrypt key data or disrupt systems | Removes the attacker's monetary incentive, whatever the entry point |
| 2. Limit the scope of ransomware damage | Protect privileged roles so that one compromise doesn't reach every business-critical system | Most damage comes from privileged access |
| 3. Make it hard for cybercriminals to get in | Remove risk incrementally at the common entry points | Takes the longest; must not slow down steps 1 and 2 |

The order reduces risk as fast as possible. Teams (backup, identity, endpoint) can work in parallel, but the program is driven in priority order. Microsoft's checklists are in priority order, not in technical dependency order.

> **Exam trap.** "Make it hard to get in" feels like the obvious first step. When a question asks what to do first, the answer is the recovery plan (immutable backups), then privileged access. Hardening entry points comes third.

Paying is never part of the plan: even after payment, attackers might never provide a working key.

<!-- section: bcdr-design | objectives: 1.1.2, 1.1.3 -->
## Business continuity and disaster recovery against attacks

Treat a ransomware or extortion attack with the same importance as a natural disaster: the BCDR plan must cover it and be exercised regularly. Two objectives size the design:

| Objective | Meaning | Drives |
| --- | --- | --- |
| Recovery point objective (RPO) | How much data the business may lose | Backup or replication frequency |
| Recovery time objective (RTO) | How long the service may be unavailable | Restore method, replication and failover |

| Solution | Use it for |
| --- | --- |
| Azure Backup | Point-in-time copies of Azure VMs, databases, file shares and on-premises servers, kept in a vault; the answer to encryption or deletion of data |
| Azure Site Recovery | Replication and failover of machines to another region or from on-premises to Azure; the answer to an outage. Replication reproduces changes quickly, encrypted data included, so it doesn't replace long-retention, protected backups against ransomware |
| Microsoft 365 versioning and recycle bin | Recovery of user files moved to OneDrive and SharePoint, which users can restore themselves |

The **secure backups** checklist of the recovery step:

1. Back up all critical data automatically on a regular schedule, including critical business systems and the **Active Directory Domain Services domain controllers**.
2. Regularly exercise the BCDR plan; within 30 days, the mean time to recover (MTTR) measured in simulations must meet the BCDR goal.
3. Protect backups against deliberate erasure and encryption. **Strong**: require out-of-band steps (multifactor authentication or a PIN) before online backups can be modified. **Strongest**: keep backups in online immutable storage, such as Azure Blob immutable storage, or fully offline or off-site.
4. Protect the documents needed for recovery: restore procedures, the configuration management database (CMDB) and network diagrams. Attackers deliberately target them.

Microsoft gives a priority order for the most important applications: identity systems, human life, financial systems, product or service enablement, then security (minimum). The prioritized backup list also becomes the prioritized restore list.

The data protection checklist adds: move user data to OneDrive and SharePoint, designate protected folders (controlled folder access in Microsoft Defender), and reduce broad write and delete permissions on file shares and SharePoint, then monitor so that they don't reappear.

For hybrid and multicloud estates, apply the same requirements everywhere: backups administered by separate identities, immutable or offline copies, protected recovery documents and tested restores.

<!-- section: backup-protection | objectives: 1.1.2 -->
## Protecting Azure Backup from attackers

Azure Backup data is reachable only through Recovery Services vaults and Backup vaults: nobody can open the backup storage directly to encrypt it. The vault features that resist a malicious administrator:

| Feature | What it does |
| --- | --- |
| Soft delete | Keeps deleted backup data recoverable; 14 days by default, extendable to 180 days; the first 14 days are free. Enabled by default on new vaults. Always-on soft delete makes it irreversible |
| Immutable vault | Blocks operations that could lose recovery points: deleting recovery points before expiry, reducing retention. **Enabled** can still be disabled; **Enabled and locked** adds WORM storage and is irreversible |
| Multi-user authorization (MUA) | Critical operations (disabling soft delete, reducing protection) require approval through a **Resource Guard** controlled by another team, such as security administrators, possibly in another subscription or tenant |
| Encryption | Microsoft-managed keys by default; customer-managed keys in Azure Key Vault are optional |
| Private endpoints | Private connectivity for supported workloads (SQL Server and SAP HANA in Azure VMs, MARS agent, DPM) |
| Azure RBAC | Backup Reader, Backup Operator, Backup Contributor; separate backup administration from workload administration |
| Cross Region Restore | Restores Azure VMs in the secondary paired region from a geo-redundant vault (opt-in) |

Azure Backup rates each vault's protection:

| Security level | Condition |
| --- | --- |
| Excellent | Immutability or soft delete is irreversible (locked or always-on) **and** MUA is enabled |
| Good | Immutability is locked or soft delete is enabled |
| Fair | MUA is enabled |
| Poor | No advanced protection, or only reversible capabilities |

For on-premises servers protected by the MARS agent, Microsoft Azure Backup Server (MABS) or System Center DPM, destructive operations (stop protection with delete, change passphrase, reduce retention) require a **security PIN** generated in the vault and valid five minutes; deleted data is kept 14 more days.

**Resiliency** in Azure (the successor of Azure Business Continuity Center) gives one view of backup and replication across Azure and hybrid environments, with a protection posture assessment and the cyber recovery settings (immutability, soft delete, MUA) of each vault.

> **Exam trap.** Immutability doesn't apply to operational backups of blobs, files and disks, which stay in the source account. A requirement that "no administrator can delete backups before their expiry" needs vaulted backups in a locked immutable vault.

> **Exam tip.** "Even a compromised backup administrator must not be able to disable protection" means MUA with a Resource Guard owned by a different team. Soft delete alone is reversible by that administrator.

<!-- section: privileged-access | objectives: 1.1.3 -->
## Limiting the damage through privileged access

Step 2 protects privileged roles so that a ransomware operator can't reach many business-critical systems. Microsoft's ransomware privileged access strategy has four tasks:

| Task | Content | Typical Microsoft capabilities |
| --- | --- | --- |
| Enforce end-to-end session security | Validate users and devices before any access to administrative interfaces | Conditional Access, privileged access workstations |
| Protect and monitor identity systems | Directories, identity management, administrator accounts and groups, consent grant configuration | Privileged Identity Management, Microsoft Defender for Identity |
| Mitigate lateral traversal | Compromising one device must not give control of many others through local passwords, service account passwords or other secrets | Windows LAPS, unique credentials |
| Ensure rapid threat response | Limit the attacker's time in the environment | Microsoft Defender XDR, Microsoft Sentinel |

The results targeted in 30 to 90 days: 100 % of administrators use secure workstations, 100 % of local workstation and server passwords are randomized, 100 % of privilege escalation mitigations are deployed.

The detection and response checklist of the same step:

- Prioritize the common entry points: endpoint, email, identity and RDP. Use integrated XDR (Microsoft Defender XDR) and monitor password spray.
- Monitor for an attacker disabling security: clearing of the Security and PowerShell Operational event logs, disabling of security tools.
- Don't ignore commodity malware: ransomware operators buy access to target organizations.
- Isolate impacted devices rapidly with Microsoft Defender for Endpoint.

> **Exam trap.** Backups come before privileged access in the plan, but they depend on it: if backup administrators use the same accounts as domain administrators, an attacker who owns the domain also deletes the backups. Separate backup administration, MUA and immutability close that gap.

<!-- section: entry-points | objectives: 1.1.3 -->
## Making entry points harder to use

Step 3 hardens the common entry points:

| Area | Controls |
| --- | --- |
| Remote access | Keep VPNs and appliances updated; Microsoft Entra Conditional Access; Azure point-to-site VPN with Microsoft Entra authentication; Microsoft Entra application proxy to publish on-premises web apps; Azure Bastion for Azure VMs |
| Email and collaboration | Microsoft Defender for Office 365; AMSI for Office VBA; attack surface reduction rules, in audit mode first, then block mode |
| Endpoints | Attack surface reduction rules, tamper protection and block at first sight in Microsoft Defender Antivirus; security baselines; fast deployment of critical updates; isolate, disable or retire unsupported systems and legacy protocols; host firewalls |
| Accounts | Strong MFA or passwordless sign-in for all users, starting with administrators; Microsoft Entra Password Protection, extended to AD DS |

Targets within 30 days: 100 % of employees actively use MFA, and higher password security is fully deployed.

> **Exam trap.** In ransomware guidance, ASR means attack surface reduction (rules in Microsoft Defender for Endpoint), not Azure Site Recovery.

<!-- section: security-updates | objectives: 1.1.4 -->
## Evaluating security update solutions

Match the machines to the solution:

| Machines or need | Solution |
| --- | --- |
| Windows and Linux servers in Azure, on-premises and in other clouds | **Azure Update Manager**, with machines outside Azure connected by **Azure Arc** |
| Critical updates on Azure VMs without a restart | Hotpatching through Azure Update Manager |
| Windows client devices | Microsoft Intune update policies, or Windows Autopatch, which automates them |
| Prioritize vulnerabilities by risk across Windows, macOS, Linux, Android, iOS and network devices | **Microsoft Defender Vulnerability Management** |
| Systems that can't be updated | Isolate them, disable insecure protocols or retire them |

Azure Update Manager is native to Azure VMs and Azure Arc-enabled servers, with no dependency on Log Analytics or Azure Automation. It assesses every machine every 24 hours (periodic assessment), schedules installations in customer-defined maintenance windows, groups machines by criteria (dynamic scoping), and supports Azure Policy, Azure RBAC and alerts. It manages machines that run a server operating system.

Defender Vulnerability Management discovers assets continuously, including with agentless scanners, prioritizes vulnerabilities using threat intelligence, breach likelihood and business context, correlates them with active EDR alerts, creates remediation tasks in Microsoft Intune, can block vulnerable applications for device groups, and assesses security baselines against CIS and STIG benchmarks.

> **Exam trap.** Azure Update Manager is for servers. A requirement to update Windows 11 laptops points to Intune or Windows Autopatch; a requirement to decide which vulnerability to fix first points to Defender Vulnerability Management, which prioritizes but doesn't install updates itself.

<!-- section: key-points -->
## Key points

- Ransomware plan order: recovery plan, then privileged access, then entry points. Critical asset inventory runs in parallel and must not delay the first two.
- Security Exposure Management classifies critical assets (Very High to Low) across devices, identities, Azure, AWS and GCP, and finds choke points on attack paths.
- Strongest backup protection: immutable or offline. Azure Backup Excellent level: irreversible immutability or soft delete plus MUA with a Resource Guard owned by another team.
- Back up domain controllers and protect recovery documents (procedures, CMDB, network diagrams).
- Privileged access: secure workstations, randomized local passwords, privilege escalation mitigations, end-to-end session security.
- Updates: Azure Update Manager for servers everywhere through Azure Arc, Intune or Windows Autopatch for clients, Defender Vulnerability Management to prioritize.
