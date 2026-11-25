Data security on SC-100 follows a sequence: find and classify the data, decide which threats to mitigate first, choose the encryption model, then specify the controls of each data service (Azure SQL, Azure Synapse Analytics, Azure Cosmos DB, Azure Storage and the data used by AI workloads) and the Defender for Cloud plans that watch them. Expect "what should you recommend" questions where one constraint, such as customer control of keys or no keys at all, eliminates the obvious answer.

<!-- section: discovery-classification | objectives: 4.3.1 -->
## Data discovery and classification

You can't protect what you haven't found. Each tool discovers a different part of the estate:

| Requirement | Solution |
| --- | --- |
| Classify documents and emails in Microsoft 365 and on endpoints | Microsoft Purview **sensitive information types** (built-in, named entity, custom, exact data match), **trainable classifiers**, **sensitivity labels** |
| Scan and classify data sources across Azure, other clouds and on-premises databases, and build a governed catalog | Microsoft Purview **Data Map** and **Unified Catalog** |
| Find which cloud storage and databases hold sensitive data, and use it to prioritize attack paths | **Defender CSPM** with the **sensitive data discovery** extension |
| Classify columns of an Azure SQL database and audit who queries them | **Data discovery and classification** in Azure SQL (labels and information types on columns, surfaced in audit logs) |
| Classify prompts and responses of AI apps | Purview DSPM (sensitive information types and classifiers on AI interactions) |
| Prioritize data risks across all signals | Purview **Data Security Posture Management (DSPM)** |

Classification rules: a fixed pattern (card number, national ID) is a sensitive information type; an exact list of customer values is exact data match; a category of document that no pattern describes (contracts, source code) is a trainable classifier. A **sensitivity label** is the business decision ("Confidential") that carries protection; classification feeds it, manually or through auto-labeling.

> **Exam trap.** Purview Data Map classifies and catalogs; it doesn't block anything. Defender CSPM sensitive data discovery adds data context to cloud posture and attack paths. Neither replaces DLP or encryption.

<!-- section: data-threat-priorities | objectives: 4.3.2 -->
## Priorities for mitigating threats to data

Microsoft's data guidance follows **know your data, protect your data, prevent data loss, govern your data**, and Zero Trust adds: assume breach, verify every access explicitly, grant least privilege. Prioritize by the sensitivity and business criticality of the data, then by exposure.

| Threat | First mitigations |
| --- | --- |
| Data reachable from the internet (public endpoints, anonymous blob access) | Private endpoints, public network access disabled, anonymous access off, Azure Policy `Deny` |
| Stolen or leaked keys and connection strings | Microsoft Entra authentication with managed identities, account keys disabled (Shared Key, `disableLocalAuth`), secrets in Key Vault |
| Ransomware and destructive administrators | Immutable backups, soft delete and versioning, purge protection on key vaults, resource locks, multi-user authorization for backups, privileged access with PIM |
| Exfiltration by an insider | DLP, Insider Risk Management, sensitivity labels with encryption, Defender for Cloud Apps session controls |
| Injection and anomalous queries | Parameterized code, Defender for Azure SQL threat protection, WAF |
| Malware uploaded to storage | Defender for Storage malware scanning |
| Misconfiguration drift | Azure Policy, Defender CSPM recommendations and attack paths |
| Loss of control over keys (regulator, sovereignty) | Customer-managed keys in Key Vault or Managed HSM |

> **Exam tip.** When a scenario says "first" or "highest priority", start with the most sensitive, internet-exposed data and with identity-based access: removing keys and public exposure closes more attack paths than any detection tool.

<!-- section: encryption | objectives: 4.3.3 -->
## Encryption at rest and in transit

Azure encrypts data at rest by default with AES-256 and **Microsoft-managed keys**, using envelope encryption: a data encryption key (DEK) encrypts the data and a key encryption key (KEK) protects the DEK. Design choices are about who controls the KEK:

| Requirement | Recommendation |
| --- | --- |
| Encryption at rest, no key management | Platform default (Microsoft-managed keys) |
| Control rotation and be able to revoke access to the data | **Customer-managed keys (CMK)** in Azure Key Vault or Managed HSM; vault with soft delete **and** purge protection |
| Keys in HSMs dedicated to one tenant, with your own security domain | **Azure Key Vault Managed HSM** |
| A second encryption layer with a different algorithm and key | **Infrastructure encryption** (double encryption, always with a Microsoft-managed key); for a storage account, set **at creation only**; on an account without it, a new Blob Storage encryption scope can enable it when the scope is created |
| Encrypt VM temp disks, caches and data flows to storage | **Encryption at host**; Azure Disk Encryption is scheduled for retirement on September 15, 2028 |
| Columns that database administrators must never read in clear | **Always Encrypted** (client-side keys), optionally with secure enclaves (Intel SGX enclaves on DC-series reach end of support on October 31, 2027; VBS enclaves on the other compute tiers) |
| Data protected while being processed | Confidential computing (confidential VMs and containers) |

Key Vault options:

| Option | Protection | Use |
| --- | --- | --- |
| Key Vault Standard | Software-protected keys, secrets, certificates | Application secrets and certificates |
| Key Vault Premium | Adds HSM-protected keys (FIPS 140-3 Level 3 validated HSMs for new keys; older key versions can be on FIPS 140-2 Level 2 HSMs) | CMK that must stay in an HSM |
| Managed HSM | Single-tenant HSM pool, keys only, local RBAC | Highest isolation and key sovereignty |

**In transit**: require HTTPS and **TLS 1.2** as the minimum on storage accounts, Azure SQL and App Service; use private endpoints so traffic stays on the Microsoft backbone; for hybrid links, add IPsec VPN over ExpressRoute private peering or **MACsec** on ExpressRoute Direct.

> **Exam trap.** "Microsoft must not be able to read the data" isn't solved by a customer-managed key alone: the service still decrypts with your key while processing. Client-side encryption (Always Encrypted) or confidential computing keeps the data out of the operator's reach.

<!-- section: ai-data | objectives: 4.3.4 -->
## Security for data used in AI workloads

AI workloads read grounding data (indexes, documents, databases), store prompts, responses and agent state, and can leak whatever they can reach. Secure data before exposing it to a model:

| Requirement | Control |
| --- | --- |
| The app or agent reaches grounding stores without keys | Managed identity with data-plane roles on Azure AI Search, Storage and Cosmos DB; keys disabled (`disableLocalAuth`) |
| No public exposure of models and data | Private endpoints for the Foundry resource and every connected resource, public network access disabled |
| Keep agent data in your own resources with your own keys | Foundry agents **standard setup** (your Cosmos DB, Storage and Azure AI Search) instead of the basic Microsoft-managed setup, with CMK |
| Users must get only what they're allowed to see in answers | Respect source permissions (security trimming in the index), sensitivity labels with EXTRACT rights for Microsoft 365 data |
| Find AI resources whose grounding data is sensitive or internet exposed | **Defender CSPM** AI security posture (AI bill of materials, attack paths) with sensitive data discovery |
| Detect jailbreak, data leakage and credential theft in prompts | **Defender for AI services** (threat protection for AI services) |
| Classify, audit and apply insider risk and retention to prompts and responses | Purview DSPM (AI apps and agents; the earlier product is now DSPM for AI (classic)); **data security for AI interactions** enabled from the Defender for AI services plan (Purview license) |
| Block a prompt attack before it reaches the model | Foundry guardrails (prompt shields) |
| Stop sensitive data being pasted into consumer AI sites | Purview Endpoint DLP and browser controls |

Classify and minimize training and fine-tuning data like any other sensitive dataset: remove what the model doesn't need, label the rest, and restrict who can change it (data poisoning is an integrity threat).

> **Exam trap.** Defender for AI services detects and alerts; it doesn't block prompts or classify data. Blocking is a guardrail, posture is Defender CSPM, and classification and retention of interactions are Purview.

<!-- section: azure-data-workloads | objectives: 4.3.5 -->
## Securing Azure SQL, Azure Synapse Analytics and Azure Cosmos DB

| Layer | Azure SQL Database and Managed Instance | Azure Synapse Analytics | Azure Cosmos DB |
| --- | --- | --- | --- |
| Identity | Microsoft Entra admin, then **Microsoft Entra-only authentication** | Microsoft Entra ID for the workspace and SQL pools | Microsoft Entra ID with Cosmos DB **data-plane roles**; keys disabled (`disableLocalAuth`) |
| Network | Private endpoint, public network access disabled; avoid "Allow Azure services" | **Managed virtual network** with **data exfiltration protection** (approved target tenants only), managed private endpoints; both chosen **at workspace creation** | IP firewall, virtual network service endpoints, private endpoints |
| Encryption at rest | **TDE**, service-managed or customer-managed protector | TDE on dedicated SQL pools; workspace **double encryption with a customer-managed key** (at creation) | Encryption by default; customer-managed keys |
| Sensitive columns and rows | Always Encrypted, dynamic data masking, row-level security, data discovery and classification | Column-level and row-level security, dynamic data masking | Data-plane roles scoped to containers; masking options |
| Integrity and audit | Auditing to Storage, Log Analytics or Event Hubs; **ledger** for tamper evidence | Auditing of SQL pools | Diagnostic logs, control-plane locks |
| Threat protection | Defender for Azure SQL | Defender for Azure SQL (dedicated SQL pools) | Defender for Azure Cosmos DB (NoSQL API) |

Decision points:

- Remove SQL logins entirely: Microsoft Entra-only authentication (requires a Microsoft Entra admin first).
- Revoke a whole database on demand: customer-managed TDE protector; losing access to the key makes the database inaccessible.
- Prevent analysts from copying data to a storage account in another tenant: Synapse data exfiltration protection, which can't be added to an existing workspace.
- Cosmos DB data access with Microsoft Entra uses Cosmos DB's own data-plane roles (Cosmos DB Built-in Data Reader, Data Contributor), not Azure RBAC Contributor.

> **Exam trap.** Dynamic data masking hides values in query results; it isn't encryption, and privileged users still see the data. "Administrators must not see card numbers" is Always Encrypted.

<!-- section: storage-security | objectives: 4.3.6 -->
## Securing data in Azure Storage

| Layer | Recommendation |
| --- | --- |
| Authorization | Microsoft Entra ID with data roles (Storage Blob Data Reader, Contributor); **Shared Key access disallowed**; **user delegation SAS** when a SAS is required |
| Transport | Secure transfer required, minimum TLS 1.2 |
| Public exposure | Anonymous blob access disabled; firewall with selected networks or public network access disabled with private endpoints |
| Encryption | Microsoft-managed keys by default, CMK for control and revocation, infrastructure encryption chosen at creation |
| Data protection | Blob soft delete, container soft delete, versioning, point-in-time restore; **immutable storage** (time-based retention or legal hold) for WORM and ransomware resilience |
| Configuration | Resource lock on the account, cross-tenant object replication disallowed, Azure Policy `Audit` then `Deny` |
| Threat protection | Defender for Storage |

Roll out Shared Key removal in order: identify clients that use keys, move them to Microsoft Entra ID or user delegation SAS, disallow Shared Key, then enforce with policy.

> **Exam trap.** A stored access policy revokes only **service SAS** tokens. An account SAS can be revoked only by rotating the key that signed it, which is one more reason to disallow Shared Key and use user delegation SAS.

<!-- section: defender-storage-databases | objectives: 4.3.7 -->
## Defender for Storage and Defender for Databases

Both are **workload protection** plans of Defender for Cloud: they detect threats against data services, while posture (misconfigurations, attack paths) belongs to CSPM.

**Defender for Storage** (agentless, per storage account, Blob Storage, Azure Files, Azure Data Lake Storage):

| Component | What it adds |
| --- | --- |
| Activity monitoring | Alerts on unusual access, suspicious data extraction, access from malicious IPs |
| Malware scanning | Microsoft Defender Antivirus scan on upload or on demand; results in blob index tags, alerts, Event Grid; optional soft delete of malicious blobs; monthly cap per account (10,000 GB by default) |
| Sensitive data threat detection | Uses Purview sensitive information types to prioritize alerts on accounts holding sensitive data |

**Defender for Databases** groups four plans:

| Plan | Covers |
| --- | --- |
| Defender for Azure SQL Databases | Azure SQL Database, SQL Managed Instance, Synapse dedicated SQL pools: vulnerability assessment and threat protection (SQL injection, brute force, anomalous access) |
| Defender for SQL servers on machines | SQL Server on Azure VMs and SQL Server enabled by Azure Arc (on-premises, other clouds) |
| Defender for open-source relational databases | Azure Database for PostgreSQL and MySQL flexible servers, Amazon RDS engines |
| Defender for Azure Cosmos DB | Cosmos DB for NoSQL only |

Enable plans at the **subscription** level so existing and future resources are covered; send alerts to Defender XDR and Microsoft Sentinel for investigation.

> **Exam trap.** SQL Server running on premises gets Defender protection only through **Azure Arc** and the SQL servers on machines plan; a Cosmos DB for MongoDB account isn't covered by Defender for Azure Cosmos DB.

<!-- section: key-points -->
## Key points

- Discover and classify: Purview (SITs, classifiers, labels, Data Map), Defender CSPM sensitive data discovery, Azure SQL data discovery and classification.
- Priorities: sensitive and exposed data first; identity instead of keys, private endpoints, immutable backups, DLP for insiders.
- Encryption: platform keys by default, CMK with purge protection for control, Managed HSM for single-tenant HSMs, infrastructure encryption at creation, Always Encrypted or confidential computing against the operator.
- AI data: keyless and private grounding stores, standard agent setup for your own keys, Defender CSPM for posture, Defender for AI services for threats, Purview for interactions.
- Azure SQL: Entra-only auth, TDE CMK, Always Encrypted; Synapse: managed virtual network and exfiltration protection at creation; Cosmos DB: data-plane roles, local auth disabled.
- Defender for Storage = activity, malware scanning, sensitive data; Defender for Databases = four plans, Arc for non-Azure SQL Server.
