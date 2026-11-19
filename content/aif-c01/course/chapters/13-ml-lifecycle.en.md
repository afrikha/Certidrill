An ML project is a cycle, not a one-time build: a business goal becomes an ML problem, data is collected and prepared, a model is trained, evaluated and deployed, then monitored and retrained when its performance drops. This chapter covers the stages of the pipeline, where models come from, how they run in production, the AWS services for each stage, MLOps and the metrics that judge a model, technical and business.

<!-- section: ml-pipeline | objectives: 1.3.1 -->
## Components of an ML pipeline

| Stage | What happens |
| --- | --- |
| 1. **Business goal** | Define the problem and how success is measured (for example, reduce churn by 5 %) |
| 2. **ML problem framing** | Decide whether ML fits and which type: classification, regression, clustering... and what the target is |
| 3. **Data collection** | Gather data from databases, files, streams; label it if supervised |
| 4. **Data preprocessing** | Clean (missing values, duplicates, outliers), transform, split into training, validation and test sets |
| 5. **Feature engineering** | Select, create and transform the input variables (features) that help the model: for example "days since last purchase" |
| 6. **Model training** | The algorithm learns parameters from the training set |
| 7. **Hyperparameter tuning** | Try settings that are not learned (learning rate, tree depth, number of epochs) to find the best model |
| 8. **Evaluation** | Measure performance on data the model has not seen, against the business goal |
| 9. **Deployment** | Make the model available for inference (endpoint, batch job) |
| 10. **Monitoring** | Watch for data drift, model quality drift and operational health |
| 11. **Retraining** | Train again with new data when performance degrades, then redeploy |

Parameters are learned during training (weights); hyperparameters are chosen before training. The test set is used only once, for the final evaluation; the validation set guides tuning.

> **Exam trap.** In an ordering question the sequence is: collect data, preprocess data, engineer features, train, tune and evaluate, deploy, monitor. Feature engineering comes after cleaning and before training; evaluation comes before deployment.

<!-- section: model-sources | objectives: 1.3.2 -->
## Sources of models

| Source | What it is | Trade-off |
| --- | --- | --- |
| **Proprietary foundation models through a managed service** | Models from Amazon (Amazon Nova) and other providers, called through the Amazon Bedrock API | No training or infrastructure; pay per use; customizable within the service's options |
| **Open source pretrained models** | Publicly available weights (for example from model hubs), deployed through SageMaker JumpStart, Amazon Bedrock Marketplace or your own compute | You can inspect, fine-tune and host them; check the license; you operate the hosting unless the service manages it |
| **Training a custom model** | Train your own model on your data, from scratch or by fine-tuning a pretrained one | Most control and differentiation; needs data, ML skills, time and compute; training an FM from scratch is the most expensive option |

<!-- section: production-methods | objectives: 1.3.3 -->
## Using a model in production

| Method | How it works | Choose it when |
| --- | --- | --- |
| **Managed API service** | The provider hosts and scales the model; your application sends requests to an API (Amazon Bedrock, the AWS AI services) | Least operational overhead, fast start, usage-based cost |
| **Managed hosting of your model** | You bring or train a model; SageMaker AI provisions and scales the endpoint for you | Custom or open source model without managing servers |
| **Self-hosted API** | You deploy the model on your own infrastructure (Amazon EC2, containers on Amazon ECS or Amazon EKS) and expose your own API | Full control over the stack, specific hardware or software, existing container platform; you patch, scale and secure everything |

> **Exam tip.** "LEAST operational overhead to use a foundation model" is Amazon Bedrock. "Full control over the serving stack" or "run the model in the company's existing Kubernetes clusters" is self-hosting, for example on Amazon EKS.

<!-- section: aws-pipeline-services | objectives: 1.3.4 -->
## AWS services for each stage

| Stage | AWS services and features |
| --- | --- |
| Data collection and storage | Amazon S3 (data lake), AWS Glue (data integration and Data Catalog), AWS Lake Formation (governed data lake), Amazon Redshift, databases |
| Data preparation | AWS Glue DataBrew (visual, no-code data cleaning), SageMaker Data Wrangler (prepare and featurize data in SageMaker Studio), Amazon EMR (large-scale Spark) |
| Feature engineering | SageMaker Data Wrangler, SageMaker Feature Store (online and offline store of reusable features) |
| Training and tuning | SageMaker AI training jobs and automatic model tuning, SageMaker Canvas (no-code ML for business analysts), SageMaker JumpStart (pretrained models), SageMaker HyperPod (large-scale training clusters) |
| Foundation models | Amazon Bedrock: choose, customize and invoke FMs through one API |
| Deployment | SageMaker AI endpoints (real-time, serverless, asynchronous), batch transform; Amazon Bedrock for FMs |
| Orchestration and governance | SageMaker Pipelines (automated workflows), SageMaker Model Registry (versions and approval), SageMaker Model Cards (documentation) |
| Monitoring | Amazon CloudWatch metrics and alarms, managed MLflow in SageMaker AI, AWS open-source monitoring solutions |
| Building the application | Kiro, the agentic development environment, writes and tests the code that calls the model |
| Consuming the results | Amazon Quick: dashboards (Quick Sight), research and AI agents that business users query in natural language |

Amazon SageMaker Model Monitor (drift detection on endpoints) and SageMaker Clarify are no longer open to new customers. For a new project, AWS recommends CloudWatch custom metrics with anomaly detection alarms, managed MLflow and its open-source monitoring solutions.

> **Exam trap.** Glue DataBrew and Data Wrangler both prepare data without code: DataBrew is for data analysts on AWS Glue; Data Wrangler is inside SageMaker Studio for ML. SageMaker Canvas builds models without code; it is not a data catalog.

<!-- section: mlops | objectives: 1.3.5 -->
## MLOps fundamentals

MLOps applies DevOps practices to machine learning so that models reach production reliably and stay accurate.

| Concept | What it means | On AWS |
| --- | --- | --- |
| **Experimentation** | Track every run: data version, code, hyperparameters, metrics, to compare and reproduce | Managed MLflow and SageMaker Experiments |
| **Repeatable processes** | Automate the steps of the pipeline instead of manual notebooks | SageMaker Pipelines |
| **Scalable systems** | Training and inference scale with data and traffic | Managed training jobs, endpoint autoscaling |
| **Managing technical debt** | Avoid fragile glue code, undocumented data dependencies and unversioned models | Model Registry, versioned data and code |
| **Production readiness** | Testing, security, approvals, rollback, cost and latency checks before release | Model Registry approval status, CI/CD |
| **Model monitoring** | Detect data drift (inputs change), concept drift (the relation between inputs and target changes) and quality drops | CloudWatch, monitoring solutions |
| **Model retraining** | Retrain on a schedule or when a monitored metric crosses a threshold, then redeploy | Pipelines triggered automatically |

> **Exam trap.** A model that was accurate at launch and degrades over months while the code didn't change suffers from drift. The fix is monitoring and retraining on recent data, not a larger instance.

<!-- section: model-metrics | objectives: 1.3.6 -->
## Model and business metrics

Classification metrics come from the confusion matrix: true positives (TP), false positives (FP), true negatives (TN), false negatives (FN).

| Metric | Formula or meaning | Use it when |
| --- | --- | --- |
| **Accuracy** | (TP + TN) / all predictions | Classes are balanced |
| **Precision** | TP / (TP + FP): of the items flagged positive, how many really are | False positives are costly: blocking a legitimate payment, spam filter hiding real emails |
| **Recall** | TP / (TP + FN): of the real positives, how many were found | False negatives are costly: missing a fraud or a disease |
| **F1 score** | Harmonic mean of precision and recall | Classes are imbalanced and both errors matter |
| **AUC (area under the ROC curve)** | Ability to rank positives above negatives across all thresholds; 0.5 = random, 1 = perfect | Comparing classifiers independently of the threshold |
| **MAE, RMSE, R²** | Average error, error that penalizes large mistakes, share of variance explained | Regression models |

Business metrics judge whether the model is worth it: **cost per user** or per prediction, **development costs**, **customer feedback** and satisfaction, **return on investment (ROI)**, plus outcomes such as revenue gained or fraud losses avoided.

> **Exam trap.** On a dataset with 1 % fraud, a model that always answers "legitimate" has 99 % accuracy and is useless. Use recall, precision or F1 for imbalanced classes.

<!-- section: key-points -->
## Key points

- Pipeline: business goal, framing, data collection, preprocessing, feature engineering, training, tuning, evaluation, deployment, monitoring, retraining.
- Models come from managed FM providers, open source pretrained models or custom training; production uses a managed API, managed hosting or self-hosting.
- SageMaker AI covers preparation, training, deployment and governance; Bedrock serves FMs; Kiro builds the application; Quick delivers insights to business users.
- MLOps: experiments, automation, scalability, low technical debt, production readiness, monitoring, retraining.
- Precision when false positives are costly, recall when false negatives are costly, F1 for imbalanced data; business metrics decide the value.
