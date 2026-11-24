# QZ-az-400-34-deployments — report

File: `content/az-400/quizzes/34-deployments.yaml` (10 questions, `az400-qz-34-01` to `-10`). Check: `npx tsx factory/check-quiz.ts az-400 34-deployments` → 0 problem(s), 0 warning(s).

## Coverage

| # | Obj. | Diff. | Type | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 3.4.1 | 1 | single | Canary deployment job: `preDeploy` runs once, other hooks per increment |
| 2 | 3.4.6 | 1 | single | Flags stored as key-values with prefix `.appconfig.featureflag/` |
| 3 | 3.4.3 | 2 | single | Auto swap unsupported on Linux → `AzureAppServiceManage@0` Swap Slots |
| 4 | 3.4.4 | 2 | single | Fix main first, cherry-pick into two supported release branches |
| 5 | 3.4.2 | 2 | single | Bicep: hard-coded resource ID string → no implicit dependency; use `plan.id` |
| 6 | 3.4.8 | 3 | single | SQL server with public access denied → self-hosted agent with private line of sight |
| 7 | 3.4.7 | 3 | dropdown | GitHub Actions to Container Apps: `needs`, `environment`, `imageToDeploy` |
| 8 | 3.4.3 | 3 | multi | Managed identities aren't swapped → Key Vault reference fails after swap |
| 9 | 3.4.5 | 3 | single | Non backward-compatible migration → roll forward, not rollback/restore |
| 10 | 3.4.6 | 3 | yesno | `UseFeatureFlags()` loads no-label flags only; TimeWindow; 30 s refresh |

All mock-exam questions of 3.4.1–3.4.8 (about 80, including case studies and series sr2) were read; none of their decisions is repeated with the same answer.

## Facts verified on Learn (November 2026)

- Deployment jobs: canary runs `preDeploy` once and iterates `deploy`/`routeTraffic`/`postRouteTraffic`; artifacts auto-downloaded only in `deploy`; no automatic checkout.
- Slots: auto swap not supported for Linux web apps and Web App for Containers; managed identities are in the "not swapped" list.
- Key Vault references: system-assigned identity by default, `keyVaultReferenceIdentity` for a user-assigned identity, role Key Vault Secrets User.
- App Configuration: prefix `.appconfig.featureflag/`; `UseFeatureFlags()` without parameter loads flags with no label; default flag refresh interval 30 s; TimeWindow/Percentage registered by `AddFeatureManagement()`, Targeting only with `WithTargeting()`.
- Azure SQL Private Link: with public access denied only private endpoint connections are allowed; firewall rules can't be created or modified then (connectivity-settings page, error 42101).
- Bicep dependencies: implicit through symbolic references; explicit `dependsOn` discouraged when a reference exists.

## Doubts / unverified

- Q5: the Bicep dependencies page doesn't state explicitly that a hard-coded string or `resourceId()` creates no dependency (general Bicep behavior, also reflected by the linter rule `use-resource-symbol-reference`). The question avoids offering an explicit `dependsOn` on the web app, so only one option works.
- Q10: the ASP.NET Core feature flag quickstart no longer shows `app.UseAzureAppConfiguration()`; the snippet includes it anyway (harmless, and required by the dynamic configuration tutorial for refresh).
- Q7: Learn's Container Apps GitHub Actions page still shows `azure/container-apps-deploy-action@v1` with `creds` (service principal secret); the quiz uses `@v1` (as on Learn) with OIDC `azure/login@v2`. The page also doesn't document the GitHub environment approval; the OIDC page mentions that a job can't access environment secrets until a required reviewer approves.
- Q6 FR: portal labels « Refuser l'accès au réseau public » and « Autoriser les services et les ressources Azure à accéder à ce serveur » were not checked on fr-fr Learn.

## Chapter issues (not edited)

- FR chapter uses « permutation » / « permuter » for swap; the shared glossary (confirmed on fr-fr Learn) says « échange », « échange avec aperçu », « échange automatique ». The quiz follows the glossary.
- The chapter says slots allow "up to 5 slots in Standard and 20 in Premium and Isolated"; the staging slots page now only says Standard supports five and refers to the App Service limits page for the rest (not rechecked).
- The chapter's feature flags section says flags are refreshed every 30 s "by default" — still correct; it doesn't mention that `UseFeatureFlags()` without a selector loads only no-label flags, nor that the key-value `Select` label doesn't apply to flags (a useful trap to add next to the labels sentence).
- The Container Apps GitHub Actions page on Learn is outdated (v1 action, `creds` secret); the chapter's `azure/container-apps-deploy-action` row is fine but carries no version.
