Automation needs passwords, keys, certificates and signing files, and every copy of them in YAML, a log or an agent disk is a leak waiting to happen. The exam asks where to store each kind of secret, how a pipeline gets it without storing a credential, and which setting stops it from leaking.

<!-- section: key-vault | objectives: 4.2.1 -->
## Secrets, keys and certificates in Azure Key Vault

| Object | Holds | Typical DevOps use |
| --- | --- | --- |
| Secret | Any value up to 25 KB: password, connection string, API key | Pipeline variables, app settings through Key Vault references |
| Key | RSA or EC key; software-protected (Standard) or HSM-protected (Premium) | Encryption with customer-managed keys, signing |
| Certificate | X.509 certificate with its key and policy; the private part is readable as a secret | TLS for App Service or Application Gateway, code signing |

**Access model.** Data plane access uses Azure RBAC or the legacy access policies. Starting with API version 2026-02-01, Azure RBAC is the default for new vaults. Recommended pattern: one vault per application per environment, roles assigned at vault scope (assignments on individual secrets are discouraged).

| Role | Allows |
| --- | --- |
| Key Vault Secrets User | Read secret contents: the role for a pipeline identity or an app |
| Key Vault Secrets Officer | Any action on secrets except permissions |
| Key Vault Certificate User / Certificates Officer | Read whole certificates / manage certificates |
| Key Vault Crypto User / Crypto Officer | Use keys for cryptographic operations / manage keys |
| Key Vault Reader | Metadata only, never secret values |
| Key Vault Administrator | All data plane operations; no role assignment |
| Key Vault Contributor | Control plane only (the vault resource), no data access |

> **Exam trap.** Key Vault Contributor doesn't read secrets, but on a vault using access policies it can grant itself access by editing the policies. With the RBAC model, data access requires a data role such as Key Vault Secrets User.

**Protection.** Soft delete is always on: deleted vaults and objects stay recoverable for 7 to 90 days (default 90), set at creation and not changeable. **Purge protection** (optional, can't be disabled once on) prevents anyone from purging before the retention ends. A soft-deleted vault name can't be reused until it's purged or expires. Purging needs the Key Vault Purge Operator role (or subscription owner for a vault).

**Rotation.** Give secrets an expiration date and rotate them: Key Vault publishes near-expiry and expiry events to Event Grid (trigger an Azure Function that rotates), keys support an automatic rotation policy, and certificates from an integrated CA renew automatically. Applications read the latest version by name, so rotation needs no redeployment.

**Network.** If the vault firewall blocks public access, a Microsoft-hosted agent or GitHub-hosted runner can't reach it (Microsoft-hosted agents aren't Key Vault trusted services): use a self-hosted agent or runner in a network allowed through a private endpoint or the firewall. A variable group linked to the vault is queried from the Azure DevOps public IP addresses, so the firewall must also allow the Azure DevOps IP ranges of the organization's geography. To avoid opening the vault to Azure DevOps, read the secrets with AzureKeyVault@2 on a self-hosted agent whose virtual network is allowed.

In Azure Pipelines, two ways to read secrets:

```yaml
variables:
  - group: vg-contoso-prod-kv   # variable group linked to a key vault

steps:
  - task: AzureKeyVault@2
    inputs:
      azureSubscription: 'sc-contoso-prod-wif'
      KeyVaultName: 'kv-contoso-prod'
      SecretsFilter: 'SqlPassword,ApiKey'
      RunAsPreJob: false
  - script: ./deploy.sh
    env:
      SQL_PASSWORD: $(SqlPassword)
```

| | Variable group linked to Key Vault | AzureKeyVault@2 task |
| --- | --- | --- |
| Configured in | Pipelines > Library, shared by many pipelines | The pipeline YAML |
| Secret list | Chosen secret names; new vault secrets must be added to the group | `SecretsFilter` (`*` for all) |
| Values | Fetched at run time, always the latest | Fetched when the task runs |
| Supports | Secrets only (not keys or certificates) | Secrets |

Both need an Azure Resource Manager service connection whose identity has **Get** and **List** on secrets (access policies) or **Key Vault Secrets User** (RBAC).

<!-- section: secretless | objectives: 4.2.2 -->
## Secrets and secretless authentication in GitHub Actions and Azure Pipelines

**GitHub Actions secrets** exist at three levels:

| Level | Limit | Note |
| --- | --- | --- |
| Organization | 1,000 | Created by organization owners; access policy: all, private or selected repositories |
| Repository | 100 | Available to every workflow of the repository |
| Environment | 100 | Readable only by jobs that reference the environment, after its protection rules (required reviewers, wait timer, branches) pass |

A secret is at most 48 KB; names use letters, digits and `_`, don't start with a digit or `GITHUB_`. When the same name exists at several levels, the lowest level wins (environment, then repository, then organization). Secrets can't be referenced directly in `if:`: set the secret as a job-level environment variable and test that variable in the condition. Secrets aren't passed to workflows triggered by Dependabot or from forks (except GITHUB_TOKEN), nor automatically to reusable workflows: the calling workflow passes only the secrets the reusable workflow needs, explicitly.

```bash
gh secret set SQL_PASSWORD --env production
gh secret set NPM_TOKEN --org contoso --repos api,web
```

**Secretless authentication with OpenID Connect.** The workflow asks GitHub for an OIDC token and exchanges it with Microsoft Entra ID through a federated credential on an app registration or a user-assigned managed identity. The client, tenant and subscription IDs aren't secrets, but storing them as secrets keeps them out of logs.

```yaml
permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - run: az webapp list --resource-group rg-web --output table
```

The federated credential's subject must match the job exactly (no wildcards for branches and tags):

| Job | Subject |
| --- | --- |
| References environment `production` | `repo:contoso/web:environment:production` |
| Runs on branch `main`, no environment | `repo:contoso/web:ref:refs/heads/main` |
| Runs on tag `v1.0` | `repo:contoso/web:ref:refs/tags/v1.0` |
| Triggered by `pull_request` | `repo:contoso/web:pull_request` |

Issuer `https://token.actions.githubusercontent.com`, audience `api://AzureADTokenExchange`. A mismatch fails the token exchange without a useful error.

> **Exam trap.** A job that declares `environment: production` presents the environment subject, not the branch subject. If the credential was created for `ref:refs/heads/main`, login fails even on `main`.

**Azure Pipelines** has three places for secrets: secret variables in the pipeline settings (scoped to that pipeline), variable groups in the Library (shared, with Library security and pipeline permissions), and variable groups linked to Key Vault. Secret variables are encrypted at rest, masked in logs and **not** decrypted into environment variables: map them with `env:`. For Azure, use an Azure Resource Manager service connection with **workload identity federation**: no secret to rotate. `AzureCLI@2` with `addSpnToEnvironment: true` exposes `servicePrincipalId`, `tenantId` and either `servicePrincipalKey` or, with workload identity federation, the federation token `idToken` to the script, without storing them.

| Requirement | Answer |
| --- | --- |
| GitHub workflow deploys to Azure, no stored credential | OIDC: `id-token: write`, federated credential, `azure/login` |
| Azure Pipelines deploys to Azure, no secret to rotate | Service connection with workload identity federation |
| Production secret readable only after an approval (GitHub) | Environment secret with required reviewers |
| Same third-party API key in 40 repositories | Organization secret with selected repositories |
| Secret shared by ten Azure pipelines and rotated in Key Vault | Variable group linked to Key Vault |

<!-- section: secure-files | objectives: 4.2.3 -->
## Sensitive files during deployment: secure files

A signing certificate, an Apple provisioning profile, an Android keystore, an SSH key or a license file must never be committed. In Azure Pipelines, upload it to **Pipelines > Library > Secure files**:

- encrypted at rest on the server, at most **10 MB** per file;
- usable only from a pipeline task;
- YAML pipelines must be **authorized** on the file (Pipeline permissions, or Open access for all pipelines); approvals and checks can be added;
- Library roles: Reader, User (consume in pipelines), Creator, Administrator (the uploader).

```yaml
steps:
  - task: DownloadSecureFile@1
    name: signingCert
    inputs:
      secureFile: 'contoso-codesign.pfx'
  - script: ./sign.sh "$(signingCert.secureFilePath)"
    env:
      CERT_PASSWORD: $(CertPassword)
```

The file is downloaded to `$(Agent.TempDirectory)`, its path is in the output variable `secureFilePath`, and it's deleted when the job ends, whether it succeeds, fails or is canceled. Keep its password in a secret variable or Key Vault, not next to it.

| Need | Answer |
| --- | --- |
| Certificate or keystore used by a build task | Secure file + DownloadSecureFile@1 |
| TLS certificate used by an Azure service | Key Vault certificate, referenced by the service |
| Small binary in GitHub Actions | Base64-encoded secret (48 KB limit), decoded on the runner |
| File larger than 48 KB in GitHub Actions | Encrypt with `gpg`, commit the encrypted file, store the passphrase as a secret |

> **Exam trap.** A secure file isn't a variable: referencing it by name in a script does nothing until DownloadSecureFile@1 has run, and a YAML pipeline that isn't authorized on the file waits for permission.

<!-- section: prevent-leakage | objectives: 4.2.4 -->
## Designing pipelines that don't leak

Masking is best effort. Azure Pipelines and GitHub mask registered secret values in logs, but never substrings, and they can't recognize a secret that was transformed (Base64, JSON, URL encoding).

| Risk | Control |
| --- | --- |
| Secret printed by a script | Never echo secrets; map to environment variables instead of command-line arguments |
| Value obtained at run time (a generated token) | Register it: `::add-mask::VALUE` (GitHub), `##vso[task.setvariable variable=token;issecret=true]` (Azure Pipelines) |
| Structured secret (JSON) partially unmasked | One secret per value |
| Fork pull request steals secrets | GitHub: secrets aren't sent to fork workflows, avoid `pull_request_target` with a checkout of the fork code. Azure Pipelines: keep **Make secrets available to builds of forks** off, require a team member's comment; organization or project control **Limit building pull requests from forked GitHub repositories** (disable, securely build, or customize rules) |
| Script injection from a pull request title or branch name | Pass `${{ github.event... }}` through an `env:` variable, never inline in `run:` |
| Compromised third-party action | Pin actions to a full commit SHA; restrict allowed actions |
| Self-hosted runner in a public repository | Use hosted runners for untrusted code |
| Pipeline token reaches other projects | **Limit job authorization scope** to the current project; **Protect access to repositories in YAML pipelines** |
| Queue-time override of a variable | **Limit variables that can be set at queue time**; mark only intended variables settable |
| Secret pushed in code | Secret scanning with push protection |
| Azure CLI prints a key | `--output none` on commands that return secrets |

```yaml
- bash: |
    TOKEN=$(./get-token.sh)
    echo "##vso[task.setvariable variable=apiToken;issecret=true]$TOKEN"
  displayName: Get token
- bash: ./call-api.sh
  env:
    API_TOKEN: $(apiToken)
```

```yaml
- name: Check title
  env:
    TITLE: ${{ github.event.pull_request.title }}
  run: |
    echo "::add-mask::$(cat token.txt)"
    [[ "$TITLE" =~ ^[A-Z]+-[0-9]+ ]] || exit 1
```

> **Exam tip.** "Secret appears in logs" questions are answered by changing how the secret flows (environment variable, issecret, add-mask, one value per secret), not by deleting logs. Rotate any secret that has already leaked.

<!-- section: key-points -->
## Key points

- Key Vault: secrets, keys, certificates; RBAC default from API 2026-02-01; Key Vault Secrets User for pipelines; soft delete 7–90 days; purge protection is permanent.
- Azure Pipelines reads Key Vault with a linked variable group (secrets only, latest values) or AzureKeyVault@2.
- GitHub secrets: organization, repository, environment; lowest level wins; 48 KB; environment secrets wait for protection rules.
- Secretless: OIDC with `id-token: write` in GitHub, workload identity federation service connections in Azure Pipelines; the subject must match exactly.
- Secure files: 10 MB, authorized per pipeline, DownloadSecureFile@1, deleted after the job.
- Secret variables must be mapped with `env:`; masking is best effort; protect fork builds, pin actions and restrict job scope.
