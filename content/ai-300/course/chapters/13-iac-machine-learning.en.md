An MLOps platform is rebuilt from code, not from portal clicks: Bicep or CLI YAML describe the workspace and its compute, a GitHub Actions workflow deploys them and runs the jobs, Git keeps every definition under version control, and network settings keep the workspace off the public internet. Exam questions show a workflow, a Bicep resource or a workspace YAML file to complete, ask how GitHub should authenticate without secrets, and which isolation mode or private endpoint meets a network requirement.

<!-- section: github-access | objectives: 1.3.1 -->
## Configuring secure access from GitHub

A workflow that runs `az` commands must sign in to Azure with an identity that has an Azure role. Microsoft Learn describes two options:

| Option | What GitHub stores | Assessment |
| --- | --- | --- |
| OpenID Connect (OIDC) with a federated identity credential, on a Microsoft Entra application or a user-assigned managed identity | Client ID, tenant ID, subscription ID (identifiers, not secrets) | Recommended: GitHub's short-lived token is exchanged for an Azure token, nothing expires or leaks |
| Service principal with a client secret | The whole credentials JSON in a secret named `AZURE_CREDENTIALS` | Less secure, not recommended: the secret must be stored and rotated |

Setting up OIDC:

1. Create a Microsoft Entra application (with its service principal) or a user-assigned managed identity.
2. Assign it an Azure role at the narrowest scope that works (see the table below).
3. Add a federated identity credential that trusts tokens issued by GitHub for this repository.
4. Store the client ID, tenant ID and subscription ID as GitHub secrets (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`).
5. In the workflow, grant `permissions: id-token: write` and sign in with `azure/login`.

```json
{
  "name": "ml-platform-production",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:contoso/ml-platform:environment:production",
  "description": "GitHub Actions, production environment",
  "audiences": ["api://AzureADTokenExchange"]
}
```

```bash
az ad app federated-credential create --id <application-object-id> --parameters credential.json
```

| Federated credential entity | Subject |
| --- | --- |
| Environment | `repo:<org>/<repo>:environment:<name>` |
| Branch | `repo:<org>/<repo>:ref:refs/heads/<branch>` |
| Tag | `repo:<org>/<repo>:ref:refs/tags/<tag>` |

Rules: the subject must match the workflow exactly (a mismatch is accepted at creation and only fails at sign-in), wildcards aren't supported, the audience is `api://AzureADTokenExchange`, and an application or managed identity holds at most 20 federated credentials.

Which role to give the workflow identity:

| The workflow... | Role and scope |
| --- | --- |
| Only submits jobs and registers models in an existing workspace | AzureML Data Scientist on the workspace |
| Deploys the workspace, its associated resources and compute with Bicep | Contributor on the resource group |
| Also creates role assignments in the Bicep file | Add Role Based Access Control Administrator or User Access Administrator on that scope |

Use GitHub **environment secrets** for production: when the environment requires reviewers, a job can't read its secrets until a reviewer approves.

> **Exam trap.** When a job declares `environment: production`, GitHub's token carries the environment subject (`...:environment:production`), not the branch. A federated credential created for `ref:refs/heads/main` then fails with a sign-in error: create the credential for the environment entity.

<!-- section: bicep-cli | objectives: 1.3.2 -->
## Deploying workspaces and resources with Bicep and Azure CLI

The workspace resource type is `Microsoft.MachineLearningServices/workspaces`; compute targets are its child `workspaces/computes`. The current stable API version is `2026-05-01`.

```bicep
param location string = resourceGroup().location
param storageAccountId string
param keyVaultId string
param appInsightsId string
param containerRegistryId string

resource workspace 'Microsoft.MachineLearningServices/workspaces@2026-05-01' = {
  name: 'mlw-contoso-prod'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    friendlyName: 'Contoso production workspace'
    storageAccount: storageAccountId
    keyVault: keyVaultId
    applicationInsights: appInsightsId
    containerRegistry: containerRegistryId
    publicNetworkAccess: 'Disabled'
    systemDatastoresAuthMode: 'Identity'
    managedNetwork: {
      isolationMode: 'AllowOnlyApprovedOutbound'
    }
  }
}

resource cluster 'Microsoft.MachineLearningServices/workspaces/computes@2026-05-01' = {
  parent: workspace
  name: 'cpu-cluster'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    computeType: 'AmlCompute'
    properties: {
      vmSize: 'STANDARD_DS3_V2'
      vmPriority: 'LowPriority'
      enableNodePublicIp: false
      scaleSettings: {
        minNodeCount: 0
        maxNodeCount: 4
        nodeIdleTimeBeforeScaleDown: 'PT120S'
      }
    }
  }
}
```

```bash
az deployment group what-if --resource-group rg-ml-prod --template-file main.bicep --parameters main.bicepparam
az deployment group create --resource-group rg-ml-prod --template-file main.bicep --parameters main.bicepparam
```

The same settings exist in Bicep (ARM property names, PascalCase values) and in the CLI workspace YAML (snake_case keys and values):

| Setting | Bicep | CLI YAML |
| --- | --- | --- |
| Associated resources (IDs) | `storageAccount`, `keyVault`, `applicationInsights`, `containerRegistry` | `storage_account`, `key_vault`, `application_insights`, `container_registry` |
| Public access | `publicNetworkAccess: 'Disabled'` | `public_network_access: Disabled` |
| Managed network | `managedNetwork.isolationMode: 'AllowOnlyApprovedOutbound'` | `managed_network.isolation_mode: allow_only_approved_outbound` |
| High business impact | `hbiWorkspace: true` | `hbi_workspace: true` |
| Image build compute | `imageBuildCompute` | `image_build_compute` |
| User-assigned identity | `primaryUserAssignedIdentity` | `primary_user_assigned_identity` |
| Authentication to the default datastores | `systemDatastoresAuthMode`: `'AccessKey'`, `'Identity'` or `'UserDelegationSAS'` | |

Compute properties in Bicep: `computeType` (`'AmlCompute'`, `'ComputeInstance'`, `'Kubernetes'`, `'VirtualMachine'` and others), `vmPriority` (`'Dedicated'` or `'LowPriority'`), `scaleSettings` (`maxNodeCount` required, `minNodeCount`, `nodeIdleTimeBeforeScaleDown`), `enableNodePublicIp: false` (nodes without public IPs), `subnet`. A compute instance takes `idleTimeBeforeShutdown` in ISO 8601 (15 minutes to 3 days) and `personalComputeInstanceSettings.assignedUser` (object ID and tenant ID).

`keyVault` and `storageAccount` can't be changed after creation, so a redeployment with other IDs fails: plan them in the first deployment.

With Azure CLI, every resource and asset has a YAML file and an `az ml` command, which makes the CLI the natural tool for the parts that Bicep doesn't describe (assets and jobs):

| Resource or asset | Command |
| --- | --- |
| Workspace | `az ml workspace create --file workspace.yml` |
| Compute | `az ml compute create --file cluster.yml` |
| Datastore | `az ml datastore create --file datastore.yml` |
| Environment, component, data, model | `az ml environment create`, `az ml component create`, `az ml data create`, `az ml model create` |
| Job or pipeline | `az ml job create --file pipeline.yml` |
| Registry | `az ml registry create --file registry.yml` |

> **Exam trap.** Bicep and YAML spell the same value differently. `isolationMode: 'AllowOnlyApprovedOutbound'` belongs in a Bicep file, `isolation_mode: allow_only_approved_outbound` in a CLI YAML file; a drop-down that mixes them has only one right answer per file type.

<!-- section: github-actions | objectives: 1.3.3 -->
## Automating provisioning with GitHub Actions workflows

A workflow is a YAML file in `.github/workflows/`. It has triggers (`on`), permissions, and jobs made of steps that run on a runner. A typical provisioning workflow: sign in with OIDC, deploy Bicep, install the `ml` extension, create assets, submit the training pipeline.

```yaml
name: ml-platform-deploy
on:
  push:
    branches: [main]
    paths:
      - infra/**
      - ml/**
  workflow_dispatch:
permissions:
  id-token: write
  contents: read
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Azure login with OpenID Connect
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - name: Deploy workspace and compute
        run: az deployment group create -g rg-ml-prod --template-file infra/main.bicep --parameters infra/main.bicepparam
      - name: Install the ml extension
        run: az extension add -n ml -y
      - name: Register assets and run the pipeline
        run: |
          az configure --defaults workspace=mlw-contoso-prod group=rg-ml-prod
          az ml environment create --file ml/env/churn-train-env.yml
          az ml component create --file ml/components/train.yml
          az ml job create --file ml/pipelines/churn-training.yml
```

| Element | Role |
| --- | --- |
| `on.push` with `branches` and `paths` | Run only when infrastructure or ML files change on `main` |
| `on.pull_request` | Validate a change before merge (for example `what-if`, or a short training run on a dev workspace) |
| `on.schedule` with `cron` | Periodic runs, such as a weekly retraining |
| `on.workflow_dispatch` | Manual run from the Actions tab |
| `permissions: id-token: write` | Lets the job request the OIDC token; without it `azure/login` fails with OIDC |
| `contents: read` | Needed by `actions/checkout` once permissions are set explicitly, because unlisted permissions become none |
| `environment: production` | Applies the environment's protection rules (required reviewers) and secrets |
| `azure/login@v2` with `client-id`, `tenant-id`, `subscription-id` | OIDC sign-in; with a service principal secret, `creds: ${{ secrets.AZURE_CREDENTIALS }}` instead |

Typical order of a promotion pipeline: dev workspace (train and evaluate on pull request) → registry (share the validated model and its environment) → test and prod workspaces (deploy from the registry, each behind its own GitHub environment and reviewers). Each stage signs in with its own federated credential and least-privilege role.

> **Exam trap.** The machine learning "pipeline" (`type: pipeline` job YAML submitted with `az ml job create`) and the GitHub Actions workflow are different things: the workflow runs on a GitHub runner and only submits the pipeline, which runs on Azure Machine Learning compute.

<!-- section: network-isolation | objectives: 1.3.4 -->
## Restricting network access to Machine Learning workspaces

Two independent settings: **inbound** access to the workspace (public network access and private endpoints) and **outbound** traffic from the managed compute (managed virtual network).

**Inbound.** Set `public_network_access: Disabled` and create a private endpoint for the workspace in your virtual network, with the group ID `amlworkspace` and the private DNS zones `privatelink.api.azureml.ms` and `privatelink.notebooks.azure.net`.

```bash
az ml workspace update -n mlw-contoso-prod -g rg-ml-prod --public-network-access disabled

az network private-endpoint create --name pe-mlw-prod \
  --vnet-name vnet-hub --subnet snet-private-endpoints \
  --private-connection-resource-id "/subscriptions/<sub-id>/resourceGroups/rg-ml-prod/providers/Microsoft.MachineLearningServices/workspaces/mlw-contoso-prod" \
  --group-id amlworkspace --connection-name workspace -l westeurope
```

**Outbound: managed virtual network.** Azure Machine Learning creates and runs an isolated network for its managed compute:

| Isolation mode | Outbound traffic | Use when |
| --- | --- | --- |
| `disabled` (default) | Not restricted, or handled by your own virtual network | You run your own network, or need no isolation |
| `allow_internet_outbound` | All internet outbound allowed | Unrestricted access to packages and pretrained models |
| `allow_only_approved_outbound` | Only required destinations and your outbound rules | Minimize data exfiltration risk |

```yaml
name: mlw-contoso-prod
managed_network:
  isolation_mode: allow_only_approved_outbound
  firewall_sku: basic
  outbound_rules:
    - name: pypi
      type: fqdn
      destination: 'pypi.org'
    - name: sales-storage
      type: private_endpoint
      destination:
        service_resource_id: /subscriptions/<sub-id>/resourceGroups/rg-data/providers/Microsoft.Storage/storageAccounts/stcontososales
        subresource_target: blob
        spark_enabled: false
    - name: datafactory
      type: service_tag
      destination:
        service_tag: DataFactory
        protocol: TCP
        port_ranges: 443
```

```bash
az ml workspace create --name mlw-contoso-dev --resource-group rg-ml-dev --managed-network allow_internet_outbound
az ml workspace update --file workspace.yml --resource-group rg-ml-prod --name mlw-contoso-prod
az ml workspace provision-network -g rg-ml-prod -n mlw-contoso-prod
az ml workspace show -n mlw-contoso-prod -g rg-ml-prod --query managed_network
```

Rules of the managed virtual network:

- Outbound rule types: `private_endpoint` (to an Azure resource), `service_tag` and `fqdn`. Service tag and FQDN rules are only valid in `allow_only_approved_outbound`.
- FQDN rules are implemented with an Azure Firewall that is billed: Standard by default, Basic with `firewall_sku: basic`; Premium isn't supported. FQDN rules only allow ports 80 and 443, and can't be used to reach a storage account in approved-only mode: use a private endpoint rule.
- Required private endpoints to the workspace's storage, key vault, container registry and workspace are created automatically (in internet outbound mode, only for resources whose public access is disabled).
- The network is provisioned when the first compute is created (it can take about 30 minutes), or on demand with `az ml workspace provision-network` or `--provision-network-now` at creation. Provision it before creating an online deployment or a serverless Spark job.
- Once enabled, managed network isolation can't be disabled. Existing compute isn't migrated: recreate clusters, instances and managed online endpoints.
- Inside a managed network, compute can't be placed in your own virtual network; Kubernetes and attached VMs aren't supported, and a cluster can't be created in another region.
- Prerequisites: the `Microsoft.Network` resource provider registered, and the Azure AI Enterprise Network Connection Approver role for the workspace identity to approve private endpoint connections to your resources.

Alternative without a managed network: keep `disabled` and place compute in your own subnet (`network_settings.subnet` in the compute YAML, `enableNodePublicIp: false` for clusters without public IPs). When the workspace and its container registry use private endpoints, set `image_build_compute` to a cluster, because registry tasks can't build the images.

| Requirement | Answer |
| --- | --- |
| Users reach the studio only from the corporate network | Public network access disabled plus a workspace private endpoint |
| Training may only reach approved destinations | `allow_only_approved_outbound` |
| Training needs `pypi.org` in approved-only mode | `fqdn` outbound rule (Azure Firewall cost) |
| Training reads a storage account in approved-only mode | `private_endpoint` outbound rule with `subresource_target: blob` |
| Packages from the internet, no network management | `allow_internet_outbound` |

> **Exam trap.** Disabling public network access protects inbound access only; it doesn't stop a training job from sending data to the internet. Data exfiltration protection comes from `allow_only_approved_outbound`.

<!-- section: git-source-control | objectives: 1.3.5 -->
## Managing source control with Git

Everything that defines the platform belongs in a Git repository: Bicep files, workspace and compute YAML, environment, component and pipeline definitions, training and scoring code, and the GitHub workflows. Secrets never do: keep them in GitHub secrets or Azure Key Vault, and prefer identity-based access.

```text
ml-platform/
├── .github/workflows/      deploy and training workflows
├── infra/                  main.bicep, main.bicepparam
└── ml/
    ├── env/                environment YAML and conda files
    ├── components/         component YAML and their src folders
    ├── pipelines/          pipeline job YAML
    └── data/               data asset YAML
```

**Git on a compute instance.** Open a terminal on the compute instance (it has a full Git client) and clone into your own user folder so that colleagues' branches don't collide. Files under `~/cloudfiles/code/` are on the workspace file share and survive the deletion of the instance; a clone on the instance's local disk is faster but is lost when the instance is deleted. Authenticate with an SSH key generated in the terminal (only the instance owner can access it) or with a personal access token over HTTPS:

```bash
ssh-keygen -t ed25519 -C "ana@contoso.com"
cat ~/.ssh/id_ed25519.pub        # add this public key to GitHub
git clone git@github.com:contoso/ml-platform.git
git checkout -b feature/churn-lr
```

**Git tracking of jobs.** When a job is submitted from the CLI or SDK from inside a Git repository (and `git` is installed), Azure Machine Learning records Git properties on the job:

| Property | Content |
| --- | --- |
| `azureml.git.repository_uri` or `mlflow.source.git.repoURL` | Repository the code was cloned from |
| `azureml.git.branch` or `mlflow.source.git.branch` | Active branch |
| `azureml.git.commit` or `mlflow.source.git.commit` | Commit hash of the submitted code |
| `azureml.git.dirty` | `True` when there were uncommitted changes |

In the studio: job **Overview** > **Properties** > **See all properties** > **Raw JSON**. From the CLI:

```bash
az ml job show --name <job-name> --query "{GitCommit:properties.\"azureml.git.commit\"}"
```

A job with `azureml.git.dirty` set to `True` can't be reproduced from the recorded commit alone: commit before submitting jobs whose results matter.

Branching practice: work on feature branches, open a pull request that triggers a validation workflow, protect `main`, and let only merges to `main` (or tags) trigger deployments to test and prod.

> **Exam trap.** If Git properties are missing on a job, check that `git --version` works on the machine that submitted the job and that the code folder is inside the cloned repository; it isn't a workspace setting to enable.

<!-- section: key-points -->
## Key points

- GitHub signs in with OIDC: federated credential (issuer `https://token.actions.githubusercontent.com`, audience `api://AzureADTokenExchange`, exact subject), `permissions: id-token: write`, `azure/login@v2` with client, tenant and subscription IDs.
- The subject depends on the trigger context: environment, branch or tag; an `environment:` job uses the environment subject.
- Bicep: `Microsoft.MachineLearningServices/workspaces@2026-05-01` and child `workspaces/computes`; PascalCase values in Bicep, snake_case in CLI YAML.
- Inbound protection: public network access disabled plus a private endpoint (`amlworkspace`); outbound protection: managed network `allow_only_approved_outbound`.
- FQDN outbound rules add a billed Azure Firewall and only allow ports 80 and 443; managed network isolation can't be disabled once enabled.
- Jobs record the Git repository, branch, commit and dirty flag when submitted from a Git working folder.
