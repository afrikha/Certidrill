An AI back end needs two kinds of external settings: secrets (API keys, connection strings, passwords) and ordinary configuration (endpoints, model deployment names, thresholds, feature flags). Azure Key Vault holds the first, Azure App Configuration the second, and the code reaches both with a managed identity and `DefaultAzureCredential`, never with a credential written in code. Exam questions give a constraint (no secrets in code, rotation without redeployment, one setting shared by several apps, change a value without a restart) and ask for the service, the SDK call or the setting.

<!-- section: choose-store | objectives: 4.1.1, 4.1.2 -->
## Key Vault, App Configuration or app settings

| Requirement | Answer |
| --- | --- |
| Store an API key, a password or a connection string | Key Vault secret |
| Store an encryption key used for wrap, sign or encrypt operations | Key Vault key |
| Store a TLS certificate and renew it automatically | Key Vault certificate |
| Share non-secret settings between several apps and environments | App Configuration key-values with labels |
| Turn a feature on or off at run time without redeploying | App Configuration feature flag |
| A setting that belongs to one App Service app or one deployment slot | App Service app setting (environment variable) |
| A non-secret setting that must also point to a secret | App Configuration Key Vault reference |
| Avoid storing any credential at all | Managed identity with Microsoft Entra authentication to the target service |

App Configuration encrypts its data, but Microsoft states that Key Vault is still the best place for secrets: hardware-level encryption, granular access and management operations such as rotation. The two are used side by side.

> **Exam trap.** If the target service accepts Microsoft Entra authentication (Azure OpenAI in Foundry, Storage, Cosmos DB, Service Bus), the best answer is a managed identity with a data-plane role, not a key stored in Key Vault. Key Vault is the answer when a secret must exist.

<!-- section: key-vault-access | objectives: 4.1.1 -->
## Access to Key Vault: permission model and roles

A vault authorizes data-plane operations with one of two permission models: **Azure RBAC** or **vault access policies**. Starting with API version 2026-02-01, Azure RBAC is the default for new vaults. Switching an existing vault to RBAC invalidates every access policy, so assign the equivalent roles first. Microsoft recommends one vault per application and per environment, with roles assigned at the vault scope.

| Role (Azure RBAC model) | What it allows |
| --- | --- |
| Key Vault Secrets User | Read secret contents. The role for an application that only reads |
| Key Vault Secrets Officer | Any action on secrets except managing permissions (set, delete, update properties) |
| Key Vault Reader | Read metadata of the vault and its objects, **not** secret values |
| Key Vault Crypto Officer | Any action on keys, including the rotation policy |
| Key Vault Administrator | All data-plane operations on keys, secrets and certificates |
| Key Vault Purge Operator | Permanently delete soft-deleted vaults |
| Key Vault Contributor | Manage the vault resource (control plane). No access to secrets |

With access policies, the equivalent of Key Vault Secrets User is the **Get** permission on secrets (add **List** to enumerate them). Role assignments take several minutes to apply.

> **Exam trap.** Key Vault Reader and Key Vault Contributor can't read a secret value. The app's identity needs Key Vault Secrets User (or Get on secrets). Key Vault Contributor can, however, grant itself access through an access policy on a vault that uses that model.

<!-- section: retrieve-secrets | objectives: 4.1.1 -->
## Retrieving secrets in code

Install `azure-identity` and `azure-keyvault-secrets`. `DefaultAzureCredential` uses the managed identity in Azure and the developer's Azure CLI or environment credentials locally, so the same code runs everywhere.

```text
import os
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient
from azure.core.exceptions import ResourceNotFoundError

client = SecretClient(
    vault_url=os.environ["VAULT_URL"],  # https://kv-contoso-prod.vault.azure.net
    credential=DefaultAzureCredential(),
)

secret = client.get_secret("openai-api-key")              # latest version
print(secret.properties.version)
pinned = client.get_secret("openai-api-key", version="ec96f02080254f109c51a1f14cdb1931")

for props in client.list_properties_of_secrets():          # names and attributes, no values
    print(props.name, props.expires_on)

try:
    client.get_secret("missing-secret")
except ResourceNotFoundError as e:
    print(e.message)
```

| Method | Behavior |
| --- | --- |
| `get_secret(name)` | Latest version. Pass `version=` to read a specific one |
| `set_secret(name, value, expires_on=..., content_type=..., tags=...)` | Creates the secret, or a **new version** if the name exists |
| `update_secret_properties(name, enabled=False)` | Changes attributes only, never the value |
| `list_properties_of_secrets()` / `list_properties_of_secret_versions(name)` | Properties only, **no values** |
| `begin_delete_secret(name)` | Long-running operation (poller); deletes all versions |
| `begin_recover_deleted_secret(name)` / `purge_deleted_secret(name)` | Recover or permanently delete a soft-deleted secret |

The async client is in `azure.keyvault.secrets.aio` (with `azure.identity.aio`) and needs an async transport such as `aiohttp`.

**Throttling.** A vault accepts 4,000 "other" transactions (which include secret reads) per 10 seconds per region; a subscription-wide limit is five times the vault limit. Above that, Key Vault returns **HTTP 429**. Microsoft's guidance: cache secrets **in memory** and re-read only when the cached value stops working (for example after a rotation), retry 429 responses with exponential backoff, and never read the vault on every request.

The hosting platform can also resolve secrets for you, so the code only reads an environment variable:

| Platform | Syntax | Refresh of an unversioned reference |
| --- | --- | --- |
| App Service, Azure Functions | App setting `@Microsoft.KeyVault(SecretUri=https://kv1.vault.azure.net/secrets/db-password)` or `@Microsoft.KeyVault(VaultName=kv1;SecretName=db-password)` | Within 24 hours; any configuration change restarts the app and refetches at once |
| Azure Container Apps | Secret `keyvaultref:<secret URL>,identityref:<identity resource ID or system>`, then an environment variable that references the secret | Within 30 minutes; active revisions that use it are restarted |

Both use the app's managed identity (App Service: system-assigned by default, or the identity set in `keyVaultReferenceIdentity`), which needs Key Vault Secrets User. A URI that includes a version pins that version and never rotates.

> **Exam trap.** When an App Service Key Vault reference can't be resolved (missing role, deleted secret, syntax error), the app receives the literal string `@Microsoft.KeyVault(...)` as the value, not an error at startup. Check the reference status in the app settings or the Key Vault Application Settings Diagnostics detector.

<!-- section: rotate-secrets | objectives: 4.1.1 -->
## Rotating secrets

Rotation means writing a new **version** under the same secret name. Code that reads the latest version (no version in the call or in the reference) picks it up; code pinned to a version doesn't.

| Object | Automatic rotation |
| --- | --- |
| Key | Rotation policy: `Rotate` action after `timeAfterCreate` or before expiry, `Notify` action before expiry, minimum seven days. Needs Key Vault Crypto Officer |
| Certificate | Automatic renewal at a percentage of lifetime or a number of days before expiry |
| Secret | No rotation policy: an **Event Grid** event triggers an **Azure Functions** function that creates the new credential and calls `set_secret` |

Key Vault publishes these secret events to Event Grid (a subscription on the vault is required):

| Event type | Raised when |
| --- | --- |
| `Microsoft.KeyVault.SecretNearExpiry` | The current version expires in 30 days |
| `Microsoft.KeyVault.SecretExpired` | The current version has expired |
| `Microsoft.KeyVault.SecretNewVersionCreated` | A new version was written (use it to refresh caches) |

The near-expiry and expired events rely on the expiration date of the secret, so set one when you write it:

```bash
az keyvault secret set --vault-name kv-contoso-prod --name storageKey \
  --value "<key1 value>" --expires "2026-12-31T00:00:00Z" \
  --tags CredentialId=key1 ValidityPeriodDays=60
```

Two rotation patterns:

- **Single credential** (a database password): the function generates a new password, updates the database, then writes the new version. There is a short window during which clients holding the old value fail and must re-read the secret.
- **Dual credential** (services with two keys, such as a storage account `key1`/`key2`): each new version stores the **other** key after regenerating it. Clients keep a valid key for a full rotation cycle, so there is no downtime.

> **Exam tip.** "Rotate a secret automatically 30 days before it expires" = an expiration date on the secret + an Event Grid subscription to `SecretNearExpiry` + a function. "Rotate a key every 90 days" = a key rotation policy, with no code.

**Soft delete and purge protection.** Soft delete is on for every new vault and can't be disabled. Retention is 7 to 90 days (default 90), set only at creation. A deleted secret can only be listed, recovered or purged; creating a secret with the same name fails with a conflict until it is recovered or purged. **Purge protection** (off by default) blocks purging until the retention period ends. Purging needs the purge permission.

<!-- section: app-configuration-store | objectives: 4.1.2 -->
## App Configuration: key-values, labels and tiers

A store holds **key-values**. Keys are case-sensitive, can use any Unicode character except `%`, and are usually hierarchical with `:` or `/` (`Rag:Search:TopK`). A key-value, attributes included, is limited to 10 KB. A **label** creates a variant of the same key: one per environment (`Dev`, `Prod`) or per build version. A key-value without a label has the null label, written `\0` in filters. The optional **content type** marks JSON values (`application/json`), feature flags and Key Vault references. App Configuration also keeps the change history of every key-value and supports **snapshots** (an immutable set of key-values).

```bash
az appconfig kv set -n appcs-contoso --key Rag:Search:TopK --value 5 --label Prod
az appconfig kv set -n appcs-contoso --key Rag:Prompts --value '{"tone":"formal"}' --content-type application/json
az appconfig kv set-keyvault -n appcs-contoso --key Rag:OpenAiKey --label Prod \
  --secret-identifier https://kv-contoso-prod.vault.azure.net/secrets/openai-api-key
az appconfig kv import -n appcs-contoso -s file --path ./settings.json --format json --separator :
az appconfig kv list -n appcs-contoso --key "Rag:*" --label Prod --auth-mode login
```

The CLI uses `--auth-mode key` by default; `login` uses your Microsoft Entra sign-in.

| Tier | Storage | Request quota | SLA | Revision history | Geo-replication |
| --- | --- | --- | --- | --- | --- |
| Free | 10 MB | 1,000 requests per day | None | 7 days | No |
| Developer | 500 MB | 6,000 requests per hour | None | 7 days | No |
| Standard | 1 GB | 30,000 requests per hour | 99.9% (99.95% with geo-replication) | 30 days | Yes |
| Premium | 4 GB | No quota | 99.9% (99.99% with geo-replication) | 30 days | Yes |

Data-plane roles: **App Configuration Data Reader** (read key-values) and **App Configuration Data Owner** (read, write, delete). They don't grant access to the resource itself. Allow up to 15 minutes for a new assignment to apply. Owner and Contributor have no direct data access through Microsoft Entra ID, but they can read the access keys; disable access key authentication (enforced with Azure Policy) to close that path.

> **Exam trap.** A Key Vault reference in App Configuration stores only the URI of the secret. App Configuration never reads the vault: the **application** reads the secret, so the app's identity needs App Configuration Data Reader on the store **and** Key Vault Secrets User on the vault.

<!-- section: app-configuration-python | objectives: 4.1.2 -->
## Loading configuration in Python

The configuration provider package `azure-appconfiguration-provider` loads the store into a dictionary-like object (`azure-appconfiguration` is the lower-level client for individual key-values).

```text
import os
from azure.identity import DefaultAzureCredential
from azure.appconfiguration.provider import load, SettingSelector, WatchKey
from featuremanagement import FeatureManager

credential = DefaultAzureCredential()

config = load(
    endpoint=os.environ["AZURE_APPCONFIG_ENDPOINT"],   # https://appcs-contoso.azconfig.io
    credential=credential,
    selects=[
        SettingSelector(key_filter="Rag:*", label_filter="\0"),   # defaults
        SettingSelector(key_filter="Rag:*", label_filter="Prod"), # overrides: last selector wins
    ],
    trim_prefixes=["Rag:"],
    keyvault_credential=credential,          # resolves Key Vault references
    refresh_on=[WatchKey("Sentinel")],       # reload everything when Sentinel changes
    refresh_interval=60,                     # seconds; default 30
    feature_flag_enabled=True,               # feature flags aren't loaded by default
)

top_k = int(config["Search:TopK"])
features = FeatureManager(config)

def handle_request():
    config.refresh()                         # no-op until the interval has elapsed
    if features.is_enabled("SemanticRanker"):
        ...
```

| Option | Behavior to know |
| --- | --- |
| No `selects` | Loads all key-values with **no label** |
| Several selectors | Loaded in order; for the same key, the **last** selector wins |
| `trim_prefixes` | Removes the prefix from the keys exposed to the app |
| JSON content type | The value is deserialized: `config["Prompts"]["tone"]` |
| `keyvault_credential` / `keyvault_client_configs` / `secret_resolver` | Three ways to resolve Key Vault references; `secret_refresh_interval` re-reads secrets |
| `refresh_on=[WatchKey(...)]` | Watches only those keys; a change reloads **all** values at once. Sets `refresh_enabled` to `True` |
| `refresh()` | Must be called by the app (for example at each request); returns immediately before the interval |
| `feature_flag_enabled` | `False` by default; `feature_flag_refresh_enabled` monitors flags separately |
| `SettingSelector(snapshot_name=...)` | Loads a snapshot; can't be combined with key, label or tag filters |
| `startup_timeout` | 100 seconds by default; replica discovery is on by default |

The **sentinel key** pattern: change all the keys you need, then update `Sentinel` last. The app watches only that key, so it reloads a consistent set and sends fewer requests than watching every key.

> **Exam trap.** Updating a key-value doesn't change a running app until it calls `refresh()` and the refresh interval has elapsed, and, with `refresh_on`, until the watched sentinel key changes. No restart or redeployment is needed.

<!-- section: key-points -->
## Key points

- Secrets go to Key Vault, shared non-secret settings and feature flags to App Configuration; prefer a managed identity over any stored credential.
- The reading identity needs Key Vault Secrets User; Key Vault Reader and Contributor can't read values.
- `get_secret(name)` returns the latest version; `set_secret` adds a version; listings never return values.
- Cache secrets in memory and back off on HTTP 429.
- Unversioned references follow rotation: App Service within 24 hours, Container Apps within 30 minutes.
- Secret rotation = expiration date + `SecretNearExpiry` (30 days before) + Event Grid + function; keys have rotation policies.
- App Configuration: labels for environments, last selector wins, sentinel key plus `refresh()` for dynamic configuration, the app itself resolves Key Vault references.
