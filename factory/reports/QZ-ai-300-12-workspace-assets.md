# QZ-ai-300-12-workspace-assets — notes

Quiz `content/ai-300/quizzes/12-workspace-assets.yaml`: 10 questions (1.2.1 ×3, 1.2.2 ×2, 1.2.3 ×2, 1.2.4 ×3). Positions 6–10: dropdown (YAML), single, single, yesno_statements, dropdown (Python). `check-quiz` = 0 problems, 0 warnings.

## Chapter vs current Learn (to check in the chapter, not done here)

- **Curated environment URI, singular or plural.** "Manage Azure Machine Learning environments with the CLI & SDK (v2)" and "CLI (v2) command component YAML schema" write `azureml://registries/azureml/environment/<name>/...` (singular). The serverless, registries-share and pipeline pages, the chapter and the mock bank write `.../environments/...` (plural). Learn isn't consistent. The plural form is the one in the working examples. The quiz uses only the plural form, for a custom registry environment (q10), as on the share page.
- **Pipeline output binding.** The "CLI (v2) pipeline job YAML schema" page shows `${{ parents.outputs.<output_name> }}` ("parents"), which looks like a typo on Learn. "Create and run component-based ML pipelines (CLI)" uses `${{parent.outputs...}}`, as the chapter does. That same schema page says `default_compute` must name an existing compute (`azureml:<compute-name>`), while the CLI pipelines page documents `azureml:serverless`. The chapter is right.
- **Registry name rules.** The chapter gives only "2 to 32 characters, can't be changed". Learn adds that alphanumerics, underscore and hyphen are allowed, that the name must start with an alphanumeric, and that it is unique within the Microsoft Entra tenant.
- **Registry region rule for workspaces.** The chapter says "a workspace can use the registry only if its region is one of the registry's regions". The "Create and manage registries" page I fetched doesn't state this rule explicitly. It only says that multiregion replication lets workspaces in different regions use the assets. The quiz doesn't rely on it. The mock question `ai300-1b-reg-new-region` does.
- **AutoML input.** Learn says AutoML v2 accepts MLTable data assets and, for backward compatibility, v1 Tabular Datasets. The chapter's "AutoML with tables" row matches this.
- **For the bank, not this quiz.** The mock question `ai300-1a-env-facts` (s1) relies on a reserved `Microsoft-` prefix. The environments page I fetched doesn't mention it: it documents only the `AzureML-` prefix of curated environments. Worth re-checking.

## Facts not verified on a fetched page

- q7: Learn says that the `eval_*` modes are needed because the files an MLTable yields can sit in another storage account and are visible only after the MLTable is evaluated. The claim in the explanation that `ro_mount` mounts the folder that holds the MLTable file (and not the files it lists) is an inference from the generic definition of `ro_mount` ("mount storage location"). The page doesn't say it explicitly.
- q10: `load_component`, `MLClient.from_config()` and `components.create_or_update()` are standard azure-ai-ml SDK v2 calls, from memory. Only the `MLClient(credential=..., registry_name=..., registry_location=...)` form is shown on the fetched page.
- q8: "pip packages of the base image aren't available in the conda environment" comes from the chapter (it's verified per the course report `C-ai-300-1`). The environments page I fetched doesn't restate it.

## Design notes

- q2: the stem doesn't say "inline", so that the correct option (anonymous / not tracked) doesn't repeat the stem's word.
- q4: the option set is close to `ai300-1b-reg-role-assets`, but the decision differs: consume only means Reader, while publish means Registry User. The stems are different.
- q6: the step-level `compute` override is shown on the pipeline YAML schema page. Learn doesn't document `serverless` without the `azureml:` prefix, so it isn't offered as a distractor.
- q8: `litware-features` is stated as not published to any feed, so that "add it to the conda file" can't be a valid answer.
- These mock-exam decisions were avoided: images → uri_folder, MLTable file name, mltable creation order, archive statements, wrong path or type, modes matching, output asset, conda module error (image only), curated URI, Dockerfile YAML, build timing, private build compute, description update, environment new version, component name/input/add-input/new version/optional input/binding/register order/CLI match, registry commands, component environment in registry, data statements, deploy URI, new region, pipeline order, promote/share model, Registry User role.
- French: region names follow Learn FR (« USA Est », « Europe Ouest »). Portal and code values stay in English.
