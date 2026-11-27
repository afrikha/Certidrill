Security questions on the Professional Cloud Architect exam rarely ask for a definition. They describe a risk (a leaked key, an over-privileged team, data exfiltration, an untrusted image, a prompt injection) and ask for the control that addresses it with least privilege and least effort. The skill is to place each control at the right layer: identity, hierarchy, data, network perimeter, supply chain or AI application.

<!-- section: iam | objectives: 3.1.1 -->
## Identity and Access Management

An **allow policy** binds principals to roles on a resource. Principals: Google accounts, Google groups, service accounts, Cloud Identity or Workspace domains, and federated identities (workforce and workload pools).

| Role type | What to know |
| --- | --- |
| Basic roles | Admin (`roles/admin`), Writer (`roles/writer`), Reader (`roles/reader`). Each includes the one below. Very broad: do not grant in production unless there is no alternative |
| Legacy basic roles | Owner, Editor, Viewer (`roles/owner`, `roles/editor`, `roles/viewer`), the former primitive roles. They do not accept IAM Conditions; prefer the new basic roles when a basic role is unavoidable |
| Predefined roles | Maintained by Google per service (`roles/storage.objectViewer`, `roles/compute.instanceAdmin.v1`): the default choice |
| Custom roles | Your own permission list, created at the **organization or project** level, never at folder level; permissions marked `TESTING` are not for production |

Rules the exam relies on:

- Grant roles to **groups**, not individuals; membership then drives access.
- Policies are **inherited** down the hierarchy and combined: a lower level cannot remove a role granted higher up.
- **IAM Conditions** restrict a binding by resource name, tag or date and time (temporary access).
- **IAM deny policies** are checked **before** allow policies and block listed permissions whatever the roles; they attach to an organization, folder or project and support exception principals.
- **Privileged Access Manager** gives just-in-time, time-bound elevation: an entitlement defines who may request which roles for how long, with optional approval and justification; grants are logged in Cloud Audit Logs.
- **Service accounts** are identities for workloads. Attach one per application with only its roles. Prevent the default Compute Engine and App Engine service accounts from receiving Editor automatically with `constraints/iam.automaticIamGrantsForDefaultServiceAccounts`.

> **Exam trap.** Removing a role at the project level does nothing if the user inherits it from a folder or the organization. Find where the binding is (Policy Analyzer, Policy Troubleshooter) and remove it there, or add a deny policy.

<!-- section: resource-hierarchy | objectives: 3.1.2 -->
## Resource hierarchy

```text
Organization (bound to one Cloud Identity or Google Workspace account)
├── Folder: Shared         (networking host project, logging, security tooling)
├── Folder: Production
│   ├── Folder: Payments   (projects pay-api-prod, pay-data-prod)
│   └── Folder: Retail
└── Folder: Non-production
```

- The **organization** is the root node, created with a Cloud Identity or Workspace account; its owner cannot change.
- **Folders** group projects by environment, business unit or compliance scope, and can nest. They are the place for IAM bindings and organization policies that apply to a group of projects.
- **Projects** are the unit of billing, API enablement and quota. The project ID is globally unique and chosen at creation; the project number is assigned and read-only; the display name can change.
- Allow policies, deny policies and organization policies are inherited down the tree.

Design guidance: separate production and non-production in different folders; keep shared services (Shared VPC host, central logging, key projects) in their own projects; one project per application per environment so that IAM and quotas stay small and blast radius is limited.

<!-- section: data-security | objectives: 3.1.3 -->
## Data security: encryption and secrets

Google Cloud encrypts all data at rest and in transit between Google facilities by default. The choices are about who controls the key:

| Option | Key location and control | Choose when |
| --- | --- | --- |
| Default encryption | Google-owned, Google-managed keys; no setup, no cost | No regulatory need to control keys |
| CMEK (Cloud KMS) | Keys in your Cloud KMS project; you control rotation, disable, destroy, audit | Regulation requires customer-managed keys, crypto-shredding, key usage audit |
| CMEK with Cloud HSM | Same, key in FIPS 140-2 Level 3 HSMs | Hardware-protected key required |
| Cloud EKM | Key material stays in a supported external key manager, never sent to Google | Keys must stay outside Google (sovereignty) |
| CSEK | You supply the raw key with each request; Google does not store it | Cloud Storage only (CSEK for Compute Engine is deprecated); losing the key loses the data |

**Secret Manager** stores API keys, passwords and certificates:

- A secret has **versions**; applications read `latest` or a pinned version. Disable or destroy old versions.
- Replication: **automatic** (Google chooses locations) or **user-managed** (you list the regions, for residency).
- Access with `roles/secretmanager.secretAccessor` granted on the secret to the workload's service account.
- A **rotation schedule** publishes a Pub/Sub notification; your code (for example a Cloud Run function) creates the new version. Secret Manager does not rotate the credential itself.
- Secrets can be protected with CMEK.
- On Cloud Run, a secret exposed as an **environment variable** is resolved at instance startup (pin a version); a secret mounted as a **volume** is fetched from Secret Manager at each read, so it follows rotation with `latest`.

```bash
gcloud secrets create db-password --replication-policy=user-managed \
  --locations=europe-west1,europe-west4
printf 's3cr3t-value' | gcloud secrets versions add db-password --data-file=-
gcloud secrets add-iam-policy-binding db-password \
  --member=serviceAccount:orders@acme-prod.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

> **Exam trap.** Secrets in environment variables baked into images, in source code or in instance metadata are always wrong answers. Cloud Run and GKE can mount Secret Manager secrets directly.

<!-- section: separation-of-duties | objectives: 3.1.4 -->
## Separation of duties

The person who controls a key, a policy or an approval must not be the person who uses it.

| Duty | Typical role | Kept apart from |
| --- | --- | --- |
| Manage keys | `roles/cloudkms.admin` (cannot encrypt or decrypt) | `roles/cloudkms.cryptoKeyEncrypterDecrypter`, granted to service agents |
| Set guardrails | `roles/orgpolicy.policyAdmin` | Project owners who must obey the policies |
| Grant access | Organization or folder IAM admins | Developers in the projects |
| Approve elevation | Privileged Access Manager approvers | Requesters of the entitlement |
| Review activity | Security team with Private Logs Viewer on a central log project | Administrators whose actions are logged |
| Billing | Billing Account Administrator | Resource administrators |

Patterns: put Cloud KMS keys in a **dedicated key project** managed by a security team (Autokey's dedicated-project mode does this automatically); centralize logs in a project the workload administrators cannot change; require PAM approval for production admin roles; use separate projects per environment so nobody holds production access by default.

<!-- section: security-controls | objectives: 3.1.5 -->
## Security controls: perimeters, context, policies and firewalls

| Risk | Control |
| --- | --- |
| Data copied out of Google-managed services with valid stolen credentials | **VPC Service Controls** |
| Access only from managed devices or corporate IP ranges | **Access Context Manager** access levels (context-aware access) |
| Resources created in a forbidden way (public IP, wrong region, keys) | **Organization policies** |
| Network traffic rules that project teams cannot override | **Hierarchical firewall policies** |
| Who did what | **Cloud Audit Logs** (see the compliance chapter) |

**VPC Service Controls** places projects in a **service perimeter** around services such as Cloud Storage and BigQuery. Calls across the perimeter are blocked even with valid IAM permissions; inside, normal IAM applies. Use **dry run** mode first to see what would be blocked; allow specific cross-perimeter flows with **ingress and egress rules** (preferred over perimeter bridges); admit internet clients with an access level. On-premises hosts reach protected services through Private Google Access with `restricted.googleapis.com` (`199.36.153.4/30`) over Cloud Interconnect or VPN. Use it together with IAM, not instead of it.

```bash
gcloud access-context-manager perimeters create analytics_perimeter \
  --policy=POLICY_ID --title="Analytics" \
  --resources=projects/123456789012 \
  --restricted-services=storage.googleapis.com,bigquery.googleapis.com
```

**Organization policies** to know:

| Constraint | Effect |
| --- | --- |
| `constraints/iam.allowedPolicyMemberDomains` | Domain restricted sharing: only principals of listed customer IDs can be granted roles |
| `constraints/iam.managed.disableServiceAccountKeyCreation` | No service account keys |
| `constraints/gcp.resourceLocations` | Allowed locations for new resources (`in:eu-locations`) |
| `constraints/compute.vmExternalIpAccess` | Which VMs may have external IPv4 addresses |
| `constraints/storage.uniformBucketLevelAccess` / `constraints/storage.publicAccessPrevention` | IAM-only bucket access / no `allUsers` grants |
| `constraints/compute.trustedImageProjects` | Boot images only from approved projects |
| `constraints/gcp.restrictTLSVersion` | Deny TLS 1.0 or 1.1 |

**Hierarchical firewall policies** attach to the organization or a folder and are evaluated before the VPC's own rules. A rule can `allow`, `deny`, `goto_next` (delegate the decision to the next level, down to the network's rules) or `apply_security_profile_group` (send to Cloud NGFW inspection). Use them for rules every project must inherit: block known bad ranges, always allow health check and IAP ranges.

> **Exam trap.** A firewall rule cannot stop a user with valid credentials from copying a BigQuery table to a project outside the company: that is exfiltration through Google APIs, solved by VPC Service Controls.

<!-- section: cloud-kms | objectives: 3.1.6 -->
## Managing customer-managed encryption keys with Cloud KMS

Hierarchy: **location** → **key ring** → **key** → **key versions**. The key ring's location must suit the resources it protects (a regional resource needs a key in a compatible location). Key rings, keys and key versions can be deleted only in some circumstances; a deleted key ring's name can be reused, a deleted key's name cannot. Deleting removes a resource from lists, while destroying a key version permanently deletes its key material.

| Protection level | Validation | Note |
| --- | --- | --- |
| Software | FIPS 140-3 Level 1 | Default, all locations |
| HSM (Cloud HSM) | FIPS 140-2 Level 3 | Multi-tenant, or single-tenant for dedicated partitions |
| External (Cloud EKM), over the internet or a VPC | Depends on the external manager | Symmetric only; not every CMEK service supports it |

Lifecycle and operations:

- **Rotation**: automatic for symmetric software and HSM keys (new primary version; old versions still decrypt old data); manual for asymmetric, imported and external keys.
- **Destruction**: a version is scheduled for destruction for **30 days** by default and can be restored during that period; an organization policy can enforce a minimum duration.
- **Disable** a version to cut access immediately; revoking the service agent's role, disabling or destroying the key makes the data inaccessible (crypto-shredding).
- The service using CMEK calls Cloud KMS through its **service agent**, which needs `roles/cloudkms.cryptoKeyEncrypterDecrypter` on the key.
- **Autokey** creates key rings and keys on demand when a resource is created and grants the service agent automatically, in a dedicated key project or in the same project.
- Enforce CMEK with `constraints/gcp.restrictNonCmekServices` and limit key sources with `constraints/gcp.restrictCmekCryptoKeyProjects` (both apply to new resources only).

```bash
gcloud kms keyrings create data-keys --location=europe-west1 --project=acme-keys
gcloud kms keys create gcs-orders --keyring=data-keys --location=europe-west1 \
  --purpose=encryption --protection-level=hsm \
  --rotation-period=90d --next-rotation-time=2027-01-01T00:00:00Z --project=acme-keys
gcloud kms keys add-iam-policy-binding gcs-orders --keyring=data-keys \
  --location=europe-west1 --project=acme-keys \
  --member=serviceAccount:service-123456789012@gs-project-accounts.iam.gserviceaccount.com \
  --role=roles/cloudkms.cryptoKeyEncrypterDecrypter
```

> **Exam trap.** Rotating a key does not re-encrypt existing data: old data stays readable with the older version. To remove access to the data, disable or destroy the versions, not just rotate.

<!-- section: secure-remote-access | objectives: 3.1.7 -->
## Secure remote access

| Requirement | Answer |
| --- | --- |
| Employees reach an internal web app without VPN, by identity and context | **Identity-Aware Proxy** on the load balancer, App Engine or Cloud Run; grant IAP-secured Web App User. For Cloud Run, Google recommends enabling IAP directly on the service (GA since March 13, 2026): it covers all ingress paths, including the default `run.app` URL; IAP cannot be configured on both the load balancer and the service |
| Administrators SSH or RDP to VMs without external IPs or a bastion | **IAP TCP forwarding**: allow ingress from `35.235.240.0/20`, grant IAP-secured Tunnel User (`roles/iap.tunnelResourceAccessor`) |
| Zero trust for web apps on Google Cloud, on-premises and other clouds, with device posture and Chrome data loss prevention | **Chrome Enterprise Premium** (formerly BeyondCorp Enterprise) |
| A person or pipeline acts as a service account temporarily without a key | **Service account impersonation**: Service Account Token Creator (`roles/iam.serviceAccountTokenCreator`) on that service account |
| Workloads on AWS, Azure, GitHub Actions, GitLab, Kubernetes or on-premises call Google APIs without keys | **Workload Identity Federation** |
| Pods in GKE call Google APIs | **Workload Identity Federation for GKE** |

```bash
gcloud compute ssh db-admin-vm --zone=europe-west1-b --tunnel-through-iap
gcloud storage ls gs://acme-prod-exports \
  --impersonate-service-account=exporter@acme-prod.iam.gserviceaccount.com
```

**Workload Identity Federation**: create a **workload identity pool** per environment and a **provider** (AWS, OIDC, SAML 2.0, X.509) that trusts the external identity provider. **Attribute mapping** builds `google.subject` and custom attributes from the external token; an **attribute condition** rejects tokens that do not match (for example a specific repository or AWS role). Grant roles directly to the federated principal (`principal://` or `principalSet://`), which Google recommends, or let it impersonate a service account through `roles/iam.workloadIdentityUser`. The exchange returns short-lived tokens.

IAP is a central authorization layer: block traffic that bypasses it (firewall rules allowing only the load balancer, Cloud Run ingress settings), and apply access levels for context-aware access.

> **Exam trap.** "Download a service account key and store it as a CI secret" is the answer to avoid. External CI uses Workload Identity Federation; internal tools use impersonation or an attached service account. Block keys with `constraints/iam.managed.disableServiceAccountKeyCreation`.

<!-- section: supply-chain | objectives: 3.1.8 -->
## Securing the software supply chain

| Stage | Control |
| --- | --- |
| Dependencies | **Assured Open Source Software** (packages built and verified by Google); Artifact Registry remote repositories as a controlled cache |
| Source and build | **Cloud Build** with private pools, build provenance, SLSA Level 3 builds for container images |
| Store and scan | **Artifact Registry** with **Artifact Analysis**: automatic and on-demand vulnerability scanning, SBOM generation, VEX statements |
| Deploy | **Binary Authorization** for GKE and Cloud Run: only images with the required attestations (built by the trusted pipeline, scanned, approved) are admitted |
| Runtime | GKE security posture dashboard, Cloud Run security insights (SLSA level, provenance, vulnerabilities) |
| Guardrails | `constraints/container.managed.enableBinaryAuthorization`, `constraints/compute.trustedImageProjects` |

```yaml
globalPolicyEvaluationMode: ENABLE
defaultAdmissionRule:
  evaluationMode: REQUIRE_ATTESTATION
  enforcementMode: ENFORCED_BLOCK_AND_AUDIT_LOG
  requireAttestationsBy:
  - projects/acme-sec/attestors/built-by-cloud-build
```

> **Exam tip.** "Ensure only images built by our CI pipeline run in production" is Binary Authorization with attestations; vulnerability scanning alone reports problems but does not block deployment.

<!-- section: securing-ai | objectives: 3.1.9 -->
## Securing AI workloads

**Model Armor** screens prompts and responses of any model, on Google Cloud or elsewhere:

| Filter | Detects |
| --- | --- |
| Responsible AI | Hate speech, harassment, sexually explicit and dangerous content |
| Prompt injection and jailbreak | Attempts to override instructions or bypass safety |
| Sensitive Data Protection | Basic mode (credit card numbers, US SSN and similar) or advanced mode with your inspection and de-identification templates |
| Malicious URLs | Known malicious links (first 256 URLs) |
| CSAM | Always on, cannot be disabled |

Configure **templates** (separate ones for prompts and responses are recommended), confidence levels (High, Medium and above, Low and above) and organization-wide **floor settings**. Start in **inspect only** (violations logged to Cloud Logging), then move to **inspect and block**.

**Sensitive Data Protection** discovers and de-identifies sensitive data in training sets, RAG corpora and logs before models see it. **Security Command Center** AI Protection inventories AI assets and detects threats against them.

Secure model deployment checklist:

- Endpoints reachable privately (Private Service Connect), projects inside a **VPC Service Controls** perimeter, **CMEK** on datasets, models and endpoints where required.
- A dedicated, least-privilege service account per pipeline and endpoint; no user keys.
- Allow only vetted models with `constraints/vertexai.allowedModels`; review Model Garden and Hugging Face scan results.
- Ground answers on approved data, and log and monitor prompts, responses and Model Armor findings.

> **Exam trap.** IAM and VPC Service Controls protect who calls the model, not what the prompt says. Prompt injection, jailbreaks and sensitive data leaking in responses are handled by Model Armor.

<!-- section: key-points -->
## Key points

- Predefined roles to groups at the narrowest scope; basic roles are now Admin, Writer, Reader (Owner, Editor, Viewer are legacy); custom roles at organization or project, never folder.
- Deny policies are evaluated before allow policies; PAM gives just-in-time, approved, time-bound elevation.
- Default encryption, CMEK (software or HSM), Cloud EKM (key outside Google), CSEK (Cloud Storage only). Secrets go in Secret Manager.
- Keys in a dedicated project: `cloudkms.admin` manages, service agents hold `cryptoKeyEncrypterDecrypter`; destruction waits 30 days by default; rotation does not re-encrypt.
- VPC Service Controls stops API-level exfiltration; organization policies enforce guardrails; hierarchical firewall policies impose network rules from the organization or folder.
- IAP for web and SSH/RDP access, Chrome Enterprise Premium for zero trust, impersonation and Workload Identity Federation instead of service account keys.
- Supply chain: Artifact Registry + Artifact Analysis to scan, Cloud Build provenance, Binary Authorization to block.
- AI: Model Armor for prompts and responses, Sensitive Data Protection for data, private endpoints, VPC Service Controls and model allowlists.
