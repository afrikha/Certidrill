An AI back end is usually shipped as a container image: a Python API that calls a model, an embedding worker, a retrieval service. This chapter covers where the image lives (Azure Container Registry), how it is built in Azure without a local Docker engine (ACR Tasks) and how App Service runs it with its settings and secrets. Exam questions ask for the command, the YAML property or the setting that meets a constraint such as "no credentials in the pipeline", "rebuild when the base image is patched" or "no secret in the code".

<!-- section: acr-registry | objectives: 1.1.1 -->
## Storing and versioning images in Azure Container Registry

A registry has a login server `<registry>.azurecr.io`. An image is addressed as `<registry>.azurecr.io/<repository>:<tag>` or, immutably, by its manifest digest `<repository>@sha256:<digest>`. Repositories can be namespaced (`rag/api`, `rag/indexer`).

| Tier | Included storage | What only this tier adds |
| --- | --- | --- |
| Basic | 10 GiB | Entry level, lowest throughput; no artifact cache, no anonymous pull |
| Standard | 100 GiB | Same features as Basic with more storage and throughput, plus artifact cache and anonymous pull |
| Premium | 500 GiB | Geo-replication, private endpoints, dedicated data endpoints, IP access rules, customer-managed keys, connected registries, artifact streaming, retention policy for untagged manifests, dedicated agent pools for Tasks |

You can change the tier at any time without downtime (`az acr update --name crcontoso --sku Premium`); to go down from Premium, first delete geo-replications and connected registries. Zone redundancy is enabled by default in supported regions for every tier.

**Push and pull from a workstation or a pipeline:**

```bash
az acr login --name crcontoso
docker build -t crcontoso.azurecr.io/rag/api:1.4.0 .
docker push crcontoso.azurecr.io/rag/api:1.4.0

# Copy a public or partner image into the registry without docker pull/push
az acr import --name crcontoso \
  --source docker.io/library/python:3.12-slim --image base/python:3.12-slim

az acr repository list --name crcontoso --output table
az acr repository show-tags --name crcontoso --repository rag/api --output table
```

The token obtained by `az acr login` is valid for **3 hours**. Without a Docker daemon (a build agent that only runs Azure CLI), use `az acr login --name crcontoso --expose-token` and pass the token to `docker login` with the user name `00000000-0000-0000-0000-000000000000`.

**Authentication options:**

| Option | Use it for | Limits |
| --- | --- | --- |
| Microsoft Entra identity (`az acr login`) | Developers pushing and pulling | Token renewed every 3 hours |
| Managed identity with a role | Azure services that pull (App Service, Container Apps, AKS) or pipelines on Azure | Only services that support managed identities |
| Service principal with a role | Unattended CI/CD outside Azure | Secret to rotate (1 year by default) |
| Admin user | Quick tests by one person | **Disabled by default**; full push and pull, no role-based scoping |
| Repository-scoped token | Pull or push limited to some repositories, outside Microsoft Entra ID | Not integrated with Microsoft Entra RBAC |

Roles: **AcrPull** (pull) and **AcrPush** (push and pull) on the registry. A registry in the **RBAC Registry + ABAC Repository Permissions** mode (available on every tier) uses the repository roles instead, which accept conditions limiting them to some repositories: **Container Registry Repository Reader** (pull), **Container Registry Repository Writer** (push, no delete), **Container Registry Repository Contributor** (also delete). **Container Registry Tasks Contributor** manages tasks and `az acr build` / `az acr run` without any data access.

**Tagging strategy:**

| Tag kind | Example | Use |
| --- | --- | --- |
| Stable tag | `python:3.12`, `rag/api:1` | Base images: the tag keeps receiving patches |
| Unique tag | `rag/api:1.4.0-7f3c2a1`, build ID | **Deployments**: every node and every restarted replica pulls exactly the same image |
| Digest | `rag/api@sha256:...` | Absolutely immutable reference, but hard to read and uncorrelated with the build |

> **Exam trap.** Deploying `:latest` or another stable tag means that a scale-out or a restart can pull a different image from the one already running. The answer to "all instances must run the same build" is a unique tag (or the digest), not `latest`.

When a stable tag is pushed again, the previous image becomes an **untagged manifest**: it still uses storage and can still be pulled by digest.

**Managing the content:**

```bash
# Lock a deployed image: no overwrite, no delete
az acr repository update --name crcontoso --image rag/api:1.4.0 --write-enabled false

# Allow updates but block deletion of a whole repository
az acr repository update --name crcontoso --repository rag/api \
  --delete-enabled false --write-enabled true

# Premium (preview): delete untagged manifests 30 days after they are untagged
az acr config retention update --registry crcontoso \
  --status enabled --days 30 --type UntaggedManifests

# Any tier (preview): purge tags older than 7 days, and untagged manifests
az acr run --registry crcontoso \
  --cmd "acr purge --filter 'rag/api:.*' --ago 7d --untagged" /dev/null
```

| Need | Answer |
| --- | --- |
| Protect the image in production from an accidental push or delete | `az acr repository update ... --write-enabled false` |
| Delete untagged manifests automatically, Premium registry | Retention policy (0 to 365 days, 7 by default); applies only to manifests untagged after it is enabled |
| Clean old tags on a schedule, any tier | `acr purge` in a scheduled task; test first with `--dry-run` |
| Systems pull by digest | Don't purge or expire untagged manifests: their images would disappear |

> **Exam trap.** Without `--untagged`, `acr purge` deletes only the tags; the manifests and layers stay and keep using storage. Locked images (`write-enabled` or `delete-enabled` false) are skipped unless you add `--include-locked`. Deleted image data can't be recovered.

<!-- section: acr-tasks | objectives: 1.1.2 -->
## Building and running images with ACR Tasks

ACR Tasks builds and runs containers **in Azure**: no Docker engine on the developer machine or on the pipeline agent, and the image lands directly in the registry.

| Task type | Command | When |
| --- | --- | --- |
| Quick task | `az acr build` | One build and push, on demand ("docker build + docker push in the cloud") |
| Quick run of a YAML file | `az acr run -f <file>.yaml <context>` | One multi-step run, on demand |
| Triggered task | `az acr task create` | Automatic runs on a source commit, a base image update or a schedule |

```bash
# Quick task: send the local folder as context, build and push
az acr build --registry crcontoso --image rag/api:1.4.0 .

# Build for another platform (default Linux/amd64)
az acr build --registry crcontoso --image rag/api:1.4.0-arm64 \
  --platform linux/arm64/v8 .
```

The **context** can be a local folder, a Git repository URL (`https://github.com/contoso/rag-api.git#main:src`, branch then subfolder), an Azure Repos URL, a remote tarball or an OCI artifact. Supported platforms: Linux (amd64, arm, arm64, 386) and Windows (amd64).

**Triggers of a task:**

| Trigger | Behavior |
| --- | --- |
| Source code commit | Enabled by default on a GitHub or Azure Repos context; needs a personal access token (`repo` scope for a private GitHub repository). Not supported for GitHub Enterprise. Pull request trigger: off by default |
| Base image update | Rebuilds the application image when its base image is updated in the registry or in a public registry such as Docker Hub |
| Timer | Cron expression `{minute} {hour} {day} {month} {day-of-week}` in **UTC**, no seconds field; several timers per task allowed if their schedules differ |

```bash
# Rebuild on every commit to main, and on base image updates
az acr task create --registry crcontoso --name build-rag-api \
  --context https://github.com/contoso/rag-api.git#main \
  --file Dockerfile --image rag/api:{{.Run.ID}} \
  --git-access-token $GIT_PAT

# Nightly run at 02:30 UTC without any source context
az acr task create --registry crcontoso --name nightly-purge \
  --cmd "acr purge --filter 'rag/.*:.*' --ago 30d --untagged" \
  --schedule "30 2 * * *" --context /dev/null

az acr task timer add --registry crcontoso --name build-rag-api \
  --timer-name weekly --schedule "0 4 * * Sun"
az acr task run --registry crcontoso --name build-rag-api
az acr task logs --registry crcontoso --name build-rag-api
```

Manual runs stream their log to the console; automatic runs only store it (portal or `az acr task logs`).

**Multi-step tasks** are YAML files that chain `build`, `push` and `cmd` steps; each `cmd` step runs a container, so a task can build an image, run its tests, then push it only if the tests passed:

```yaml
version: v1.1.0
stepTimeout: 900
steps:
  - id: build
    build: -t $Registry/rag/api:$ID -f Dockerfile .
  - id: test
    cmd: $Registry/rag/api:$ID python -m pytest
    when: ["build"]
  - id: push
    push:
      - $Registry/rag/api:$ID
    when: ["test"]
```

| Element | Meaning |
| --- | --- |
| `build` | Like `docker build`; the image is **not pushed** until a `push` step |
| `push` | Pushes one or more built or retagged images |
| `cmd` | Runs a container (an image without registry prefix comes from Docker Hub) |
| `when` | Dependencies on step ids; `["-"]` = start immediately, in parallel |
| `$Registry`, `$ID`, `$Date`, `$Commit`, `$Branch` | Aliases of the run variables `{{.Run.Registry}}`, `{{.Run.ID}}`... |
| `stepTimeout` / `timeout` | Seconds per step, **600 by default** |
| `secrets` | Values read from Key Vault at run time with a managed identity, instead of command-line arguments |

> **Exam trap.** Anything passed on the command line or in a context URL can appear in ACR diagnostic traces, tokens included. Keep secrets in the task's `secrets` (Key Vault) or in its managed identity, not in command-line arguments or URLs.

> **Exam tip.** Task runs are temporarily paused for subscriptions running on Azure free credits. If a scenario's task never starts on such a subscription, that is the cause, not the YAML.

<!-- section: app-service-containers | objectives: 1.1.3 -->
## Running containers on Azure App Service

App Service runs a Linux custom container from a registry and adds what a web API needs: TLS, custom domains, deployment slots, authentication and autoscale of the plan. It suits **one HTTP container** (plus optional sidecars), not event-driven scaling to zero.

**Pulling from ACR with a managed identity**, the recommended method for Linux and Windows containers (a service principal is no longer supported for Windows container image pull):

```bash
az webapp identity assign --resource-group rg-rag --name app-rag-api \
  --query principalId --output tsv
az role assignment create --assignee <principal-id> \
  --scope <registry-resource-id> --role "AcrPull"
az webapp config set --resource-group rg-rag --name app-rag-api \
  --generic-configurations '{"acrUseManagedIdentityCreds": true}'
# User-assigned identity: also give its client ID
az webapp config set --resource-group rg-rag --name app-rag-api \
  --generic-configurations '{"acrUserManagedIdentityID": "<client-id>"}'

az webapp config container set --resource-group rg-rag --name app-rag-api \
  --container-image-name crcontoso.azurecr.io/rag/api:1.4.0
```

The registry must accept ARM audience tokens (`az acr config authentication-as-arm update -r crcontoso --status enabled`), otherwise the pull fails with `UNAUTHORIZED`. A registry reachable only through a private endpoint also needs virtual network integration on the app and `vnetImagePullEnabled` set to true. After an image change, the old container keeps serving until the new one is started and ready.

**Settings the container reads:**

| Setting | Effect |
| --- | --- |
| App settings | Injected into the container as **environment variables**; changing one restarts the app |
| `WEBSITES_PORT` | Port the container listens on when it isn't 80; only one HTTP port is exposed; not injected into the container |
| `WEBSITES_ENABLE_APP_SERVICE_STORAGE` | `true` = `/home` persists across restarts and is shared by instances; **disabled by default** for custom containers |
| `DOCKER_REGISTRY_SERVER_*` | Registry credentials; not exposed to the application |

```text
import os

search_endpoint = os.environ["SEARCH_ENDPOINT"]
openai_key = os.environ["OPENAI_API_KEY"]   # value resolved from Key Vault by App Service
```

**Secrets: Key Vault references.** The value of an app setting (or connection string) is a reference, and App Service resolves it with the app's managed identity; the code reads a normal environment variable.

```text
@Microsoft.KeyVault(SecretUri=https://kv-rag.vault.azure.net/secrets/openai-key)
@Microsoft.KeyVault(VaultName=kv-rag;SecretName=openai-key)
```

```bash
az webapp config appsettings set --resource-group rg-rag --name app-rag-api \
  --settings WEBSITES_PORT=8000 \
  "OPENAI_API_KEY=@Microsoft.KeyVault(SecretUri=https://kv-rag.vault.azure.net/secrets/openai-key)"
```

| Requirement | Configuration |
| --- | --- |
| Vault access | Managed identity of the app with **Key Vault Secrets User** (RBAC model) or the Get secrets permission (access policy model) |
| Use a user-assigned identity | Set `keyVaultReferenceIdentity` to its resource ID (`az webapp update --set keyVaultReferenceIdentity=<id>`); applies to all references of the app |
| Always use the latest version after rotation | Reference without a version; App Service refetches within **24 hours**, immediately on any configuration change (restart) |
| Pin a version | Include the version in `SecretUri` or `SecretVersion` |
| Vault behind a firewall | Virtual network integration; for Linux apps reaching a private endpoint, `vnetRouteAllEnabled` |

> **Exam trap.** When a reference can't be resolved (missing role, deleted secret, syntax error), the app receives the literal string `@Microsoft.KeyVault(...)` as the value, and the code fails because it uses that string as the secret. Check the status in the app setting's edit dialog or the Key Vault Application Settings Diagnostics detector.

**Logs and shell:**

```bash
az webapp log config --resource-group rg-rag --name app-rag-api \
  --docker-container-logging filesystem
az webapp log tail --resource-group rg-rag --name app-rag-api
```

The browser SSH terminal and the `az webapp exec` command (preview) go through Kudu and need no SSH server in the image, but they need a shell (`/bin/bash` for the browser terminal; `az webapp exec --shell` can use another one, such as `/bin/sh`), so distroless images can't open a session. Platform (Docker) logs are on by default and also available at `https://<app>.scm.azurewebsites.net/api/logs/docker`.

**Several containers:** add up to nine **sidecar** containers next to the main container (Deployment Center > Containers), for example an OpenTelemetry collector; app settings are visible to all containers, and each container can also have its own environment variables. In a sidecar-enabled app, `WEBSITES_PORT` and the `DOCKER_REGISTRY_SERVER_*` settings don't apply: each container listens on its own port, and only ports 80 and 8080 receive external HTTP traffic. Docker Compose multi-container apps retire on March 31, 2027 and are replaced by sidecars.

| Requirement | Service |
| --- | --- |
| One containerized web API with slots, custom domain, TLS, built-in authentication | App Service |
| Scale on queue length or events, down to zero, revisions with traffic splitting | Azure Container Apps (next chapter) |
| Full Kubernetes API, custom controllers, node pools | AKS (next chapter) |

<!-- section: key-points -->
## Key points

- Deploy with a unique tag or a digest, never a moving tag; lock deployed images with `--write-enabled false`.
- Premium only: geo-replication, private endpoints, retention policy for untagged manifests, dedicated agent pools. Zone redundancy is on by default for every tier.
- Admin user disabled by default; services pull with a managed identity holding AcrPull (or Container Registry Repository Reader on an ABAC registry).
- `az acr build` = build and push in Azure without Docker; `az acr task create` adds commit, base image and timer (UTC cron) triggers; multi-step YAML chains `build`, `cmd`, `push`.
- App Service: app settings become environment variables, `WEBSITES_PORT` for a non-80 port (not in a sidecar-enabled app, which receives external traffic on port 80 or 8080), `acrUseManagedIdentityCreds` to pull with the identity.
- Key Vault references `@Microsoft.KeyVault(...)` need the app's identity with Key Vault Secrets User; unversioned references follow rotation within 24 hours.
