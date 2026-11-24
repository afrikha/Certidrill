# QZ-ai-300-13-iac-machine-learning — notes

Quiz `content/ai-300/quizzes/13-iac-machine-learning.yaml`: 10 questions (1.3.1 × 1, 1.3.2 × 3, 1.3.3 × 2, 1.3.4 × 3, 1.3.5 × 1). Types: single 5, dropdown 3, yesno_statements 1, multi 1. Positions 6–10: yesno_statements, single, dropdown, multi, dropdown. Checker: `0 problem(s), 0 warning(s)`.

## Sources fetched (2026-11-24)

Managed virtual network isolation (how-to-managed-network, three reads); Microsoft.MachineLearningServices/workspaces and workspaces/computes (Bicep reference); Git integration; Authenticate to Azure from GitHub Actions by OpenID Connect; GitHub Actions for CI/CD; Create a trust relationship between an app and an external identity provider; Azure built-in roles for Privileged; Install and set up the CLI (v2); Secure training environments with virtual networks; Secure an Azure Machine Learning workspace with virtual networks.

## Chapter vs current Learn (to fix in the chapter, not done here)

- **API version.** The chapter says "the current stable API version is `2026-05-01`". True for `workspaces` (latest listed), but `workspaces/computes` now also has a newer GA version `2026-07-01` (and `2026-07-15-preview`). Using `2026-05-01` for both is still valid.
- **Switching isolation modes.** The chapter only says isolation can't be disabled once enabled. Learn also says the mode can't be changed in either direction: approved-only → internet outbound is refused, and "If the workspace was created with `ALLOW_INTERNET_OUTBOUND`, it can't be updated later to use `ALLOW_ONLY_APPROVED_OUTBOUND`." Worth adding to the chapter (and checking against bank questions that might assume an internet → approved upgrade).
- **Image build compute.** The chapter says "registry tasks can't build the images". Current Learn wording: by default a serverless compute builds the image, which works only when the workspace-dependent resources (storage, registry) aren't behind private endpoints; otherwise set an image-build compute. It must be a **CPU** compute cluster in the same VNet; a no-public-IP cluster needs a route (UDR) to reach the internet. The chapter could update the reason and add the CPU-only limit.
- **Workspace private endpoints in the managed network** are created only when the first compute is created or when provisioning is forced (the chapter implies they're created at once).
- **Serverless Spark.** Learn requires `az ml workspace provision-network ... --include-spark` and disabling public network access before provisioning; the chapter only says to provision before a serverless Spark job.
- **`contents: read`.** The chapter says `contents: read` is needed by `actions/checkout` once permissions are explicit. That is GitHub behaviour; no Learn page states it, and Learn's own workflow examples grant only `id-token: write`. Not tested in the quiz.
- **`network_settings.subnet`** in the compute YAML: not found on a fetched Learn page (Learn shows `az ml compute create --vnet-name ... --subnet ...` and `--set enable_node_public_ip=False`). Not verified, not tested.

## Bank observation (outside this task)

- `ai300-cs3a-workspace-bicep` uses `Microsoft.MachineLearningServices/workspaces@2026-09-01`, a version that the workspaces template reference page doesn't list (latest: `2026-05-01`). To check.

## Facts relied on that Learn states only indirectly

- Q4: `az configure --defaults` persists for later steps of the same job because the steps share the runner's file system (Azure CLI configuration). Learn shows the command and its purpose, not the runner behaviour.
- Q9: environment secrets and protection rules apply only to jobs that reference the environment (GitHub behaviour). Learn says a job can't read environment secrets until a required reviewer approves, and that the subject of a job tied to an environment is `repo:<org>/<repo>:environment:<name>`.
- Q10: compute in your own VNet requires the managed network isolation mode to stay `Disabled` (Learn: with a managed VNet, compute can't be deployed in your Azure Virtual Network). The BYO-VNet pages aren't labelled legacy; they point to managed VNet as an alternative.

## Design notes

- Bank coverage of 1.3.x is dense (45 questions, case studies and two series included); the quiz avoids their decisions: no OIDC-vs-secret, no secret values, no Data Scientist / Compute Operator roles, no `id-token: write` fix, no pypi FQDN / storage PE rule, no `~/cloudfiles/code/Users` clone, no dirty-flag fix.
- New decisions: child resource type (Q1), rule type allowed in internet outbound mode (Q2), local-disk clone for speed (Q3, opposite answer of the bank question), `az configure --defaults` (Q4), user-assigned workspace identity in Bicep (Q5), FQDN port limit / auto PE regardless of public access / cross-region cluster (Q6), Contributor + Role Based Access Control Administrator for Bicep role assignments (Q7), compute instance in Bicep (Q8), environment reference + environment credential together (Q9), BYO subnet + image build compute (Q10).
