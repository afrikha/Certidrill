# QZ-az-400-35-infrastructure-as-code — report

File: `content/az-400/quizzes/35-infrastructure-as-code.yaml` (10 questions, `az400-qz-35-01` to `-10`). Check: `npx tsx factory/check-quiz.ts az-400 35-infrastructure-as-code` → 0 problem(s), 0 warning(s).

## Coverage

| # | Obj. | Diff. | Type | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 3.5.1 | 1 | single | One-time first-boot bootstrap of Linux VMs → cloud-init |
| 2 | 3.5.4 | 1 | single | Deployment stack: keep removed resources unmanaged → `detachAll` |
| 3 | 3.5.3 | 2 | single | JSON ARM templates, recommended practices without Azure → arm-ttk `Test-AzTemplate` |
| 4 | 3.5.2 | 2 | single | Nightly drift reset, keep unmanaged resources and operator access → scheduled Incremental redeploy |
| 5 | 3.5.5 | 2 | single | One subscription per environment type → project environment types |
| 6 | 3.5.4 | 3 | yesno | Machine Configuration: autocorrect, Arc agent includes the extension, VMSS Uniform unsupported |
| 7 | 3.5.5 | 3 | single | Environment creator role(s) + additional access on a project environment type |
| 8 | 3.5.2 | 3 | dropdown | JSON parameter file Key Vault `reference` / `keyVault.id` / `secretName` |
| 9 | 3.5.4 | 3 | ordering | Custom Machine Configuration policy: MOF → package AuditAndSet → blob → policy ApplyAndAutoCorrect → publish/assign |
| 10 | 3.5.3 | 3 | multi | Azure Repos PR validation by branch policy, approval on environment (not the shared service connection), WIF |

All 40 mock-exam questions of 3.5.1–3.5.5 were read; no decision is repeated with the same answer.

## Facts verified on Learn (November 2026)

- Azure Deployment Environments retires on **22 February 2027** (overview page, updated 2026-09-14). It stays in the study guide and isn't retired yet, so it's still used as a correct answer (Q5, Q7); revisit these questions after that date.
- Azure Automation State Configuration retires on September 30, 2027; DSC for Linux retired on 30 September 2023.
- Project environment type settings: deployment subscription, deployment identity, Environment creator role(s), Additional access; the dev center identity needs Contributor and User Access Administrator on the deployment subscription.
- Machine Configuration: VMSS Uniform not supported (Flex is), 50 guest assignments per machine, extension not required on Arc-enabled servers (in the Connected Machine agent); package `Type` `Audit`/`AuditAndSet`; policy `Mode` `Audit` (default)/`ApplyAndMonitor`/`ApplyAndAutoCorrect`.
- Deployment stacks: `detachAll`, `deleteResources`, `deleteAll`; detach is the default behavior; deny modes `none`, `denyDelete`, `denyWriteAndDelete`.
- Deployment modes: Incremental reapplies all properties of declared resources and leaves other resources unchanged; Complete mode "not recommended" and "will be gradually deprecated" in favor of deployment stacks.
- ARM template test toolkit only for ARM JSON; Bicep files use the linter.
- Azure Repos Git: YAML `pr` triggers not supported, PR validation through build validation branch policy; checks of all resources used in a stage must pass before the stage starts.

## Doubts / unverified

- Q7: the Learn page doesn't give the default value of "Environment creator role(s)"; the chapter says creators get Contributor by default. The question doesn't depend on the default.
- Q8: `defaultValue` (template) and `vaultUri` (vault resource property) are real names used as distractors; `SecretUri` is the App Service Key Vault reference syntax, not a parameter file property.
- FR: « kit de ressources de test de modèle ARM » and « serveurs avec Azure Arc » follow usual fr-fr Learn wording but were not rechecked page by page.

## Chapter issues (not edited)

- The chapter says Complete mode is an option "at resource group scope"; Learn now states that Complete mode will be gradually deprecated (not only "not recommended"). Worth a sentence in the desired-state section.
- The chapter's deployment-environments table says project members get Contributor on their environment resource group "by default": not stated on the current "Configure project environment types" page (the creator roles are a selection). Recheck.
- No error found in the mock-exam questions read.
