A deployment strategy decides how a new version reaches users, how much of the audience it touches first and how fast you can take it back. Exam questions name a constraint (no downtime, test with real users, instant rollback, schema change) and expect the matching pattern, Azure feature or pipeline task.

<!-- section: deployment-strategies | objectives: 3.4.1 -->
## Deployment strategies

| Strategy | How it works | Rollback | Choose it when |
| --- | --- | --- | --- |
| Blue-green | Two identical environments; deploy to the idle one, test, then switch all traffic | Switch back | Instant cut-over and instant rollback, and you can pay for two environments |
| Canary | Send a small share of traffic (or servers) to the new version, watch metrics, then increase | Route the share back | Validate with real traffic while limiting the blast radius |
| Ring | Release to successive groups of users: ring 0 (team), ring 1 (early adopters), then everyone | Stop the rollout at the current ring | Large user base, staged exposure by audience |
| Rolling | Replace instances in batches behind a load balancer | Redeploy the previous version batch by batch | Fixed pool of servers, no second environment |
| Progressive exposure | Umbrella term: canary, rings and percentage rollouts gated by health signals | Stop at the current step | Automated promotion based on telemetry |
| Feature flags | Code deployed dark; a flag turns the feature on for chosen users | Turn the flag off, no redeployment | Separate deployment from release, kill switch |
| A/B testing | Two variants shown to two user groups, measured against a business metric | End the experiment | Decide which variant performs better |

> **Exam trap.** Canary and A/B testing both split users, but a canary validates the **health** of a new version before full rollout, while A/B testing compares **variants** to pick a winner. Blue-green moves 100 % of traffic at once; canary moves it gradually.

Azure Pipelines deployment jobs implement three strategies with lifecycle hooks:

| Strategy | Hooks |
| --- | --- |
| `runOnce` | `preDeploy`, `deploy`, `routeTraffic`, `postRouteTraffic`, then `on: failure` or `on: success`, each once |
| `rolling` | Same hooks per batch of `maxParallel` (count or percentage); supported only for virtual machine resources |
| `canary` | `preDeploy` once, then `deploy`, `routeTraffic`, `postRouteTraffic` for each value of `increments` |

```yaml
jobs:
- deployment: Web
  environment:
    name: prod
    resourceType: VirtualMachine
  strategy:
    rolling:
      maxParallel: 25%
      deploy:
        steps:
        - script: ./deploy.sh
      postRouteTraffic:
        steps:
        - script: ./smoke-test.sh
      on:
        failure:
          steps:
          - script: ./rollback.sh
```

A deployment job downloads the pipeline artifacts in the `deploy` hook automatically but doesn't check out the source: add `checkout: self` when scripts from the repository are needed.

<!-- section: dependency-order | objectives: 3.4.2 -->
## Reliably ordering dependency deployments

Deploy what others depend on first: network and shared infrastructure, then data (database schema), then back-end services, then front ends.

| Requirement | Design |
| --- | --- |
| Infrastructure before the application in one pipeline | Separate stages, `dependsOn: Infra` on the application stage |
| Two independent services, one shared database | Database stage first, then both service stages with `dependsOn: Database` (they run in parallel) |
| A library pipeline must finish before the application pipeline starts | `resources.pipelines` trigger on the library pipeline |
| Deploy only the version that passed the previous stage | Promote the same artifact, never rebuild per stage |
| Two runs must not deploy to the same environment at once | Exclusive lock check on the environment, or `concurrency` in GitHub Actions |
| Resources inside one Bicep file | Implicit dependencies through symbolic references; `dependsOn` only when no reference exists |
| GitHub Actions | `needs: [infra, database]` on the deployment job |

> **Exam tip.** "Reliably ordered" points to explicit dependencies (`dependsOn`, `needs`, pipeline resource triggers), not to timing tricks such as a Delay task.

<!-- section: minimize-downtime | objectives: 3.4.3 -->
## Minimizing downtime: load balancing, rolling deployments and slots

| Technique | Use |
| --- | --- |
| Azure Load Balancer, Application Gateway | Take a VM out of the backend pool (health probe fails), update it, put it back |
| Azure Front Door, Traffic Manager | Shift traffic between regions or between blue and green deployments |
| Virtual Machine Scale Sets rolling upgrade | Upgrade instances in batches with health monitoring |
| Deployment job `rolling` strategy | Batches of VMs from an environment |
| App Service deployment slots | Deploy to staging, warm up, swap with production |

Slots require the **Standard, Premium or Isolated** tier, at no extra cost: up to 5 slots in Standard and 20 in Premium and Isolated. A swap first applies the target's slot settings to the source instances and restarts them, waits for warm-up, then switches routing: production stays online and the swap is a rollback in itself (swap again).

| Swaps with the app | Stays in the slot |
| --- | --- |
| App settings and connection strings not marked as slot setting, framework versions, handler mappings, WebJobs content | Settings marked **Deployment slot setting**, publishing endpoints, custom domains, non-public certificates and TLS settings, scale settings, managed identities, virtual network integration |

- **Swap with preview** pauses after the target's settings are applied, so you can validate before **Complete Swap** or **Cancel Swap**.
- **Auto swap** swaps automatically after each deployment to the slot; not supported on Linux web apps or Web App for Containers.
- Warm-up: `applicationInitialization` in `web.config`, or `WEBSITE_SWAP_WARMUP_PING_PATH` and `WEBSITE_SWAP_WARMUP_PING_STATUSES`.
- **Traffic %** on a slot sends a share of production users to it (canary in App Service); the `x-ms-routing-name` cookie pins a client to the slot.

```bash
az webapp deployment slot swap --resource-group rg-shop \
  --name app-shop --slot staging --target-slot production
```

> **Exam trap.** A connection string that must keep pointing at the test database after the swap is marked as a deployment slot setting on the staging slot. Without it, the staging value moves to production.

<!-- section: hotfix-path | objectives: 3.4.4 -->
## Hotfix path for high-priority fixes

A hotfix plan answers: where the fix is made, how it reaches production fast, and how it gets back into the main line.

1. Create a `hotfix/*` branch from the code that is in production (the release branch or the release tag), not from `main`, which may hold unreleased work.
2. Fix, open a pull request with the normal branch policies or protection rules (fewer reviewers is acceptable, no bypass of required builds and security scans).
3. Run the same pipeline: build once, deploy the artifact through the stages, optionally with shorter wait timers, never skipping production approvals.
4. Merge or cherry-pick the fix back into `main` (and any other active release branch) so the bug doesn't return in the next release.

In trunk-based development, fix in `main` first, then cherry-pick to the release branch. Feature flags are an even faster mitigation: turn off the faulty feature while the hotfix is prepared.

<!-- section: resiliency | objectives: 3.4.5 -->
## Resiliency strategy for deployments

| Risk | Mitigation |
| --- | --- |
| Transient failure of a task (network, throttling) | `retryCountOnTaskFailure` on the task; retry a failed stage from the run |
| Bad version detected after release | Automated rollback in `on: failure`, slot swap back, or redeploy the previous artifact |
| Problem visible only in telemetry | Query Azure Monitor alerts check, or `postRouteTraffic` health checks, before promotion |
| Region outage | Deploy to paired regions behind Front Door or Traffic Manager, one region at a time |
| Unhealthy instance kept in rotation | App Service Health check path, load balancer health probes |
| Configuration drift between environments | Deploy infrastructure and configuration from code on every release |
| Long migration blocking a rollback | Backward-compatible database changes (see below) |

Rollback by redeploying the **previous artifact** works only if artifacts and runs are retained (see the retention strategy in Maintain pipelines). Rolling forward with a hotfix is the alternative when data changes can't be undone.

<!-- section: feature-flags | objectives: 3.4.6 -->
## Feature flags with Azure App Configuration Feature Manager

Feature flags are created in the App Configuration store under **Operations > Feature manager**, as Switch (on or off), Rollout (percentage, users and groups, schedule) or Experiment (variants with allocation). They are stored as key-values with the reserved prefix `.appconfig.featureflag/` and can carry labels per environment.

```json
{
  "id": "NewCheckout",
  "enabled": true,
  "conditions": {
    "requirement_type": "All",
    "client_filters": [
      { "name": "Microsoft.TimeWindow", "parameters": { "Start": "Mon, 01 Dec 2026 08:00:00 GMT" } },
      { "name": "Microsoft.Targeting", "parameters": { "Audience": {
          "Users": [ "anna@contoso.com" ],
          "Groups": [ { "Name": "Ring1", "RolloutPercentage": 50 } ],
          "DefaultRolloutPercentage": 10 } } }
    ]
  }
}
```

| Built-in filter | Turns the flag on |
| --- | --- |
| `Microsoft.Percentage` | For a percentage of evaluations |
| `Microsoft.TimeWindow` | Between `Start` and `End`, optionally recurring |
| `Microsoft.Targeting` | For listed users and groups, a percentage of each group, a default percentage, with exclusions that win |

`requirement_type` is `Any` by default (one passing filter is enough) or `All`. In .NET, the application loads flags with `UseFeatureFlags()` in `AddAzureAppConfiguration`, registers `AddFeatureManagement()` (`Microsoft.FeatureManagement.AspNetCore`) and tests flags with `IsEnabledAsync`, the `FeatureGate` attribute or the `feature` tag helper. Without a `Select` call inside `UseFeatureFlags`, only flags with **no label** are loaded: a flag labeled per environment is loaded with `featureFlagOptions.Select("*", "<label>")`. Flags are refreshed every 30 seconds by default (`SetRefreshInterval`). The application reads the store with a managed identity holding **App Configuration Data Reader**.

> **Exam trap.** Changing a flag doesn't need a pipeline run or a redeployment. If the requirement is "turn the feature off immediately without redeploying", the answer is the flag, not a slot swap.

<!-- section: deploy-apps | objectives: 3.4.7 -->
## Deploying containers, binaries and scripts

| Package | Azure Pipelines | GitHub Actions |
| --- | --- | --- |
| Container image build and push to Azure Container Registry | `Docker@2` (`buildAndPush`) | `docker/build-push-action`, or `az acr build` |
| Container to App Service | `AzureWebAppContainer@1` | `azure/webapps-deploy@v3` with `images` |
| Container to Azure Container Apps | `AzureContainerApps@1` | `azure/container-apps-deploy-action` |
| Binaries (zip, folder) to App Service | `AzureWebApp@1` | `azure/webapps-deploy@v3` with `package` |
| Functions | `AzureFunctionApp@2` | `Azure/functions-action` |
| Scripts | `AzureCLI@2`, `AzurePowerShell@5`, `script`, `pwsh` | `azure/cli`, `run:` after `azure/login` |

```yaml
- task: AzureWebApp@1
  inputs:
    azureSubscription: sc-prod-wif        # workload identity federation service connection
    appType: webAppLinux
    appName: app-shop
    deployToSlotOrASE: true
    resourceGroupName: rg-shop
    slotName: staging
    package: $(Pipeline.Workspace)/drop/*.zip
```

Build once, publish the artifact or image with an immutable tag (the build ID or commit SHA, not `latest`), and deploy that same artifact to every stage.

<!-- section: database-tasks | objectives: 3.4.8 -->
## Deployments that include database tasks

| Approach | Tooling |
| --- | --- |
| State-based (declarative) | SQL Server Database Project compiled to a DACPAC; `SqlAzureDacpacDeployment@1` or SqlPackage `/Action:Publish`; `azure/sql-action` in GitHub Actions |
| Migration-based | Ordered scripts or Entity Framework Core migrations: `dotnet ef migrations script --idempotent` produces a script safe to rerun; migration bundles for a self-contained executable |
| Ad hoc SQL script | `SqlAzureDacpacDeployment@1` with a SQL file, or `Invoke-Sqlcmd` in `AzurePowerShell@5` |

```yaml
- task: SqlAzureDacpacDeployment@1
  inputs:
    azureSubscription: sc-prod-wif
    ServerName: sql-shop.database.windows.net
    DatabaseName: shopdb
    SqlUsername: $(sqlUser)
    SqlPassword: $(sqlPassword)              # secret variable
    DacpacFile: $(Pipeline.Workspace)/db/Shop.dacpac
```

Rules for zero-downtime schema changes:

- Run the database step **before** the application step, in its own stage or job, so the new code finds the new schema.
- Make changes **backward compatible** (expand and contract): add a nullable column or a new table first, deploy the code that uses it, remove the old column in a later release. The previous application version keeps working, which keeps a rollback possible.
- The agent's IP must be allowed by the logical server firewall, or the agent must reach the server privately (self-hosted agent in the virtual network).
- Generate a deployment report or script for review before production, gated by an approval on the environment.

> **Exam trap.** Restoring a database backup is not a deployment rollback strategy: it loses the data written since the backup. Design schema changes so the old code still works, and roll the application back instead.

<!-- section: key-points -->
## Key points

- Blue-green: switch all traffic, instant rollback; canary: small share first; ring: audiences; feature flags: deploy dark, release by configuration.
- Order dependencies with stages and `dependsOn` or `needs`, pipeline resource triggers and one promoted artifact.
- Slots need Standard or higher; slot settings stay, everything else swaps; swap again to roll back.
- Hotfix from the production code, same pipeline and gates, then merge back to `main`.
- App Configuration flags: prefix `.appconfig.featureflag/`, filters Percentage, TimeWindow, Targeting.
- Database first, backward-compatible changes, DACPAC or idempotent migration scripts.
