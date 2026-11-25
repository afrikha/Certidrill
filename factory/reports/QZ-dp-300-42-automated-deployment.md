# QZ-dp-300-42-automated-deployment — notes

`content/dp-300/quizzes/42-automated-deployment.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 4.2.1 (q1, q7, q10), 4.2.2 (q3), 4.2.3 (q4, q6), 4.2.4 (q2, q5, q8, q9). Positions 6–10: dropdown ×2, multi, single, yesno_statements.

## Chapter vs current Learn (fix in the chapter, not done here)

- No error found in the chapter. Confirmed on Learn: `@secure()` / `securestring` values are not logged or kept in the deployment history; `az bicep decompile`; .bicepparam with `New-AzResourceGroupDeployment -TemplateParameterFile` (Az PowerShell 10.4+ and Bicep CLI 0.22+, local file only; `-TemplateParameterUri` takes JSON files only); `az sql db update --auto-pause-delay -1` disables auto-pause; `--max-size` is in bytes without a unit; deployment history cleanup from 700 to 600, hard limit 800, blocked by a CanNotDelete lock on the resource group **or the subscription**; what-if makes no change.
- Possible additions: the history cleanup is also triggered by what-if and validate operations, and it can be disabled per subscription with the `DisableDeploymentGrooming` feature (the 800 limit still applies). The chapter only mentions the resource group lock, not the subscription lock.
- Serverless: auto-pause is GA in General Purpose but still **preview in Hyperscale** (serverless overview). The chapter's `autoPauseDelay` row doesn't say so; worth a note if a question ever combines Hyperscale serverless and auto-pause.
- `az sql vm create --sql-mgmt-type` is marked deprecated in the CLI reference. The chapter doesn't use it.

## Not verified on a fetched page

- q9: Learn says that a CanNotDelete lock on a resource group (or subscription) blocks the automatic cleanup and that locks are inherited by child resources. It doesn't explicitly say that a lock on a resource (the logical server) leaves the history cleanup working. This follows from the scope of the lock (deployments are children of the resource group, not of the server), but it is an inference.
- q4: the HA/DR licensing page says pay-as-you-go customers can use the HA/DR (`DR`) license type for a passive replica. The extra conditions of the free passive replica (no reads, no backups) come from general licensing knowledge and are stated in the stem as facts of the scenario, not tested.
- q5: the chapter and the generic error page map an operation already in progress to `Conflict`. Azure SQL can also return its own conflict codes (for example for concurrent database operations); the stem gives the code explicitly.
- q6: the minimum vCores allowed for a GP serverless database with 8 max vCores (1.0) wasn't on a fetched page; the question uses 2, which is inside any plausible range.

## Design notes

- The mock bank already covers most decisions of the chapter (dependsOn, Entra-only admin, Key Vault reference, deployment modes, SKU redeploy, PSCredential, -AsJob/--no-wait, list-editions, firewall 0.0.0.0, error-code matching, failed operations, debug logging sequence, what-if/validate, provider registration, uniqueString as a fix). The quiz tests other decisions: decompile, activity log vs deployment history, .bicepparam deployment cmdlet, `DR` license type, `Conflict`, serverless conversion with `update` / `--min-capacity` / `-1`, ARM `securestring` + full child name, recovery after a partial failure, the lock that blocks history cleanup, and the dependency that full-name child resources don't infer plus derived-secret outputs.
- q7 and q10 both touch the full-name child resource pattern, but test different decisions (name format in JSON vs missing implicit dependency in Bicep).
