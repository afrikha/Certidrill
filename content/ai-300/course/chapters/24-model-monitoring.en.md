A model that passed evaluation can still degrade in production: the input data changes, the predictions shift, data quality breaks, or the endpoint slows down. Azure Machine Learning covers two layers: **model monitoring** (scheduled jobs that compare production data with a reference and compute drift, quality and performance signals) and **endpoint monitoring** (Azure Monitor metrics and logs of the online endpoint). Exam questions ask which signal detects a symptom, what data and reference it needs, which YAML key sets a threshold, and how a breached threshold can alert people or start retraining.

<!-- section: collect-production-data | objectives: 2.4.1 -->
## Collecting production inference data

Monitoring needs the inputs and outputs the model actually saw. For **online endpoints**, the **data collector** writes them to blob storage and registers them as data assets; for batch endpoints and models deployed outside Azure Machine Learning, you collect and register production data yourself.

```yaml
data_collector:
  sampling_rate: 1.0
  rolling_rate: Hour
  collections:
    model_inputs:
      enabled: 'True'
    model_outputs:
      enabled: 'True'
```

```text
# score.py (package azureml-ai-monitoring in the environment)
from azureml.ai.monitoring import Collector

def init():
    global model, inputs_collector, outputs_collector
    inputs_collector = Collector(name="model_inputs")
    outputs_collector = Collector(name="model_outputs")
    # load the model here

def run(data):
    input_df = parse_request(data)                 # pandas DataFrame
    context = inputs_collector.collect(input_df)   # returns the correlation context
    output_df = model.predict(input_df)
    outputs_collector.collect(output_df, context)
    return output_df.tolist()
```

| Fact | Detail |
| --- | --- |
| Names | `model_inputs` and `model_outputs` are recognized automatically by model monitoring; `request` and `response` are reserved for raw HTTP payload logging without code changes |
| Payload logging | Not guaranteed tabular: monitoring needs a preprocessing component, so the custom logging SDK is recommended |
| MLflow models | Data collection is enabled with one setting on the deployment page of the studio |
| Data type | `collect()` logs **pandas DataFrames** only |
| Correlation | A `correlationid` is generated to join inputs and outputs (or pass your own ID) |
| Storage | `azureml://datastores/workspaceblobstore/paths/modelDataCollector/` then `{endpoint}/{deployment}/{collection}/{yyyy}/{MM}/{dd}/{HH}/` as JSON Lines |
| Defaults | `sampling_rate` 1.0 (100 %), `rolling_rate` `Hour`; data assets named `<endpoint>-<deployment>-<collection>` |

> **Exam trap.** By default a failure in `collect()` raises an exception in your scoring script. Pass `on_error` to the `Collector` to log the error instead of failing the request.

<!-- section: drift-signals | objectives: 2.4.1 -->
## Detecting and analyzing data drift

Each monitoring signal compares a **production** data window with **reference** data and computes metrics against thresholds.

| Signal | Compares | Reference | Metrics |
| --- | --- | --- | --- |
| Data drift | Distribution of model **inputs** | Training data or recent past production data | Jensen-Shannon distance, population stability index, normalized Wasserstein distance, two-sample Kolmogorov-Smirnov test, Pearson's chi-squared test |
| Prediction drift | Distribution of model **outputs** | Validation data or recent past production data | Same family, plus Chebyshev distance |
| Data quality | Integrity of inputs | Training data or recent past production data | Null value rate, data type error rate, out-of-bounds rate |
| Feature attribution drift (preview) | Feature importance in production vs training | Training data (required) | Normalized discounted cumulative gain (NDCG) |
| Model performance (preview) | Predictions vs **ground truth** | Ground truth data (required) | Classification: accuracy, precision, recall. Regression: MAE, MSE, RMSE |

Out-of-bounds uses the reference: the min to max interval for numerical features, the set of known values for categorical ones. Windows: the production lookback window defaults to the monitoring frequency; the reference can be a fixed window (`window_start_date`, `window_end_date`) or a rolling one (`lookback_window_size`, `lookback_window_offset`, for example `P7D`).

**Out-of-box monitoring** needs only the deployment: it detects the collected data assets, uses recent past production data as reference, and runs data drift, prediction drift and data quality, emailing the user who set it up when a threshold is breached. **Advanced monitoring** chooses signals, reference data, features and thresholds:

```yaml
$schema: http://azureml/sdk-2-0/Schedule.json
name: churn_model_monitoring
trigger:
  type: recurrence
  frequency: day
  interval: 1
  schedule:
    hours: 3
    minutes: 15
create_monitor:
  compute:
    instance_type: standard_e4s_v3
    runtime_version: "3.4"
  monitoring_target:
    ml_task: classification
    endpoint_deployment_id: azureml:churn-api:blue
  monitoring_signals:
    churn_data_drift:
      type: data_drift
      reference_data:
        input_data:
          path: azureml:churn-train:3
          type: mltable
        data_context: training
        data_column_names:
          target_column: churned
      features:
        top_n_feature_importance: 10
      alert_enabled: true
      metric_thresholds:
        numerical:
          jensen_shannon_distance: 0.01
        categorical:
          pearsons_chi_squared_test: 0.02
    churn_data_quality:
      type: data_quality
      reference_data:
        input_data:
          path: azureml:churn-train:3
          type: mltable
        data_context: training
      alert_enabled: true
      metric_thresholds:
        numerical:
          null_value_rate: 0.05
        categorical:
          out_of_bounds_rate: 0.03
  alert_notification:
    emails:
      - mlops@contoso.com
```

```bash
az ml schedule create --file churn-monitoring.yml
```

Monitoring jobs run on **serverless Spark** compute (sizes such as `Standard_E4s_v3`, `Standard_E8s_v3`). Microsoft recommends a daily frequency for models with heavy daily traffic and weekly or monthly otherwise. Model monitoring doesn't support the `AllowOnlyApprovedOutbound` managed network isolation mode. Drift metrics are computed **per feature**, so the results show which features drifted; `top_n_feature_importance` limits drift monitoring to the most important features, where drift is most likely to explain a drop in quality.

> **Exam trap.** Data drift looks at inputs, prediction drift at outputs, and neither needs labels. Only the model performance signal measures accuracy, and it needs **ground truth** joined to predictions by a correlation ID. "The customers changed" is data drift; "the model now predicts churn twice as often" is prediction drift; "null values appeared" is data quality.

<!-- section: performance-metrics | objectives: 2.4.2 -->
## Monitoring performance metrics of deployed models

Two kinds of performance matter: the **model's** quality on real data, and the **endpoint's** operational health.

Model quality uses the `model_performance` signal. Ground truth arrives later (for example, whether the customer actually churned) and is registered as a data asset with the same correlation ID:

```yaml
  monitoring_signals:
    churn_model_performance:
      type: model_performance
      production_data:
        input_data:
          path: azureml:churn-api-blue-model_outputs:1
          type: mltable
        data_column_names:
          prediction: churned
          correlation_id: correlation_id
      reference_data:
        input_data:
          path: azureml:churn-ground-truth:1
          type: mltable
        data_column_names:
          actual: churned
          correlation_id: correlation_id
        data_context: ground_truth
      alert_enabled: true
      metric_thresholds:
        tabular_classification:
          accuracy: 0.95
          precision: 0.8
```

Endpoint health comes from **Azure Monitor**:

| Source | Content | Use |
| --- | --- | --- |
| Endpoint metrics | Request latency, requests per minute, new connections per second, network bytes; drill down by deployment or status | Latency and error trends, alert rules |
| Deployment metrics | CPU, GPU, memory and disk utilization, down to the instance | Sizing and autoscale |
| `AmlOnlineEndpointTrafficLog` | Each request: response code and reason, model status code, deployment, durations, throttling delays | Which deployment returns errors, where latency comes from |
| `AmlOnlineEndpointConsoleLog` | Container console output (stdout) | Errors printed by `score.py` |
| `AmlOnlineEndpointEventLog` | Container events: `LivenessProbeFailed`, `ReadinessProbeFailed`, `BackOff`, `Killing`, `Started` | Restarts and probe failures |
| Application Insights | Live metrics, failures, performance views of the deployment (`app_insights_enabled: true`) | Application-level tracing |

The three log tables require a **diagnostic setting** on the endpoint that sends logs to a Log Analytics workspace (allow up to an hour for the first data). Throttling caused by bandwidth limits shows in the network bytes metric and in the response trailers `ms-azureml-bandwidth-request-delay-ms` and `ms-azureml-bandwidth-response-delay-ms`.

> **Exam tip.** "Which deployment returns 5xx errors and how long does the model take" → query `AmlOnlineEndpointTrafficLog`. "Why does the container restart" → `AmlOnlineEndpointEventLog`. "The model's accuracy dropped" → the model performance signal, not endpoint metrics.

<!-- section: alerts-retraining | objectives: 2.4.3 -->
## Configuring alerts and retraining triggers

| Mechanism | Trigger | Typical action |
| --- | --- | --- |
| `alert_enabled` + `metric_thresholds` + `alert_notification.emails` in the monitor | A signal breaches its threshold | Email to the listed addresses |
| Azure Event Grid on the workspace | Monitoring job run fails because of a threshold breach | Logic App, Azure Function, webhook or Azure Data Factory pipeline that submits the retraining pipeline |
| Azure Monitor alert rule on an endpoint metric | Latency, errors or CPU above a threshold | Action group (email, SMS, webhook, runbook) |
| Schedule resource | Time | Periodic retraining pipeline |

For a monitoring threshold, create an event subscription on the workspace:

1. Event type: **Run status changed** only. Don't select **Dataset drift detected**, which belongs to data drift v1, not to model monitoring.
2. Advanced filter: key `data.RunTags.azureml_modelmonitor_threshold_breached`, operator **String contains**, value **has failed due to one or more features violating metric thresholds**.
3. Optionally add a filter on the signal name to react to one signal only.
4. Endpoint: a Logic App or Azure Function that calls `az ml job create` (or the SDK) for the retraining pipeline, which ends with evaluation and registration of a new model version.

Workspace events available in Event Grid:

| Event type | Raised when |
| --- | --- |
| `Microsoft.MachineLearningServices.RunCompleted` | A run completes |
| `Microsoft.MachineLearningServices.RunStatusChanged` | A run changes status |
| `Microsoft.MachineLearningServices.ModelRegistered` | A model or model version is registered (filter on model tags or subject `models/<name>`) |
| `Microsoft.MachineLearningServices.ModelDeployed` | Models are deployed to an endpoint |

Failed or canceled operations don't raise the success events (a failed deployment raises no `ModelDeployed`). Creating subscriptions needs Contributor or Owner on the workspace and the `Microsoft.EventGrid` resource provider registered.

Time-based retraining uses a schedule, which can't be event-triggered:

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/schedule.schema.json
name: churn_weekly_retraining
trigger:
  type: cron
  expression: "0 2 * * 1"
  time_zone: "W. Europe Standard Time"
create_job: ./churn-training-pipeline.yml
```

```bash
az ml schedule create --file retraining-schedule.yml
az ml schedule disable --name churn_weekly_retraining
```

`trigger.type` is `recurrence` (`frequency`: minute, hour, day, week or month, plus `interval` and optional `schedule` hours, minutes, weekdays) or `cron` (day-of-month and month fields are ignored). `time_zone` defaults to UTC. Disable a schedule before deleting it; deletion can't be undone.

> **Exam trap.** A retrained model shouldn't replace production automatically: the pipeline registers a new version, and a separate gated step deploys it to `green` with 0 % traffic for a safe rollout. Event Grid and schedules start the pipeline; they don't decide whether the new model is better.

<!-- section: key-points -->
## Key points

- The data collector (`model_inputs`, `model_outputs`, pandas DataFrames) feeds monitoring for online endpoints; batch and external models need their own data assets.
- Data drift = inputs, prediction drift = outputs, data quality = nulls, types, out of bounds; model performance needs ground truth.
- Out-of-box monitoring: data drift, prediction drift and data quality against recent production data, emails to the creator.
- Monitors are schedules (`az ml schedule create`) running on serverless Spark, with `metric_thresholds` per signal.
- Endpoint health: Azure Monitor metrics, plus traffic, console and event logs through a diagnostic setting.
- Threshold breaches reach Event Grid as **Run status changed** with the `azureml_modelmonitor_threshold_breached` tag; a Logic App or Function starts retraining.
- Schedules handle time-based retraining; deploy the retrained model through a safe rollout.
