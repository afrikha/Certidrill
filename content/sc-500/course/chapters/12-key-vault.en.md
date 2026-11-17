Azure Key Vault keeps secrets, encryption keys and certificates out of code and configuration files. SC-500 tests the security decisions around it: the tier, the recovery settings that can never be turned off, the permission model, the network exposure, the life cycle of each object, and the two Defender for Cloud capabilities that find leaked secrets and watch the vaults.

<!-- section: deploy | objectives: 1.2.1 -->
## Deploying a key vault

| Option | Choose it when |
| --- | --- |
| Key vault, **Standard** tier | Secrets, certificates and software-protected keys (FIPS 140 Level 1 validated software) |
| Key vault, **Premium** tier | Keys must be **HSM-protected** (RSA-HSM, EC-HSM), generated and kept in FIPS 140-3 Level 3 validated HSMs; they never leave the HSM boundary |
| **Managed HSM** | A separate resource type: a single-tenant HSM pool for keys only, with its own local role-based access control |

Design rules: one vault **per application, per environment** (development, preproduction, production) and per region. A vault shared by several teams exposes every secret to whoever administers it.

```bash
az keyvault create --name kv-orders-prod-weu --resource-group rg-orders-prod \
  --location westeurope --sku premium \
  --enable-rbac-authorization true \
  --retention-days 90 --enable-purge-protection true \
  --public-network-access Disabled
```

- `--enable-rbac-authorization` defaults to `true` in the Azure CLI, and from REST API version **2026-02-01** Azure RBAC is the default permission model for new vaults.
- `--retention-days` (7 to 90, default 90) can be set **only at creation**.
- Deploying a vault (control plane) requires **Key Vault Contributor** or Contributor on the resource group.

<!-- section: vault-settings | objectives: 1.2.2 -->
## Key vault settings

| Setting | Behavior |
| --- | --- |
| **Soft delete** | On for every new vault and **can't be disabled**. A deleted vault or object stays recoverable for the retention period; its name can't be reused meanwhile |
| **Purge protection** | Optional, off by default. Once on, **nobody, not even Microsoft, can turn it off or purge** before the retention period ends. Required by services that use your keys for encryption, such as Azure Storage customer-managed keys |
| Access configuration | Permission model (Azure RBAC or vault access policy) and resource access: `--enabled-for-deployment` (VMs retrieve certificates stored as secrets), `--enabled-for-disk-encryption` (Azure Disk Encryption), `--enabled-for-template-deployment` (Resource Manager retrieves secrets during deployments) |
| Networking | Firewall and private endpoints (see below) |
| Diagnostic settings | Send the **AuditEvent** logs to a Log Analytics workspace, a storage account or an event hub to see who accessed what |
| Events | Event Grid events such as `Microsoft.KeyVault.SecretNearExpiry` or `Microsoft.KeyVault.CertificateNearExpiry` trigger rotation workflows |

Recovery: in the portal, **Key vaults > Manage deleted vaults** (or **Manage deleted** on the Secrets, Keys or Certificates page) offers **Recover** or **Purge**. Recovering a vault requires Key Vault Contributor; purging requires the **Key Vault Purge Operator** role or subscription Owner. A recovered vault doesn't get back its role assignments or Event Grid subscriptions.

```bash
az keyvault update --name kv-orders-prod-weu --enable-purge-protection true
az keyvault secret recover --vault-name kv-orders-prod-weu --name sql-password
az keyvault recover --name kv-legacy-dev
```

> **Exam trap.** Soft delete protects against **accidental** deletion only: without purge protection, an attacker with purge permission deletes then purges. "Deleted keys must remain recoverable even by a malicious administrator" means **purge protection**, and it is irreversible.

<!-- section: vault-access | objectives: 1.2.3 -->
## Access to Key Vault

Two planes, always authenticated by Microsoft Entra ID:

| Plane | Endpoint | Authorization |
| --- | --- | --- |
| Control (management) plane | `management.azure.com` | Azure RBAC only: create the vault, change its settings, firewall, tags |
| Data plane | `<vault-name>.vault.azure.net` | Azure RBAC (recommended) **or** vault access policies: read secrets, use keys, manage certificates |

Data plane roles (Azure RBAC permission model):

| Role | Allows |
| --- | --- |
| Key Vault Administrator | All data plane operations on all objects; no role assignments, no vault management |
| Key Vault Secrets Officer / Secrets User | Manage secrets / read secret contents (including the private key of a certificate) |
| Key Vault Crypto Officer / Crypto User | Manage keys (including rotation policy) / use keys for cryptographic operations |
| Key Vault Crypto Service Encryption User | Read key metadata, wrap and unwrap: the role for a service's managed identity using a customer-managed key |
| Key Vault Certificates Officer / Certificate User | Manage certificates / read whole certificate contents |
| Key Vault Reader | Metadata only, never secret values or key material |
| Key Vault Data Access Administrator | Assign the Key Vault data roles only (constrained by a condition) |
| Key Vault Contributor | Control plane only: manages vaults, no data access, no role assignments |

- Assign roles at the **vault** scope. Assign on an individual secret only for a secret used by one person or shared by several applications.
- With **access policies**, permissions (Get, List, Set, Delete, Recover, Backup, Restore, Purge...) are set per principal for each object type, at vault level only. Any **Contributor** on the vault can write an access policy and grant **itself** data access.
- **Switching** to Azure RBAC requires `Microsoft.Authorization/roleAssignments/write` (Owner, or User Access Administrator plus Key Vault Contributor) and invalidates every access policy at once: assign the equivalent roles first.

> **Exam trap.** Owner and Contributor don't read secrets in a vault that uses Azure RBAC: they need a data role. In a vault that uses access policies, they can't read secrets either, but they can grant themselves an access policy that does.

<!-- section: vault-firewall | objectives: 1.2.4 -->
## Key Vault firewall and private access

| Setting (Networking > Firewalls and virtual networks) | Effect |
| --- | --- |
| Allow public access from all networks | Any network; Entra authentication and authorization still apply |
| Allow public access from specific virtual networks and IP addresses | Only listed subnets (with the `Microsoft.KeyVault` service endpoint) and public IPv4 addresses or CIDR ranges |
| Disable public access | Private endpoints only |
| Exception: **Allow trusted Microsoft services to bypass this firewall** | Listed trusted services (for example Azure Backup, Azure Disk Encryption, Resource Manager template deployment) still reach the vault, even with public access disabled. Services not on the list, such as Azure DevOps, are blocked |

- Limits: 200 virtual network rules and 1,000 IPv4 rules. No IPv6, no private RFC 1918 ranges in IP rules.
- Changes take up to 15 minutes.
- Firewall rules restrict the **data plane** only. The portal is a data plane client: an administrator outside the allowed networks opens the vault but can't list its secrets.
- A **private endpoint** gives the vault a private IP in your virtual network, with the zone `privatelink.vaultcore.azure.net`. The public name still resolves; disabling public access is what blocks the internet.
- A **network security perimeter** in Enforced mode overrides `publicNetworkAccess` and also blocks trusted services unless a perimeter rule admits them; Transition mode only logs.

```bash
az keyvault network-rule add --name kv-orders-prod-weu --ip-address 203.0.113.0/24
az keyvault network-rule add --name kv-orders-prod-weu --vnet-name vnet-app --subnet snet-web
az keyvault update --name kv-orders-prod-weu --default-action Deny --bypass AzureServices
```

> **Exam tip.** "Only the application subnet, no internet exposure, and Azure Backup must keep working" is a private endpoint, public access disabled, and the trusted services exception left on.

<!-- section: keys-secrets-certificates | objectives: 1.2.5 -->
## Managing keys, secrets and certificates

| Object | What to know |
| --- | --- |
| **Secret** | Up to 25 KB, optional content type (255 characters), versions. `exp` and `nbf` are informational: a get still returns an expired secret. Disable a version to block it |
| **Key** | RSA or EC, software-protected or HSM-protected (Premium). Operations: encrypt, decrypt, sign, verify, wrap, unwrap. The private key is never exported from an HSM |
| **Certificate** | Creating one also creates a key and a secret with the same name. The **certificate policy** holds subject, key type, exportable or not, issuer, and **lifetime actions** |

**Key rotation policy** (Key Vault Crypto Officer): rotate automatically a given time after creation or before expiry (minimum 7 days), set the new version's expiry, and raise a near-expiry event. Services such as Azure Storage and Azure SQL TDE use a **versionless key URI** and pick up the new version automatically. Rotation rewraps data encryption keys; it doesn't re-encrypt data.

```json
{
  "lifetimeActions": [
    { "trigger": { "timeAfterCreate": "P18M" }, "action": { "type": "Rotate" } },
    { "trigger": { "timeBeforeExpiry": "P30D" }, "action": { "type": "Notify" } }
  ],
  "attributes": { "expiryTime": "P2Y" }
}
```

```bash
az keyvault key rotation-policy update --vault-name kv-orders-prod-weu \
  --name cmk-storage --value policy.json
```

**Certificates**: lifetime actions trigger at a number of days before expiry or a percentage of the lifetime, and either **AutoRenew** (with an integrated CA: **DigiCert** or **GlobalSign**, or self-signed) or **EmailContacts** (any other CA: renew manually). Certificate contacts are shared by all certificates of the vault. Only an **exportable** RSA or EC key lets you download the PFX or PEM with its private key.

**Secrets** have no built-in rotation: subscribe to `SecretNearExpiry` with Event Grid and run a function that creates the new version in the vault and in the target service.

> **Exam trap.** A certificate from a non-integrated CA can't renew itself: Key Vault only emails the contacts. "Renew automatically without any manual step" means an integrated issuer or a self-signed certificate.

<!-- section: secrets-scanning | objectives: 1.2.6 -->
## Scanning for secrets with Defender CSPM

Secrets left in plaintext (connection strings, SSH private keys, storage SAS tokens, Entra client secrets, personal access tokens) let an attacker move laterally. Defender for Cloud finds them **agentlessly**:

| Scan | Finds secrets in | Plan |
| --- | --- | --- |
| Machine scanning | Disk snapshots of Azure VMs, AWS EC2 instances, GCP VM instances | **Defender CSPM** or **Defender for Servers Plan 2** |
| Cloud deployment scanning | Infrastructure-as-code deployment resources across clouds | Defender CSPM |
| Code repository scanning | Azure DevOps repositories | Defender CSPM |

- No agent, no network connectivity and no performance impact: the scanner reads snapshots through cloud APIs.
- Findings appear in the **asset inventory**, as recommendations under the **Remediate vulnerabilities** control (*Machines should have secrets findings resolved*; *EC2 instances should have secrets findings resolved*; *VM instances should have secrets findings resolved*), in **cloud security explorer** queries (for example "VM with plaintext secret that can authenticate to a storage account") and in **attack paths** from an exposed VM to a storage account or SQL server.
- Viewing findings requires Security Reader, Security Admin, Reader, Contributor or Owner.

Remediation: remove the secret from the machine or template, store it in Key Vault, give the workload a managed identity, rotate the exposed credential, and prefer short-lived credentials (a short SAS rather than a storage connection string).

> **Exam trap.** Defender for Servers **Plan 1** doesn't scan for secrets. If the subscription has Plan 1 and no Defender CSPM, enabling the scan means upgrading to Plan 2 or enabling Defender CSPM.

<!-- section: defender-key-vault | objectives: 1.2.7 -->
## Microsoft Defender for Key Vault

**Defender for Key Vault** is the workload protection plan that detects unusual and potentially harmful attempts to access or exploit key vaults, from Key Vault activity, without any agent. Enable it on the subscription (**Defender for Cloud > Environment settings >** subscription **> Defender plans > Key Vault: On**); the recommendation *Microsoft Defender for Key Vault should be enabled* flags subscriptions where it is off.

An alert identifies the object ID, and the user principal name or the IP address of the source (no object ID for traffic from outside Azure, no UPN when an application accessed the vault), with the list of secrets accessed and when.

Response, in order:

1. Identify the source; don't dismiss an alert just because you recognize the user or the application.
2. Contain: for an unrecognized source, enable the Key Vault firewall and allow only trusted networks; for an unauthorized application or user, remove its role assignment or access policy.
3. Measure the impact from the accessed secrets and timestamps, and the diagnostic logs.
4. Rotate the affected secrets, keys and certificates, and disable or delete the compromised versions.

> **Exam tip.** Alerts need a plan; logs need diagnostic settings. "Be alerted when a vault is accessed from a suspicious location" is Defender for Key Vault. "Keep a record of every secret read for one year" is a diagnostic setting sending AuditEvent to a Log Analytics workspace.

<!-- section: key-points -->
## Key points

- Premium for HSM-protected keys; one vault per application and environment; retention days fixed at creation.
- Soft delete is always on; purge protection is optional and irreversible, and required for customer-managed keys.
- Use the Azure RBAC permission model; Key Vault Contributor manages vaults but reads nothing; switching invalidates access policies.
- The firewall protects the data plane; private endpoint plus disabled public access; trusted services exception for Azure services.
- Rotation policies for keys, lifetime actions for certificates, Event Grid near-expiry events for secrets.
- Agentless secrets scanning: Defender CSPM or Defender for Servers Plan 2. Defender for Key Vault raises alerts on suspicious access.
