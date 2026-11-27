Compliance questions give you a regulation, a contract clause or an auditor's request and ask which Google Cloud design satisfies it. Google certifies its infrastructure and offers controls, but compliance is a **shared responsibility**: the customer chooses covered services, configures them correctly, controls access and keeps the evidence. This chapter maps legal, commercial, certification and audit requirements to the products that implement them.

<!-- section: legislation | objectives: 3.2.1 -->
## Legislation and regulation

| Requirement | Design answer |
| --- | --- |
| Health records (HIPAA in the US) | Sign the Google Cloud **Business Associate Agreement (BAA)**; process protected health information (PHI) only in BAA-covered products; disable or avoid unsupported services; no pre-GA offerings with PHI unless terms allow it; keep PHI out of resource names, labels, metadata and alert text |
| Children's privacy (COPPA in the US and similar laws) | Application-level duties: age screening, verifiable parental consent records, data minimization, short retention and deletion on request. On Google Cloud: separate storage of children's data, retention and lifecycle rules, Sensitive Data Protection to find stray identifiers, strict IAM |
| Data privacy (GDPR and similar) | Data processing terms with Google, lawful basis and purpose limitation in the application, data subject rights (export, deletion), encryption, pseudonymization, location controls, breach detection and logs |
| Ownership of data | The customer owns its data; **Access Transparency** logs Google personnel access, **Access Approval** requires your approval before that access |
| Data sovereignty and residency | Location controls, key control and personnel controls, combined below |

**Residency and sovereignty building blocks:**

| Need | Control |
| --- | --- |
| Create resources only in permitted regions | Organization policy `constraints/gcp.resourceLocations` with value groups such as `in:eu-locations`; applies to new resources, not to resources already created |
| A compliance boundary with residency, personnel and key controls applied as guardrails to a folder | **Assured Workloads** with the matching control package |
| Keys held outside Google, with a reason for every key access | **Cloud EKM** plus **Key Access Justifications** |
| Software-defined sovereignty on the public cloud | **Google Cloud Data Boundary** |
| Dedicated infrastructure operated by a local partner (for example S3NS in France, designed for SecNumCloud) | **Google Cloud Dedicated** |
| Fully disconnected, on-premises, cannot be accessed or shut down remotely by Google | **Google Distributed Cloud** air-gapped |

**Assured Workloads** control packages include regulatory ones (FedRAMP Moderate and High, IL2, IL4, IL5, CJIS, ITAR, IRS Publication 1075, Healthcare and Life Sciences for HIPAA and HITRUST, Canada Controlled Goods) and regional ones (EU, UK, Switzerland, Canada, Japan, Australia, India, Kingdom of Saudi Arabia and others), plus **Sovereign Controls by Partners**. It applies organization policy constraints to the folder, can restrict support to personnel by location (Assured Support), and monitors violations.

```yaml
name: folders/482917305512/policies/gcp.resourceLocations
spec:
  rules:
  - values:
      allowedValues:
      - in:eu-locations
```

```bash
gcloud org-policies set-policy eu-only.yaml
```

> **Exam trap.** The resource locations constraint controls where resources are created. It does not control where Google support staff are or who holds the keys. "Data must stay in the EU and only EU-based personnel may access it" needs Assured Workloads (EU control package), not only the organization policy.

<!-- section: commercial-data | objectives: 3.2.2 -->
## Commercial requirements: card data and PII

**Payment card data (PCI DSS).** Google Cloud is assessed as a PCI DSS service provider, but your cardholder data environment (CDE) is yours to secure. The main design lever is **scope reduction**:

1. Avoid storing card numbers: use a payment processor's hosted page or tokens.
2. If you must store them, **tokenize** at ingestion and keep the vault in a dedicated, isolated project and VPC network.
3. Put the CDE projects in a **VPC Service Controls** perimeter, use CMEK, restrict IAM to a small group, and log everything with Data Access audit logs enabled.
4. Systems that only see tokens fall outside most of the assessment scope.

**Personally identifiable information.** **Sensitive Data Protection** handles discovery, inspection and de-identification:

| Capability | Use |
| --- | --- |
| Discovery (data profiles) | Scan an organization, folder or project continuously; find which BigQuery, Cloud SQL and Cloud Storage assets contain sensitive data and their risk level |
| Inspection | Deep scan of one resource (BigQuery table, bucket, Datastore kind) or of content sent through `content.inspect`, using built-in or custom **infoTypes** |
| De-identification | Masking, redaction, bucketing, date shifting, tokenization (pseudonymization), on content or on Cloud Storage copies |
| Risk analysis | Measure re-identification risk of structured BigQuery data (for example k-anonymity) |
| Actions | Send findings to Security Command Center or Pub/Sub to trigger remediation |

| Requirement | De-identification choice |
| --- | --- |
| Analysts need to join on customer ID without seeing it | Deterministic tokenization (same input, same token) |
| Support staff see only the last four card digits | Masking |
| Remove free-text identifiers from chat logs before storing them | Inspection plus redaction (or replacement with the infoType name) |
| Keep ages for statistics but not exact birth dates | Bucketing or date shifting |
| Authorized team must recover the original value | Reversible tokenization with a Cloud KMS-wrapped key |

Keep PII out of logs (application logging filters, de-identification in the pipeline), and screen prompts and responses of AI applications with Model Armor's Sensitive Data Protection filter.

> **Exam trap.** Encryption at rest does not reduce PCI DSS scope or hide PII from analysts who can query the table: anyone with read access sees cleartext. Tokenization or de-identification changes what the data contains; encryption changes only how it is stored.

<!-- section: certifications | objectives: 3.2.3 -->
## Industry certifications

Google Cloud is independently audited against standards such as SOC 1, SOC 2 and SOC 3, ISO/IEC 27001, 27017 and 27018, PCI DSS and FedRAMP. Customers download the latest ISO certificates, SOC reports and self-assessments, free, from **Compliance Reports Manager**; confidential reports are shared under the customer agreement.

What a certification means for your design:

- Google's **SOC 2 report** covers Google's controls over the infrastructure and services in its scope. Your own SOC 2 audit still covers your controls: access reviews, change management, logging, incident response, configuration of the services you use.
- Use only services within the scope of the certification you rely on; check the product scope lists.
- Map controls to technology: IAM and PAM for access control, organization policies for configuration baselines, Cloud Audit Logs for evidence, Cloud Build and Cloud Deploy approvals for change management.

**Continuous compliance monitoring:**

| Tool | Provides |
| --- | --- |
| Security Command Center Premium | Security Health Analytics detectors mapped to benchmarks such as CIS, NIST, PCI DSS and HIPAA; compliance monitoring; Compliance Manager; Event Threat Detection |
| Security Command Center Standard | Free, basic posture management; limited Compliance Manager |
| Assured Workloads | Monitoring of control package violations, exceptions with justification |
| Organization policies with dry run | Test a guardrail before enforcing it |

The Security Command Center Enterprise tier (multicloud) is deprecated and shuts down on May 21, 2027; its organizations move to Premium.

> **Exam tip.** "The auditor asks for Google's SOC 2 Type II report" is answered by Compliance Reports Manager. "Prove continuously that our projects meet CIS benchmarks" is Security Command Center Premium compliance reporting.

<!-- section: audits | objectives: 3.2.4 -->
## Audits and logs

**Cloud Audit Logs** record who did what, where and when:

| Log | Records | Default | Can disable? |
| --- | --- | --- | --- |
| Admin Activity | Configuration and metadata changes by users | Always on | No |
| System Event | Changes made by Google systems | Always on | No |
| Data Access | Reads of configuration or metadata, reads and writes of user data | Off, except BigQuery | Yes (enable per service, at organization, folder or project level) |
| Policy Denied | Access denied by a security policy (for example VPC Service Controls) | On | No, but can be excluded from storage |

Storage and retention:

| Bucket | Content | Retention |
| --- | --- | --- |
| `_Required` | Admin Activity, System Event | 400 days, not configurable, free of storage charge |
| `_Default` | Data Access, Policy Denied, other logs | 30 days; configurable in projects from 1 to 3,650 days |
| User-defined (project) | What your sinks route there | Configurable from 1 to 3,650 days |

Viewing Data Access logs requires **Private Logs Viewer** (`roles/logging.privateLogViewer`); **Logs Viewer** (`roles/logging.viewer`) sees the other audit logs.

Central audit design:

1. Enable Data Access logs where the regulation requires read auditing (they add volume and cost).
2. Create an **aggregated sink** at the organization or folder (`--include-children`) routing audit logs to a central log bucket, BigQuery dataset or Cloud Storage bucket in a security-owned project. An intercepting aggregated sink also stops child-project sinks from receiving those entries.
3. Retain: log bucket with long retention and a locked retention setting, or a Cloud Storage bucket with a **locked retention policy** (Bucket Lock) for write-once evidence for several years.
4. Analyze with Observability Analytics on log buckets or SQL in BigQuery; stream to a SIEM such as Google Security Operations through Pub/Sub.
5. Add **Access Transparency** logs for Google personnel actions, and Cloud Asset Inventory for the recent configuration history of resources.

```bash
gcloud logging sinks create org-audit-to-bq \
  bigquery.googleapis.com/projects/acme-sec-logs/datasets/org_audit \
  --organization=301598742611 --include-children \
  --log-filter='logName:"cloudaudit.googleapis.com"'
```

After creating a sink, grant its writer identity write access on the destination (for example BigQuery Data Editor on the dataset).

> **Exam trap.** "Keep audit logs for seven years, tamper-proof" is not met by the `_Required` bucket (400 days) or by default `_Default` retention. Route the logs with an aggregated sink to a destination with a long retention and lock it (Bucket Lock on Cloud Storage, or a locked log bucket).

<!-- section: key-points -->
## Key points

- Compliance is shared: Google certifies the platform; you pick covered services, configure them, control access and keep evidence.
- HIPAA: BAA, covered products only, no PHI in metadata; residency: `gcp.resourceLocations` for new resources; sovereignty: Assured Workloads, Cloud EKM with Key Access Justifications, Data Boundary, Dedicated, air-gapped Google Distributed Cloud.
- Access Transparency shows what Google staff did; Access Approval makes them ask first.
- PCI DSS: shrink scope with tokenization, isolated projects, VPC Service Controls; PII: Sensitive Data Protection discovery, inspection and de-identification.
- Google's SOC and ISO reports come from Compliance Reports Manager; continuous benchmark compliance from Security Command Center Premium.
- Admin Activity and System Event logs are always on (`_Required`, 400 days); Data Access logs are off by default except BigQuery and need Private Logs Viewer.
- Long-term, tamper-proof audit evidence: aggregated sink to a central project plus locked retention.
