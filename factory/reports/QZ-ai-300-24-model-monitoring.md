# QZ-ai-300-24-model-monitoring — notes

## Chapter vs current Learn (to fix in the chapter, not done here)

- **Preview status of model performance.** The Learn page "Model monitoring in production" (concept-model-monitoring) marks **Model performance (classification and regression)** and **Feature attribution drift** as preview. The chapter flags both as preview in the signal table. But the 2.4.2 section ("Monitoring performance metrics of deployed models") and its Exam tip ("The model's accuracy dropped → the model performance signal") present model performance as the standard answer and don't repeat that it is preview. Because preview features must not be tested as the answer, the quiz tests 2.4.2 only through endpoint monitoring (Application Insights and the traffic log).
- **Mock bank (not my files, reported only).** These questions use the preview model performance signal as the correct answer: `ai300-2c-ground-truth-performance`, `ai300-2c-performance-monitor-order`, `ai300-cs1a-precision-signal`, `ai300-cs2a-monitor-signals` (s3) and `ai300-cs4a-monitor-signals` (m4). `ai300-2c-drift-symptoms` (t4) uses feature attribution drift, also preview.
- **YAML schema conflicts on Learn.** The reference page "CLI (v2) schedule YAML schema for model monitoring (preview)" disagrees with the how-to "Monitor model performance in production", which the chapter follows:
  - categorical chi-squared key: `chi_squared_test` (reference) vs `pearsons_chi_squared_test` (how-to and chapter);
  - model performance: `metric_thresholds.classification` / `regression` with `mae`, `mse`, `rmse`, and reference `data_context: training` only (reference) vs `tabular_classification` and `data_context: ground_truth` (how-to and chapter);
  - trigger keys: `timezone`, `pattern`, `week_days` (reference prose) vs `time_zone`, `schedule`, `weekdays` (how-to examples, the pipeline schedule page and the chapter);
  - `runtime_version` default `3.3` (reference) vs `"3.4"` in every how-to example.
  The quiz doesn't depend on any of these keys.
- **Fixed reference window keys.** The chapter (like the concept page) gives `window_start_date` / `window_end_date`. The reference YAML page gives `window_start` / `window_end`. This isn't tested.
- **Out-of-box monitoring.** The chapter is right: Learn confirms recent past production data as the reference, and an email to the user who set up the monitor. The `data_collector` defaults (`sampling_rate` 1.0, `rolling_rate` Hour, asset name `<endpoint>-<deployment>-<collection>`) are confirmed by "CLI (v2) managed online deployment YAML schema", but not by the data collection how-to.
- **ModelRegistered subject.** The chapter writes the subject filter as `models/<name>`. The real subject is `models/{modelName}:{modelVersion}` (Event Grid page). Mentioning the `:version` suffix would help, because "ends with" filters on the model name never match (this is q8's trap).
- **Small additions worth putting in the chapter.** The default reference window offset is twice the production window size, and Learn recommends a reference offset of at least the production size plus the production offset. The traffic log separates `ResponseCode` (returned to the client) from `ModelStatusCode` (returned by the model), and has the duration columns `TotalDurationMs`, `RequestDurationMs` and `ResponseDurationMs`, plus `RequestThrottlingDelayMs` and `ResponseThrottlingDelayMs`.

## Beyond the chapter (study-guide scope, verified on Learn)

- q6 uses the meaning of 424 (the model container returned a non-200 response), which comes from "Troubleshoot online endpoint deployment and scoring", not from chapter 24.
- q9 uses the YAML for a model deployed outside Azure Machine Learning: production `input_data.type: uri_folder` with `pre_processing_component` (whose output is `mltable`). This comes from "Monitor model performance in production". The chapter mentions the preprocessing component only in the payload-logging row.

## Reasoning not stated word for word on Learn

- q7 option e (`sampling_rate: 0.1`): Learn doesn't discuss sampling for monitoring cost. The explanation says that 10 percent of about 300 requests a week makes the distributions noisier. That is an inference.
- q10 s2 relies on `top_n_feature_importance: 10` limiting drift computation to the top 10 features (Learn: "Monitor the top N features"). q10 s1 stays No whatever the default `features` of the data quality signal is, because `alert_enabled` is false.

## Design notes

- No preview feature is a correct answer. Model performance appears only in an explanation (q1 d), and the custom signal's `component_id` appears only as a distractor (q9).
- q2: the stem doesn't name Application Insights, so the correct key doesn't echo the stem.
