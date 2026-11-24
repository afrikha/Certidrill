# QZ-az-104-31-arm-bicep — report

Result: `npx tsx factory/check-quiz.ts az-104 31-arm-bicep` gives 0 problem(s), 0 warning(s).

## Plan of the quiz

| # | Obj. | Diff. | Type | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 3.1.1 | 1 | single | Required top-level section (`resources`) |
| 2 | 3.1.1 | 1 | single | Idempotent redeployment leaves resources unchanged |
| 3 | 3.1.2 | 2 | dropdown | `int` + `minValue`/`maxValue`, no `defaultValue` |
| 4 | 3.1.3 | 2 | dropdown | `module` + `params` |
| 5 | 3.1.4 | 2 | single | `az deployment sub create` needs `--location` |
| 6 | 3.1.1 | 3 | yesno | `reference()` gives a dependency, `resourceId()` does not; `uniqueString(subscription().subscriptionId)` gives the same name in every resource group |
| 7 | 3.1.2 | 3 | dropdown | Top-level child resource: full type, `parent/child` name, `equals()` condition, explicit `dependsOn` |
| 8 | 3.1.3 | 3 | dropdown | Subnets in the `subnets` property so they survive a redeployment; `(item, index)` order; `${i + 1}` offset |
| 9 | 3.1.5 | 3 | multi | Exported template before reuse: secure password parameter and a unique storage account name; history export loses portal changes |
| 10 | 3.1.4 | 3 | multi | Complete mode + `copyIndex(1)` loop: deleted = stnwlogs3 and the manual NSG; other resource groups are left alone |

None of these repeats the decision or the scenario of a `c1-*`, `comp-bicep-*` or `cs3-*` mock question (all were read).

## Verified on Learn (fetched)

deployment-modes (incremental and complete, subnets caveat, what-if, deployment stacks), templates/syntax (required elements, minValue/maxValue), templates/resource-dependency (reference implicit, child without implicit dependency), templates/child-resource-name-type, bicep/child-resource-name-type, bicep/modules, bicep/deploy-to-subscription (location required), bicep/loops (`(item, index)`, range), bicep/existing-resource, bicep/resource-declaration, bicep/resource-dependencies, bicep/scenarios-secrets, export-template-portal (passwords missing, hard-coded values, history export is JSON only), PowerShell New-AzDeployment (`-Location` mandatory).

## Doubts and deviations

- Not used because I could not confirm it on Learn: an `existing` resource used as the `parent` of a new child resource. I first planned Q8 on it, then replaced it with the subnets-property design.
- The PowerShell page for `New-AzSubscriptionDeployment` could not be fetched (client error), and New-AzDeployment's page doesn't list that alias, so Q5 uses only Azure CLI commands. The chapter table still lists `New-AzSubscriptionDeployment` (correct as far as I know, but not re-verified).
- Q6, statement s3: the explanation says that the second deployment cannot create a second account with the same name, because storage account names are globally unique. The exact error was not checked.
- `npm run content:validate -- --cert az-104` reports every quiz file in `course/quizzes/` (mine included) as "orphan file (not a chapter file of course.yaml)". The validator doesn't seem to know about quizzes yet. That isn't in my scope, so I didn't change it.
- Bicep `import` (Q4 distractor) is the compile-time import of types/variables; its explanation uses that meaning.
