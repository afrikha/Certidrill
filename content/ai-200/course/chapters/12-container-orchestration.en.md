When an AI solution has several services, background workers and load that follows a queue, it needs an orchestrator. Azure Container Apps gives revisions, traffic splitting and event-driven scaling without managing Kubernetes; Azure Kubernetes Service (AKS) gives the full Kubernetes API driven by manifest files. Questions ask for the command, the YAML property or the diagnostic step: which change creates a revision, which scale rule wakes a worker, which `kubectl` command explains a pod that won't start.

<!-- section: aca-deploy-revisions | objectives: 1.2.1 -->
## Deploying to Azure Container Apps: environments and revisions

| Concept | Meaning |
| --- | --- |
| Environment | Secure boundary around a group of apps: same virtual network, same log destination (Log Analytics workspace by default), same Dapr configuration |
| Container app | One or more containers, their configuration (ingress, secrets, registries) and their scale rules |
| Revision | Immutable snapshot of the app's template; named `<app>--<suffix>` |
| Replica | A running instance of a revision |

Two environment types exist: **workload profiles** (the default; Consumption profile billed per use with scale to zero, plus optional Dedicated profiles with reserved hardware) and **Consumption only** (legacy). Put apps that must never share compute, or test and production, in separate environments; put apps that call each other, share a virtual network or a log workspace in the same one.

```bash
az containerapp env create --resource-group rg-rag --name cae-rag \
  --location westeurope --enable-workload-profiles

az containerapp create --resource-group rg-rag --name ca-rag-api \
  --environment cae-rag \
  --image crcontoso.azurecr.io/rag/api:1.4.0 \
  --registry-server crcontoso.azurecr.io --registry-identity system \
  --ingress external --target-port 8000 \
  --secrets "openai-key=keyvaultref:https://kv-rag.vault.azure.net/secrets/openai-key,identityref:system" \
  --env-vars SEARCH_ENDPOINT=https://srch-rag.search.windows.net OPENAI_API_KEY=secretref:openai-key \
  --revision-suffix v1
```

| Option | Rule |
| --- | --- |
| `--registry-identity system` | Pulls from ACR with the app's managed identity (AcrPull); no registry password |
| `--secrets name=value` | Secret stored in the app; secret names are limited to 20 characters |
| `--secrets name=keyvaultref:<uri>,identityref:<id>` | Secret read from Key Vault by a managed identity (`system` or a user-assigned resource ID) holding **Key Vault Secrets User** |
| `--env-vars NAME=secretref:<secret>` | Environment variable whose value comes from a secret |
| `--ingress external` / `internal` | Reachable through the environment's inbound IP / only from apps of the same environment |
| `--target-port` | Port the container listens on |

Secrets can also be mounted as files: a volume of type `Secret` writes one file per secret, named after the secret. A Key Vault reference without a version follows rotation: new versions are picked up within 30 minutes and active revisions that use the secret in an environment variable restart automatically.

**What creates a revision:**

| Change | Scope | New revision? |
| --- | --- | --- |
| Image, container command, environment variables, CPU and memory, probes, volumes, revision suffix, **scale rules** (`properties.template`) | Revision | Yes |
| Secret values, ingress on/off, traffic weights, labels, revision mode, registry credentials, Dapr settings (`properties.configuration`) | Application | No, applied to all revisions |

> **Exam trap.** Updating a secret doesn't create a revision and doesn't reach running replicas: restart the revision (`az containerapp revision restart`) or deploy a new one. Before deleting a secret, deploy a revision that no longer references it.

**Revision modes:**

| Mode | Behavior | Typical use |
| --- | --- | --- |
| Single (default) | The new revision receives all traffic once it is ready, then the old one is deprovisioned; if the update fails, traffic stays on the old revision | Plain rolling update without downtime |
| Multiple | Several active revisions; traffic split by weight; you choose when to deactivate | Blue-green, canary, A/B testing of a new model or prompt |
| Labels (preview) | Named labels (dev, staging, prod) moved between revisions | Stable URLs per stage, simple rollback |

In single mode, the old revision stays active until the new one is provisioned, has scaled to the previous replica count and has passed its startup and readiness probes.

```bash
az containerapp revision set-mode --resource-group rg-rag --name ca-rag-api --mode multiple
az containerapp update --resource-group rg-rag --name ca-rag-api \
  --image crcontoso.azurecr.io/rag/api:1.5.0 --revision-suffix v2
az containerapp ingress traffic set --resource-group rg-rag --name ca-rag-api \
  --revision-weight ca-rag-api--v1=90 ca-rag-api--v2=10
az containerapp revision label add --resource-group rg-rag --name ca-rag-api \
  --label canary --revision ca-rag-api--v2
az containerapp revision deactivate --resource-group rg-rag --name ca-rag-api \
  --revision ca-rag-api--v1
az containerapp revision list --resource-group rg-rag --name ca-rag-api --output table
```

A label gets its own URL that stays the same when the label moves to another revision, so testers can reach the new revision with 0 % of the production traffic. Inactive revisions aren't billed; by default up to 100 inactive revisions are kept and the oldest are purged beyond that.

> **Exam trap.** Traffic weights need **multiple** revision mode. In single mode, `ingress traffic set` can't keep 90 % on the old revision: the new revision takes everything as soon as it is ready.

<!-- section: keda-scaling | objectives: 1.2.2 -->
## Event-driven scaling with KEDA in Container Apps

Each revision scales between `minReplicas` (default 0, maximum 1,000) and `maxReplicas` (default 10, from 1 to 1,000). Without any rule, an HTTP rule applies, from 0 to 10 replicas.

| Rule | Metric | Property / CLI flag |
| --- | --- | --- |
| HTTP | Concurrent HTTP requests per replica, measured over 15 seconds | `concurrentRequests` (default 10) / `--scale-rule-http-concurrency` |
| TCP | Concurrent TCP connections | `concurrentConnections` (default 10) / `--scale-rule-tcp-concurrency` |
| Custom | Any ScaledObject-based KEDA scaler: Azure Service Bus, Event Hubs, Storage queues, Kafka, Redis, CPU, memory... | `custom.type`, `custom.metadata`, `custom.auth` or `custom.identity` |

A custom rule is the KEDA trigger copied into the app: `type` and `metadata` keep the KEDA names, and each `secretTargetRef` of the KEDA `TriggerAuthentication` becomes an `auth` entry pointing to an app secret.

```yaml
properties:
  configuration:
    activeRevisionsMode: Single
    secrets:
      - name: sb-connection
        value: <service-bus-connection-string>
  template:
    scale:
      minReplicas: 0
      maxReplicas: 30
      rules:
        - name: embed-queue
          custom:
            type: azure-servicebus
            metadata:
              queueName: embed-requests
              namespace: sb-rag
              messageCount: "20"
            auth:
              - secretRef: sb-connection
                triggerParameter: connection
```

The same rule without a secret, with a managed identity that has a data role on the queue (supported for Azure Queue Storage, Service Bus and Event Hubs rules; not configurable in the portal):

```bash
az containerapp update --resource-group rg-rag --name ca-embed-worker \
  --min-replicas 0 --max-replicas 30 \
  --scale-rule-name embed-queue --scale-rule-type azure-servicebus \
  --scale-rule-metadata "queueName=embed-requests" "namespace=sb-rag" "messageCount=20" \
  --scale-rule-identity system
```

**How the scaler behaves:**

| Behavior | Value |
| --- | --- |
| Polling interval (custom rules) | 30 seconds |
| Cool down period before going from 1 replica to 0 | 300 seconds |
| Scale down stabilization window | 300 seconds; scale up: none |
| Scale up steps | 1, 4, 8, 16, 32... up to `maxReplicas` |
| Target | `desiredReplicas = ceil(metric / target)`: 200 messages with `messageCount` 20 = 10 replicas |
| Several rules | Scaling starts as soon as any rule's condition is met |

> **Exam trap.** A worker with **ingress disabled**, `minReplicas` 0 and no custom rule scales to zero and never starts again: nothing can wake it. Give it an event rule (queue length) or `minReplicas` of at least 1.

> **Exam trap.** Scale rules belong to the template: changing one creates a new revision. Non-HTTP event rules require `activeRevisionsMode` set to `single`; in multiple mode the old revision would keep its old rules.

| Requirement | Answer |
| --- | --- |
| Pay nothing when the queue is empty | `minReplicas` 0 with a queue rule |
| No cold start for an interactive API | `minReplicas` 1 or more |
| Never more than 30 parallel model calls | `maxReplicas` 30 (replica counts are targets, not guarantees) |
| Each replica handles at most 50 requests at a time | HTTP rule, `concurrentRequests` 50 |
| No connection string in the rule | `identity` (`--scale-rule-identity`) with a data role on the source |
| One execution per message, then stop | Container Apps job with an event trigger: same KEDA rules, but HTTP and TCP rules aren't supported for jobs |

<!-- section: aks-manifests | objectives: 1.2.3 -->
## Deploying to AKS with manifest files

```bash
az aks get-credentials --resource-group rg-rag --name aks-rag
# Grant AcrPull on the registry to the kubelet managed identity of the node pools
az aks update --resource-group rg-rag --name aks-rag --attach-acr crcontoso
```

`--attach-acr` uses the permissions of the person running it (Owner or another role that can assign roles) and isn't supported on ACR registries in the ABAC repository permissions mode, which need Container Registry Repository Reader instead.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rag-api-config
  namespace: rag
data:
  SEARCH_INDEX: docs-v3
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rag-api
  namespace: rag
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rag-api
  template:
    metadata:
      labels:
        app: rag-api
    spec:
      containers:
        - name: api
          image: crcontoso.azurecr.io/rag/api:1.4.0
          ports:
            - containerPort: 8000
          envFrom:
            - configMapRef:
                name: rag-api-config
          env:
            - name: OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: rag-api-secrets
                  key: openai-key
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              memory: 2Gi
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
---
apiVersion: v1
kind: Service
metadata:
  name: rag-api
  namespace: rag
spec:
  type: ClusterIP
  selector:
    app: rag-api
  ports:
    - port: 80
      targetPort: 8000
```

| Object | Role |
| --- | --- |
| Deployment | Desired state of the pods (image, replicas); a change of the pod template triggers a rolling update |
| `selector.matchLabels` | Must match `template.metadata.labels`, otherwise the Deployment is rejected |
| Service | Stable name and virtual IP in front of the pods whose labels match its `selector`; `targetPort` = container port |
| ConfigMap / Secret | Non-sensitive settings / sensitive values, injected as environment variables or files |
| `requests` / `limits` | Scheduling reservation / ceiling; a container over its memory limit is killed (`OOMKilled`) |
| `readinessProbe` / `livenessProbe` | Pod removed from the Service while not ready / container restarted when the probe fails |

| Service type | Reachable from |
| --- | --- |
| ClusterIP (default) | Inside the cluster only |
| LoadBalancer | Public IP of an Azure load balancer; private IP with the annotation `service.beta.kubernetes.io/azure-load-balancer-internal: "true"` |
| NodePort | A port on every node; rarely the answer |

```bash
kubectl create namespace rag
kubectl create secret generic rag-api-secrets -n rag --from-literal=openai-key=<value>
kubectl apply -f rag-api.yaml
kubectl rollout status deployment/rag-api -n rag
kubectl set image deployment/rag-api api=crcontoso.azurecr.io/rag/api:1.5.0 -n rag
kubectl rollout undo deployment/rag-api -n rag
kubectl scale deployment/rag-api --replicas=5 -n rag
```

> **Exam trap.** `kubectl apply` is declarative and idempotent: run it again with the edited file to update. `kubectl create` fails when the object already exists. A Kubernetes Secret is only Base64-encoded, not encrypted in the manifest: never commit its values with the manifests.

<!-- section: troubleshoot-containers | objectives: 1.2.4 -->
## Monitoring and troubleshooting AKS and Container Apps

**AKS: from the symptom to the command.**

```bash
kubectl get pods -n rag -o wide
kubectl describe pod rag-api-7d9f8-abcde -n rag      # events at the bottom
kubectl logs rag-api-7d9f8-abcde -n rag -c api
kubectl logs rag-api-7d9f8-abcde -n rag --previous   # log of the crashed container
kubectl get events -n rag --sort-by=.metadata.creationTimestamp
kubectl exec -it rag-api-7d9f8-abcde -n rag -- /bin/sh
kubectl get endpoints rag-api -n rag
```

| Pod status | Likely cause | Where to look |
| --- | --- | --- |
| `ImagePullBackOff` / `ErrImagePull` | Wrong image or tag, or the nodes can't authenticate to the registry (no AcrPull) | `kubectl describe pod` events |
| `CrashLoopBackOff` | The process exits at start: missing variable, bad secret, unhandled exception | `kubectl logs --previous` |
| `Pending` | No node with enough CPU or memory for the `requests`, or an unmet node selector | `kubectl describe pod` (FailedScheduling) |
| `OOMKilled` (last state) | Memory limit too low for the model or the batch | `kubectl describe pod`, raise `limits.memory` |
| Running but not ready | Readiness probe fails (wrong path or port) | `kubectl describe pod` |

**End-to-end connectivity:** a Service is reached in the cluster as `<service>.<namespace>.svc.cluster.local` (or `<service>` from the same namespace). If calls fail, check in this order: the Service has **endpoints** (an empty list means its selector matches no ready pod), `port` and `targetPort` match the container port, DNS resolves from a pod (`kubectl exec ... -- nslookup rag-api.rag`), then the network policy and the load balancer.

**Container insights** sends cluster data to Log Analytics:

```kusto
ContainerLogV2
| where PodNamespace == "rag" and PodName startswith "rag-api"
| project TimeGenerated, PodName, ContainerName, LogMessage, LogSource
| order by TimeGenerated desc
```

| Table | Content |
| --- | --- |
| `ContainerLogV2` | stdout and stderr of the containers |
| `KubeEvents` | Kubernetes events (Normal events aren't collected by default) |
| `KubePodInventory` | Pods, their status and their controller |
| `KubeNodeInventory` | Nodes and their status |

**Container Apps:**

```bash
# Platform events: image pull, probe failures, scaling, revision provisioning
az containerapp logs show --resource-group rg-rag --name ca-rag-api --type system --follow
# Application stdout/stderr (default type: console) of one replica and container
az containerapp logs show --resource-group rg-rag --name ca-rag-api \
  --revision ca-rag-api--v2 --replica <replica-name> --container api --type console --tail 50
az containerapp env logs show --resource-group rg-rag --name cae-rag --follow
# Interactive shell in a replica
az containerapp exec --resource-group rg-rag --name ca-rag-api
```

```kusto
ContainerAppConsoleLogs_CL
| where ContainerAppName_s == "ca-rag-api"
| project TimeGenerated, RevisionName_s, ContainerName_s, Log_s
| take 100
```

| Table | Content |
| --- | --- |
| `ContainerAppConsoleLogs_CL` | What the containers write to stdout and stderr |
| `ContainerAppSystemLogs_CL` | Events of the Container Apps service for the app |
| `ContainerAppHTTPLogs` | HTTP requests (status code, duration), sent through diagnostic settings of the environment |

| Symptom | Check |
| --- | --- |
| Revision *Provisioned* but *Degraded*, "0/1 replicas ready" | Health probes: for TCP probes the port must equal the ingress target port; raise the initial delay for slow starts |
| Revision stuck in *Provisioning* | Probes, image pull (firewall or custom DNS blocking the registry) |
| 404 "Container App is stopped or does not exist" from outside | Ingress limited to the environment: `az containerapp ingress update --type external` |
| Timeouts, app never answers | Target port different from the port the app listens on, wrong transport (HTTP/1 vs HTTP/2) |
| Log stream says "This revision is scaled to zero" | No replica to stream from: send a request or set `minReplicas` to 1 |
| Name resolution fails in a custom-DNS virtual network | The DNS server must forward to `168.63.129.16` |

> **Exam tip.** Console logs answer "what did my code print"; system logs answer "why didn't my revision start". An image that can't be pulled or a failing probe appears in the system logs, not in the console logs.

<!-- section: key-points -->
## Key points

- Container Apps: environment > app > revision > replica. Template changes (image, env vars, scale rules) create a revision; configuration changes (secrets, ingress, traffic) don't.
- Secrets: `secretref:` in environment variables, `keyvaultref:` + `identityref:` for Key Vault; restart or redeploy after a secret change.
- Traffic splitting and labels need multiple revision mode; single mode switches only when the new revision is ready.
- Scale rules: HTTP (10 concurrent requests by default), TCP, custom KEDA scalers; `minReplicas` 0 to 1,000, `maxReplicas` 10 by default; no ingress + no custom rule + min 0 = never wakes up.
- AKS: `--attach-acr` gives AcrPull to the kubelet identity; `kubectl apply`, `rollout status`, `rollout undo`; selector must match the pod labels.
- Troubleshooting: `describe` for events, `logs --previous` for crashes, endpoints for Service connectivity; Container Apps system logs for platform failures, console logs for code output.
