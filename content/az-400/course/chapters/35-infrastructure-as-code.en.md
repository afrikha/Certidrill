Infrastructure as code (IaC) describes environments in versioned files and lets a pipeline create and update them the same way every time. AZ-400 questions ask which technology fits a requirement (Azure only or multicloud, resources or operating system settings, push or pull), how to test a template before deployment, and how to keep machines and environments in their desired state.

<!-- section: config-technology | objectives: 3.5.1 -->
## Recommending a configuration management technology

Two layers must be managed: the **Azure resources** (control plane) and the **configuration inside the machines** (operating system, roles, files, services).

| Technology | Layer | Model | Choose it when |
| --- | --- | --- | --- |
| Bicep | Azure resources | Declarative, no state file (Azure is the state) | Azure only, day-zero support of new resource types, simplest syntax |
| ARM templates (JSON) | Azure resources | Declarative, no state file | Existing JSON templates; Bicep compiles to them |
| Terraform | Resources in Azure and other clouds | Declarative, state file to store and lock | Multicloud or an existing Terraform practice |
| Azure Machine Configuration | Inside Azure VMs and Azure Arc-enabled servers | Desired state audited or enforced through Azure Policy | Audit or enforce OS settings at scale, hybrid servers |
| Azure Automation State Configuration | Inside machines (PowerShell DSC pull server) | Pull | Existing deployments only: retires on September 30, 2027 |
| Ansible | Inside machines, also Azure resources | Agentless push over SSH or WinRM, YAML playbooks | Linux-heavy fleet, no agent wanted |
| Chef, Puppet | Inside machines | Agent-based pull from a server | Existing investment in these tools |
| Custom Script Extension, cloud-init | Inside a new VM | Run once at provisioning | Bootstrap a VM, not ongoing drift control |
| Azure App Configuration, Azure Key Vault | Application settings and secrets | Central store read at runtime | Settings and feature flags shared across environments |

> **Exam trap.** Bicep and ARM templates don't keep a state file, Terraform does: a Terraform pipeline needs a remote backend (an Azure Storage blob container, which locks the state with a blob lease) shared by every run. Losing the state file means Terraform no longer knows which resources it manages.

<!-- section: config-strategy | objectives: 3.5.2 -->
## Implementing a configuration management strategy

- **One template, several parameter sets.** The same Bicep file is deployed to dev, test and production with one `.bicepparam` file per environment; differences are parameters, never copies of the template.
- **Secrets out of the code.** Parameter files reference Key Vault (`getSecret()` in a `.bicepparam` file, or a Key Vault reference in a JSON parameter file); applications use Key Vault references or a managed identity.
- **Application settings by environment.** App Configuration with labels (`dev`, `prod`) and the same keys; the pipeline sets the label, not the values.
- **Idempotent deployments.** Running the same deployment twice produces the same result; the pipeline redeploys on every release, which corrects manual changes (drift).
- **Detect drift.** `what-if` against the live environment, Azure Policy compliance, Machine Configuration reports for guests.
- **Reusable modules.** Publish Bicep modules to a private module registry (an Azure Container Registry) or as template specs, with semantic versions.

```bicep
// main.bicepparam
using 'main.bicep'
param environmentName = 'prod'
param appServiceSku = 'P1v3'
param sqlAdminPassword = az.getSecret('<subscription-id>', 'rg-secrets', 'kv-shop-prod', 'sqlAdminPassword')
```

<!-- section: iac-strategy | objectives: 3.5.3 -->
## IaC strategy: source control, testing and deployment automation

Infrastructure code follows the same flow as application code: a repository, pull requests with branch policies or protection rules, a pipeline, environments with approvals.

| Stage | Tooling | Catches |
| --- | --- | --- |
| Lint | Bicep linter (`bicep lint`, rules configured in `bicepconfig.json`), `terraform fmt -check` and `terraform validate` | Syntax errors, unused parameters, hard-coded locations, secrets in outputs |
| Static analysis | PSRule for Azure, ARM template test toolkit (arm-ttk), security scanners | Non-compliance with Azure Well-Architected rules and organization rules |
| Preflight validation | `az deployment group validate` | Invalid values, quota, policy denies, before any change |
| Change preview | `az deployment group what-if`, `terraform plan` | Resources to be created, modified or deleted; publish the output to the pull request |
| Deployment | `az deployment group create`, `AzureResourceManagerTemplateDeployment@3`, `terraform apply` of the saved plan | |
| Post-deployment tests | Smoke tests, Pester, policy compliance | Environment really works |

```yaml
stages:
- stage: Validate
  jobs:
  - job: Preview
    pool:
      vmImage: ubuntu-latest
    steps:
    - task: AzureCLI@2
      inputs:
        azureSubscription: sc-infra-wif
        scriptType: bash
        scriptLocation: inlineScript
        inlineScript: |
          az bicep lint --file infra/main.bicep
          az deployment group what-if --resource-group rg-shop-prod \
            --template-file infra/main.bicep --parameters infra/prod.bicepparam
- stage: Deploy
  dependsOn: Validate
  jobs:
  - deployment: Infra
    environment: infra-prod          # approval check on this environment
    pool:
      vmImage: ubuntu-latest
    strategy:
      runOnce:
        deploy:
          steps:
          - checkout: self
          - task: AzureCLI@2
            inputs:
              azureSubscription: sc-infra-wif
              scriptType: bash
              scriptLocation: inlineScript
              inlineScript: |
                az deployment group create --resource-group rg-shop-prod \
                  --template-file infra/main.bicep --parameters infra/prod.bicepparam
```

The service connection or the GitHub `azure/login` step uses workload identity federation (no stored secret), with a role such as Contributor scoped to the target resource group. Deploy the infrastructure stage before the application stages that need it.

> **Exam tip.** "Show reviewers which resources will change before the deployment is approved" is `what-if` (or `terraform plan`) in a validation stage, then an approval on the environment of the deployment stage.

<!-- section: desired-state | objectives: 3.5.4 -->
## Desired state configuration for environments

| Need | Tool and behavior |
| --- | --- |
| Azure resources match the template, extra resources left alone | ARM or Bicep deployment, **Incremental** mode (default) |
| Resources not in the template are deleted | **Deployment stack** with `--action-on-unmanage deleteResources` (the recommended way), or **Complete** mode at resource group scope |
| Prevent manual changes or deletion of deployed resources | Deployment stack with deny settings (`denyDelete` or `denyWriteAndDelete`) |
| OS settings audited or enforced on Azure VMs and Arc-enabled servers | Azure Machine Configuration |
| Existing PowerShell DSC pull server in Azure Automation | Azure Automation State Configuration, to migrate to Machine Configuration before September 30, 2027 |

```bash
az stack group create --name shop-prod --resource-group rg-shop-prod \
  --template-file infra/main.bicep --parameters infra/prod.bicepparam \
  --action-on-unmanage deleteResources --deny-settings-mode denyDelete
```

**Azure Machine Configuration** (a feature of Azure Policy) audits or configures settings inside machines, as configurations assigned per machine or through policy. Enforcement modes:

| Mode | Behavior |
| --- | --- |
| Audit | Reports compliance only |
| Apply and Monitor (`ApplyAndMonitor`) | Applies once, then reports drift |
| Apply and Autocorrect (`ApplyAndAutoCorrect`) | Applies and corrects drift whenever it is detected |

Requirements: the machine configuration extension and a system-assigned managed identity on Azure VMs (a built-in initiative deploys both), or the Azure Connected Machine agent for Arc-enabled servers. A custom configuration is a PowerShell DSC configuration packaged as a `.zip` with the GuestConfiguration module (`New-GuestConfigurationPackage`), stored in a blob container, and turned into a policy definition with `New-GuestConfigurationPolicy`. A machine accepts up to 50 guest assignments; Virtual Machine Scale Sets in Uniform orchestration aren't supported.

**Azure Automation State Configuration** offers a managed PowerShell DSC pull server: import or compile configurations, register nodes, view compliance reports, forward them to Log Analytics. Linux support already ended in 2023, and the service retires on September 30, 2027.

> **Exam trap.** Complete mode deletes every resource of the resource group that isn't in the template, including resources another team deployed. When only resources previously deployed by this template must be cleaned up, use a deployment stack.

<!-- section: deployment-environments | objectives: 3.5.5 -->
## Azure Deployment Environments for self-service

Azure Deployment Environments lets developers create preapproved application infrastructure on demand from IaC templates curated by platform engineers. **The service retires on February 22, 2027**: Microsoft asks customers to move to another Microsoft, Azure or partner solution before that date. It remains in the AZ-400 study guide.

| Component | Role |
| --- | --- |
| Dev center | Holds projects, catalogs and dev center environment types (shared with Microsoft Dev Box) |
| Catalog | A GitHub or Azure DevOps repository folder scanned for environment definitions |
| Environment definition | An IaC template (ARM or Bicep, other frameworks through the extensibility model) plus its manifest file |
| Environment type | Dev, test, production...: defined at the dev center, enabled per project |
| Project environment type | Maps the type to a deployment subscription, a managed identity and the developers' access level |
| Environment | The deployed resources, in their own resource group |

| Role | Allows |
| --- | --- |
| DevCenter Owner | Manage the dev center |
| DevCenter Project Admin | Manage projects and project environment types, create environments |
| Deployment Environments User | Create environments in a project |
| Deployment Environments Reader | Read environments created by others |

The deployment runs under the project environment type's **managed identity**, which needs Contributor and User Access Administrator on the target subscription: developers don't need any role on the subscription itself. Each environment is created in its own resource group, where project members get Contributor by default. Environments are created from the developer portal, the Azure CLI (`az devcenter dev environment create`) or a pipeline, for example one temporary environment per pull request, deleted when the pull request closes.

> **Exam tip.** "Developers create their own test environments without permissions on the subscription, only from approved templates" points to Deployment Environments: catalog plus project environment type with a managed identity.

<!-- section: key-points -->
## Key points

- Bicep and ARM: Azure only, no state file; Terraform: multicloud, remote state with locking.
- Machine Configuration enforces OS settings through Azure Policy; Automation State Configuration retires on September 30, 2027.
- One template, one parameter file per environment, secrets from Key Vault.
- Lint, validate, `what-if` in the pull request, approval, then deploy with workload identity federation.
- Deployment stacks clean up unmanaged resources and deny changes; Complete mode deletes everything not in the template.
- Deployment Environments: dev center, catalog, environment definitions, project environment types with a managed identity; retires on February 22, 2027.
