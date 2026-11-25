# QZ-ai-300-22-model-registration: notes

Check: `npx tsx factory/check-quiz.ts ai-300 22-model-registration` gives 0 problems and 0 warnings. 10 questions: 2.2.1 (q5, q10), 2.2.2 (q3, q6, q7), 2.2.3 (q1, q9), 2.2.4 (q2, q4, q8). Positions 6–10 use hotarea, single, yesno_statements, multi and single.

## Chapter vs current Learn (fix these in the chapter; I did not edit it)

- **Responsible AI scorecard is in preview.** The Learn page "Generate Responsible AI insights with YAML and Python" titles the section "How to generate a Responsible AI scorecard (preview)", and the component is referenced as `azureml:rai_score_card@latest`. The chapter (section responsible-ai, key points) presents the scorecard with no preview label. The mock question `ai300-2b-rai-scorecard` uses the scorecard as its correct answer. The quiz doesn't use the scorecard.
- **Fetch Registered Model.** The chapter says the model "is supplied by the Fetch Registered Model component". On Learn, that component appears only once, in the Limitations list. The YAML examples on the same page pass the model straight to the constructor (`type: mlflow_model`, `path: azureml:<name>:<version>`). The Learn page contradicts itself, so the chapter should not state this as fact.
- **Component → principle table.** I couldn't find the mapping of dashboard components to responsible AI principles on "Assess AI systems by using the Responsible AI dashboard". That page never maps components to principles. The source may be another page; I didn't verify it, and the quiz doesn't test it.
- **"At least 10 counterfactuals per data point".** I didn't find this wording on the pages I fetched. The YAML/Python page only gives `total_CFs` with a default of 10.
- **RAI scope.** The concept page says AutoML MLflow models and AutoML models registered from the UI aren't supported. The chapter doesn't say this, but the mock question `ai300-2b-rai-statements` (s3) tests it. Consider adding one line to the chapter.
- **Stages.** The chapter says MLflow stages can't be read with the Azure Machine Learning CLI. That's true per "Manage models registry in Azure Machine Learning with MLflow". However, the `az ml model` reference lists a `--stage` parameter on `create`, `update` and `list`, which is the Azure Machine Learning asset's own stage. A learner may confuse the two, so a short clarification in the chapter would help. The quiz avoids stages.
- **Feature retrieval component (extra details on Learn, not errors):** its `input_model` input is typed `custom_model`. Only one of `input_model` and `feature_retrieval_spec` is required. Its output is always Parquet, with `feature_retrieval_spec.yaml` at the root of the output folder. When the training data isn't produced by the component, the spec has to be passed to the training job as an input and copied into the model folder. q10 relies on that last point, which the chapter doesn't spell out.

## Facts I verified but that rest on inference

- q6: the MLmodel lines (`pickled_model`, `sklearn_version`, `env: conda.yaml`) follow the usual MLflow 2.x format; the Learn example is a fastai model. The pairing of column-based inputs with tensor outputs is what `infer_signature(DataFrame, ndarray)` produces, but I didn't see it on a Learn page. Newer MLflow versions write `env` as a nested mapping.
- q7: `runs:/<run-id>/<artifact_path>` follows the Learn MLflow pages, which show MLflow 2 behaviour. MLflow 3 renames the `log_model` argument to `name` and introduces logged models. Revisit q7 if Azure Machine Learning documents MLflow 3 differently.
- q8 s1: I took "a new deployment can reference an archived version" from Learn's sentence "You can continue to reference and use an archived model in your workflows".
- q8 s3: Learn says deleting a whole model container isn't supported and that you delete each version instead. That `delete_registered_model()` fails in Azure Machine Learning is an inference from this.
- q9: Learn requires the sklearn flavor. That a pyfunc-only model (a custom `PythonModel` wrapper) is rejected is an inference from this requirement.

## Overlap with the mock exam (different decision or combination, but related facts)

- q4 (why version 7 is hidden) uses the fact behind distractor c of `ai300-2b-life-restore-container`. Here it's a diagnosis, not the restore-then-archive decision.
- q9 combines the sklearn-flavor requirement (also tested in `ai300-2b-rai-model-format`, with a joblib `custom_model`) with the `mltable` data requirement, and uses a pyfunc model.
- q10 differs from `ai300-2b-frs-lineage`. There, the spec is copied from the component's output. Here, the training data comes from `get_offline_features()`, so the spec isn't in the data folder, and that copy option is the trap.
