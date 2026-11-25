# FIX-ai-300-1 — chapters 11, 12, 13, 21 and 22 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert ai-300 11-workspace-resources 12-workspace-assets 13-iac-machine-learning 21-model-training 22-model-registration` 0 problems; `content:validate --cert ai-300` 0 problems, 0 warnings; `check-quiz ai-300` (5 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed. Two tables got one row each in both languages (21 compare-jobs); the others keep their shape.

## 11-workspace-resources

| Finding | Learn | Change |
| --- | --- | --- |
| Studio data preview behind a storage firewall | Confirmed (how-to-administrate-data-authentication): enable the datastore setting **Use workspace managed identity for data preview and profiling in Azure Machine Learning studio**, give the workspace identity Storage Blob Data Reader, plus Reader on the storage private endpoint if there is one | Identity table, data preview row |
| Application Insights deleted | Both statements are on Learn, for different cases. how-to-manage-workspace-cli: if you delete the Application Insights the workspace created, "the only way to recreate it is to delete and recreate the workspace". concept-soft-delete: to recover a soft-deleted workspace, recover the Log Analytics workspace, then recreate Application Insights with its original name | Table row unchanged. Soft-delete paragraph: dependency order with the Application Insights steps |
| Soft delete and role assignments, container registry | Confirmed (concept-soft-delete): role assignments of the workspace identity are recovered (recreation attempted, not guaranteed, up to 15 min to propagate); added ones aren't. The container registry isn't a hard requirement: images are regenerated | Recovered/lost table, left cell; soft-delete paragraph |
| Default role of the workspace system-assigned identity | Confirmed (how-to-assign-roles): Azure AI Administrator for workspaces created after 2024-11-19; Contributor on the resource group before | Managed identity table, system-assigned row |
| Storage Blob Data Contributor for a user-assigned identity | Confirmed optional, only for data preview (how-to-identity-based-service-authentication). Key Vault Administrator (RBAC model) isn't optional | User-assigned identity paragraph |
| Reader can view datastore credentials | Learn contradicts itself: how-to-assign-roles says Readers can view datastore credentials; how-to-administrate-data-authentication says retrieving credentials needs `datastores/listsecrets/action` and lists Contributor, Azure AI Developer, AzureML Data Scientist | None. For a human decision (see below) |
| Missing: cluster in another region | Confirmed (how-to-create-attach-compute-cluster): clusters only, not instances; more latency and data transfer costs. Not supported with a managed virtual network (how-to-managed-network) | Compute cluster paragraph: one sentence |
| Missing: instance with managed identity and idle shutdown | Confirmed (how-to-identity-based-service-authentication): no idle shutdown unless the identity has Contributor on the workspace | Idle shutdown bullet: one sentence |

## 12-workspace-assets

| Finding | Learn | Change |
| --- | --- | --- |
| Curated environment URI, `environment` or `environments` | Learn inconsistent: how-to-manage-environments-v2 writes `.../registries/azureml/environment/...`; the share page and serverless page write `.../environments/...` in working examples | None (the chapter keeps the plural, used in Learn's examples) |
| Pipeline output binding `parents.outputs` | reference-yaml-job-pipeline writes `parents` in one row, `parent` in inputs and examples (typo) | None |
| Registry name rules | Confirmed (how-to-manage-registries): 2-32 characters, alphanumerics, `_` and `-`, starts with an alphanumeric, unique in the Microsoft Entra tenant, can't be changed | Registry rules table, Name row |
| Workspace region must be a registry region | Confirmed on how-to-share-models-pipelines-across-workspaces-with-registries (Prerequisites, pipeline warning, deploy section) | None |
| Image build behind private endpoints ("registry tasks can't build images") | how-to-secure-workspace-vnet: by default a serverless compute builds images, which works only when storage and registry have no network restriction; otherwise an image-build compute: CPU SKU only, same VNet, a no-public-IP cluster needs a UDR to the internet. concept-environments: default build on serverless quota | Environments rules, last bullet rewritten |
| Bank: reserved `Microsoft` prefix (`ai300-1a-env-facts` s1) | Confirmed (concept-environments: "AzureML-" and "Microsoft" reserved for curated environments) | None |

## 13-iac-machine-learning

| Finding | Learn | Change |
| --- | --- | --- |
| API version | The template reference pages now list `2026-09-01` as the newest version for both `workspaces` and `workspaces/computes` (also 2026-07-01, 2026-07-15-preview); the 2026-09-01 workspace page exists. GA is inferred from the absence of a `-preview` suffix | Prose: latest GA `2026-09-01`, examples keep `2026-05-01` (still valid). Key point updated. Code unchanged |
| Switching isolation modes | Confirmed (how-to-managed-network): approved-only → internet outbound refused; internet outbound → approved-only refused; can't be disabled | Network rules bullet, key point |
| Workspace private endpoints created on provisioning | Confirmed: created only when the first compute is created or provisioning is forced | Private endpoint bullet |
| Serverless Spark | Confirmed: manual `provision-network --include-spark`; disable public network access before provisioning | Provisioning bullet |
| Image build compute | Same as 12 (how-to-secure-workspace-vnet) | BYO-VNet paragraph, last sentence |
| `contents: read` | Not on Learn. GitHub workflow syntax page: when any permission is specified, the unspecified ones are set to none. The need of `actions/checkout` for `contents: read` isn't stated there either | None (GitHub behaviour, consistent with GitHub docs) |
| `network_settings.subnet` | Confirmed (reference-yaml-compute-aml): subnet name or full subnet resource ID; don't set `vnet_name` with an ID | None |

## 21-model-training

| Finding | Learn | Change |
| --- | --- | --- |
| Default `compute` of a command job | Learn contradicts itself: how-to-use-serverless-compute says a job without `compute` runs on serverless; reference-yaml-job-command still lists default `local` | None (the chapter follows the more specific serverless page). Flag |
| Step types in a pipeline | reference-yaml-job-pipeline: "only command jobs and sweep jobs"; how-to-use-parallel-job-in-pipeline: a parallel job "can be used only as a step in a pipeline job" | training-pipelines: "and a parallel job runs only as a pipeline step" |
| AutoML `max_concurrent_trials` | Confirmed (how-to-configure-auto-train): match the cluster nodes; compute instance = number of cores; ignored in distributed classification/regression. "Defaults to 1" in the distributed forecasting part refers to the number of trial models trained in parallel; not added | Settings table row |
| `trial_timeout_minutes` default | Confirmed: 43,200 minutes (1 month) | Settings table row |
| Ensembles | No default on Learn; not supported in distributed training mode | None |
| Vision tasks | Confirmed (how-to-auto-train-image-models): image classification, multi-label classification, object detection, instance segmentation (none preview); at least 10 images; MLTable from JSONL | Task types table, Images row |
| `delay_evaluation` | Confirmed (how-to-tune-hyperparameters): the policy applies at every multiple of `evaluation_interval` ≥ `delay_evaluation`; example "starting at evaluation interval 5" | Sweep paragraph reworded |
| `search_runs` tag operators | Confirmed (how-to-track-experiments-mlflow): `!=` not supported for tags; `LIKE`/`ILIKE` supported | compare-jobs table: new row |

## 22-model-registration

| Finding | Learn | Change |
| --- | --- | --- |
| Responsible AI scorecard is preview | Confirmed: "How to generate a Responsible AI scorecard (preview)" (how-to-responsible-ai-insights-sdk-cli); the scorecard page title also says preview. concept-responsible-ai doesn't label it | "(preview)" in the section and the key point. Bank question rewritten (below) |
| Fetch Registered Model | Learn contradicts itself: the Limitations list says models must be supplied by that component; the YAML examples pass the registered model to the constructor's model input (`type: mlflow_model`, `path: azureml:<name>:<version>`) | Sentence replaced by the documented constructor input. Flag |
| Component → principle table | concept-responsible-ai: fairness assessment → fairness and inclusiveness; error analysis → reliability and safety; interpretability and counterfactual what-if → transparency; causal inference and counterfactual → accountability. concept-data-analysis links data analysis only to fairness | Fairness row: "Fairness and inclusiveness"; Data analysis row: "Fairness" |
| "At least 10 counterfactuals per data point" | Not on Learn. `total_CFs`: counterfactual points per test row, default 10 | Cell reworded to the default |
| AutoML models not supported | Confirmed (concept-responsible-ai-dashboard) | Requirements bullet: one sentence |
| `--stage` on `az ml model` | Confirmed: `create`, `update`, `list` have `--stage` ("Stage of the model."); MLflow stages can't be retrieved with the CLI (how-to-manage-models-mlflow) | Stages paragraph: one sentence |
| Feature retrieval component details | Confirmed (feature-retrieval-concepts): `input_model` is `custom_model`; only one of `input_model` / `feature_retrieval_spec` required; output always Parquet with the spec at the root; for training data made otherwise, pass the spec to the training job and copy it into the model folder | New paragraph in feature-retrieval-spec |

## Mock-exam bank questions changed

- `questions/ml-lifecycle/ai300-2b-rai-scorecard.yaml` (2.2.3, multi, difficulty 2): the correct answer relied on the Responsible AI scorecard, a preview feature. Rewritten on a GA decision: which two dashboard components address the transparency principle (model interpretability and counterfactual what-if; distractors error analysis, causal analysis, data analysis). Same id, type, objective and difficulty; references concept-responsible-ai and concept-responsible-ai-dashboard.
- `questions/ml-lifecycle/ai300-sr2-sweep-slack-3.yaml` (EN + FR explanation) and `series/ai300-sr2-sweep-slack.yaml` (EN + FR stem requirement): "`delay_evaluation=5` skips the first five intervals" / "not during the first five intervals" contradicted Learn (with 1 and 5 the policy starts at interval 5). The requirement now says "starting at the fifth interval" and the explanation "makes the first evaluation happen at interval 5". Answers unchanged (Yes for sr2-3, No for sr2-1 and sr2-2).

Checked and left unchanged: soft delete and Application Insights (`ai300-1a-ws-recover-order`, `ws-delete-all`, `ws-byo-yaml`), datastore identities (`ai300-1a-ds-adls-nosecret`, `iam-uai-facts`), image build (`ai300-1a-env-private-build`, `ai300-1b-net-requirements-map`, `env-build-timing`, `env-facts`), managed network modes (`ai300-1b-net-pypi-rule`, `net-managed-statements`, `net-yaml-provision`, `net-exfiltration`, `cs2a-outbound-rules`; none assumes an internet → approved-only update), Bicep API versions (`ai300-1b-iac-bicep-*` use 2026-05-01 / 2026-07-01, `ai300-cs3a-workspace-bicep` uses 2026-09-01, all listed on Learn), `search_runs` (`ai300-2b-cmp-or-filter`: option d's "`!=` not supported for tags" is right), the other sweep questions (`ai300-2a-sweep-bandit-hotarea`, sr2-1, sr2-2), the other RAI questions (`ai300-2b-rai-*`, `cs3a-rai-components`; the scorecard is only a distractor in `rai-connect-compute` and `rai-pipeline-yaml`), and the model lifecycle questions.

## Quiz files

None changed. The five quizzes still agree with the corrected chapters (check-quiz 0/0). Quiz 13 Q10 already uses the serverless-default image build reason.

## For a human decision

- **Reader and datastore credentials.** how-to-assign-roles ("Readers can list and view assets, including datastore credentials") versus how-to-administrate-data-authentication (`listsecrets/action`, held by Contributor, Azure AI Developer, AzureML Data Scientist). The chapter 11 exam trap and key point, and the bank questions `ai300-1a-ds-reader-creds` and `ai300-cs3a-workspace-roles` follow the first page. If the second page is right, options a and b of `ai300-1a-ds-reader-creds` also meet the goal. Not changed.
- **Default `compute` of a command job** (`local` in the YAML schema, serverless on the serverless page). The chapter follows the serverless page.
- **Fetch Registered Model.** Learn's Limitations list requires it, its examples don't use it. The chapter now describes only the documented constructor input.
- **`az ml model update --stage`.** The CLI reference says only description and tags can be updated, but lists `--stage` on `update`. `ai300-2b-life-tag-archive-cli` (explanation of s2b: "`stage` is not one of the mutable fields") follows the first sentence; the answer doesn't change either way.
- **API version "GA".** The template reference doesn't label versions; 2026-09-01 is called GA because it has no `-preview` suffix.
- **`contents: read`** in chapter 13: true per GitHub's workflow syntax page (unspecified permissions become none), not on Learn.

## French terms not settled (not in the glossary)

- « multi-étiquette » (multi-label) and « segmentation d'instance » (instance segmentation), chapter 21: « étiquette » is the glossary term for Azure tags.
- « préversion » (preview), « disponibilité générale » (GA), « itinéraire défini par l'utilisateur » (UDR, from the questions guide), « référentiels de packages » (package repositories), chapters 12, 13, 22.
- « Équité et inclusivité », « transparence », « responsabilité » (responsible AI principles): existing chapter wording, not in the glossary.
- « carte de performance IA responsable » (Responsible AI scorecard, existing in 22) versus « scorecard » in the bank question `ai300-2b-rai-pipeline-yaml` and `rai-connect-compute`.
- « phases » (MLflow stages, existing in 22).
- No « appairé » or other glossary violation found in the five French chapters.
