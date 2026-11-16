A container packages an application with its dependencies and shares the kernel of its host, so it starts in seconds. The AZ-104 exam covers three services: a registry to store images, and two ways to run them without managing virtual machines.

<!-- section: choose-container-service | objectives: 3.3.2, 3.3.3 -->
## Which service for which need

| Service | What it is | Choose it for |
| --- | --- | --- |
| **Azure Container Registry** (ACR) | Private registry of container images | Storing, building and replicating images |
| **Azure Container Instances** (ACI) | One container group started on demand, billed per second | Simple or short tasks, batch jobs, tests; no orchestration, **no autoscale** |
| **Azure Container Apps** | Serverless platform for applications and microservices | HTTP or event-driven **autoscale, including to zero**, revisions, traffic splitting, without managing Kubernetes |
| Azure Kubernetes Service (AKS) | Managed Kubernetes cluster | Full control of Kubernetes (outside the scope of this exam) |

<!-- section: acr | objectives: 3.3.1 -->
## Azure Container Registry

A registry has a globally unique name (5 to 50 alphanumeric characters) and a login server `<name>.azurecr.io`. Images are addressed as `<name>.azurecr.io/<repository>:<tag>`.

| Tier | Features |
| --- | --- |
| Basic | Entry level: same core features, least storage and throughput |
| Standard | More storage and throughput; fits most production needs |
| **Premium** | Highest limits, plus **geo-replication**, **private endpoints** (Private Link), zone redundancy, content trust, retention policy for untagged manifests |

The tier can be changed at any time.

**Authentication:**

| Method | Use |
| --- | --- |
| Microsoft Entra identity (`az acr login`) | Developers |
| **Managed identity** or service principal with a role | Services that pull or push: ACI, Container Apps, AKS, pipelines |
| **Admin user** | Single account with two regenerable passwords, **disabled by default**, full push and pull rights, can't be restricted. For tests only |

Roles: **AcrPull** (pull), **AcrPush** (pull and push), **AcrDelete** (delete artifacts); Contributor and Owner manage the registry itself.

```bash
az acr create -g RG1 -n crcontoso --sku Standard
az acr login -n crcontoso
docker tag web:1.0 crcontoso.azurecr.io/web:1.0
docker push crcontoso.azurecr.io/web:1.0

# Build in Azure without a local Docker engine (ACR Tasks quick task)
az acr build --registry crcontoso --image web:1.0 .
# Copy an image from another registry without pulling it locally
az acr import -n crcontoso --source docker.io/library/nginx:latest --image nginx:latest
```

**ACR Tasks** build images in Azure: quick tasks (`az acr build`), tasks triggered by a source code commit, by a **base image update**, or on a **schedule** (`az acr task create --schedule "0 2 * * *"`, cron in UTC).

**Geo-replication** (Premium): one registry, one login server, replicas in several regions; a push is replicated everywhere and a pull is served by the closest replica. Each replica is billed.

**Network**: with a private endpoint, the zone `privatelink.azurecr.io` resolves the registry to its private addresses; public network access can then be disabled.

<!-- section: aci | objectives: 3.3.2 -->
## Azure Container Instances

The deployment unit is the **container group**: one or more containers on the same host, sharing a life cycle, an IP address, ports and volumes (like a Kubernetes pod). Containers of a group talk to each other on `localhost`.

```bash
az container create -g RG1 -n aci-job1 --image crcontoso.azurecr.io/job:1.0 \
  --os-type Linux --cpu 1 --memory 1.5 --restart-policy OnFailure \
  --assign-identity <identity ID> --acr-identity <identity ID> \
  --environment-variables MODE=batch --secure-environment-variables KEY=<secret> \
  --azure-file-volume-account-name stor1 --azure-file-volume-account-key <key> \
  --azure-file-volume-share-name share1 --azure-file-volume-mount-path /mnt/data

az container show -g RG1 -n aci-job1 --query instanceView.state
az container logs -g RG1 -n aci-job1
az container exec -g RG1 -n aci-job1 --exec-command "/bin/sh"
```

| Setting | Values and rules |
| --- | --- |
| OS type | Linux or Windows, fixed for the group |
| CPU and memory | Requested per container; the group gets the sum |
| **Restart policy** | **Always** (default; long-running services), **OnFailure** (restart only on a non-zero exit code; run-once tasks), **Never** |
| Network | Public IP address with an optional DNS name label (`<label>.<region>.azurecontainer.io`), or deployment in a **subnet** of a virtual network (private IP, subnet delegated to ACI) |
| Storage | Containers are stateless. Volumes: **Azure file share**, `emptyDir`, secret, `gitRepo` |
| Image pull | Public registry, registry credentials, or a managed identity with AcrPull |

Rules that questions rely on:

- With **OnFailure** or **Never**, a container that ends successfully stops; the group goes to *Terminated* and **billing stops**.
- **Multi-container groups and Azure Files volumes are for Linux containers.** A Windows group runs a single container.
- Multi-container groups are deployed with a **YAML file** or an ARM/Bicep template, not with simple `az container create` parameters.
- Secure environment variables aren't shown in the properties of the group.

<!-- section: container-apps | objectives: 3.3.3 -->
## Azure Container Apps

| Concept | Meaning |
| --- | --- |
| **Environment** | Secure boundary around a set of apps: same virtual network, same log destination (Log Analytics workspace). Apps that must be isolated go to different environments. Apps of one environment can call each other, including through Dapr |
| **Container app** | The application: one or more containers, its configuration, its scale rules |
| **Revision** | An immutable snapshot of a version of the app |
| **Replica** | A running instance of a revision |

```bash
az containerapp env create -g RG1 -n cae-prod --location westeurope
az containerapp create -g RG1 -n ca-web --environment cae-prod \
  --image crcontoso.azurecr.io/web:1.0 --registry-server crcontoso.azurecr.io \
  --registry-identity system --ingress external --target-port 8080 \
  --min-replicas 0 --max-replicas 5
```

**Ingress** decides who can reach the app:

| Ingress | Reachable from |
| --- | --- |
| Disabled | Nobody (background workers) |
| **Internal** (limited to the environment) | Other apps of the same environment only |
| **External** | The inbound IP address of the environment: the internet for an external environment, the virtual network only for an **internal environment** |

The **target port** is the port the container listens on.

**Revisions:**

- **Revision-scope** changes (the `template` section: image, environment variables, resources, scale rules) create a **new revision**.
- **Application-scope** changes (the `configuration` section: secrets, ingress, revision mode, traffic splitting, registry credentials) apply to all revisions and create none. After changing a secret, restart the revision or deploy a new one to pick it up.
- **Single revision mode** (default): the new revision replaces the old one. **Multiple revision mode**: several revisions are active and traffic is split by weight (blue-green, A/B testing).

```bash
az containerapp revision set-mode -g RG1 -n ca-web --mode multiple
az containerapp ingress traffic set -g RG1 -n ca-web \
  --revision-weight ca-web--v1=80 ca-web--v2=20
```

Secrets are defined at the app level and referenced by environment variables (`secretref:`); a managed identity pulls images from ACR with AcrPull.

<!-- section: container-scaling | objectives: 3.3.4 -->
## Sizing and scaling containers

**Azure Container Instances**

- CPU and memory are fixed at creation. Changing them, like the OS type or the restart policy, means **deleting and recreating** the container group (its IP address may change).
- There is no autoscale: to handle more load, deploy more container groups, or move to Container Apps.

**Azure Container Apps**

- Resources per container on the Consumption profile: from 0.25 vCPU / 0.5 Gi to 4 vCPU / 8 Gi, always **2 Gi of memory per vCPU**. The total of all containers of the app must match a supported combination.
- A revision scales **between `minReplicas` and `maxReplicas`** according to its scale rules:

| Scale rule | Trigger | Scale to zero |
| --- | --- | --- |
| **HTTP** | Concurrent HTTP requests per replica (default 10) | Yes |
| TCP | Concurrent TCP connections | Yes |
| **Custom** (KEDA scalers) | Events: Azure Service Bus queue length, Event Hubs, Storage queue... | Yes |
| CPU or memory | Utilization | **No** |

- Without any rule, a default HTTP rule applies, from 0 to 10 replicas.
- With `minReplicas = 0`, the app **scales to zero** when idle and costs nothing; the first request then waits for a replica to start. Set `minReplicas` to 1 or more to avoid this cold start.
- An app without ingress and without a custom rule that scales to zero is never woken up: give it an event-based rule or `minReplicas` of at least 1.
- Changing scale rules creates a new revision.

```bash
az containerapp update -g RG1 -n ca-worker --min-replicas 0 --max-replicas 10 \
  --scale-rule-name orders --scale-rule-type azure-servicebus \
  --scale-rule-metadata queueName=orders messageCount=20 \
  --scale-rule-auth connection=sb-connection
```

<!-- section: key-points -->
## Key points

- ACR Premium only: geo-replication and private endpoints. Admin user disabled by default; prefer AcrPull or AcrPush on an identity.
- `az acr build` builds in Azure; ACR Tasks can be triggered by commit, base image update or schedule.
- ACI: container group; restart policy Always, OnFailure, Never; multi-container and Azure Files volumes on Linux only; resize = recreate; no autoscale.
- Container Apps: environment > app > revision > replica. Template changes create a revision; configuration changes don't.
- Ingress external or internal; traffic splitting needs multiple revision mode.
- Scale rules HTTP, TCP, custom (KEDA); scale to zero with `minReplicas = 0`, except with CPU or memory rules.
