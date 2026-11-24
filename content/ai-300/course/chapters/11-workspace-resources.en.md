The Azure Machine Learning workspace is the top-level resource of MLOps on Azure: every job, data asset, model, endpoint and compute target belongs to one. Exam questions ask how to create it with its associated resources, how to connect it to storage through datastores, which compute target fits a workload at the lowest cost, and which role or managed identity gives exactly the access required.

<!-- section: workspace | objectives: 1.1.1 -->
## Creating and managing a workspace

A workspace keeps the history of all training runs (logs, metrics, outputs, lineage, a snapshot of the scripts) and groups jobs, pipelines, data assets, models, components, environments, endpoints, compute targets and datastores. It relies on four **associated resources**; Azure Machine Learning creates the ones you don't provide:

| Associated resource | Used for | Rules to know |
| --- | --- | --- |
| Storage account | Default storage: job logs, uploaded data, code snapshots, notebooks | Not a BlobStorage account, not premium (`Premium_LRS`, `Premium_GRS`), no hierarchical namespace; Blob and File both enabled. Add other accounts, including Data Lake Storage Gen2, as datastores |
| Key vault | Secrets: datastore credentials, compute secrets | |
| Application Insights | Monitoring of inference endpoints | If deleted, the only way to get it back is to recreate the workspace |
| Container registry | Docker images built from custom environments | Created only when the first custom image is built. Deleting it makes the workspace inoperative |

The storage account and key vault can't be changed after creation. Deleting a workspace doesn't delete its associated resources; deleting the resource group does.

You can create a workspace from the studio, the portal, Azure CLI, the Python SDK, Bicep, ARM, Terraform or REST. With the CLI v2:

```bash
az extension add -n ml
az group create --name rg-ml-prod --location westeurope
az ml workspace create -n mlw-contoso-prod -g rg-ml-prod

# Avoid repeating the workspace and resource group on every command
az configure --defaults workspace=mlw-contoso-prod group=rg-ml-prod
```

To reuse resources that IT already created and secured, give their resource IDs in a YAML file (any of them can be omitted and will be created):

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/workspace.schema.json
name: mlw-contoso-prod
location: westeurope
display_name: Contoso production workspace
storage_account: /subscriptions/<sub-id>/resourceGroups/rg-shared/providers/Microsoft.Storage/storageAccounts/stcontosoml
key_vault: /subscriptions/<sub-id>/resourceGroups/rg-shared/providers/Microsoft.KeyVault/vaults/kv-contoso-ml
application_insights: /subscriptions/<sub-id>/resourceGroups/rg-shared/providers/Microsoft.insights/components/appi-contoso-ml
container_registry: /subscriptions/<sub-id>/resourceGroups/rg-shared/providers/Microsoft.ContainerRegistry/registries/crcontosoml
tags:
  costcenter: ml-platform
```

```bash
az ml workspace create -g rg-ml-prod --file workspace.yml
az ml workspace update -n mlw-contoso-prod -g rg-ml-prod --public-network-access enabled
az ml workspace sync-keys -n mlw-contoso-prod -g rg-ml-prod
```

Other creation-time settings: `customer_managed_key` (a key in your key vault, for encryption with customer-managed keys) and `hbi_workspace: true` (high business impact: less diagnostic data collected), which can only be set at creation.

Microsoft recommends one workspace per project, access through Microsoft Entra groups and registries to share assets. A **hub workspace** groups project workspaces under shared security settings, connections and compute. A workspace can't be moved to another subscription.

**Soft delete.** Deleting a workspace soft-deletes it for 14 days by default; it is then permanently deleted. During that time you can only recover it (portal: Azure Machine Learning > **Recently deleted** > **Recover**) or delete it permanently, and its name can't be reused.

| Recovered with the workspace | Lost for good |
| --- | --- |
| Run history, models, data, environments, components, notebooks, pipelines, AutoML jobs, labeling projects, datastores, role assignments of the workspace identity (recreation attempted, not guaranteed) | Queued or running jobs, compute instances and clusters, inference endpoints, role assignments you added, internal cache |

Recover the dependencies first: the key vault and the storage account; for a deleted Application Insights, recover its Log Analytics workspace, then recreate Application Insights with its original name. The container registry isn't required: images of custom environments are rebuilt. To skip soft delete, select **Delete the workspace permanently** in the portal or set `permanently_delete=True` in the SDK:

```text
ml_client.workspaces.begin_delete(
    name="mlw-contoso-dev",
    permanently_delete=True,
    delete_dependent_resources=False
).result()
```

> **Exam trap.** A soft-deleted workspace still holds its name. "Create a new workspace with the same name right after deleting the old one" fails unless the old one was permanently deleted. Soft delete isn't supported when the workspace uses only a user-assigned managed identity.

<!-- section: datastores | objectives: 1.1.2 -->
## Creating and managing datastores

A **datastore** is a reference to an existing Azure storage service: it stores the connection information (and, for credential-based access, the secret). A datastore never creates storage.

Every workspace has four default datastores:

| Datastore | Type | Holds |
| --- | --- | --- |
| `workspaceblobstore` | Blob container | Data uploads, job code snapshots, pipeline data cache (the default datastore) |
| `workspaceworkingdirectory` | File share | Notebooks and files of compute instances |
| `workspacefilestore` | File share | Alternative location for data uploads |
| `workspaceartifactstore` | Blob container | Metrics, models, components |

Datastore types and the authentication they accept:

| Storage | YAML `type` | Identity-based | Credential-based |
| --- | --- | --- | --- |
| Azure Blob Storage | `azure_blob` | Yes | Account key or SAS token |
| Azure Data Lake Storage Gen2 | `azure_data_lake_gen2` | Yes | Service principal |
| Azure Files | `azure_file` | No | Account key or SAS token |
| OneLake (Microsoft Fabric lakehouse, preview) | `one_lake` | Yes | Service principal |

Azure Data Lake Storage Gen1 was retired on February 29, 2024: use Gen2.

A datastore without a `credentials` block is **identity-based** (credential-less): no secret is stored, and access is checked with Microsoft Entra ID against the storage roles.

```yaml
# blob-identity.yml: no credentials block, Microsoft Entra ID is used
$schema: https://azuremlschemas.azureedge.net/latest/azureBlob.schema.json
name: sales_raw
type: azure_blob
account_name: stcontososales
container_name: raw
```

```yaml
# adls-sp.yml: service principal credentials, cached in the workspace key vault
$schema: https://azuremlschemas.azureedge.net/latest/azureDataLakeGen2.schema.json
name: lake_curated
type: azure_data_lake_gen2
account_name: stcontosolake
filesystem: curated
credentials:
  tenant_id: <tenant-id>
  client_id: <client-id>
  client_secret: <client-secret>
```

```bash
az ml datastore create --file blob-identity.yml
az ml datastore list --output table
az ml datastore show --name sales_raw
```

Jobs and data assets point to a datastore path with the URI `azureml://datastores/<datastore-name>/paths/<path>`.

Which identity reads the data of an identity-based datastore:

| Context | Identity used |
| --- | --- |
| Studio, notebooks on a compute instance | The signed-in user's Microsoft Entra token |
| Job with `identity: type: user_identity` | The user who submitted the job |
| Job with no `identity` setting | The managed identity of the compute |
| Studio data preview when the storage firewall only allows trusted Azure services | The workspace managed identity, once the datastore setting **Use workspace managed identity for data preview and profiling in Azure Machine Learning studio** is enabled. It needs Storage Blob Data Reader, plus Reader on the storage private endpoint if the storage uses one |

The identity that reads needs at least **Storage Blob Data Reader** on the storage account. To avoid granting every data scientist a storage role, grant it to the compute cluster's managed identity and let jobs run with it.

> **Exam trap.** Credential-based datastores keep keys, SAS tokens or client secrets in the workspace key vault, and a user with the **Reader** role on the workspace can view datastore credentials. When the requirement is "no secret stored in the workspace", choose an identity-based datastore with a storage data role, not a SAS token.

<!-- section: compute | objectives: 1.1.3 -->
## Creating and managing compute targets

A compute target is where a job or deployment runs; changing it doesn't require code changes.

| Compute | Type | Typical use | Key behavior |
| --- | --- | --- | --- |
| Compute instance | Managed, single node | Notebooks, VS Code, development, small test jobs | Personal: can't be shared with other users of the workspace |
| Compute cluster (`amlcompute`) | Managed, single or multinode | Training jobs, pipelines, sweeps, distributed training | Autoscales between `min_instances` and `max_instances` each time a job is submitted |
| Serverless compute | Managed by the service | Jobs when you don't want to create or size compute | Requested per job; same billing and quota as compute clusters |
| Kubernetes | Attached (unmanaged) | Training and inference on an AKS or Arc-enabled cluster you run | You maintain the cluster |
| Remote VM, Azure Databricks, HDInsight and others | Attached (unmanaged) | Existing compute | Created outside Azure Machine Learning, then attached |

Compute clusters, serverless compute and compute instances are the only managed computes. For inference, managed online endpoints and batch endpoints run on fully managed compute (see the deployment chapter).

**Compute cluster.** The YAML schema defaults are worth memorizing:

| Key | Default | Notes |
| --- | --- | --- |
| `size` | `Standard_DS3_v2` | List the sizes of a region with `az ml compute list-sizes` |
| `tier` | `dedicated` | `low_priority`: cheaper, preemptible, no SLA; a preempted job must be restarted |
| `min_instances` | `0` | Any value above 0 keeps that many nodes running (and billed) when idle |
| `max_instances` | `1` | Autoscale ceiling |
| `idle_time_before_scale_down` | `120` | Seconds before an idle node is released |
| `ssh_public_access_enabled` | `false` | |
| `identity.type` | none | `system_assigned` or `user_assigned`: one system-assigned identity or several user-assigned ones, not both |

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/amlCompute.schema.json
name: cpu-cluster
type: amlcompute
size: STANDARD_DS3_v2
min_instances: 0
max_instances: 4
idle_time_before_scale_down: 120
tier: low_priority
identity:
  type: system_assigned
```

```bash
az ml compute create --file cpu-cluster.yml
az ml compute create -n gpu-cluster --type AmlCompute --min-instances 0 --max-instances 2
az ml compute list --output table
```

A cluster can be created in another region than the workspace (more latency and data transfer costs; not supported with a managed virtual network); a compute instance can't. Quota is counted per region and VM family and shared between clusters and instances. Don't put delete or read-only locks on the workspace resource group: they block scaling.

**Compute instance.** Facts that come back in questions:

- The name must be unique across the region. The VM size can't be changed after creation.
- **Idle shutdown**: the instance stops after a period of inactivity between 15 minutes and 3 days (no kernel, terminal, job or VS Code session). An instance with a managed identity doesn't idle-shut-down unless that identity has Contributor on the workspace. Up to four start/stop **schedules** per instance.
- Stopping stops compute billing but you still pay for the disk, public IP and load balancer, and the quota isn't released.
- **Create on behalf of** a user (`create_on_behalf_of` with the user's tenant and object ID): an administrator prepares the instance; only the assigned user uses it.
- SSH access is disabled by default and can't be enabled or disabled after creation.
- The workspace storage account must allow storage account key access for instance creation to succeed.

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/computeInstance.schema.json
name: ci-ana-dev
type: computeinstance
size: STANDARD_DS3_v2
create_on_behalf_of:
  user_tenant_id: <tenant-id>
  user_object_id: <object-id-of-ana>
```

**Serverless compute.** Omit `compute` in a command, sweep, AutoML or pipeline job and the service provisions the nodes. Optional settings: `resources.instance_type` and `resources.instance_count` (default: one CPU node chosen from your quota), and `queue_settings.job_tier` (`Standard`, the default, or `Spot`). In a pipeline, use `default_compute: azureml:serverless`. Serverless jobs run with the user's identity or a user-assigned managed identity of the workspace; the system-assigned identity isn't supported.

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/commandJob.schema.json
type: command
command: python train.py --data ${{inputs.training_data}}
code: ./src
environment: azureml://registries/azureml/environments/sklearn-1.5/labels/latest
inputs:
  training_data:
    type: uri_folder
    path: azureml://datastores/sales_raw/paths/2026/
resources:
  instance_type: Standard_E4s_v3
  instance_count: 1
queue_settings:
  job_tier: Spot
```

| Requirement | Answer |
| --- | --- |
| No cost when no job runs, fixed pool of a chosen VM size | Cluster with `min_instances: 0` |
| No compute to create, size or maintain | Serverless compute |
| Lowest price, interruptions acceptable | `tier: low_priority` (cluster) or `job_tier: Spot` (serverless) |
| Jobs must start immediately, no node allocation wait | Cluster with `min_instances` above 0 (billed while idle) |
| Notebooks for one data scientist, stop when unused | Compute instance with idle shutdown or a schedule |

> **Exam trap.** A compute instance is not a shared team resource: "five data scientists share one compute instance" is never the answer. Give each user an instance, and send training jobs to a cluster or serverless compute.

<!-- section: identity-access | objectives: 1.1.4 -->
## Configuring identity and access management

Access to a workspace uses Azure RBAC. The built-in roles:

| Role | Can | Can't |
| --- | --- | --- |
| Owner | Everything, including role assignments | |
| Contributor | Create, edit and delete assets, create or attach compute, submit jobs, deploy | Assign roles |
| Reader | List and view assets, **including datastore credentials** | Create or update anything |
| AzureML Data Scientist | Every action inside the workspace: jobs, data, models, endpoints | Create or delete compute, modify or delete the workspace |
| AzureML Compute Operator | Create, manage, delete and access compute | Run experiments |
| AzureML Registry User | Read registries; read, write and delete assets in them | Create or delete registries |

Roles add up: AzureML Data Scientist plus AzureML Compute Operator lets a user run experiments and create compute in self-service.

Other permission facts:

- Creating a workspace needs Owner, Contributor or a custom role with `Microsoft.MachineLearningServices/workspaces/write`, `Microsoft.Resources/deployments/*` and write access to the dependent resources. The creator doesn't become Owner: they keep the role inherited from the higher scope.
- Quota operations need permissions at **subscription** scope; resource group or workspace scope isn't enough.

Custom role that lets data scientists work but not create compute or change the workspace:

```json
{
  "Name": "Data Scientist Custom",
  "IsCustom": true,
  "Description": "Can run experiments but can't create or delete compute.",
  "Actions": ["*"],
  "NotActions": [
    "Microsoft.MachineLearningServices/workspaces/*/delete",
    "Microsoft.MachineLearningServices/workspaces/write",
    "Microsoft.MachineLearningServices/workspaces/computes/*/write",
    "Microsoft.MachineLearningServices/workspaces/computes/*/delete",
    "Microsoft.Authorization/*/write"
  ],
  "AssignableScopes": [
    "/subscriptions/<sub-id>/resourceGroups/rg-ml-prod/providers/Microsoft.MachineLearningServices/workspaces/mlw-contoso-prod"
  ]
}
```

```bash
az role definition create --role-definition data-scientist-custom.json

az role assignment create --assignee-object-id <group-object-id> \
  --assignee-principal-type Group \
  --role "AzureML Data Scientist" \
  --scope /subscriptions/<sub-id>/resourceGroups/rg-ml-prod/providers/Microsoft.MachineLearningServices/workspaces/mlw-contoso-prod
```

**Workspace managed identity.** The workspace uses a managed identity to reach its storage account, key vault, container registry and Application Insights.

| Option | Role assignments on the associated resources | Notes |
| --- | --- | --- |
| System-assigned | Created automatically: Azure AI Administrator for workspaces created after November 19, 2024 (before: Contributor on the resource group) | Simplest; lifecycle tied to the workspace |
| User-assigned (with `primary_user_assigned_identity`) | Created by you | Independent lifecycle, can be reused, least-privilege control |

You can move from system-assigned to system-assigned plus user-assigned, not back. With a user-assigned identity, grant it Contributor on the workspace and on each associated resource, plus, optionally, Storage Blob Data Contributor (only needed for data preview in the studio) and, for a key vault using the Azure RBAC model, Key Vault Administrator.

```yaml
location: westeurope
identity:
  type: user_assigned
  user_assigned_identities:
    '/subscriptions/<sub-id>/resourceGroups/rg-ml-prod/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id-mlw-prod': {}
primary_user_assigned_identity: /subscriptions/<sub-id>/resourceGroups/rg-ml-prod/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id-mlw-prod
storage_account: <storage-account-resource-id>
key_vault: <key-vault-resource-id>
```

**Compute managed identity.** A cluster's identity reads datastore secrets from the key vault, pulls images from the container registry and, in jobs without `identity`, reads identity-based datastores. Its Microsoft Entra name is `/workspace-name/computes/compute-name`. A cluster with a system-assigned identity automatically gets AcrPull on the workspace registry when the registry admin user is disabled. Inside a job, the default identity's client ID is in the `DEFAULT_IDENTITY_CLIENT_ID` environment variable:

```text
import os
from azure.identity import ManagedIdentityCredential

credential = ManagedIdentityCredential(client_id=os.environ.get("DEFAULT_IDENTITY_CLIENT_ID"))
token = credential.get_token("https://storage.azure.com/")
```

| Requirement | Answer |
| --- | --- |
| Data scientists run jobs and deploy models, no compute creation | AzureML Data Scientist on the workspace |
| A platform team manages clusters only | AzureML Compute Operator |
| Teams publish and consume shared assets, can't create registries | AzureML Registry User on the registry |
| Jobs read a storage account without per-user storage roles | Identity-based datastore, Storage Blob Data Reader for the cluster's managed identity |
| A job must access data as the person who submitted it | `identity: type: user_identity` in the job |

> **Exam trap.** AzureML Data Scientist can't create a compute cluster, and Contributor can't assign roles. When a user must "run jobs and create their own compute", combine AzureML Data Scientist and AzureML Compute Operator rather than giving Contributor or Owner.

<!-- section: key-points -->
## Key points

- A workspace needs a storage account, key vault, Application Insights and (on first custom image) a container registry; storage and key vault can't be changed later.
- Soft delete keeps a workspace and its name for 14 days; compute, endpoints, running jobs and added role assignments aren't recovered.
- A datastore references existing storage; without credentials it is identity-based and the reader needs Storage Blob Data Reader. Readers can see the credentials of credential-based datastores.
- Clusters default to `min_instances: 0`, `max_instances: 1`, 120 s idle time, `dedicated` tier; serverless compute only needs `compute` to be omitted.
- AzureML Data Scientist does everything but compute and workspace changes; AzureML Compute Operator manages compute; roles add up.
