Gemini Enterprise Agent Platform (Agent Platform for short) is the evolution of Vertex AI, announced on April 22, 2026: Vertex AI services and their roadmap are now delivered through it, and the documentation, the console and the exam guide use the new names. The exam does not test data science. It tests whether you can choose the right managed building block (a pipeline, a feature store, an accelerator and a consumption model, a prebuilt API, a Gemini Enterprise agent, a Model Garden model) and wire it into a secure, cost-aware architecture.

<!-- section: ml-pipelines | objectives: 2.4.1 -->
## Automating the ML lifecycle with Agent Platform Pipelines

**Agent Platform Pipelines** runs ML workflows serverlessly: no cluster to create, patch or scale. A pipeline is a directed acyclic graph of containerized tasks linked by their inputs and outputs; independent tasks run in parallel.

| Concept | Meaning |
| --- | --- |
| SDK | Kubeflow Pipelines (KFP) SDK, or TensorFlow Extended (TFX) for TensorFlow workloads with very large data |
| Component | Self-contained step with inputs, outputs and code, packaged as a container image |
| Google Cloud Pipeline Components | Prebuilt components for Agent Platform operations (training, AutoML, batch inference, model upload, endpoint deployment) and for services such as BigQuery and Dataflow |
| Compilation | The pipeline definition is compiled to a YAML file, then submitted as a run |
| Run | One-time, or recurring through the scheduler API |
| Metadata and lineage | Parameters and artifacts are recorded in **Agent Platform ML Metadata**; lineage graphs trace which dataset and run produced a model |
| Experiments | Runs can be grouped in **Agent Platform Experiments** to compare hyperparameters and metrics |

A typical MLOps loop:

```text
Cloud Build (on Git push) --> compile pipeline --> store template
Scheduler / event --> Pipeline run:
  extract (BigQuery) -> validate -> transform (Dataflow) -> train (custom job, GPU)
  -> evaluate -> if metric above threshold: register in Model Registry -> deploy to endpoint
Model monitoring alert (drift) --> trigger a new run
```

Design rules:

- Run each pipeline with a **dedicated service account** holding only the roles its steps need, not the Compute Engine default service account.
- Use the pipeline for repeatable training; use the custom training job alone for one-off experiments.
- Event-driven retraining: a Cloud Storage or Pub/Sub event, through Eventarc, calls a Cloud Run function that submits the pipeline run.

| Requirement | Answer |
| --- | --- |
| Orchestrate ML steps with lineage, artifacts and model registration, no infrastructure | Agent Platform Pipelines |
| Orchestrate general data workflows across many services with Apache Airflow DAGs | Managed Service for Apache Airflow (formerly Cloud Composer) |
| Chain a few API calls or serverless services with retries | Workflows |
| Large-scale batch or streaming transformation inside a step | Dataflow |

> **Exam trap.** Running Kubeflow Pipelines on a self-managed GKE cluster works, but when the requirement is "minimize operational overhead" or "fully managed", the answer is Agent Platform Pipelines.

<!-- section: data-integration | objectives: 2.4.2 -->
## Preparing data for Agent Platform

Training and inference read data that must be in the right place, format and security boundary.

| Data source | When |
| --- | --- |
| Cloud Storage | Default for training data (files, images, TFRecord, Parquet): best performance and support |
| BigQuery | Tabular data already in the warehouse; read directly by training jobs, AutoML and pipelines |
| NFS (Filestore, Google Cloud NetApp Volumes) | Frameworks that need a POSIX file system with high throughput |
| Managed datasets | Datasets registered in Agent Platform for labeling, splits and lineage, used by training pipelines |

**Agent Platform Feature Store** serves the same features to training and online inference:

- Feature data **stays in BigQuery**: the tables or views form the offline store, no copy to maintain.
- A **feature group** maps to a BigQuery source table or view; each feature is a column.
- A **feature view** materializes selected features into an online store and refreshes periodically.
- **Bigtable online serving** handles very large, frequently updated datasets (no embeddings). Optimized online serving is deprecated.

Data preparation happens upstream: BigQuery SQL for tabular cleanup, Dataflow for large or streaming transformation, Managed Service for Apache Spark (formerly Dataproc) for existing Spark code. For generative AI, enterprise content is indexed for retrieval with **RAG Engine**, **Vector Search** or **Agent Search** data stores (websites, structured and unstructured documents) so that Gemini answers are grounded.

Security and placement checklist:

- Keep data, training jobs and endpoints in the **same region** (data residency, latency, egress cost).
- Protect the projects with **VPC Service Controls** and the data with **CMEK** where required.
- Remove or tokenize sensitive fields with **Sensitive Data Protection** before they reach training data.
- Track lineage from source table to model with ML Metadata and the catalog.

> **Exam tip.** "Avoid training-serving skew" or "reuse features across teams" points to Feature Store with BigQuery as the source of truth, not to exporting CSV files for each model.

<!-- section: ai-hypercomputer | objectives: 2.4.3 -->
## AI Hypercomputer, accelerators and consumption models

**AI Hypercomputer** is Google Cloud's integrated supercomputing system for AI: performance-optimized hardware (NVIDIA GPUs, Cloud TPUs, networking, storage), open software (optimized PyTorch, JAX, TensorFlow) and orchestration (GKE, Cluster Director for Slurm clusters, Cluster Toolkit blueprints), with flexible consumption options.

| Accelerator | Choose when |
| --- | --- |
| TPU (TPU7x Ironwood, v6e, v5p, v5e) | Large matrix-heavy models, long training runs, large batch sizes, giant embeddings (recommendation); code compiled by XLA (JAX, PyTorch/XLA). Chips are grouped in slices |
| GPU (A series: A2, A3, A4, A4X; G series: G2, G4) | Many custom PyTorch operations, CUDA ecosystem, broad framework support; G series for inference and graphics |
| CPU | Prototyping, small models, I/O-bound work |

Where to run:

| Need | Platform |
| --- | --- |
| Managed training without managing VMs | Agent Platform custom training (prebuilt or custom containers, GPUs or TPUs, distributed training; Reduction Server speeds up multi-node GPU all-reduce) |
| Managed online inference | Agent Platform endpoint |
| Full control, mixed workloads, existing Kubernetes skills, large multi-host serving | GKE with GPU or TPU node pools |
| HPC-style scheduler familiar to researchers | Cluster Director (Slurm) |
| Serverless inference that scales to zero | Cloud Run with a GPU (NVIDIA L4, for example) |
| Lightweight glue: preprocess a request, call a model, react to events | Cloud Run functions |

**Consumption models** for accelerators:

| Option | Capacity | Duration | Discount | Best for |
| --- | --- | --- | --- | --- |
| On-demand | Best effort | Unlimited | None | Serving, prototyping |
| Spot VMs | Best effort, preemptible | Until reclaimed | Up to 91 % | Fault-tolerant batch, checkpointed distributed training |
| Flex-start (Dynamic Workload Scheduler) | Best effort; all-or-nothing for MIG resize requests | Up to 7 days | Up to 53 % on A4, A3, A2, G4 | Fine-tuning, small pre-training, batch inference that can wait for capacity |
| Future reservation, calendar mode | Very high assurance | Up to 90 days, up to 80 VMs | Up to 53 % | Planned training run on a fixed date |
| Future reservation for capacity blocks | Very high assurance | Reserved period | Up to 53 % with CUDs | Foundation model pre-training, multi-host inference on premium machines |
| Standard reservation (with committed use discounts) | Very high assurance | Unlimited | CUD price | Critical production serving |

> **Exam trap.** Spot is the cheapest, but a multi-week pre-training run that "must start on March 1 with 64 GPU VMs" needs assured capacity: a future reservation (calendar mode or capacity blocks), not Spot or on-demand.

<!-- section: google-ai-apis | objectives: 2.5.1 -->
## Choosing among Google AI APIs

Prebuilt APIs and models avoid training anything. Match the modality and the task:

| Need | Service |
| --- | --- |
| Search and recommendations over websites and enterprise documents, with generative answers | **Agent Search** (formerly Vertex AI Search; API name Discovery Engine) |
| Chatbots and voice agents with deterministic flows and generative playbooks, telephony integration | **Conversational Agents** (Dialogflow CX), built in the Conversational Agents console |
| Analyze images: labels, OCR, landmarks, logos, objects, SafeSearch, faces (no individual facial recognition) | **Cloud Vision API** |
| Generate or edit images from prompts | Gemini image models (Nano Banana) on Agent Platform |
| Analyze stored video (description, what is said, chapters with timestamps), video in Cloud Storage | **Gemini** models on Agent Platform (video understanding). The Video Intelligence API is deprecated since September 14, 2026 and shuts down on September 14, 2027, with Gemini models as the replacement: not an answer for new designs |
| Generate video from text or images | **Veo** models on Agent Platform |
| Speech to text: synchronous for audio of 1 minute or less, asynchronous for long files, streaming for live audio | **Speech-to-Text** |
| Natural speech output | **Text-to-Speech**, or Gemini TTS models |
| Extract fields from invoices, forms, IDs | Document AI |
| Reason over mixed text, images, audio and video in one prompt | **Gemini** models through Agent Platform |

Decision order: a prebuilt API when the task is standard (OCR, transcription, labels); Gemini when the task needs reasoning, summarization or flexible multimodal understanding; AutoML or custom training only when your own labeled data must teach a domain-specific task that neither handles.

> **Exam trap.** Vision API label detection returns generic labels. "Recognize our 40 proprietary part numbers on photos" needs a model trained or tuned on your images (AutoML or tuning), not the prebuilt API.

<!-- section: gemini-enterprise | objectives: 2.5.2 -->
## Gemini Enterprise: agents and Gemini Notebook for business

**Gemini Enterprise** is the employee-facing app ("front door" to AI at work): permissions-aware search across enterprise data, an assistant, and agents. **Agent Platform** is where technical teams build, scale and govern the agents that Gemini Enterprise delivers. Editions include Business, Standard, Plus, Frontline and pay-as-you-go.

| Feature | Use |
| --- | --- |
| Connectors | Index and query Microsoft SharePoint, Jira, Confluence, ServiceNow and other sources; answers respect each user's source permissions |
| Google-made agents | Core assistant, Deep Research for in-depth exploration |
| Workflow Builder | No-code, low-code agents built by employees; admins enable it and control sharing |
| Custom agents | ADK agents hosted on Agent Runtime, Agent2Agent (A2A) agents, Dialogflow agents, registered in Gemini Enterprise and listed in the Agent Gallery |
| Agent lifecycle | States Private, Enabled, Suspended, Disabled; admins share, transfer or delete |

**Gemini Notebook for business** (formerly NotebookLM Enterprise, the name the exam guide uses) grounds summaries, answers and audio overviews in the sources a user adds (Google Docs and Slides, PDFs, web URLs, YouTube, DOCX, PPTX, XLSX and more):

- Data stays in the customer's Google Cloud project, in a US or EU multi-region; access is controlled by IAM roles and sign-in through Cloud Identity or a third-party identity provider.
- Supports **VPC Service Controls**, **CMEK** and data residency commitments, unlike the consumer product.
- Notebooks are private by default and can be shared only with users of the same project; never publicly.
- Chat history is not saved between sessions: users save answers as notes.

> **Exam tip.** "Give employees one place to ask questions across SharePoint, Jira and Drive with their existing permissions" is Gemini Enterprise with connectors. "Build a customer-facing agent embedded in our product" is an agent built on Agent Platform (ADK, Agent Runtime), not the employee app.

<!-- section: model-garden | objectives: 2.5.3 -->
## Integrating models from Model Garden

**Model Garden** is the catalog to discover, test, tune and deploy models from Google, partners and the open-source community. Model collections separate models managed by Google, by partners, or by you.

| Option | Characteristics | Choose when |
| --- | --- | --- |
| Gemini models (Google, managed API) | No infrastructure, pay per use, multimodal | Default for generative features |
| Partner models offered as managed APIs | Called like Gemini, billed per use | A specific third-party model is required without hosting it |
| Open models (Gemma, Llama and others) self-deployed | Deployed to an Agent Platform endpoint (or GKE) on machines you choose; you pay for the compute | Full control of weights, fine-tuning, data never leaves your deployment, predictable high volume |
| Hugging Face models | Deployed with Hugging Face deep learning containers; scanned by Hugging Face, unsafe models blocked | A model only published on Hugging Face |

Integration steps:

1. Evaluate candidates in Agent Studio or a Colab Enterprise notebook against your own prompts and metrics.
2. Tune if needed (billed like custom training), register, deploy to an endpoint with autoscaling.
3. Call the endpoint from Cloud Run or GKE through a service account; expose it to clients through Apigee or API Gateway when it is a product API.
4. Restrict which models projects may use with the Model Garden organization policy (`constraints/vertexai.allowedModels`): allow vetted models, deny the rest.

> **Exam trap.** Self-deploying an open model is not "lowest operational overhead": you size, scale and pay for the serving machines even when idle. Choose it for control, tuning or data isolation requirements; otherwise a managed model API wins.

<!-- section: key-points -->
## Key points

- Agent Platform = the evolution of Vertex AI (April 2026); use the new names: Agent Platform Pipelines, ML Metadata, Experiments, Feature Store, Agent Runtime, Agent Search.
- Pipelines: KFP or TFX, compiled to YAML, serverless runs, scheduler, lineage in ML Metadata; Composer for general Airflow orchestration.
- Feature Store keeps features in BigQuery (offline) and syncs feature views to an online store; Cloud Storage is the default training data source.
- TPUs for large matrix-heavy XLA workloads, GPUs for CUDA and custom operations; Spot for interruptible, flex-start for jobs up to 7 days, future reservations for assured planned capacity.
- Prebuilt APIs for standard tasks, Gemini for reasoning and multimodal prompts, custom training for proprietary labeled tasks.
- Gemini Enterprise is the employee app (connectors, Deep Research, Workflow Builder, custom ADK and A2A agents); Gemini Notebook for business (formerly NotebookLM Enterprise) keeps data in your project with IAM, VPC Service Controls and CMEK.
- Model Garden: managed APIs for least overhead, self-deployed open models for control; restrict models with `constraints/vertexai.allowedModels`.
