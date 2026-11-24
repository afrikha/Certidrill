# FIX-sc-500-1 — chapters 11, 12, 13, 21 and 22 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert sc-500 11-entra-access 12-key-vault 13-governance 21-storage-security 22-database-security` 0 problems; `content:validate --cert sc-500` 0 problems, 0 warnings; `check-quiz sc-500 …` 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed. The shared WebFetch budget ran out several times; I waited and retried each time, so every finding below was checked.

## 11-entra-access

| Finding | Learn | Change |
| --- | --- | --- |
| User consent settings role | Confirmed (configure-user-consent): Privileged Role Administrator with Microsoft Graph / Graph PowerShell; Global Administrator "only required when using the Microsoft Entra admin center" | consent section: the setting is set by a Privileged Role Administrator with Graph or Graph PowerShell, and needs a Global Administrator in the admin center |
| Graph application permissions through the admin consent workflow | Confirmed. The workflow page says only Global Administrators approve requests for Microsoft Graph app roles. The grant page says Privileged Role Administrator grants any permission (Cloud App Admin, App Admin and AI Admin: all except Graph app roles). The two pages describe different paths, so they don't contradict each other | Workflow bullet: new sentence. Key point rewritten: Privileged Role Administrator (not the app admin roles) grants Graph application permissions; through the workflow, only a Global Administrator approves them |
| Register security information also applies to WHfB and macOS Platform SSO | Confirmed (policy-all-users-security-info-registration: "Starting July 6, 2026"). It isn't on the target-resources page | New sentence after the target-resource table |
| Windows Azure Service Management API covers the Entra admin center but not Azure DevOps | Confirmed (concept-conditional-access-cloud-apps) | Same new sentence |
| PIM for Groups | Consistent | None |
| FR « faire confiance à GitHub Actions » | Questions guide: « approuver » | « pour approuver GitHub Actions » |

## 12-key-vault

| Finding | Learn | Change |
| --- | --- | --- |
| FIPS levels | Confirmed (about-keys): software keys FIPS 140-2 Level 1. Premium HSM Platform 1: FIPS 140-2 Level 2. Platform 2: FIPS 140-3 Level 3, and it "now protects all new keys and key versions". oct-HSM is preview in vaults | Standard row: FIPS 140-2 Level 1. Premium row: Platform 2 / Platform 1 levels. oct-HSM not added (preview) |
| Vault recovery role | Confirmed: soft-delete-overview says the user "who has the privilege to create a key vault under the resource group" can recover it. Purge: subscription owner or Key Vault Purge Operator | Recovery sentence reworded around that permission, with Key Vault Contributor as the example |
| Secrets access "at the level of the key vault" vs per-secret assignments | rbac-guide (re-fetched): per-secret assignments aren't recommended, with two exceptions (one person's secret; a secret shared by several apps). The chapter follows it | None. For a human: the secrets page and the RBAC guide disagree |
| Secrets scanning roles | Confirmed (secrets-scanning): "To use secrets scanning, the following permissions are needed". No role is stated for viewing findings | "Viewing findings requires" became "Using secrets scanning requires" |
| Defender for Key Vault response | Confirmed (defender-for-key-vault-introduction): for an unauthorized app or user, remove the principal from the vault's access policy settings or restrict its operations. A separate branch covers principals that hold a Microsoft Entra role | Step 2 follows Learn's wording. It keeps "in an Azure RBAC vault, remove its role assignment" in parentheses and adds the Entra role branch |
| `--enable-rbac-authorization` default | Consistent (QZ report) | None |
| Firewall limits (QZ "not verified") | network-security page: 200 VNet rules and 1,000 IPv4 rules, IPv4 only, no RFC 1918 ranges confirmed. The "up to 15 minutes" applies only to enabling the service endpoint | "Changes take up to 15 minutes" became "Enabling the `Microsoft.KeyVault` service endpoint … up to 15 minutes". Also confirmed: trusted services still bypass when public access is disabled, and Azure DevOps isn't trusted |

## 13-governance

| Finding | Learn | Change |
| --- | --- | --- |
| Regulatory compliance roles | **Learn disagrees with itself.** update-regulatory-compliance-packages ("Assign regulatory compliance standards") says "You need `Owner` or `Policy Contributor` permissions to add a standard" and lists every plan except Servers Plan 1 and API Plan 1. regulatory-compliance-dashboard says "At a minimum … Resource Policy Contributor and Security Admin" and "at least one paid plan". Both pages say Reader (not Security Reader) gives access to the compliance data | The chapter keeps the more specific page (Owner or Policy Contributor). Added: reading compliance data needs Reader, Security Reader isn't enough. Flagged for a human |
| Greyed-out controls and the compliance-over-time workbook | Confirmed on concept-regulatory-compliance-standards: uncheckable controls "will show as greyed out", and the page links a compliance over time workbook. The dashboard page adds manual attestation with evidence | None |
| Immutable vault enablement options | Confirmed (backup-azure-immutable-vault-concept): "Enable based on backup policy" (default) and "Enable for specific duration", where retention can be reduced down to the duration. GA, no preview | Immutable vault row describes both options |
| Backup security levels shown as preview | **Not confirmed.** security-overview ("Overview of security and cyber recovery in Azure Backup") and resiliency/security-levels-concept ("Security levels in Resiliency") both have no preview label | None |
| Secure score: AWS/GCP recommendations and Cloud Secure Score | Confirmed (secure-score-security-controls): over 200 AWS and GCP recommendations now count. The risk-based Cloud Secure Score in the Defender portal is a "completely different" model | Secure score bullet: two sentences |
| Exemption expiration | exempt-resource: optional in the Azure portal flow, "mandatory expiration dates" in the Defender portal governance section. Roles, 24 hours and custom recommendations confirmed as in the chapter. The page also contradicts itself on whether mitigated exemptions raise the score | None (the chapter covers the Azure portal flow). Flagged |
| Elevate access rollout | Not tested anywhere | None |

## 21-storage-security

| Finding | Learn | Change |
| --- | --- | --- |
| Minimum TLS | transport-layer-security-configure-migrate-to-tls2 (2026-01-30): on February 3, 2026, Blob Storage stopped supporting TLS 1.0 and 1.1 for all new and existing accounts, and this applies to Files, Queue and Table on the account. The configure page (2026-10-26) says Storage supports TLS 1.2 and 1.3, permits "1.2 and above", and recommends 1.2 as the minimum. But it still says an unset property "permits requests sent with TLS version 1.0 or greater" | TLS row: dropped "which accepts TLS 1.0 and later"; added the February 3, 2026 retirement and "TLS 1.2 is the recommended minimum". Flagged: that sentence on the configure page is stale |
| Cross-tenant replication default | Confirmed (object-replication-prevent-cross-tenant-policies): defaults to false for accounts created after Dec 15, 2023. For older accounts the property is null, which allows it | Parenthesis on the hardening sentence |
| Malware scanning limits | Confirmed: legacy v1 accounts, NFS 3.0 and client-side encrypted blobs aren't scanned; CMK-encrypted blobs are (defender-for-storage-malware-scan). Cap with up to 20 GB deviation, reset at midnight UTC at month end, and a subscription cap allocated to each account (on-upload-malware-scanning) | Malware scanning row and Exam trap |
| Cap alerts at 75 % and 100 % | **Confirmed** on defender-for-storage-introduction (two alerts, at 75 % and at the cap) | None (the chapter was right) |
| Defender for Storage (classic) | Confirmed: migrate to get current features and pricing, no retirement date | None |
| Bank `sc500-2a-fw-statements` s2 (trusted services stay in effect after Disabled) | **Confirmed**, storage-network-security-limitations: "any resource instances and exceptions that you previously configured, including Allow Azure services on the trusted services list … will remain in effect". Trusted services take "the highest precedence" | Question unchanged (answer Yes is right). Chapter: Disabled row notes it, plus a new bullet under "Behaviors that decide answers" |

## 22-database-security

| Finding | Learn | Change |
| --- | --- | --- |
| "Select types" in the Databases plan | **Not confirmed**: tutorial-enable-databases-plan only says On activates all four plans, and points to each plan's own enablement article | "**Select types** lets you choose" replaced by "follow that plan's own enablement article". Flagged for a portal check |
| AES TDE protector keys | Confirmed (transparent-data-encryption-byok-overview): AES 128/192/256 bits in Key Vault Premium or Managed HSM, SQL Database only, AES-256 recommended, no preview label. RSA 2048/3072 for both products. Versionless key IDs are SQL Database only | Key row, rotation row (versionless ID), key point |
| TDE inaccessibility timing | Confirmed: up to 10 min; 5XX errors get a 24-hour buffer; 4XX errors make the database inaccessible after 30 min; recovery is automatic within one hour if access returns within 30 min; after that, restore the original key version, then Retry existing key and Validate key | Paragraph after the table |
| Server auditing re-architecture | Confirmed (auditing-overview, "July 2025 GA"): one server-level extended event session, a single `master` folder. The GPv2-behind-firewall rule is confirmed too | One sentence in the auditing paragraph |
| Public network access default | Confirmed (connectivity-settings): "The default … is Disable". Errors 47073, 42101 and 47072 confirmed | "Disable (default)" |
| VA express on SQL MI needs a system-assigned identity | Confirmed (sql-azure-vulnerability-assessment-overview, Dependencies row). Express settings: "SQL Security Manager or security admin (for new unified API)" | New "Dependency" row in the VA table |
| Microsoft support operations on MI | Confirmed (managed-instance/auditing-configure): it needs a separate server audit, because checking the box on an existing audit overwrites it and only support operations are logged. Learn's sample comment ("without OPERATOR_AUDIT ON") contradicts its code | Sentence after the `TO EXTERNAL_MONITOR` paragraph |

## Mock-exam bank questions changed

- `questions/data-networking/sc500-2a-acct-cli-hardening.yaml` (2.1.1). Since TLS 1.0/1.1 were retired on February 3, 2026, the requirement "Requests that use TLS 1.0 or TLS 1.1 must be rejected" is met by any slot value, so the TLS slot had three correct answers. The stem requirement became "The minimum TLS version of sttailspin must be set to the version that Microsoft recommends" (Learn: TLS 1.2). The correct explanation and the t11 explanation were updated, and the migrate-to-TLS-1.2 page was added as a second reference. Answer unchanged.
- `questions/identity/sc500-1c-iac-storage-bicep.yaml` (1.3.9). Same reason: "Clients must use TLS 1.2 or later" became "The minimum TLS version is set to the version that Microsoft recommends". The tls10/tls11 explanations ("would allow TLS 1.0 and later") were rewritten. Answer unchanged.
- `questions/data-networking/sc500-2a-sql-tde-statements.yaml` (2.2.1). The explanation said the protector "must be" RSA, and that AES keys "are only in preview". The BYOK page lists AES 128/192/256 for SQL Database without a preview label. Both explanations now say AES keys are supported for SQL Database only. Answer unchanged (c is still true, d about EC keys is still false).

## Checked and left unchanged

- `sc500-cs4a-user-consent` s2 already says "by using Microsoft Graph", so Yes is right. `sc500-1a-consent-workflow-reviewers`: option d's explanation ("a more privileged role must approve AppY") is consistent with "only Global Administrators can approve" and wasn't changed. A reviewer may want it to name Global Administrator.
- `sc500-1b-dkv-respond` (RBAC vault, remove the role assignment), `sc500-1c-bk-immutable-statements` (policy-based immutability stated in the stem), `sc500-1c-std-exempt-mitigated`, and `sc500-2a-fw-statements` (see above). `sc500-2a-def-cap` explanation (75 % and 100 % alerts, confirmed). `sc500-2b-ddb-va-express`, `sc500-2a-audit-support-ops` (SQL Database, not MI), and `sc500-2a-sql-tde-key-loss` (30-minute automatic recovery, consistent).
- `sc500-2b-ddb-plan-scope`: the stem ("without changing the plan types") and option a's explanation ("Select types is only needed to choose a subset") rely on a "Select types" link that no fetched Learn page mentions. Nothing on Learn contradicts it, so it wasn't changed. Check the portal.

## Quiz files

None changed. The five quizzes still agree with the corrected chapters (check-quiz 0/0). The quiz 11 q9 explanation already gives the Privileged Role Administrator / Global Administrator nuance.

## For a human decision

- **Regulatory compliance roles** (13): "Owner or Policy Contributor" (Assign standards page) vs "at a minimum Resource Policy Contributor and Security Admin" (dashboard page). No built-in Azure role is named "Policy Contributor". The chapter follows the more specific page.
- **TLS on Storage** (21): the configure page (updated 2026-10-26) still says an unset `MinimumTlsVersion` permits TLS 1.0+, which conflicts with the February 3, 2026 retirement. The chapter and two bank questions follow the retirement.
- **Key Vault secrets access scope** (12): "About Azure Key Vault secrets" says vault level only, while the RBAC guide allows two per-secret exceptions. The chapter follows the RBAC guide.
- **Exemption expiry** (13): optional in the Azure portal, mandatory in the Defender portal. exempt-resource also contradicts itself on whether mitigated exemptions raise the secure score.
- **"Select types"** in the Databases plan (22 and `sc500-2b-ddb-plan-scope`): check in the portal.
- **Backup security levels**: the QZ report saw a "(preview)" title. The current pages (security-overview, resiliency/security-levels-concept) have none, so the chapter is unchanged.

## French terms not settled (not in the glossary, or not decided)

- « score de sécurité » (Secure Score): still `undecided` in `content/glossary.yaml`. Existing chapter text kept it, and the new sentence in 13 uses it. « Cloud Secure Score » is kept in English (product name).
- New and not in the glossary: « identificateur de clé sans version » (versionless key identifier), « session d'événements étendus » (extended event session), « refonte » (re-architecture), « comptes v1 hérités » (legacy v1 accounts), « écart » (deviation).
- « flux de travail de consentement administrateur » (chapter 11) vs « workflow de consentement administrateur » (bank and quiz): not in the glossary, left as is.
